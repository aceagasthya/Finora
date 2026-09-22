import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import bs58 from 'bs58';
import config from '../../config/index.js';

const KEY_DIR = path.join(config.dataDir, 'keys');

export function getConnection() {
  return new Connection(config.rpcUrl, config.confirmationCommitment);
}

/**
 * Load a named keypair from disk, or create + persist one if absent.
 * Keys live in .finora-data/keys/<name>.json — gitignored.
 *
 * NOTE: this is a DEVNET convenience. Never store production keys this way.
 * Production custody is BitGo's job (MPC, cold storage), not a JSON file.
 */
export function loadOrCreateKeypair(name) {
  fs.mkdirSync(KEY_DIR, { recursive: true });
  const file = path.join(KEY_DIR, `${name}.json`);

  if (fs.existsSync(file)) {
    const secret = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }

  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  console.log(`  [keys] created new keypair "${name}" -> ${kp.publicKey.toBase58()}`);
  return kp;
}

export function loadKeypairFromBase58(secret) {
  return Keypair.fromSecretKey(bs58.decode(secret));
}

/**
 * Request devnet SOL. Faucets are aggressively rate-limited and fail often —
 * we retry with smaller amounts before giving up, and tell the user where
 * to get SOL manually if all attempts fail.
 */
export async function ensureSol(connection, pubkey, minSol = 0.5) {
  const balance = await connection.getBalance(pubkey);
  const currentSol = balance / LAMPORTS_PER_SOL;

  if (currentSol >= minSol) {
    console.log(`  [sol] ${pubkey.toBase58().slice(0, 8)}… has ${currentSol.toFixed(4)} SOL — ok`);
    return currentSol;
  }

  console.log(`  [sol] balance ${currentSol.toFixed(4)} SOL, need ${minSol}. Requesting airdrop…`);

  for (const amount of [1, 0.5]) {
    try {
      const sig = await connection.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, config.confirmationCommitment);
      const newBal = (await connection.getBalance(pubkey)) / LAMPORTS_PER_SOL;
      console.log(`  [sol] airdropped ${amount} SOL -> now ${newBal.toFixed(4)} SOL`);
      return newBal;
    } catch (err) {
      console.log(`  [sol] airdrop of ${amount} SOL failed (${err.message.slice(0, 60)}…)`);
    }
  }

  console.log(`
  ⚠  Airdrop failed. Devnet faucets are frequently rate-limited.
     Fund this address manually at https://faucet.solana.com
     Address: ${pubkey.toBase58()}
  `);
  return currentSol;
}

export { PublicKey, Keypair, LAMPORTS_PER_SOL };
