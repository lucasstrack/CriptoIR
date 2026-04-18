import { describe, expect, it, vi } from 'vitest';
import { MempoolSpaceProvider } from '@/infra/blockchain/btc/mempool-space-provider';

describe('MempoolSpaceProvider', () => {
  it('valida enderecos BTC', () => {
    const provider = new MempoolSpaceProvider();

    expect(provider.validateAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080')).toBe(true);
    expect(provider.validateAddress('invalido')).toBe(false);
  });

  it('normaliza transacoes da mempool.space', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            txid: 'btc-tx-1',
            fee: 1200,
            status: { confirmed: true, block_height: 900001, block_time: 1713440000 },
            vin: [{ prevout: { scriptpubkey_address: 'bc1sender', value: 250000000 } }],
            vout: [{ scriptpubkey_address: 'bc1wallet', value: 125000000 }],
          },
        ]),
      ),
    );
    const provider = new MempoolSpaceProvider({ fetcher });

    const result = await provider.fetchTransactions({
      address: 'bc1wallet',
    });

    expect(result.nextCursor).toBe('btc-tx-1');
    expect(result.transactions[0]).toMatchObject({
      network: 'BTC',
      txHash: 'btc-tx-1',
      blockNumber: '900001',
      transfers: [{ amount: '1.25000000', direction: 'IN' }],
      fee: { amount: '0.00001200', assetSymbol: 'BTC' },
    });
  });
});
