import { afterEach, describe, expect, it, vi } from 'vitest';
import { SolAssetMetadataService } from '@/infra/blockchain/sol/sol-asset-metadata-service';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const UNKNOWN = 'JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD';
const ANOTHER = '7GxATsNMnaC88vdwd2t3mwrFuQwwGvmYPrUQ4D6FotXk';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('SolAssetMetadataService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mints conhecidos sao resolvidos sem chamar Helius', async () => {
    const fetcher = vi.fn();
    const service = new SolAssetMetadataService({ apiKey: 'k', fetcher });

    const result = await service.resolveBatch([USDC]);

    expect(result.get(USDC)).toMatchObject({ symbol: 'USDC', decimals: 6 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('busca mints desconhecidos via Helius e cacheia para chamadas seguintes', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          account: UNKNOWN,
          onChainAccountInfo: { accountInfo: { data: { parsed: { info: { decimals: 9 } } } } },
          onChainMetadata: { metadata: { data: { name: 'Jup Token', symbol: 'JUPT' } } },
        },
      ]),
    );
    const service = new SolAssetMetadataService({ apiKey: 'k', fetcher });

    // 1ª chamada: bate em rede.
    const first = await service.resolveBatch([UNKNOWN]);
    expect(first.get(UNKNOWN)).toMatchObject({ symbol: 'JUPT', decimals: 9 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 2ª chamada: vem do cache.
    const second = await service.resolveBatch([UNKNOWN]);
    expect(second.get(UNKNOWN)).toMatchObject({ symbol: 'JUPT', decimals: 9 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('mistura conhecidos e desconhecidos; chamada Helius pede so os faltantes', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          account: UNKNOWN,
          onChainAccountInfo: { accountInfo: { data: { parsed: { info: { decimals: 9 } } } } },
          onChainMetadata: { metadata: { data: { name: 'Jup', symbol: 'JUPT' } } },
        },
      ]),
    );
    const service = new SolAssetMetadataService({ apiKey: 'k', fetcher });

    const result = await service.resolveBatch([USDC, UNKNOWN]);

    expect(result.get(USDC)?.symbol).toBe('USDC');
    expect(result.get(UNKNOWN)?.symbol).toBe('JUPT');

    // Body enviado nao deve incluir USDC (ja conhecido).
    const [, init] = fetcher.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.mintAccounts).toEqual([UNKNOWN]);
  });

  it('falha de rede degrada para fallback MINT_<short> sem lancar', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = new SolAssetMetadataService({ apiKey: 'k', fetcher });

    const result = await service.resolveBatch([UNKNOWN]);

    expect(result.get(UNKNOWN)).toMatchObject({
      symbol: 'MINT_JUPRJZ',
      decimals: 0,
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('falha ao resolver'));
  });

  it('mints faltando metadata no payload Helius caem para fallback', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        // Vem so um dos dois pedidos; outro deve cair pro fallback.
        {
          account: UNKNOWN,
          onChainAccountInfo: { accountInfo: { data: { parsed: { info: { decimals: 9 } } } } },
          onChainMetadata: { metadata: { data: { name: 'X', symbol: 'XXX' } } },
        },
      ]),
    );
    const service = new SolAssetMetadataService({ apiKey: 'k', fetcher });

    const result = await service.resolveBatch([UNKNOWN, ANOTHER]);

    expect(result.get(UNKNOWN)?.symbol).toBe('XXX');
    expect(result.get(ANOTHER)?.symbol).toBe('MINT_7GXATS');
    expect(result.get(ANOTHER)?.decimals).toBe(0);
  });

  it('sem HELIUS_KEY disponivel, nao tenta rede e usa fallback', async () => {
    const previousKey = process.env.HELIUS_KEY;
    delete process.env.HELIUS_KEY;
    const fetcher = vi.fn();
    const service = new SolAssetMetadataService({ fetcher }); // apiKey omitido

    const result = await service.resolveBatch([UNKNOWN]);

    expect(result.get(UNKNOWN)?.symbol).toBe('MINT_JUPRJZ');
    expect(fetcher).not.toHaveBeenCalled();
    if (previousKey !== undefined) process.env.HELIUS_KEY = previousKey;
  });

  it('resolve(mint) atalho: conhecido nao bate cache da Helius', async () => {
    const fetcher = vi.fn();
    const service = new SolAssetMetadataService({ apiKey: 'k', fetcher });

    const meta = await service.resolve(USDC);
    expect(meta.symbol).toBe('USDC');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
