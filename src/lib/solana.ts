import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';

export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';
export const TEST_USDT_MINT = process.env.TEST_MINT || 'B5k8rXXG8H9KZm271V9qt1wSThzrXdmKowAFhaWRrdnJ';
export const USDT_DECIMALS = 6;

export function getSolanaConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, 'confirmed');
}

export function generateSolanaKeypair(): {
  publicKey: string;
  secretKey: string;
} {
  const kp = Keypair.generate();
  return {
    publicKey: kp.publicKey.toBase58(),
    secretKey: bs58.encode(kp.secretKey),
  };
}

export async function getUserAta(walletAddress: string): Promise<string> {
  try {
    const owner = new PublicKey(walletAddress);
    const mint = new PublicKey(TEST_USDT_MINT);
    const ata = await getAssociatedTokenAddress(mint, owner, false);
    return ata.toBase58();
  } catch (err) {
    console.error('Error computing ATA:', err);
    return walletAddress;
  }
}

export function getSolanaExplorerUrl(txHash: string): string {
  return `https://explorer.solana.com/tx/${txHash}?cluster=${SOLANA_CLUSTER}`;
}

export function getSolanaAddressExplorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_CLUSTER}`;
}
