import type {
  NormalizedTransaction,
  NormalizedTransfer,
} from '@/core/domain/normalized-transaction';
import type {
  BlockchainProvider,
  ProviderSyncInput,
  ProviderSyncResult,
} from '@/infra/blockchain/provider';
import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';
import {
  SolAssetMetadataService,
  type SolAssetMetadataServiceOptions,
} from './sol-asset-metadata-service';
import { NATIVE_SOL_MINT, type SolAssetMetadata } from './sol-mint-registry';

/**
 * Resposta enriched do Helius `/v0/addresses/{addr}/transactions`.
 * Incluimos `tokenTransfers` (SPL) alem de `nativeTransfers` (SOL nativo) —
 * a versao anterior do tipo ignorava `tokenTransfers`, fazendo qualquer
 * transferencia de SPL aparecer como "SOL" com amount 0.
 */
type HeliusNativeTransfer = {
  fromUserAccount: string;
  toUserAccount: string;
  /** lamports (1 SOL = 1e9 lamports). */
  amount: number;
};

type HeliusTokenTransfer = {
  fromTokenAccount: string;
  toTokenAccount: string;
  fromUserAccount: string;
  toUserAccount: string;
  /** Valor ja convertido para unidades humanas (decimals aplicados). */
  tokenAmount: number;
  mint: string;
  tokenStandard?: string;
};

type HeliusTransaction = {
  signature: string;
  slot: number;
  timestamp: number;
  type?: string;
  source?: string;
  description?: string;
  fee?: number;
  feePayer?: string;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
};

/** Limite minimo (lamports) para considerar um nativeTransfer relevante. */
const DUST_LAMPORTS_THRESHOLD = 100;

export interface HeliusSolProviderOptions {
  apiKey?: string;
  fetcher?: FetchLike;
  /** Service de metadata SPL injetavel (testes). */
  metadataService?: SolAssetMetadataService;
  /** Quando true, nao registra transfers nativos com amount <= DUST_LAMPORTS_THRESHOLD. */
  filterDust?: boolean;
}

export class HeliusSolProvider implements BlockchainProvider {
  readonly network = 'SOL';
  private readonly metadataService: SolAssetMetadataService;
  private readonly filterDust: boolean;

  constructor(private readonly options: HeliusSolProviderOptions = {}) {
    const metadataOptions: SolAssetMetadataServiceOptions = {};
    if (options.apiKey !== undefined) metadataOptions.apiKey = options.apiKey;
    if (options.fetcher !== undefined) metadataOptions.fetcher = options.fetcher;
    this.metadataService = options.metadataService ?? new SolAssetMetadataService(metadataOptions);
    this.filterDust = options.filterDust ?? true;
  }

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

    const mints = collectMints(payload);
    const metadata = await this.metadataService.resolveBatch(mints);

    const normalized: NormalizedTransaction[] = [];
    for (const tx of payload) {
      const result = this.normalizeTransaction(input.address, tx, metadata);
      if (result) normalized.push(result);
    }

    return {
      transactions: normalized,
      nextCursor: payload.at(-1)?.signature ?? null,
    };
  }

  private normalizeTransaction(
    address: string,
    transaction: HeliusTransaction,
    metadata: Map<string, SolAssetMetadata>,
  ): NormalizedTransaction | null {
    const transfers: NormalizedTransfer[] = [];

    // ---- Transfers SPL (tokens) ----
    for (const tt of transaction.tokenTransfers ?? []) {
      const involved =
        tt.fromUserAccount === address || tt.toUserAccount === address;
      if (!involved) continue;

      const amount = tt.tokenAmount;
      if (!Number.isFinite(amount) || amount === 0) continue;

      const direction =
        tt.toUserAccount === address && tt.fromUserAccount === address
          ? 'SELF'
          : tt.toUserAccount === address
            ? 'IN'
            : 'OUT';

      const meta = metadata.get(tt.mint);
      if (!meta) continue; // resolveBatch sempre devolve fallback, defensivo

      transfers.push({
        assetSymbol: meta.symbol,
        assetAddress: tt.mint,
        amount: formatAmount(amount, meta.decimals),
        fromAddress: tt.fromUserAccount || null,
        toAddress: tt.toUserAccount || null,
        direction,
        decimals: meta.decimals,
      });
    }

    // ---- Transfers nativos (SOL) ----
    for (const nt of transaction.nativeTransfers ?? []) {
      const involved = nt.fromUserAccount === address || nt.toUserAccount === address;
      if (!involved) continue;
      if (this.filterDust && nt.amount <= DUST_LAMPORTS_THRESHOLD) continue;

      const direction =
        nt.toUserAccount === address && nt.fromUserAccount === address
          ? 'SELF'
          : nt.toUserAccount === address
            ? 'IN'
            : 'OUT';

      transfers.push({
        assetSymbol: 'SOL',
        assetAddress: NATIVE_SOL_MINT,
        amount: lamportsToSol(nt.amount),
        fromAddress: nt.fromUserAccount || null,
        toAddress: nt.toUserAccount || null,
        direction,
        decimals: 9,
      });
    }

    // Tx que nao envolve nossa wallet em nenhum transfer e descartada.
    if (transfers.length === 0) {
      return null;
    }

    // ---- Fee ----
    const fee =
      transaction.feePayer === address && typeof transaction.fee === 'number' && transaction.fee > 0
        ? { amount: lamportsToSol(transaction.fee), assetSymbol: 'SOL' }
        : null;

    return {
      network: 'SOL',
      walletAddress: address,
      txHash: transaction.signature,
      blockNumber: String(transaction.slot),
      timestamp: new Date(transaction.timestamp * 1000).toISOString(),
      status: 'CONFIRMED',
      transfers,
      fee,
      cursor: transaction.signature,
      rawPayload: JSON.stringify(transaction),
    };
  }
}

function collectMints(transactions: HeliusTransaction[]): string[] {
  const set = new Set<string>();
  for (const tx of transactions) {
    for (const tt of tx.tokenTransfers ?? []) {
      if (tt.mint) set.add(tt.mint);
    }
  }
  return [...set];
}

function lamportsToSol(value: number): string {
  return (value / 1_000_000_000).toFixed(9);
}

/**
 * Helius ja entrega `tokenAmount` em unidades humanas (decimais aplicados).
 * Aqui apenas garantimos uma string com `decimals` casas — `Number.toFixed`
 * arredonda quando o valor tem mais precisao que `decimals`, o que e
 * aceitavel porque `decimals` ja reflete a precisao max do token.
 */
function formatAmount(amount: number, decimals: number): string {
  if (decimals === 0) return Math.trunc(amount).toString();
  return amount.toFixed(Math.min(decimals, 18));
}
