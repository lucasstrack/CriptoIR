import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';
import {
  KNOWN_SOL_MINTS,
  fallbackSymbol,
  lookupKnownMint,
  type SolAssetMetadata,
} from './sol-mint-registry';

/**
 * Resposta do endpoint Helius `/v0/token-metadata`. Cada mint pode ter
 * `onChainMetadata` (Metaplex) e/ou `offChainMetadata` (URI/JSON apontado).
 *
 * Estrutura simplificada para o que o servico consome — campos extras
 * existem mas sao ignorados.
 */
type HeliusTokenMetadataItem = {
  account: string; // mint address
  onChainAccountInfo?: {
    accountInfo?: {
      data?: { parsed?: { info?: { decimals?: number } } };
    };
  };
  onChainMetadata?: {
    metadata?: {
      data?: { name?: string; symbol?: string };
    };
  };
  offChainMetadata?: {
    metadata?: { name?: string; symbol?: string };
  };
};

export interface SolAssetMetadataServiceOptions {
  apiKey?: string;
  fetcher?: FetchLike;
  /** Override do endpoint, util em testes. */
  endpoint?: string;
}

const DEFAULT_ENDPOINT = 'https://api.helius.xyz/v0/token-metadata';
/** Helius DAS aceita ate 100 mintAccounts por request. */
const MAX_MINTS_PER_REQUEST = 100;

/**
 * Resolve metadata (`symbol`, `name`, `decimals`) de mints SPL.
 *
 * Estrategia em camadas:
 *   1) Whitelist `KNOWN_SOL_MINTS` — zero rede para tokens populares.
 *   2) Cache em memoria por instancia — evita refetch dentro do mesmo sync.
 *   3) Helius `/v0/token-metadata` em batch (ate ~100 mints por chamada).
 *   4) Fallback `MINT_<short>` com decimals=0 quando metadata nao existe.
 *
 * Falhas de rede degradam para fallback (sem lancar) — o sync nao pode
 * derrubar por causa de metadata indisponivel.
 */
export class SolAssetMetadataService {
  private readonly cache = new Map<string, SolAssetMetadata>();

  constructor(private readonly options: SolAssetMetadataServiceOptions = {}) {
    for (const [mint, meta] of Object.entries(KNOWN_SOL_MINTS)) {
      this.cache.set(mint, meta);
    }
  }

  async resolveBatch(mints: readonly string[]): Promise<Map<string, SolAssetMetadata>> {
    const result = new Map<string, SolAssetMetadata>();
    const missing: string[] = [];

    for (const mint of new Set(mints)) {
      const cached = this.cache.get(mint);
      if (cached) {
        result.set(mint, cached);
      } else {
        missing.push(mint);
      }
    }

    if (missing.length === 0) {
      return result;
    }

    const fetched = await this.fetchFromHelius(missing);
    for (const mint of missing) {
      const meta = fetched.get(mint) ?? this.buildFallback(mint);
      this.cache.set(mint, meta);
      result.set(mint, meta);
    }

    return result;
  }

  /** Resolve metadata de um unico mint (atalho sobre `resolveBatch`). */
  async resolve(mint: string): Promise<SolAssetMetadata> {
    const direct = lookupKnownMint(mint) ?? this.cache.get(mint);
    if (direct) return direct;
    const map = await this.resolveBatch([mint]);
    return map.get(mint) ?? this.buildFallback(mint);
  }

  private buildFallback(mint: string): SolAssetMetadata {
    return {
      symbol: fallbackSymbol(mint),
      name: fallbackSymbol(mint),
      decimals: 0,
      coingeckoId: null,
    };
  }

  private async fetchFromHelius(mints: string[]): Promise<Map<string, SolAssetMetadata>> {
    const apiKey = this.options.apiKey ?? process.env.HELIUS_KEY;
    if (!apiKey) {
      // Sem chave nao tentamos rede — fallbacks serao usados.
      return new Map();
    }

    const endpoint = `${this.options.endpoint ?? DEFAULT_ENDPOINT}?api-key=${apiKey}`;

    // Chunk para nao estourar o limite (~100 mints/req) em wallets ativas.
    const chunks: string[][] = [];
    for (let i = 0; i < mints.length; i += MAX_MINTS_PER_REQUEST) {
      chunks.push(mints.slice(i, i + MAX_MINTS_PER_REQUEST));
    }

    const merged = new Map<string, SolAssetMetadata>();
    for (const chunk of chunks) {
      try {
        const response = await fetchJson<HeliusTokenMetadataItem[]>(
          endpoint,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ mintAccounts: chunk, includeOffChain: true }),
          },
          { fetcher: this.options.fetcher },
        );
        for (const [mint, meta] of parseHeliusMetadata(response)) {
          merged.set(mint, meta);
        }
      } catch (error) {
        console.warn(
          `[sol-asset-metadata] falha ao resolver chunk de ${chunk.length} mint(s) via Helius — fallback. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // Continua com os proximos chunks; mints faltantes caem no fallback.
      }
    }
    return merged;
  }
}

function parseHeliusMetadata(items: HeliusTokenMetadataItem[]): Map<string, SolAssetMetadata> {
  const out = new Map<string, SolAssetMetadata>();
  for (const item of items) {
    if (!item?.account) continue;

    const onChainSymbol = item.onChainMetadata?.metadata?.data?.symbol?.trim();
    const offChainSymbol = item.offChainMetadata?.metadata?.symbol?.trim();
    const symbol = onChainSymbol || offChainSymbol;

    const onChainName = item.onChainMetadata?.metadata?.data?.name?.trim();
    const offChainName = item.offChainMetadata?.metadata?.name?.trim();
    const name = onChainName || offChainName || symbol;

    const decimals = item.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.decimals;

    // Symbol sem decimals confiavel e pior que fallback: o Asset entraria
    // no DB com decimals=0 mas symbol "real", levando holdings a calcular
    // valores incorretos. Sem decimals -> deixa cair no fallback do caller.
    if (!symbol || typeof decimals !== 'number') continue;

    out.set(item.account, {
      symbol,
      name: name ?? symbol,
      decimals,
      coingeckoId: null,
    });
  }
  return out;
}
