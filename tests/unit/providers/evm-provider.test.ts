import { describe, expect, it, vi } from 'vitest';
import { AlchemyEvmProvider } from '@/infra/blockchain/evm/alchemy-evm-provider';

describe('AlchemyEvmProvider', () => {
  it('suporta ETH, BASE e ARB com configuracao por rede', () => {
    expect(new AlchemyEvmProvider('ETH', { apiKey: 'eth-key' }).network).toBe('ETH');
    expect(new AlchemyEvmProvider('BASE', { apiKey: 'base-key' }).network).toBe('BASE');
    expect(new AlchemyEvmProvider('ARB', { apiKey: 'arb-key' }).network).toBe('ARB');
  });

  it('normaliza transfers do contrato comum', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            transfers: [
              {
                hash: '0xtx',
                blockNum: '0x10',
                from: '0xfrom000000000000000000000000000000000000',
                to: '0xabcdefabcdefabcdefabcdefabcdefabcdef1234',
                value: 1.5,
                asset: 'ETH',
                rawContract: { address: null },
                metadata: { blockTimestamp: '2026-04-18T14:32:00.000Z' },
              },
            ],
            pageKey: 'next-page',
          },
        }),
      ),
    );

    const provider = new AlchemyEvmProvider('ETH', { apiKey: 'key', fetcher });
    const result = await provider.fetchTransactions({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdef1234',
      cursor: '0x0',
    });

    expect(result.nextCursor).toBe('next-page');
    expect(result.transactions[0]).toMatchObject({
      network: 'ETH',
      blockNumber: '16',
      transfers: [{ direction: 'IN', amount: '1.5', assetSymbol: 'ETH' }],
    });
  });
});
