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

  it('consulta token por plataforma e contrato para ativo especifico', async () => {
    const contractAddress = '0xabc0000000000000000000000000000000000000';
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          [contractAddress]: { usd: 0.25, brl: 1.25 },
        }),
      ),
    );
    const service = new PriceService(new CoinGeckoClient({ fetcher }));

    const result = await service.getPriceForAsset({
      symbol: 'USX',
      network: 'ETH',
      contractAddress,
      coingeckoId: null,
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/simple/token_price/ethereum?'),
      expect.anything(),
    );
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining(`contract_addresses=${contractAddress}`),
      expect.anything(),
    );
    expect(result).toEqual({
      priceUsd: '0.25000000',
      priceBrl: '1.25000000',
    });
  });
});
