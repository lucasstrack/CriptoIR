import { describe, expect, it } from 'vitest';
import {
  KNOWN_SOL_MINTS,
  NATIVE_SOL_MINT,
  fallbackSymbol,
  lookupKnownMint,
} from '@/infra/blockchain/sol/sol-mint-registry';

describe('sol-mint-registry', () => {
  it('NATIVE_SOL_MINT corresponde ao programa SPL token wrapper canonico', () => {
    expect(NATIVE_SOL_MINT).toBe('So11111111111111111111111111111111111111112');
    expect(KNOWN_SOL_MINTS[NATIVE_SOL_MINT]).toMatchObject({
      symbol: 'SOL',
      decimals: 9,
      coingeckoId: 'solana',
    });
  });

  it('reconhece USDC com decimals=6', () => {
    const meta = lookupKnownMint('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(meta).toMatchObject({ symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' });
  });

  it('reconhece USDT com decimals=6', () => {
    const meta = lookupKnownMint('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
    expect(meta).toMatchObject({ symbol: 'USDT', decimals: 6 });
  });

  it('retorna null para mint desconhecido', () => {
    expect(lookupKnownMint('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBeNull();
  });

  it('fallbackSymbol gera identificador previsivel a partir dos 6 primeiros chars', () => {
    expect(fallbackSymbol('JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD')).toBe('MINT_JUPRJZ');
    expect(fallbackSymbol('7GxATsNMnaC88vdwd2t3mwrFuQwwGvmYPrUQ4D6FotXk')).toBe('MINT_7GXATS');
  });

  it('todos os mints conhecidos tem decimals em [0, 18]', () => {
    for (const [mint, meta] of Object.entries(KNOWN_SOL_MINTS)) {
      expect(meta.decimals).toBeGreaterThanOrEqual(0);
      expect(meta.decimals).toBeLessThanOrEqual(18);
      expect(meta.symbol).toBeTruthy();
      expect(mint).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    }
  });
});
