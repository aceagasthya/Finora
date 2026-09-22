/**
 * Finora Fee and Conversion Calculator
 *
 * Rules:
 * - Conversion Rate: 1 USDC = ₹86.42
 * - Platform Fee: 1%
 * - TDS: 1% (Section 194S)
 * - Round components first, then sum.
 */

export const USDC_INR_RATE = 86.42;
export const PLATFORM_FEE_PERCENT = 0.01; // 1%
export const TDS_PERCENT = 0.01; // 1%

export interface UsdcToInrQuote {
  inrAmount: number;
  rate: number;
  baseUsdc: number;
  platformFeeUsdc: number;
  tdsUsdc: number;
  totalUsdcToDeduct: number;
}

export interface InrToUsdcQuote {
  usdcAmount: number;
  rate: number;
  baseInr: number;
  platformFeeInr: number;
  tdsInr: number;
  totalInrToDeduct: number;
}

export interface DirectTransferQuote {
  asset: 'USDC' | 'INR';
  amount: number;
  platformFee: number;
  totalToDeduct: number;
}

function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates USDC needed to pay a given INR merchant amount
 * Example: ₹1,000
 * Base USDC: 1000 / 86.42 = 11.5714
 * Platform fee: 0.1157
 * TDS: 0.1157
 * Total USDC: 11.8028
 */
export function calculateUsdcToInr(inrAmount: number): UsdcToInrQuote {
  if (inrAmount <= 0) {
    return {
      inrAmount: 0,
      rate: USDC_INR_RATE,
      baseUsdc: 0,
      platformFeeUsdc: 0,
      tdsUsdc: 0,
      totalUsdcToDeduct: 0,
    };
  }

  // 4 decimal places precision as in prompt example
  const rawBaseUsdc = inrAmount / USDC_INR_RATE;
  const baseUsdc = roundTo(rawBaseUsdc, 4);

  const platformFeeUsdc = roundTo(baseUsdc * PLATFORM_FEE_PERCENT, 4);
  const tdsUsdc = roundTo(baseUsdc * TDS_PERCENT, 4);

  // Sum rounded components
  const totalUsdcToDeduct = roundTo(baseUsdc + platformFeeUsdc + tdsUsdc, 4);

  return {
    inrAmount,
    rate: USDC_INR_RATE,
    baseUsdc,
    platformFeeUsdc,
    tdsUsdc,
    totalUsdcToDeduct,
  };
}

/**
 * Calculates INR needed to withdraw a target USDC amount
 */
export function calculateInrToUsdc(usdcAmount: number): InrToUsdcQuote {
  if (usdcAmount <= 0) {
    return {
      usdcAmount: 0,
      rate: USDC_INR_RATE,
      baseInr: 0,
      platformFeeInr: 0,
      tdsInr: 0,
      totalInrToDeduct: 0,
    };
  }

  const rawBaseInr = usdcAmount * USDC_INR_RATE;
  const baseInr = roundTo(rawBaseInr, 2);

  const platformFeeInr = roundTo(baseInr * PLATFORM_FEE_PERCENT, 2);
  const tdsInr = roundTo(baseInr * TDS_PERCENT, 2);

  const totalInrToDeduct = roundTo(baseInr + platformFeeInr + tdsInr, 2);

  return {
    usdcAmount,
    rate: USDC_INR_RATE,
    baseInr,
    platformFeeInr,
    tdsInr,
    totalInrToDeduct,
  };
}
