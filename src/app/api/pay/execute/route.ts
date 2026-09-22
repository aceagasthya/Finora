import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { m2pMock } from '@/lib/m2p-mock';
import { withdrawUsdc } from '@/lib/bitgo';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      flow, // 'FLOW_A' (USDC->INR->UPI), 'FLOW_B' (INR->USDC->Solana), 'FLOW_C' (INR->INR->UPI), 'FLOW_D' (USDC->USDC->Solana), 'FLOW_USDC_PAY'
      amount,
      usdcAmount,
      paymentMethod,
      merchantUpiId,
      merchantName,
      recipientAddress,
      pin,
    } = await req.json();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    // Direct External USDC Account / Solana Merchant Payment (FLOW_D, FLOW_B, or external address passed)
    const isSolanaRecipient =
      (recipientAddress && recipientAddress.length >= 32 && !recipientAddress.includes('@')) ||
      (merchantUpiId && merchantUpiId.length >= 32 && !merchantUpiId.includes('@'));

    const isDirectUsdcPayment =
      flow === 'FLOW_D' ||
      flow === 'FLOW_B' ||
      flow === 'FLOW_USDC_PAY' ||
      isSolanaRecipient;

    if (pin && pin !== '1234') {
      return NextResponse.json({ error: 'Invalid PIN. Enter 1234 to proceed.' }, { status: 400 });
    }

    if (!isDirectUsdcPayment && !pin) {
      return NextResponse.json({ error: 'UPI PIN is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isDirectUsdcPayment) {
      const targetSolAddress =
        (isSolanaRecipient ? (merchantUpiId && !merchantUpiId.includes('@') ? merchantUpiId : recipientAddress) : null) ||
        recipientAddress ||
        user.usdcDepositAddress ||
        'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ';

      // Step 1: Check database of the user first
      const currentUsdc = Number(user.virtualUsdcBalance);
      if (currentUsdc < numAmount) {
        return NextResponse.json(
          {
            error: `Insufficient USDC balance in database. Required: ${numAmount} USDC, Available: ${currentUsdc} USDC. Please deposit USDC first.`,
            required: numAmount,
            available: currentUsdc,
            databaseChecked: true,
          },
          { status: 400 }
        );
      }

      // Step 2: Deduct from virtual ledger in database BEFORE calling external API
      const newUsdcBalance = currentUsdc - numAmount;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          virtualUsdcBalance: { decrement: numAmount },
        },
      });

      // Step 3: Trigger BitGo withdrawal API to send USDC from Finora main account to external USDC account
      const bitgoResult = await withdrawUsdc(targetSolAddress, numAmount);

      // Step 4: Record Transaction and Ledger in database
      const txRecord = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'withdrawal',
          asset: 'USDC',
          amount: numAmount,
          status: 'confirmed',
          txHash: bitgoResult.txHash,
          fromAddress: bitgoResult.fromWalletId,
          toAddress: targetSolAddress,
          metadata: JSON.stringify({
            flow: flow || 'FLOW_D',
            senderName: user.name,
            senderEmail: user.email,
            fromWalletId: bitgoResult.fromWalletId,
            recipientAddress: targetSolAddress,
            bitgoApiTriggered: bitgoResult.bitgoApiTriggered,
            bitgoEndpoint: bitgoResult.bitgoEndpoint,
            bitgoStatus: bitgoResult.bitgoStatus,
            databaseChecked: true,
            databaseBalanceBefore: currentUsdc,
            databaseBalanceAfter: newUsdcBalance,
            isMockFallback: bitgoResult.isMockFallback || false,
          }),
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          userId: user.id,
          type: 'payment_usdc_debit',
          asset: 'USDC',
          amount: -numAmount,
          balanceAfter: newUsdcBalance,
          description: `USDC Payment of ${numAmount} USDC to external account ${targetSolAddress.slice(0, 8)}... (tx: ${bitgoResult.txHash.slice(0, 8)}...)`,
          transactionId: txRecord.id,
        },
      });

      return NextResponse.json({
        success: true,
        flow: flow || 'FLOW_D',
        amount: numAmount,
        fromWalletId: bitgoResult.fromWalletId,
        recipientAddress: targetSolAddress,
        txHash: bitgoResult.txHash,
        bitgoApiTriggered: bitgoResult.bitgoApiTriggered,
        bitgoEndpoint: bitgoResult.bitgoEndpoint,
        bitgoStatus: bitgoResult.bitgoStatus,
        solanaExplorerUrl: `https://explorer.solana.com/tx/${bitgoResult.txHash}?cluster=devnet`,
        virtualUsdcBalance: newUsdcBalance,
        virtualInrBalance: Number(user.virtualInrBalance),
        databaseBalanceBefore: currentUsdc,
        databaseBalanceAfter: newUsdcBalance,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle Flow A: Paying UPI Merchant USING USDC
    if (flow === 'FLOW_A' && (paymentMethod === 'USDC' || !user.virtualInrBalance || Number(user.virtualInrBalance) < numAmount)) {
      const targetMerchant = merchantUpiId || 'merchant@upi';
      const merchantInfo = await m2pMock.resolveMerchant(targetMerchant);
      const displayMerchantName = merchantName || merchantInfo.payeeName;

      // Rate conversion: 1 USDC = 83.5 INR
      const requiredUsdc = usdcAmount ? parseFloat(usdcAmount) : Number((numAmount / 83.5).toFixed(4));
      const currentUsdc = Number(user.virtualUsdcBalance);

      // Step 1: Check database of the user for sufficient USDC
      if (currentUsdc < requiredUsdc) {
        return NextResponse.json(
          {
            error: `Insufficient USDC balance in database. Required: ${requiredUsdc} USDC (for ₹${numAmount}), Available: ${currentUsdc} USDC. Please deposit USDC first.`,
            required: requiredUsdc,
            available: currentUsdc,
            databaseChecked: true,
          },
          { status: 400 }
        );
      }

      // Step 2: Deduct USDC from database virtual ledger first
      const newUsdcBalance = currentUsdc - requiredUsdc;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          virtualUsdcBalance: { decrement: requiredUsdc },
        },
      });

      // Step 3: Trigger BitGo withdrawal API from Main Account to external treasury settlement
      const bitgoResult = await withdrawUsdc(
        'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ',
        requiredUsdc
      );

      // Step 4: Execute UPI settlement via M2P
      const m2pResult = await m2pMock.initiateUpiPayment(
        user.inrWalletId || `m2p_${user.id}`,
        targetMerchant,
        numAmount,
        pin
      );

      const finalUtr = m2pResult.utr;

      // Step 5: Record database transactions and ledger
      const txRecord = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'payment',
          asset: 'USDC',
          amount: requiredUsdc,
          status: 'confirmed',
          fromAddress: bitgoResult.fromWalletId,
          toAddress: 'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ',
          txHash: bitgoResult.txHash,
          merchantUpiId: targetMerchant,
          utr: finalUtr,
          metadata: JSON.stringify({
            flow: 'FLOW_A',
            inrAmount: numAmount,
            usdcAmount: requiredUsdc,
            merchantName: displayMerchantName,
            fromWalletId: bitgoResult.fromWalletId,
            bitgoApiTriggered: bitgoResult.bitgoApiTriggered,
            bitgoEndpoint: bitgoResult.bitgoEndpoint,
            databaseChecked: true,
          }),
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          userId: user.id,
          type: 'payment_debit',
          asset: 'USDC',
          amount: -requiredUsdc,
          balanceAfter: newUsdcBalance,
          description: `USDC Payment of ${requiredUsdc} USDC for ₹${numAmount} to ${displayMerchantName}`,
          transactionId: txRecord.id,
        },
      });

      return NextResponse.json({
        success: true,
        flow: 'FLOW_A',
        amount: numAmount,
        usdcAmount: requiredUsdc,
        utr: finalUtr,
        txHash: bitgoResult.txHash,
        fromWalletId: bitgoResult.fromWalletId,
        bitgoApiTriggered: bitgoResult.bitgoApiTriggered,
        bitgoEndpoint: bitgoResult.bitgoEndpoint,
        merchantName: displayMerchantName,
        merchantUpiId: targetMerchant,
        merchantSees: `${user.name} paid ₹${numAmount}`,
        virtualInrBalance: Number(user.virtualInrBalance),
        virtualUsdcBalance: newUsdcBalance,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle Flow C: Direct INR to UPI Merchant
    if (flow === 'FLOW_C' || flow === 'FLOW_A') {
      const targetMerchant = merchantUpiId || 'merchant@upi';
      const merchantInfo = await m2pMock.resolveMerchant(targetMerchant);
      const displayMerchantName = merchantName || merchantInfo.payeeName;

      const currentInr = Number(user.virtualInrBalance);
      if (currentInr < numAmount) {
        return NextResponse.json(
          {
            error: `Insufficient INR balance in database. Required: ₹${numAmount}, Available: ₹${currentInr}.`,
            required: numAmount,
            available: currentInr,
            databaseChecked: true,
          },
          { status: 400 }
        );
      }

      // Step 1: Deduct from virtual ledger in database first
      const newInrBalance = currentInr - numAmount;
      const txId = `upi_${Date.now()}`;

      // Step 2: Call M2P UPI Payment layer
      const m2pResult = await m2pMock.initiateUpiPayment(
        user.inrWalletId || `m2p_${user.id}`,
        targetMerchant,
        numAmount,
        pin
      );

      if (!m2pResult.success) {
        return NextResponse.json({ error: m2pResult.error || 'UPI payment failed' }, { status: 400 });
      }

      const finalUtr = m2pResult.utr;

      // Step 3: Record atomic database transaction
      const [updatedUser, txRecord] = await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            virtualInrBalance: { decrement: numAmount },
          },
        }),
        prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'payment',
            asset: 'INR',
            amount: numAmount,
            status: 'confirmed',
            merchantUpiId: targetMerchant,
            utr: finalUtr,
            metadata: JSON.stringify({
              flow,
              merchantName: displayMerchantName,
              payerName: user.name,
              statement: `${user.name} paid ₹${numAmount}`,
            }),
          },
        }),
        prisma.ledgerEntry.create({
          data: {
            userId: user.id,
            type: 'payment_debit',
            asset: 'INR',
            amount: -numAmount,
            balanceAfter: newInrBalance,
            description: `UPI Payment of ₹${numAmount} to ${displayMerchantName} (${targetMerchant})`,
            transactionId: txId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        flow,
        amount: numAmount,
        utr: finalUtr,
        merchantName: displayMerchantName,
        merchantUpiId: targetMerchant,
        merchantSees: `${user.name} paid ₹${numAmount}`,
        virtualInrBalance: Number(updatedUser.virtualInrBalance),
        virtualUsdcBalance: Number(updatedUser.virtualUsdcBalance),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Unsupported payment flow' }, { status: 400 });
  } catch (err: any) {
    console.error('[Pay Execute] Error:', err);
    return NextResponse.json({ error: err.message || 'Payment execution failed' }, { status: 500 });
  }
}
