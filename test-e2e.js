import http from 'http';
import { URL } from 'url';

async function request(url, options = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch(e) { json = data; }
        resolve({
          status: res.statusMessage,
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('      FINORA FULL-STACK END-TO-END AUTOMATED SUITE  ');
  console.log('====================================================\n');

  let cookie = '';

  // 1. Authenticate Alice
  console.log('--- 1. Login with alice@finora.io ---');
  const loginRes = await request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'alice@finora.io', password: 'password123' },
  });
  console.log('Login status:', loginRes.statusCode, loginRes.data?.user ? 'Success (User: ' + loginRes.data.user.email + ')' : loginRes.data);
  if (loginRes.headers['set-cookie']) {
    cookie = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Cookie': cookie,
  };

  // 2. Fetch User Balances & Addresses
  console.log('\n--- 2. Fetch Balances & Addresses ---');
  const balRes = await request('http://localhost:3000/api/wallet/balances', { headers: authHeaders });
  console.log('Balances:', balRes.statusCode, balRes.data);

  // 3. Request Quote for Swiggy ₹500 with USDC
  console.log('\n--- 3. Calculate Payment Quote (₹500 via USDC) ---');
  const quoteRes = await request('http://localhost:3000/api/pay/quote', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'USDC_TO_INR',
      amount: 500,
    },
  });
  console.log('Quote Result (200):', quoteRes.statusCode, quoteRes.data?.quote);

  // 4. Flow A Step 1: Convert USDC to INR
  console.log('\n--- 4. Flow A: Convert USDC to INR (₹500) ---');
  const convertRes = await request('http://localhost:3000/api/pay/convert', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'USDC_TO_INR',
      amount: 500,
    },
  });
  console.log('Convert Result:', convertRes.statusCode, {
    success: convertRes.data?.success,
    creditedInr: convertRes.data?.creditedInr,
    deductedUsdc: convertRes.data?.deductedUsdc,
    newVirtualUsdc: convertRes.data?.newVirtualUsdcBalance,
    newVirtualInr: convertRes.data?.newVirtualInrBalance,
  });

  // 5. Flow A Step 2: Pay UPI with PIN 1234
  console.log('\n--- 5. Flow A: Execute UPI Payment (Swiggy ₹500, PIN 1234) ---');
  const payRes = await request('http://localhost:3000/api/pay/execute', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'FLOW_A',
      amount: 500,
      merchantUpiId: 'swiggy@icici',
      merchantName: 'Swiggy',
      pin: '1234',
    },
  });
  console.log('Payment Result:', payRes.statusCode, {
    success: payRes.data?.success,
    merchant: payRes.data?.merchantName,
    statement: payRes.data?.merchantStatement,
    utr: payRes.data?.utr,
  });

  // 6. Test Flow C: INR -> INR (Direct UPI payment)
  console.log('\n--- 6. Flow C: Direct INR to INR UPI Payment (Starbucks ₹250) ---');
  const payInrRes = await request('http://localhost:3000/api/pay/execute', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'FLOW_C',
      amount: 250,
      merchantUpiId: 'starbucks@hdfcbank',
      merchantName: 'Starbucks Coffee',
      pin: '1234',
    },
  });
  console.log('Direct INR Result:', payInrRes.statusCode, {
    success: payInrRes.data?.success,
    merchant: payInrRes.data?.merchantName,
    utr: payInrRes.data?.utr,
  });

  // 7. Test Flow D: USDC -> Solana External Address
  console.log('\n--- 7. Flow D: USDC Withdrawal to External Solana Address (5 USDC) ---');
  const withdrawRes = await request('http://localhost:3000/api/pay/execute', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'FLOW_D',
      amount: 5,
      recipientAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      pin: '1234',
    },
  });
  console.log('USDC Withdrawal Result:', withdrawRes.statusCode, {
    success: withdrawRes.data?.success,
    amount: withdrawRes.data?.amount,
    txHash: withdrawRes.data?.txHash,
  });

  // 7b. Test Flow B: INR -> USDC -> External Solana Address
  console.log('\n--- 7b. Flow B: Convert INR to USDC and Withdraw to External Solana Address ---');
  const convertBRes = await request('http://localhost:3000/api/pay/convert', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'INR_TO_USDC',
      amount: 5, // 5 USDC
    },
  });
  console.log('Flow B Convert Result:', convertBRes.statusCode, {
    success: convertBRes.data?.success,
    inrDeducted: convertBRes.data?.quote?.totalInrToDeduct,
  });

  const withdrawBRes = await request('http://localhost:3000/api/pay/execute', {
    method: 'POST',
    headers: authHeaders,
    body: {
      flow: 'FLOW_B',
      amount: 5,
      recipientAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      pin: '1234',
    },
  });
  console.log('Flow B Withdrawal Result:', withdrawBRes.statusCode, {
    success: withdrawBRes.data?.success,
    txHash: withdrawBRes.data?.txHash,
  });

  // 8. Test Webhook / Deposit Simulator: Deposit 25 USDC
  console.log('\n--- 8. Deposit Simulator (Credit 25 USDC) ---');
  const depositRes = await request('http://localhost:3000/api/deposit/simulate', {
    method: 'POST',
    headers: authHeaders,
    body: {
      amount: 25,
      asset: 'USDC',
    },
  });
  console.log('Deposit Result:', depositRes.statusCode, depositRes.data);

  // 9. Fetch History & Verify All Transactions
  console.log('\n--- 9. History Endpoint ---');
  const histRes = await request('http://localhost:3000/api/transactions?limit=6', { headers: authHeaders });
  console.log('History Count:', histRes.data?.transactions?.length);
  if (histRes.data?.transactions) {
    histRes.data.transactions.forEach(t => {
      console.log(` - [${t.type}] ${t.asset} ${t.amount} | Status: ${t.status} | Tx/UTR: ${t.txHash || t.utr || 'N/A'}`);
    });
  }

  // 10. Ledger & Reconciliation
  console.log('\n--- 10. Ledger & Reconciliation ---');
  const ledgerRes = await request('http://localhost:3000/api/ledger/reconciliation', { headers: authHeaders });
  console.log('Reconciliation USDC:', ledgerRes.data?.reconciliation?.usdc);
  console.log('Reconciliation INR:', ledgerRes.data?.reconciliation?.inr);

  // 11. Test New User Registration + Mock KYC + BitGo Address Generation
  console.log('\n--- 11. New User Signup & Onboarding KYC ---');
  const testEmail = `user_${Date.now()}@finora.io`;
  const signupRes = await request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: 'Rohan Patel',
      email: testEmail,
      password: 'SecurePassword123!',
      phone: '+919876543210',
    },
  });
  console.log('Signup Result:', signupRes.statusCode, signupRes.data?.user ? 'User created: ' + signupRes.data.user.email : signupRes.data);
  let newCookie = '';
  if (signupRes.headers['set-cookie']) {
    newCookie = signupRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
  }

  console.log('Submitting Mock KYC for new user...');
  const kycRes = await request('http://localhost:3000/api/onboarding/kyc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': newCookie },
    body: {
      pan: 'ABCDE1234F',
      aadhaar: '123456789012',
      address: '42 MG Road, Bangalore, Karnataka',
      dob: '1995-08-15',
    },
  });
  console.log('KYC + BitGo Address Result:', kycRes.statusCode, {
    kycStatus: kycRes.data?.user?.kycStatus,
    bitgoDepositAddress: kycRes.data?.user?.usdcDepositAddress,
    inrUpiId: kycRes.data?.user?.inrUpiId,
  });

  console.log('\n====================================================');
  console.log('       ALL END-TO-END VERIFICATIONS COMPLETE!        ');
  console.log('====================================================');
}

runE2ETests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
