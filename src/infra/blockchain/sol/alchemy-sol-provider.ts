import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import type {
  BlockchainProvider,
  ProviderSyncInput,
  ProviderSyncResult,
} from '@/infra/blockchain/provider';
import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';

type AlchemySolSignature = {
  signature: string;
  slot: number;
  blockTime: number | null;
};

type AlchemySolSignaturesResponse = {
  result: AlchemySolSignature[];
};

export class AlchemySolProvider implements BlockchainProvider {
  readonly network = 'SOL';

  constructor(
    private readonly options: {
      apiKey?: string;
      fetcher?: FetchLike;
    } = {},
  ) {}

  validateAddress(address: string) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  async fetchTransactions(input: ProviderSyncInput): Promise<ProviderSyncResult> {
    const apiKey = this.options.apiKey ?? process.env.ALCHEMY_SOL_KEY;

    if (!apiKey) {
      throw new Error('Chave ALCHEMY_SOL_KEY nao configurada.');
    }

    const payload = await fetchJson<AlchemySolSignaturesResponse>(
      `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            input.address,
            input.cursor ? { before: input.cursor, limit: 25 } : { limit: 25 },
          ],
        }),
      },
      { fetcher: this.options.fetcher },
    );

    return {
      transactions: payload.result.map((item) => this.normalizeSignature(input.address, item)),
      nextCursor: payload.result.at(-1)?.signature ?? null,
    };
  }

  private normalizeSignature(
    address: string,
    signature: AlchemySolSignature,
  ): NormalizedTransaction {
    return {
      network: 'SOL',
      walletAddress: address,
      txHash: signature.signature,
      blockNumber: String(signature.slot),
      timestamp: new Date((signature.blockTime ?? 0) * 1000).toISOString(),
      status: 'CONFIRMED',
      transfers: [
        {
          assetSymbol: 'SOL',
          amount: '0',
          fromAddress: null,
          toAddress: address,
          direction: 'UNKNOWN',
        },
      ],
      fee: null,
      cursor: signature.signature,
      rawPayload: JSON.stringify(signature),
    };
  }
}
