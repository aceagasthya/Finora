import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const BITGO_API_BASE = process.env.BITGO_API_BASE || 'https://app.bitgo-test.com/api/v2';
const rawWalletId = process.env.BITGO_WALLET_ID || '6ab0355036e69a0f0d29558eae1dc020';
// Automatically normalize the 0f0 typo to 90f if present
const BITGO_WALLET_ID = rawWalletId === '6ab0355036e69a0f0d29558eae1dc020' ? '6ab0355036e69a90fd29558eae1dc020' : rawWalletId;
const BITGO_TOKEN = process.env.BITGO_ACCESS_TOKEN || 'v2x0a43d8f1d8886b7747adc63edc64b6ad8b4607d6b2feec4af6821e983892a370';
const BITGO_COIN = process.env.BITGO_COIN || 'ofc';
const ON_TOKEN = process.env.BITGO_TOKEN || 'ofctsol:usdc';

async function generateBitGoDepositAddress(username = 'demo-user') {
  console.log('===============================================================');
  console.log('       FINORA: BITGO USDC RECEIVER ADDRESS GENERATION          ');
  console.log('===============================================================');
  console.log(`Target Wallet ID : ${BITGO_WALLET_ID}`);
  console.log(`Custody Coin     : ${BITGO_COIN}`);
  console.log(`Token Asset      : ${ON_TOKEN} (Solana USDC)`);
  console.log(`User Label       : finora-${username}`);
  console.log('---------------------------------------------------------------');

  const url = `${BITGO_API_BASE}/${BITGO_COIN}/wallet/${BITGO_WALLET_ID}/address`;
  console.log(`Triggering BitGo API: POST ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BITGO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      label: `finora-${username}-${Date.now().toString(36)}`,
      onToken: ON_TOKEN,
    }),
  });

  const status = response.status;
  const data = await response.json();

  console.log(`HTTP Response Status: ${status}`);
  if (!response.ok || !data.address) {
    console.error('✗ BitGo Address Creation Failed:', data);
    process.exit(1);
  }

  console.log('\n✓ SUCCESS! New BitGo USDC Receiver Address Generated:');
  console.log(`  Deposit Address  : ${data.address}`);
  console.log(`  Address ID       : ${data.id}`);
  console.log(`  Wallet ID        : ${data.wallet || BITGO_WALLET_ID}`);
  console.log(`  Token Asset      : ${data.token || ON_TOKEN}`);
  console.log(`  Chain Index      : ${data.index}`);
  console.log('===============================================================\n');

  return data;
}

const userArg = process.argv[2] || 'alice';
generateBitGoDepositAddress(userArg).catch(console.error);
