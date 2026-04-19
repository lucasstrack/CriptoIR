export const SCALE = 18;
const ZERO = BigInt(0);
const TEN = BigInt(10);
export const SCALE_FACTOR = TEN ** BigInt(SCALE);

export type AcquisitionEntry = {
  amount: string;
  priceUsd: string | null;
  priceBrl: string | null;
};

export type AverageCostResult = {
  averagePriceUsd: string | null;
  averagePriceBrl: string | null;
  totalAcquiredAmount: string;
};

/**
 * Calcula o preco medio contabil ponderado pela quantidade de aquisicao.
 *
 * - Considera somente entradas (TRANSFER_IN e lado IN de SWAP). O chamador filtra,
 *   este servico apenas consome as acquisitions.
 * - Se uma entrada tem price null, ela ainda soma no total adquirido mas nao entra
 *   no numerador/denominador do preco medio (best-effort, evita 500 quando faltam
 *   PriceSnapshots historicos).
 * - Se todas as entradas tem price null, retorna averagePrice* = null.
 * - O preco medio e "contabil": nao reseta apos venda total. O chamador nao deve
 *   filtrar por quantidade atual; sempre passa a historia completa de aquisicoes.
 */
export class AverageCostService {
  compute(entries: AcquisitionEntry[]): AverageCostResult {
    let totalAmount = ZERO;
    let totalAmountWithPrice = ZERO;
    let totalValueUsd = ZERO;
    let totalValueBrl = ZERO;
    let hasUsd = false;
    let hasBrl = false;

    for (const entry of entries) {
      const amount = parseDecimal(entry.amount);
      if (amount <= ZERO) {
        continue;
      }
      totalAmount += amount;

      if (entry.priceUsd !== null && entry.priceBrl !== null) {
        const priceUsd = parseDecimal(entry.priceUsd);
        const priceBrl = parseDecimal(entry.priceBrl);
        totalAmountWithPrice += amount;
        totalValueUsd += (amount * priceUsd) / SCALE_FACTOR;
        totalValueBrl += (amount * priceBrl) / SCALE_FACTOR;
        hasUsd = true;
        hasBrl = true;
      }
    }

    const averagePriceUsd =
      hasUsd && totalAmountWithPrice > ZERO
        ? divideScaled(totalValueUsd, totalAmountWithPrice)
        : null;
    const averagePriceBrl =
      hasBrl && totalAmountWithPrice > ZERO
        ? divideScaled(totalValueBrl, totalAmountWithPrice)
        : null;

    return {
      averagePriceUsd,
      averagePriceBrl,
      totalAcquiredAmount: formatDecimal(totalAmount),
    };
  }
}

export function parseDecimal(value: string): bigint {
  const trimmed = value.trim();
  if (trimmed === '') {
    return ZERO;
  }
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [intPart = '0', fracPartRaw = ''] = unsigned.split('.');
  const fracPart = (fracPartRaw + '0'.repeat(SCALE)).slice(0, SCALE);
  const combined = `${intPart}${fracPart}`.replace(/^0+/, '') || '0';
  const result = BigInt(combined);
  return negative ? -result : result;
}

function divideScaled(numerator: bigint, denominator: bigint): string {
  if (denominator === ZERO) {
    return formatDecimal(ZERO);
  }
  const scaled = (numerator * SCALE_FACTOR) / denominator;
  return formatDecimal(scaled);
}

export function formatDecimal(value: bigint): string {
  const negative = value < ZERO;
  const abs = negative ? -value : value;
  const str = abs.toString().padStart(SCALE + 1, '0');
  const intPart = str.slice(0, str.length - SCALE);
  const fracPart = str.slice(str.length - SCALE);
  const formatted = `${intPart}.${fracPart}`;
  return negative ? `-${formatted}` : formatted;
}

export const __internal = { parseDecimal, divideScaled, formatDecimal };
