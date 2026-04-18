import type { BlockchainProvider } from '@/infra/blockchain/provider';
import { AlchemySolProvider } from '@/infra/blockchain/sol/alchemy-sol-provider';
import { HeliusSolProvider } from '@/infra/blockchain/sol/helius-provider';
import type { FetchLike } from '@/infra/http/fetch-json';

export function createSolProvider(options: { fetcher?: FetchLike } = {}): BlockchainProvider {
  if (process.env.HELIUS_KEY) {
    return new HeliusSolProvider({ fetcher: options.fetcher });
  }

  if (process.env.ALCHEMY_SOL_KEY) {
    return new AlchemySolProvider({ fetcher: options.fetcher });
  }

  throw new Error('Nenhum provider SOL configurado. Defina HELIUS_KEY ou ALCHEMY_SOL_KEY.');
}
