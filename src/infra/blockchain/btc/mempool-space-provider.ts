import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import type {
  BlockchainProvider,
  ProviderSyncInput,
  ProviderSyncResult,
} from '@/infra/blockchain/provider';
import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';

type MempoolTransaction = {
  txid: string;
  status?: { confirmed?: boolean; block_height?: number; block_time?: number };
  vin?: Array<{ prevout?: { scriptpubkey_address?: string; value?: number } }>;
  vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
  fee?: number;
};

export class MempoolSpaceProvider implements BlockchainProvider {
  readonly network = 'BTC';

  constructor(
    private readonly options: {
      baseUrl?: string;
      fetcher?: FetchLike;
    } = {},
  ) {}

  validateAddress(address: string) {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
  }

  async fetchTransactions(input: ProviderSyncInput): Promise<ProviderSyncResult> {
    const baseUrl = this.options.baseUrl ?? 'https://mempool.space/api';
    const address = input.address.trim();
    const endpoint = input.cursor
      ? `${baseUrl}/address/${address}/txs/chain/${input.cursor}`
      : `${baseUrl}/address/${address}/txs`;
    const payload = await fetchJson<MempoolTransaction[]>(
      endpoint,
      {},
      { fetcher: this.options.fetcher },
    );

    const transactions = payload.map((transaction) =>
      this.normalizeTransaction(address, transaction),
    );
    const nextCursor = payload.at(-1)?.txid ?? null;

    return { transactions, nextCursor };
  }

  private normalizeTransaction(
    address: string,
    transaction: MempoolTransaction,
  ): NormalizedTransaction {
    const incoming = (transaction.vout ?? [])
      .filter((item) => item.scriptpubkey_address === address)
      .reduce((sum, item) => sum + (item.value ?? 0), 0);
    const outgoing = (transaction.vin ?? [])
      .filter((item) => item.prevout?.scriptpubkey_address === address)
      .reduce((sum, item) => sum + (item.prevout?.value ?? 0), 0);

    const direction =
      incoming > 0 && outgoing > 0
        ? 'SELF'
        : incoming > 0
          ? 'IN'
          : outgoing > 0
            ? 'OUT'
            : 'UNKNOWN';

    const amountSats = direction === 'IN' ? incoming : outgoing;

    return {
      network: 'BTC',
      walletAddress: address,
      txHash: transaction.txid,
      blockNumber: String(transaction.status?.block_height ?? 0),
      timestamp: new Date((transaction.status?.block_time ?? 0) * 1000).toISOString(),
      status: transaction.status?.confirmed ? 'CONFIRMED' : 'PENDING',
      transfers: [
        {
          assetSymbol: 'BTC',
          amount: satsToBtc(amountSats),
          fromAddress:
            direction === 'IN'
              ? (transaction.vin?.[0]?.prevout?.scriptpubkey_address ?? null)
              : address,
          toAddress:
            direction === 'OUT' ? (transaction.vout?.[0]?.scriptpubkey_address ?? null) : address,
          direction,
        },
      ],
      fee: transaction.fee ? { amount: satsToBtc(transaction.fee), assetSymbol: 'BTC' } : null,
      cursor: transaction.txid,
      rawPayload: JSON.stringify(transaction),
    };
  }
}

function satsToBtc(value: number) {
  return (value / 100_000_000).toFixed(8);
}
