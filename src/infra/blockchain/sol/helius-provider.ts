import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import type {
  BlockchainProvider,
  ProviderSyncInput,
  ProviderSyncResult,
} from '@/infra/blockchain/provider';
import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';

type HeliusTransaction = {
  signature: string;
  slot: number;
  timestamp: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
};

export class HeliusSolProvider implements BlockchainProvider {
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
    const apiKey = this.options.apiKey ?? process.env.HELIUS_KEY;

    if (!apiKey) {
      throw new Error('Chave HELIUS_KEY nao configurada.');
    }

    const endpoint = new URL('https://api.helius.xyz/v0/addresses');
    endpoint.pathname += `/${input.address}/transactions`;
    endpoint.searchParams.set('api-key', apiKey);
    if (input.cursor) {
      endpoint.searchParams.set('before', input.cursor);
    }

    const payload = await fetchJson<HeliusTransaction[]>(
      endpoint.toString(),
      {},
      { fetcher: this.options.fetcher },
    );

    return {
      transactions: payload.map((transaction) =>
        this.normalizeTransaction(input.address, transaction),
      ),
      nextCursor: payload.at(-1)?.signature ?? null,
    };
  }

  private normalizeTransaction(
    address: string,
    transaction: HeliusTransaction,
  ): NormalizedTransaction {
    const transfer = transaction.nativeTransfers?.[0];
    const direction =
      transfer?.toUserAccount === address
        ? 'IN'
        : transfer?.fromUserAccount === address
          ? 'OUT'
          : 'UNKNOWN';

    return {
      network: 'SOL',
      walletAddress: address,
      txHash: transaction.signature,
      blockNumber: String(transaction.slot),
      timestamp: new Date(transaction.timestamp * 1000).toISOString(),
      status: 'CONFIRMED',
      transfers: [
        {
          assetSymbol: 'SOL',
          amount: lamportsToSol(transfer?.amount ?? 0),
          fromAddress: transfer?.fromUserAccount ?? null,
          toAddress: transfer?.toUserAccount ?? null,
          direction,
        },
      ],
      fee: null,
      cursor: transaction.signature,
      rawPayload: JSON.stringify(transaction),
    };
  }
}

function lamportsToSol(value: number) {
  return (value / 1_000_000_000).toFixed(9);
}
