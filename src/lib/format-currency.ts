export type CurrencyCode = 'USD' | 'BRL';

export interface FormatCurrencyOptions {
  /** Número máximo de casas decimais exibidas. Default: 2. */
  maximumFractionDigits?: number;
  /** Número mínimo de casas decimais exibidas. Default: 2. */
  minimumFractionDigits?: number;
}

/**
 * Formata um valor monetário no locale pt-BR, em USD ou BRL.
 *
 * Aceita `number`, `bigint` ou string decimal (ex.: `"123.45"`). BigInts e
 * strings com precisão arbitrária entram direto no Intl.NumberFormat para
 * evitar perda de precisão ao converter para number; se a string não for
 * parseável, retorna `'-'` em vez de lançar.
 */
export function formatCurrency(
  value: number | bigint | string,
  currency: CurrencyCode,
  options: FormatCurrencyOptions = {},
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits,
    maximumFractionDigits,
  });

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '-';
    }
    return formatter.format(value);
  }

  if (typeof value === 'bigint') {
    return formatter.format(value);
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return '-';
  }

  // Intl.NumberFormat aceita string decimal diretamente (preserva precisão
  // além do double), mas aceita também strings inválidas devolvendo "NaN".
  // Validamos formato antes para poder retornar '-' em entrada lixo.
  const DECIMAL_STRING = /^-?\d+(?:\.\d+)?$/;
  if (!DECIMAL_STRING.test(trimmed)) {
    return '-';
  }

  try {
    return formatter.format(trimmed as unknown as number);
  } catch {
    const asNumber = Number(trimmed);
    if (!Number.isFinite(asNumber)) {
      return '-';
    }
    return formatter.format(asNumber);
  }
}
