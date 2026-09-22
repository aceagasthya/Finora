import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Finora database for USDC ↔ INR platform...');

  // Clean existing data
  await prisma.ledgerEntry.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.user.deleteMany({});

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Seed demo user: Alice Sharma
  const alice = await prisma.user.create({
    data: {
      email: 'alice@finora.io',
      name: 'Alice Sharma',
      password: hashedPassword,
      phone: '+91 98765 43210',
      kycStatus: 'verified',
      bitgoAddressId: 'addr_bitgo_alice_1594',
      usdcDepositAddress: 'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ',
      inrWalletId: 'm2p_wallet_alice_01',
      inrUpiId: 'alice@finora',
      inrUpiPin: '1234',
      virtualUsdcBalance: 100.0000,
      virtualInrBalance: 2500.00,
    },
  });

  console.log(`Created demo user: ${alice.name} (${alice.email})`);

  // Seed initial ledger entries
  await prisma.ledgerEntry.createMany({
    data: [
      {
        userId: alice.id,
        type: 'deposit',
        asset: 'USDC',
        amount: 100.0,
        balanceAfter: 100.0,
        description: 'Initial BitGo testnet USDC deposit',
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        userId: alice.id,
        type: 'deposit',
        asset: 'INR',
        amount: 2500.0,
        balanceAfter: 2500.0,
        description: 'Initial INR Wallet topup via M2P PPI',
        createdAt: new Date(Date.now() - 86400000),
      },
    ],
  });

  // Seed initial transactions
  await prisma.transaction.createMany({
    data: [
      {
        userId: alice.id,
        type: 'deposit',
        asset: 'USDC',
        amount: 100.0,
        status: 'confirmed',
        txHash: '5hK8rqPz4yNmWq27BitGoDepositInit',
        toAddress: 'CG3eYXBggS5uxDpg2RETrR2ofhpMXTRaT65HWUhve2AJ',
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        userId: alice.id,
        type: 'deposit',
        asset: 'INR',
        amount: 2500.0,
        status: 'confirmed',
        utr: 'UTR889920193821',
        createdAt: new Date(Date.now() - 86400000),
      },
    ],
  });

  console.log('Seed completed successfully! Demo user alice@finora.io / password123 ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
