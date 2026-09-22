import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  transfer,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import config from '../../config/index.js';

/**
 * Create a test SPL token that mimics USDT.
 *
 * CRITICAL: decimals must be 6 to match real USDT. The spl-token CLI
 * defaults to 9 — if you use the CLI default, every amount your backend
 * computes will be wrong by 1000x when you switch to mainnet USDT.
 */
export async function createTestUsdtMint(connection, payer) {
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,   // mint authority
    null,              // freeze authority — none for test token
    config.usdtDecimals
  );
  return mint;
}

/** Convert human amount (1.5 USDT) -> base units (1_500_000). */
export function toBaseUnits(amount) {
  return BigInt(Math.round(amount * 10 ** config.usdtDecimals));
}

/** Convert base units (1_500_000) -> human amount (1.5). */
export function fromBaseUnits(baseUnits) {
  return Number(baseUnits) / 10 ** config.usdtDecimals;
}

/**
 * Get (or create) the Associated Token Account for an owner.
 *
 * Every Solana wallet needs a separate ATA per token. Creating one costs
 * ~0.002 SOL in rent — paid by `payer`, not the owner. This matters for
 * Finora: when a user deposits to a fresh address, someone must have
 * already funded the ATA, or the transfer fails.
 */
export async function ensureTokenAccount(connection, payer, mint, owner) {
  return getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner,
    false
  );
}

export async function getTokenAddress(mint, owner) {
  return getAssociatedTokenAddress(mint, owner, false);
}

/** Mint new test tokens to a destination ATA. Test-token only — real USDT can't be minted. */
export async function mintTestTokens(connection, payer, mint, destinationAta, amount) {
  const sig = await mintTo(
    connection,
    payer,
    mint,
    destinationAta,
    payer,                 // mint authority
    toBaseUnits(amount)
  );
  return sig;
}

/** Transfer tokens between ATAs. This is what a real user deposit looks like. */
export async function transferTokens(connection, payer, sourceAta, destinationAta, owner, amount) {
  const sig = await transfer(
    connection,
    payer,
    sourceAta,
    destinationAta,
    owner,
    toBaseUnits(amount)
  );
  return sig;
}

/** Read token balance for an ATA. Returns 0 if the account doesn't exist yet. */
export async function getTokenBalance(connection, ata) {
  try {
    const account = await getAccount(connection, ata);
    return fromBaseUnits(account.amount);
  } catch {
    return 0;
  }
}

export { TOKEN_PROGRAM_ID, PublicKey };
