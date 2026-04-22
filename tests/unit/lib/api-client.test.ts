import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, apiClient } from '@/lib/api-client';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('abre envelope de sucesso e retorna data/meta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { ok: true }, error: null, meta: { total: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient<{ ok: boolean }>('/api/thing');

    expect(result.data).toEqual({ ok: true });
    expect(result.meta).toEqual({ total: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/thing', expect.any(Object));
  });

  it('serializa body json e adiciona Content-Type quando `json` e fornecido', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { id: 'abc' }, error: null, meta: null }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient('/api/wallets', { method: 'POST', json: { label: 'hi' } });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ label: 'hi' }));
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('lanca ApiClientError com o code do envelope quando a API retorna erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: null,
            error: { code: 'WALLET_ALREADY_EXISTS', message: 'duplicada' },
            meta: null,
          },
          { status: 409 },
        ),
      ),
    );

    await expect(apiClient('/api/wallets', { method: 'POST', json: {} })).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'WALLET_ALREADY_EXISTS',
      status: 409,
      message: 'duplicada',
    });
  });

  it('lanca NETWORK_ERROR quando fetch rejeita', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(apiClient('/api/things')).rejects.toBeInstanceOf(ApiClientError);
    await expect(apiClient('/api/things')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('lanca INVALID_ENVELOPE quando a resposta nao segue o shape esperado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })),
    );

    await expect(apiClient('/api/things')).rejects.toMatchObject({ code: 'INVALID_ENVELOPE' });
  });

  it('lanca INVALID_ENVELOPE quando o body nao e JSON valido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not json', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    await expect(apiClient('/api/things')).rejects.toMatchObject({ code: 'INVALID_ENVELOPE' });
  });
});
