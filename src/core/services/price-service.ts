import { COINGECKO_ASSET_MAP, type SupportedPricedAsset } from '@/infra/prices/coingecko-asset-map';
import { CoinGeckoClient } from '@/infra/prices/coingecko-client';

export type AssetPrice = {
  assetSymbol: SupportedPricedAsset;
  priceUsd: string;
  priceBrl: string;
};

export class PriceService {
  constructor(private readonly client: CoinGeckoClient) {}

  async getCurrentPrice(assetSymbol: SupportedPricedAsset): Promise<AssetPrice> {
    const coingeckoId = COINGECKO_ASSET_MAP[assetSymbol];
    const price = await this.client.getSimplePrice(coingeckoId);

    if (!price?.usd || !price?.brl) {
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
    if (!price?.usd || !price?.brl) {
      throw new Error(`Preco indisponivel para ${coingeckoId}.`);
    }
    return {
      priceUsd: price.usd.toFixed(8),
      priceBrl: price.brl.toFixed(8),
    };
  }
}
