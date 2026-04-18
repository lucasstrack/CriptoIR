export type FetchLike = typeof fetch;

export async function fetchJson<T>(
  input: string,
  init: RequestInit = {},
  options: {
    fetcher?: FetchLike;
    retries?: number;
    retryDelayMs?: number;
  } = {},
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 150;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const response = await fetcher(input, init);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao consultar ${input}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha ao consultar JSON');
}
