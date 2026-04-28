import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlchemySolProvider } from '@/infra/blockchain/sol/alchemy-sol-provider';
import { createSolProvider } from '@/infra/blockchain/sol/provider-factory';
import { HeliusSolProvider } from '@/infra/blockchain/sol/helius-provider';
import { SolAssetMetadataService } from '@/infra/blockchain/sol/sol-asset-metadata-service';

const WALLET = 'B6whaXWiZaB2QzFLj3Xj2ob2sfiFUqfjq2kKRsW1NyGT';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HeliusSolProvider', () => {
  afterEach(() => {
    delete process.env.HELIUS_KEY;
    delete process.env.ALCHEMY_SOL_KEY;
    vi.restoreAllMocks();
  });

  it('normaliza transferencia nativa simples (1 transfer SOL)', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          signature: 'sig-native',
          slot: 321,
          timestamp: 1713440000,
          type: 'TRANSFER',
          fee: 5000,
          feePayer: 'sender',
          nativeTransfers: [
            { fromUserAccount: 'sender', toUserAccount: WALLET, amount: 2_500_000_000 },
          ],
        },
      ]),
    );
    const provider = new HeliusSolProvider({ apiKey: 'k', fetcher });

    const result = await provider.fetchTransactions({ address: WALLET });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      network: 'SOL',
      txHash: 'sig-native',
      transfers: [
        {
          assetSymbol: 'SOL',
          assetAddress: 'So11111111111111111111111111111111111111112',
          amount: '2.500000000',
          direction: 'IN',
          decimals: 9,
        },
      ],
      fee: null, // feePayer != WALLET
    });
  });

  it('SWAP via Jupiter: itera tokenTransfers e popula symbol/decimals via metadata', async () => {
    // Fixture real abreviada de B6wha... (USDC OUT, JuprjznT IN)
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          signature: 'swap-sig',
          slot: 412297926,
          timestamp: 1775827716,
          type: 'SWAP',
          source: 'JUPITER',
          fee: 7879,
          feePayer: WALLET,
          nativeTransfers: [
            { fromUserAccount: WALLET, toUserAccount: 'rent-recipient', amount: 2039280 },
          ],
          tokenTransfers: [
            {
              fromTokenAccount: 'fromTA',
              toTokenAccount: 'toTA',
              fromUserAccount: WALLET,
              toUserAccount: 'amm-pool',
              tokenAmount: 183.0463,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              tokenStandard: 'Fungible',
            },
            {
              fromTokenAccount: 'fromTA2',
              toTokenAccount: 'toTA2',
              fromUserAccount: 'amm-pool',
              toUserAccount: WALLET,
              tokenAmount: 183.080829,
              mint: 'JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD',
              tokenStandard: 'Fungible',
            },
          ],
        },
      ]),
    );

    // Metadata service stub: USDC conhecido, JuprjznT desconhecido (fallback).
    const metadataService = new SolAssetMetadataService({
      apiKey: 'k',
      // Sem chamada real porque so passa mints conhecidos + fallback.
      fetcher: vi.fn().mockResolvedValue(jsonResponse([])),
    });

    const provider = new HeliusSolProvider({ apiKey: 'k', fetcher, metadataService });

    const result = await provider.fetchTransactions({ address: WALLET });

    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];
    expect(tx.transfers).toHaveLength(3); // 2 SPL + 1 native (rent)

    const usdcOut = tx.transfers.find((t) => t.assetSymbol === 'USDC');
    expect(usdcOut).toMatchObject({ direction: 'OUT', amount: '183.046300', decimals: 6 });

    const unknownIn = tx.transfers.find((t) => t.assetAddress?.startsWith('Juprjzn'));
    expect(unknownIn?.assetSymbol).toBe('MINT_JUPRJZ');
    expect(unknownIn?.direction).toBe('IN');

    const nativeOut = tx.transfers.find((t) => t.assetSymbol === 'SOL');
    expect(nativeOut?.direction).toBe('OUT');

    expect(tx.fee).toEqual({ assetSymbol: 'SOL', amount: '0.000007879' });
  });

  it('descarta dust attack (amount=1 lamport)', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          signature: 'dust-sig',
          slot: 1,
          timestamp: 1713440000,
          type: 'TRANSFER',
          fee: 5000,
          feePayer: 'attacker',
          nativeTransfers: [
            { fromUserAccount: 'attacker', toUserAccount: WALLET, amount: 1 },
          ],
        },
      ]),
    );
    const provider = new HeliusSolProvider({ apiKey: 'k', fetcher });

    const result = await provider.fetchTransactions({ address: WALLET });

    // Sem transfers relevantes (dust filtrado) -> tx descartada.
    expect(result.transactions).toHaveLength(0);
  });

  it('descarta tx sem nenhum transfer envolvendo a wallet', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          signature: 'irrelevant',
          slot: 1,
          timestamp: 1713440000,
          type: 'TRANSFER',
          fee: 5000,
          feePayer: 'someone',
          nativeTransfers: [
            { fromUserAccount: 'A', toUserAccount: 'B', amount: 100_000_000 },
          ],
        },
      ]),
    );
    const provider = new HeliusSolProvider({ apiKey: 'k', fetcher });

    const result = await provider.fetchTransactions({ address: WALLET });
    expect(result.transactions).toHaveLength(0);
  });

  it('registra fee SOL quando feePayer == address', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          signature: 'fee-sig',
          slot: 1,
          timestamp: 1713440000,
          type: 'TRANSFER',
          fee: 105000,
          feePayer: WALLET,
          nativeTransfers: [
            { fromUserAccount: WALLET, toUserAccount: 'dest', amount: 50_000_000 },
          ],
        },
      ]),
    );
    const provider = new HeliusSolProvider({ apiKey: 'k', fetcher });

    const result = await provider.fetchTransactions({ address: WALLET });
    expect(result.transactions[0].fee).toEqual({
      assetSymbol: 'SOL',
      amount: '0.000105000',
    });
  });
});

