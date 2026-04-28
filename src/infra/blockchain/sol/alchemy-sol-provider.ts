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

type AlchemySolSignature = {
  signature: string;
  slot: number;
  blockTime: number | null;
};

type AlchemySolSignaturesResponse = {
  result: AlchemySolSignature[];
};

/**
 * Resposta do `getTransaction` (jsonParsed). Estrutura simplificada — o
 * Solana RPC tem dezenas de campos, exposemos apenas o que o normalize usa.
 */
type ParsedInstruction = {
  programId?: string;
  parsed?: {
    type?: string;
    info?: {
      source?: string;
      destination?: string;
      authority?: string;
      lamports?: number;
      mint?: string;
      tokenAmount?: { uiAmountString?: string; decimals?: number };
      amount?: string;
    };
  };
};

type GetTransactionResponse = {
  result: {
    blockTime: number | null;
    slot: number;
    transaction: {
      signatures: string[];
      message: {
        accountKeys: Array<string | { pubkey: string }>;
        instructions: ParsedInstruction[];
      };
    };
    meta: {
      err: unknown;
      fee: number;
      preBalances?: number[];
      postBalances?: number[];
      preTokenBalances?: Array<{
        accountIndex: number;
        mint: string;
        owner?: string;
        uiTokenAmount: { uiAmountString?: string; decimals: number };
      }>;
      postTokenBalances?: Array<{
        accountIndex: number;
        mint: string;
        owner?: string;
        uiTokenAmount: { uiAmountString?: string; decimals: number };
      }>;
      innerInstructions?: Array<{ instructions: ParsedInstruction[] }>;
    } | null;
  } | null;
};

const DUST_LAMPORTS_THRESHOLD = 100;

export interface AlchemySolProviderOptions {
  apiKey?: string;
  fetcher?: FetchLike;
  metadataService?: SolAssetMetadataService;
  /** Limite de signatures buscadas por chamada (default 25). */
  pageSize?: number;
  filterDust?: boolean;
}

/**
 * Provider SOL via Alchemy RPC. Faz `getSignaturesForAddress` paginado e,
 * para cada sig, `getTransaction` (jsonParsed) que devolve os transfers
 * nativos e SPL via instructions e diff de balances.
 *
 * Mais lento que o Helius enriched (1+N requests por pagina), mas devolve
 * informacao equivalente — usado como fallback quando HELIUS_KEY nao
 * estiver disponivel.
 */
export class AlchemySolProvider implements BlockchainProvider {
  readonly network = 'SOL';
  private readonly metadataService: SolAssetMetadataService;
  private readonly pageSize: number;
  private readonly filterDust: boolean;

  constructor(private readonly options: AlchemySolProviderOptions = {}) {
    const metadataOptions: SolAssetMetadataServiceOptions = {};
    if (options.fetcher !== undefined) metadataOptions.fetcher = options.fetcher;
    this.metadataService =
      options.metadataService ?? new SolAssetMetadataService(metadataOptions);
    this.pageSize = options.pageSize ?? 25;
    this.filterDust = options.filterDust ?? true;
  }

