export const COINGECKO_ASSET_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDC: 'usd-coin',
  ARB: 'arbitrum',
} as const;

export type SupportedPricedAsset = keyof typeof COINGECKO_ASSET_MAP;