describe('AlchemySolProvider', () => {
  afterEach(() => {
    delete process.env.HELIUS_KEY;
    delete process.env.ALCHEMY_SOL_KEY;
  });

  it('faz getSignaturesForAddress + getTransaction; deriva SPL via diff de balances', async () => {
    const sigsResponse = jsonResponse({
      result: [{ signature: 'tx-sig', slot: 999, blockTime: 1713440000 }],
    });
    const txDetailResponse = jsonResponse({
      result: {
        blockTime: 1713440000,
        slot: 999,
        transaction: {
          signatures: ['tx-sig'],
          message: {
            accountKeys: [WALLET, 'fee-recipient'],
            instructions: [
              {
                programId: '11111111111111111111111111111111',
                parsed: {
                  type: 'transfer',
                  info: { source: WALLET, destination: 'dest', lamports: 500_000_000 },
                },
              },
            ],
          },
        },
        meta: {
          err: null,
          fee: 5000,
          preTokenBalances: [
            {
              accountIndex: 1,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: WALLET,
              uiTokenAmount: { uiAmountString: '100', decimals: 6 },
            },
          ],
          postTokenBalances: [
            {
              accountIndex: 1,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: WALLET,
              uiTokenAmount: { uiAmountString: '95.5', decimals: 6 },
            },
          ],
        },
      },
    });

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(sigsResponse)
      .mockResolvedValueOnce(txDetailResponse);

    const provider = new AlchemySolProvider({ apiKey: 'k', fetcher });
    const result = await provider.fetchTransactions({ address: WALLET });

    expect(result.transactions).toHaveLength(1);
    const tx = result.transactions[0];

    const usdcDelta = tx.transfers.find((t) => t.assetSymbol === 'USDC');
    expect(usdcDelta).toMatchObject({ direction: 'OUT', amount: '4.500000', decimals: 6 });

    const nativeOut = tx.transfers.find((t) => t.assetSymbol === 'SOL');
    expect(nativeOut).toMatchObject({ direction: 'OUT', amount: '0.500000000' });

    expect(tx.fee).toEqual({ assetSymbol: 'SOL', amount: '0.000005000' });
  });

  it('lista vazia quando getSignaturesForAddress retorna nada', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ result: [] }));
    const provider = new AlchemySolProvider({ apiKey: 'k', fetcher });
    const result = await provider.fetchTransactions({ address: WALLET });
    expect(result.transactions).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});

describe('createSolProvider (factory)', () => {
  afterEach(() => {
    delete process.env.HELIUS_KEY;
    delete process.env.ALCHEMY_SOL_KEY;
  });

  it('escolhe Helius primeiro e cai para Alchemy quando necessario', () => {
    process.env.HELIUS_KEY = 'helius-key';
    expect(createSolProvider()).toBeInstanceOf(HeliusSolProvider);

    delete process.env.HELIUS_KEY;
    process.env.ALCHEMY_SOL_KEY = 'alchemy-key';
    expect(createSolProvider()).toBeInstanceOf(AlchemySolProvider);
  });
});
