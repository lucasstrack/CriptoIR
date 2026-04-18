import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlchemySolProvider } from '@/infra/blockchain/sol/alchemy-sol-provider';
import { createSolProvider } from '@/infra/blockchain/sol/provider-factory';
import { HeliusSolProvider } from '@/infra/blockchain/sol/helius-provider';

describe('SOL providers', () => {
  afterEach(() => {
    delete process.env.HELIUS_KEY;
    delete process.env.ALCHEMY_SOL_KEY;
  });

  it('provider SOL suporta consulta via Helius', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            signature: 'helius-signature',
            slot: 321,
            timestamp: 1713440000,
            nativeTransfers: [
              {
                fromUserAccount: 'sender',
                toUserAccount: 'wallet-sol',
                amount: 2500000000,
              },
            ],
          },
        ]),
      ),
    );
    const provider = new HeliusSolProvider({ apiKey: 'helius-key', fetcher });

    const result = await provider.fetchTransactions({ address: 'wallet-sol' });

    expect(result.transactions[0]).toMatchObject({
      network: 'SOL',
      txHash: 'helius-signature',
      transfers: [{ amount: '2.500000000', direction: 'IN' }],
    });
  });

  it('provider SOL suporta consulta via Alchemy quando ALCHEMY_SOL_KEY estiver configurada', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: [{ signature: 'alchemy-signature', slot: 999, blockTime: 1713440000 }],
        }),
      ),
    );
    const provider = new AlchemySolProvider({ apiKey: 'alchemy-sol', fetcher });

    const result = await provider.fetchTransactions({ address: 'wallet-sol' });

    expect(result.transactions[0]).toMatchObject({
      network: 'SOL',
      txHash: 'alchemy-signature',
      blockNumber: '999',
    });
  });

  it('factory escolhe Helius primeiro e cai para Alchemy quando necessario', () => {
    process.env.HELIUS_KEY = 'helius-key';
    expect(createSolProvider()).toBeInstanceOf(HeliusSolProvider);

    delete process.env.HELIUS_KEY;
    process.env.ALCHEMY_SOL_KEY = 'alchemy-key';
    expect(createSolProvider()).toBeInstanceOf(AlchemySolProvider);
  });
});
