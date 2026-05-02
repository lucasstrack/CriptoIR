import { COINGECKO_ASSET_MAP, type SupportedPricedAsset } from '@/infra/prices/coingecko-asset-map';
import { CoinGeckoClient } from '@/infra/prices/coingecko-client';
import type { Network } from '@prisma/client';

export type AssetPrice = {
  assetSymbol: SupportedPricedAsset;
  priceUsd: string;
  priceBrl: string;
};

export type PriceableAsset = {
  symbol: string;
  network: Network;
  contractAddress: string | null;
  coingeckoId: string | null;
};

const COINGECKO_NATIVE_ASSET_IDS: Record<Network, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BASE: 'ethereum',
  ARB: 'ethereum',
  SOL: 'solana',
};

const COINGECKO_TOKEN_PLATFORM_IDS: Partial<Record<Network, string>> = {
  ETH: 'ethereum',
  BASE: 'base',
  ARB: 'arbitrum-one',
  SOL: 'solana',
};

export class PriceService {
  constructor(private readonly client: CoinGeckoClient) {}

  async getCurrentPrice(assetSymbol: SupportedPricedAsset): Promise<AssetPrice> {
    const coingeckoId = COINGECKO_ASSET_MAP[assetSymbol];
    const price = await this.client.getSimplePrice(coingeckoId);

    if (price?.usd == null || price?.brl == null) {
      throw new Error(`Preco indisponivel para ${assetSymbol}.`);
    }

    return {
      assetSymbol,
      priceUsd: price.usd.toFixed(8),
      priceBrl: price.brl.toFixed(8),
    };
  }

  async getPriceById(coingeckoId: string): Promise<{ priceUsd: string; priceBrl: string }> {
    const price = await this.client.getSimplePrice(coingeckoId);
    if (price?.usd == null || price?.brl == null) {
      throw new Error(`Preco indisponivel para ${coingeckoId}.`);
    }
    return {
      priceUsd: price.usd.toFixed(8),
      priceBrl: price.brl.toFixed(8),
    };
  }

  async getPriceForAsset(asset: PriceableAsset): Promise<{ priceUsd: string; priceBrl: string }> {
    if (asset.contractAddress) {
      const platformId = COINGECKO_TOKEN_PLATFORM_IDS[asset.network];
      if (!platformId) {
        throw new Error(`Plataforma CoinGecko indisponivel para ${asset.network}.`);
      }

      const price = await this.client.getTokenPriceByContract(
        platformId,
        asset.contractAddress,
      );
      if (price?.usd == null || price?.brl == null) {
        throw new Error(`Preco indisponivel para ${asset.network}:${asset.contractAddress}.`);
      }
      return {
        priceUsd: price.usd.toFixed(8),
        priceBrl: price.brl.toFixed(8),
      };
    }

    const coingeckoId = asset.coingeckoId ?? COINGECKO_NATIVE_ASSET_IDS[asset.network];
    return this.getPriceById(coingeckoId);
  }
}
