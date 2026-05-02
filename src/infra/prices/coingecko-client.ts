import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';

type CoinGeckoPriceResponse = Record<
  string,
  {
    usd?: number;
    brl?: number;
  }
>;

export class CoinGeckoClient {
  constructor(
    private readonly options: {
      apiKey?: string;
      fetcher?: FetchLike;
    } = {},
  ) {}

  async getSimplePrice(coingeckoId: string) {
    const endpoint = new URL('https://api.coingecko.com/api/v3/simple/price');
    endpoint.searchParams.set('ids', coingeckoId);
    endpoint.searchParams.set('vs_currencies', 'usd,brl');

    const headers: Record<string, string> = {};
    const apiKey = this.options.apiKey ?? process.env.COINGECKO_KEY;
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const response = await fetchJson<CoinGeckoPriceResponse>(
      endpoint.toString(),
      { headers },
      { fetcher: this.options.fetcher },
    );

    return response[coingeckoId] ?? null;
  }

  async getTokenPriceByContract(platformId: string, contractAddress: string) {
    const endpoint = new URL(
      `https://api.coingecko.com/api/v3/simple/token_price/${platformId}`,
    );
    endpoint.searchParams.set('contract_addresses', contractAddress);
    endpoint.searchParams.set('vs_currencies', 'usd,brl');

    const headers: Record<string, string> = {};
    const apiKey = this.options.apiKey ?? process.env.COINGECKO_KEY;
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const response = await fetchJson<CoinGeckoPriceResponse>(
      endpoint.toString(),
      { headers },
      { fetcher: this.options.fetcher },
    );

    return response[contractAddress] ?? response[contractAddress.toLowerCase()] ?? null;
  }
}
