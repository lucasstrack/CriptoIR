import type { Network } from '@prisma/client';
import type { BlockchainProvider } from '@/infra/blockchain/provider';
import { MempoolSpaceProvider } from '@/infra/blockchain/btc/mempool-space-provider';
import { AlchemyEvmProvider } from '@/infra/blockchain/evm/alchemy-evm-provider';
import { createSolProvider } from '@/infra/blockchain/sol/provider-factory';
import type { FetchLike } from '@/infra/http/fetch-json';

export type ProviderRegistryOptions = {
  fetcher?: FetchLike;
};

export class ProviderRegistry {
  private readonly overrides = new Map<Network, BlockchainProvider>();

  constructor(private readonly options: ProviderRegistryOptions = {}) {}

  register(network: Network, provider: BlockchainProvider) {
    this.overrides.set(network, provider);
  }

  resolve(network: Network): BlockchainProvider {
    const override = this.overrides.get(network);
    if (override) {
      return override;
    }

    const { fetcher } = this.options;
    switch (network) {
      case 'BTC':
        return new MempoolSpaceProvider({ fetcher });
      case 'ETH':
        return new AlchemyEvmProvider('ETH', { fetcher });
      case 'BASE':
        return new AlchemyEvmProvider('BASE', { fetcher });
      case 'ARB':
        return new AlchemyEvmProvider('ARB', { fetcher });
      case 'SOL':
        return createSolProvider({ fetcher });
      default: {
        const exhaustive: never = network;
        throw new Error(`Network nao suportada: ${String(exhaustive)}`);
      }
    }
  }
}
