import { describe, expect, it } from 'vitest';
import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import { TxClassifier } from '@/core/services/tx-classifier';

const baseTransaction: NormalizedTransaction = {
  network: 'ETH',
  walletAddress: '0xwallet',
  txHash: '0xtx',
  blockNumber: '10',
  timestamp: '2026-04-18T14:32:00.000Z',
  status: 'CONFIRMED',
  transfers: [],
  fee: null,
  cursor: '0x10',
  rawPayload: '{}',
};

describe('TxClassifier', () => {
  it('classifica casos basicos de entrada, saida e internal', () => {
    const classifier = new TxClassifier();

    expect(
      classifier.classify(
        {
          ...baseTransaction,
          transfers: [
            {
              assetSymbol: 'ETH',
              amount: '1',
              fromAddress: '0xother',
              toAddress: '0xwallet',
              direction: 'IN',
            },
          ],
        },
        ['0xwallet'],
      ).type,
    ).toBe('TRANSFER_IN');

    expect(
      classifier.classify(
        {
          ...baseTransaction,
          transfers: [
            {
              assetSymbol: 'ETH',
              amount: '1',
              fromAddress: '0xwallet',
              toAddress: '0xother',
              direction: 'OUT',
            },
          ],
        },
        ['0xwallet'],
      ).type,
    ).toBe('TRANSFER_OUT');

    expect(
      classifier.classify(
        {
          ...baseTransaction,
          transfers: [
            {
              assetSymbol: 'ETH',
              amount: '1',
              fromAddress: '0xwallet',
              toAddress: '0xwallet2',
              direction: 'OUT',
            },
          ],
        },
        ['0xwallet', '0xwallet2'],
      ).type,
    ).toBe('INTERNAL');
  });

  it('detecta UNKNOWN quando nao houver regra suficiente', () => {
    const classifier = new TxClassifier();

    expect(classifier.classify(baseTransaction, ['0xwallet']).type).toBe('UNKNOWN');
  });

  it('classifica swap quando ha entrada e saida com ativos diferentes', () => {
    const classifier = new TxClassifier();

    expect(
      classifier.classify(
        {
          ...baseTransaction,
          transfers: [
            {
              assetSymbol: 'ETH',
              amount: '1',
              fromAddress: '0xwallet',
              toAddress: '0xdex',
              direction: 'OUT',
            },
            {
              assetSymbol: 'USDC',
              amount: '1800',
              fromAddress: '0xdex',
              toAddress: '0xwallet',
              direction: 'IN',
            },
          ],
        },
        ['0xwallet'],
      ).type,
    ).toBe('SWAP');
  });
});