  validateAddress(address: string) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  async fetchTransactions(input: ProviderSyncInput): Promise<ProviderSyncResult> {
    const apiKey = this.options.apiKey ?? process.env.ALCHEMY_SOL_KEY;
    if (!apiKey) {
      throw new Error('Chave ALCHEMY_SOL_KEY nao configurada.');
    }

    const rpcUrl = `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;

    const sigsResponse = await fetchJson<AlchemySolSignaturesResponse>(
      rpcUrl,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            input.address,
            input.cursor
              ? { before: input.cursor, limit: this.pageSize }
              : { limit: this.pageSize },
          ],
        }),
      },
      { fetcher: this.options.fetcher },
    );

    const signatures = sigsResponse.result;
    if (signatures.length === 0) {
      return { transactions: [], nextCursor: null };
    }

    const detailed = await Promise.all(
      signatures.map((sig) => this.fetchTransactionDetail(rpcUrl, sig.signature)),
    );

    // Coleta mints unicos para resolver metadata em uma so passada.
    const mints = new Set<string>();
    for (const detail of detailed) {
      for (const balance of detail?.result?.meta?.preTokenBalances ?? []) {
        if (balance.mint) mints.add(balance.mint);
      }
      for (const balance of detail?.result?.meta?.postTokenBalances ?? []) {
        if (balance.mint) mints.add(balance.mint);
      }
    }
    const metadata = await this.metadataService.resolveBatch([...mints]);

    const transactions: NormalizedTransaction[] = [];
    for (let i = 0; i < signatures.length; i += 1) {
      const sig = signatures[i];
      const detail = detailed[i];
      const normalized = this.normalize(input.address, sig, detail, metadata);
      if (normalized) transactions.push(normalized);
    }

    return {
      transactions,
      nextCursor: signatures.at(-1)?.signature ?? null,
    };
  }

  private async fetchTransactionDetail(
    rpcUrl: string,
    signature: string,
  ): Promise<GetTransactionResponse | null> {
    try {
      return await fetchJson<GetTransactionResponse>(
        rpcUrl,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
          }),
        },
        { fetcher: this.options.fetcher },
      );
    } catch (error) {
      console.warn(
        `[alchemy-sol] falha ao buscar tx ${signature}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private normalize(
    address: string,
    sig: AlchemySolSignature,
    detail: GetTransactionResponse | null,
    metadata: Map<string, SolAssetMetadata>,
  ): NormalizedTransaction | null {
    const transfers: NormalizedTransfer[] = [];
    const meta = detail?.result?.meta;
    const accountKeys = (detail?.result?.transaction?.message?.accountKeys ?? []).map((key) =>
      typeof key === 'string' ? key : key.pubkey,
    );

    // ---- SPL transfers (via diff de pre/postTokenBalances) ----
    if (meta) {
      const splTransfers = computeSplTransfers(address, meta, metadata);
      transfers.push(...splTransfers);
    }

    // ---- Native transfers (via instructions parsed) ----
    const allInstructions: ParsedInstruction[] = [
      ...(detail?.result?.transaction?.message?.instructions ?? []),
      ...(meta?.innerInstructions ?? []).flatMap((g) => g.instructions),
    ];
    for (const ix of allInstructions) {
      if (ix.programId !== '11111111111111111111111111111111') continue;
      if (ix.parsed?.type !== 'transfer' && ix.parsed?.type !== 'transferChecked') continue;
      const lamports = ix.parsed.info?.lamports;
      if (typeof lamports !== 'number' || lamports <= 0) continue;
      if (this.filterDust && lamports <= DUST_LAMPORTS_THRESHOLD) continue;

      const source = ix.parsed.info?.source;
      const destination = ix.parsed.info?.destination;
      const involved = source === address || destination === address;
      if (!involved) continue;

      const direction =
        source === address && destination === address
          ? 'SELF'
          : destination === address
            ? 'IN'
            : 'OUT';

      transfers.push({
        assetSymbol: 'SOL',
        assetAddress: NATIVE_SOL_MINT,
        amount: lamportsToSol(lamports),
        fromAddress: source ?? null,
        toAddress: destination ?? null,
        direction,
        decimals: 9,
      });
    }

    if (transfers.length === 0) {
      return null;
    }

    // ---- Fee (Solana cobra do primeiro signer) ----
    const feePayer = accountKeys[0];
    const fee =
      feePayer === address && meta && meta.fee > 0
        ? { amount: lamportsToSol(meta.fee), assetSymbol: 'SOL' }
        : null;

    const blockTime = sig.blockTime ?? detail?.result?.blockTime ?? 0;

    return {
      network: 'SOL',
      walletAddress: address,
      txHash: sig.signature,
      blockNumber: String(sig.slot),
      timestamp: new Date(blockTime * 1000).toISOString(),
      status: meta?.err ? 'FAILED' : 'CONFIRMED',
      transfers,
      fee,
      cursor: sig.signature,
      rawPayload: JSON.stringify({ sig, detail }),
    };
  }
}

/**
 * Calcula transfers SPL via diff entre pre e postTokenBalances do meta.
 * RPC nativo nao tem `tokenTransfers` enriched — precisamos derivar.
 */
function computeSplTransfers(
  address: string,
  meta: NonNullable<GetTransactionResponse['result']>['meta'],
  metadata: Map<string, SolAssetMetadata>,
): NormalizedTransfer[] {
  if (!meta) return [];

  const transfers: NormalizedTransfer[] = [];
  const pre = meta.preTokenBalances ?? [];
  const post = meta.postTokenBalances ?? [];

  // Indexa por (accountIndex, mint).
  const key = (b: { accountIndex: number; mint: string }) => `${b.accountIndex}:${b.mint}`;
  const preMap = new Map(pre.map((b) => [key(b), b]));
  const postMap = new Map(post.map((b) => [key(b), b]));

  const accountIds = new Set([...preMap.keys(), ...postMap.keys()]);

  for (const id of accountIds) {
    const before = preMap.get(id);
    const after = postMap.get(id);
    const owner = (after ?? before)?.owner;
    if (owner !== address) continue;

    const mint = (after ?? before)!.mint;
    const decimals = (after ?? before)!.uiTokenAmount.decimals;
    const beforeAmt = parseFloat(before?.uiTokenAmount.uiAmountString ?? '0');
    const afterAmt = parseFloat(after?.uiTokenAmount.uiAmountString ?? '0');
    const delta = afterAmt - beforeAmt;
    if (!Number.isFinite(delta) || delta === 0) continue;

    const meta_ = metadata.get(mint);
    if (!meta_) continue;

    const direction = delta > 0 ? 'IN' : 'OUT';
    const absAmount = Math.abs(delta);

    transfers.push({
      assetSymbol: meta_.symbol,
      assetAddress: mint,
      amount: absAmount.toFixed(Math.min(decimals, 18)),
      fromAddress: null,
      toAddress: null,
      direction,
      decimals,
    });
  }

  return transfers;
}

function lamportsToSol(value: number): string {
  return (value / 1_000_000_000).toFixed(9);
}
