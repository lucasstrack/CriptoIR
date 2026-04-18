import { describe, expect, it, vi } from 'vitest';
import { PriceService } from '@/core/services/price-service';
import { CoinGeckoClient } from '@/infra/prices/coingecko-client';

describe('PriceService', () => {
  it('consulta CoinGecko e retorna USD e BRL', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ bitcoin: { usd: 84500.1, brl: 481000.25 } })),
      );
    const service = new PriceService(new CoinGeckoClient({ fetcher }));

    const result = await service.getCurrentPrice('BTC');

    expect(result).toEqual({
      assetSymbol: 'BTC',
      priceUsd: '84500.10000000',
      priceBrl: '481000.25000000',
    });
  });

  it('suporta uso com e sem COINGECKO_KEY', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ethereum: { usd: 3000, brl: 17000 } })));
    process.env.COINGECKO_KEY = 'demo-key';

    const service = new PriceService(new CoinGeckoClient({ fetcher }));
    const result = await service.getCurrentPrice('ETH');

    expect(fetcher).toHaveBeenCalled();
    expect(result.assetSymbol).toBe('ETH');
    delete process.env.COINGECKO_KEY;
  });
});
