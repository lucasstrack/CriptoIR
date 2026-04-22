import type { ErrorCode } from '@/lib/errors';

/**
 * Envelope padrão retornado pelas rotas `/api/*` (ver `src/lib/api-response.ts`).
 *
 * Tanto sucesso quanto erro chegam no mesmo shape, diferenciados por
 * `error === null`. O client abre o envelope e converte erros em
 * `ApiClientError` para que os hooks possam ramificar pelo `code`.
 */
export type ApiEnvelope<T> = {
  data: T | null;
  error: { code: ErrorCode; message: string } | null;
  meta?: Record<string, unknown> | null;
};

export type ApiMeta = Record<string, unknown> | null | undefined;

export type ApiResult<T> = {
  data: T;
  meta: ApiMeta;
};

export class ApiClientError extends Error {
  readonly code: ErrorCode | 'NETWORK_ERROR' | 'INVALID_ENVELOPE';
  readonly status: number;

  constructor(
    message: string,
    code: ErrorCode | 'NETWORK_ERROR' | 'INVALID_ENVELOPE',
    status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  /** Corpo serializado como JSON automaticamente. */
  json?: unknown;
}

function isEnvelope(payload: unknown): payload is ApiEnvelope<unknown> {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }
  return 'data' in payload && 'error' in payload;
}

/**
 * Wrapper tipado em torno de `fetch` — é o **único** ponto de `fetch`
 * da UI. Hooks de features consomem essa função e nunca fazem `fetch`
 * diretamente.
 *
 * Comportamento:
 * - Se `options.json` for fornecido, serializa como JSON e define o header.
 * - Espera envelope `{ data, error, meta }` na resposta.
 * - Envelope malformado ⇒ `ApiClientError('INVALID_ENVELOPE')`.
 * - `error` presente ⇒ `ApiClientError(error.message, error.code)`.
 * - Falha de rede / parse ⇒ `ApiClientError('NETWORK_ERROR')`.
 */
export async function apiClient<T>(
  input: string,
  options: ApiClientOptions = {},
): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = options;

  const init: RequestInit = { ...rest };
  const finalHeaders = new Headers(headers);

  if (json !== undefined) {
    init.body = JSON.stringify(json);
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json');
    }
  }

  init.headers = finalHeaders;

  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha de rede.';
    throw new ApiClientError(message, 'NETWORK_ERROR', 0);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      'Resposta do servidor nao e JSON valido.',
      'INVALID_ENVELOPE',
      response.status,
    );
  }

  if (!isEnvelope(payload)) {
    throw new ApiClientError(
      'Envelope de resposta invalido.',
      'INVALID_ENVELOPE',
      response.status,
    );
  }

  if (payload.error) {
    throw new ApiClientError(payload.error.message, payload.error.code, response.status);
  }

  if (!response.ok) {
    throw new ApiClientError(
      `Requisicao falhou com status ${response.status}.`,
      'INVALID_ENVELOPE',
      response.status,
    );
  }

  return {
    data: payload.data as T,
    meta: (payload.meta ?? null) as ApiMeta,
  };
}
