/**
 * Registry de mints SOL conhecidos. Symbol/decimals sao publicamente
 * estaveis para esses mints; usar a whitelist evita uma chamada DAS para
 * tokens populares e garante coerencia mesmo se a metadata onchain mudar.
 *
 * Tokens nao listados aqui caem para o `SolAssetMetadataService` que busca
 * via Helius DAS API (`/v0/token-metadata`).
 */
export type SolAssetMetadata = {
  symbol: string;
  name: string;
  decimals: number;
  /** Slug CoinGecko se aplicavel — habilita lookup de preco. */
  coingeckoId?: string | null;
};

export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

export const KNOWN_SOL_MINTS: Record<string, SolAssetMetadata> = {
  [NATIVE_SOL_MINT]: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    coingeckoId: 'solana',
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    coingeckoId: 'tether',
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: 'mSOL',
    name: 'Marinade SOL',
    decimals: 9,
    coingeckoId: 'msol',
  },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': {
    symbol: 'stSOL',
    name: 'Lido Staked SOL',
    decimals: 9,
    coingeckoId: 'lido-staked-sol',
  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    coingeckoId: 'jupiter-exchange-solana',
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    coingeckoId: 'bonk',
  },
  jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v: {
    symbol: 'jupSOL',
    name: 'Jupiter Staked SOL',
    decimals: 9,
    coingeckoId: null,
  },
};

export function lookupKnownMint(mint: string): SolAssetMetadata | null {
  return KNOWN_SOL_MINTS[mint] ?? null;
}

/** Symbol curto para mints desconhecidos — `MINT_<6primeiros>`. */
export function fallbackSymbol(mint: string): string {
  return `MINT_${mint.slice(0, 6).toUpperCase()}`;
}
