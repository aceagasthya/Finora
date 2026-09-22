import http from 'node:http';
import crypto from 'node:crypto';

const PORT = 3080;

function generateSolanaTxHash() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Ping endpoint
  if (url.pathname === '/api/v1/ping' || url.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'BitGo Express (Simulated/Local)' }));
    return;
  }

  // sendcoins endpoint: /api/v2/:coin/wallet/:walletId/sendcoins
  const sendcoinsMatch = url.pathname.match(/^\/api\/v2\/([^\/]+)\/wallet\/([^\/]+)\/sendcoins$/);
  if (req.method === 'POST' && sendcoinsMatch) {
    const coin = sendcoinsMatch[1];
    const walletId = sendcoinsMatch[2];

    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { address, amount, walletPassphrase } = parsed;

        if (!address) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'recipient address is required' }));
          return;
        }

        if (!amount) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'amount is required' }));
          return;
        }

        const txHash = generateSolanaTxHash();
        const transferId = 'transfer_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
        const numAmount = parseInt(amount, 10) || 0;

        console.log(`[BitGo Express :3080] Successfully processed sendcoins for wallet ${walletId}:`);
        console.log(`  Coin: ${coin}`);
        console.log(`  To: ${address}`);
        console.log(`  Amount (micro-USDC): ${amount} (${numAmount / 1_000_000} USDC)`);
        console.log(`  Generated TX: ${txHash}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          txid: txHash,
          hash: txHash,
          status: 'signed',
          coin,
          wallet: walletId,
          transfer: {
            id: transferId,
            coin,
            wallet: walletId,
            txid: txHash,
            status: 'confirmed',
            value: numAmount,
            valueString: amount,
            payGo: true,
            entries: [
              {
                address,
                value: numAmount,
              },
            ],
          },
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + err.message }));
      }
    });
    return;
  }

  // Fallback for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found on BitGo Express', path: url.pathname }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BitGo Express daemon running at http://localhost:${PORT}`);
  console.log(`Endpoint ready: POST http://localhost:${PORT}/api/v2/ofctsol:usdc/wallet/:walletId/sendcoins`);
});
