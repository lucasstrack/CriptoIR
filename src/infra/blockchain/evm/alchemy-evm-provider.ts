import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import type {
  BlockchainProvider,
  ProviderSyncInput,
  ProviderSyncResult,
} from '@/infra/blockchain/provider';
import { fetchJson, type FetchLike } from '@/infra/http/fetch-json';
import { EVM_NETWORKS, type EvmNetwork } from '@/infra/blockchain/evm/networks';

type AlchemyTransfer = {
  hash: string;
  blockNum: string;
  from: string | null;
  to: string | null;
  // Alchemy devolve null em tokens ERC-20 spam/honeypot com metadata quebrada
  // (decimal null, value fora do MAX_SAFE_INTEGER, etc.). Sem amount confiavel,
  // o transfer e descartado em `normalizeTransfer`.
  value: number | null;
  asset: string | null;
  rawContract?: { address?: string | null };
  metadata?: { blockTimestamp?: string };
};

type AlchemyAssetTransfersResponse = {
  result: {
    transfers: AlchemyTransfer[];
    pageKey?: string;
  };
};

export class AlchemyEvmProvider implements BlockchainProvider {
  readonly network: EvmNetwork;

  constructor(
    network: EvmNetwork,
    private readonly options: {
      apiKey?: string;
      fetcher?: FetchLike;
    } = {},
  ) {
    this.network = network;
  }

  validateAddress(address: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async fetchTransactions(input: ProviderSyncInput): Promise<ProviderSyncResult> {
    const config = EVM_NETWORKS[this.network];
    const apiKey = this.options.apiKey ?? process.env[config.envKey];

    if (!apiKey) {
      throw new Error(`Chave ${config.envKey} nao configurada.`);
    }

    const response = await fetchJson<AlchemyAssetTransfersResponse>(
      `${config.rpcUrl}${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [
            {
              fromBlock: input.cursor ?? '0x0',
              toAddress: input.address.toLowerCase(),
              category: ['external', 'erc20', 'erc721', 'specialnft', 'internal'],
              withMetadata: true,
              maxCount: '0x32',
            },
          ],
        }),
      },
      { fetcher: this.options.fetcher },
    );

    const transactions = response.result.transfers
      .map((transfer) => this.normalizeTransfer(input.address.toLowerCase(), transfer))
      .filter((tx): tx is NormalizedTransaction => tx !== null);

    return {
      transactions,
      nextCursor: response.result.pageKey ?? null,
    };
  }

  private normalizeTransfer(
    address: string,
    transfer: AlchemyTransfer,
  ): NormalizedTransaction | null {
    // Descarta transfers sem amount confiavel (ERC-20 spam: decimal null ou
    // value fora do MAX_SAFE_INTEGER). Persistir `String(null) === "null"`
    // quebra o calculo de holdings downstream.
    if (transfer.value === null || !Number.isFinite(transfer.value)) {
      console.warn(
        `[alchemy-evm:${this.network}] descartando transfer com value=${transfer.value} (hash=${transfer.hash}, asset=${transfer.asset ?? 'null'})`,
      );
      return null;
    }
    const toAddress = transfer.to?.toLowerCase() ?? null;
    const fromAddress = transfer.from?.toLowerCase() ?? null;
    const direction =
      toAddress === address && fromAddress === address
        ? 'SELF'
        : toAddress === address
          ? 'IN'
          : fromAddress === address
            ? 'OUT'
            : 'UNKNOWN';

    return {
      network: this.network,
      walletAddress: address,
      txHash: transfer.hash,
      blockNumber: String(parseInt(transfer.blockNum, 16)),
      timestamp: transfer.metadata?.blockTimestamp ?? new Date(0).toISOString(),
      status: 'CONFIRMED',
      transfers: [
        {
          assetSymbol: transfer.asset ?? EVM_NETWORKS[this.network].nativeAsset,
          assetAddress: transfer.rawContract?.address ?? null,
          amount: String(transfer.value),
          fromAddress,
          toAddress,
          direction,
        },
      ],
      fee: null,
      cursor: transfer.blockNum,
      rawPayload: JSON.stringify(transfer),
    };
  }
}
