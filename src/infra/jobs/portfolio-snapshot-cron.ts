import cron, { type ScheduledTask } from 'node-cron';
import { RecordPortfolioSnapshotUseCase } from '@/core/use-cases/record-portfolio-snapshot';

export const DEFAULT_SNAPSHOT_CRON_EXPR = '0 0 * * 0';

export type SnapshotCronLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export const defaultSnapshotLogger: SnapshotCronLogger = {
  info: (message, meta) => console.log(`[portfolio-snapshot-cron] ${message}`, meta ?? ''),
  warn: (message, meta) => console.warn(`[portfolio-snapshot-cron] ${message}`, meta ?? ''),
  error: (message, meta) => console.error(`[portfolio-snapshot-cron] ${message}`, meta ?? ''),
};

export type SnapshotCronTickDependencies = {
  recordSnapshot: Pick<RecordPortfolioSnapshotUseCase, 'execute'>;
  now?: () => Date;
  logger?: SnapshotCronLogger;
};

export type SnapshotCronTickResult = {
  status: 'ok' | 'error';
  weekStart: string | null;
  totalUsd: string | null;
  totalBrl: string | null;
  breakdownSize: number | null;
  error: string | null;
};

/**
 * Executa uma passagem do cron: chama o use-case com a data atual. O cron
 * padrao dispara domingo 00:00 UTC, entao useHistoricalPrice=false grava o
 * "snapshot de agora" — consistente com o endpoint /api/holdings.
 * Falhas sao logadas via logger estruturado, nunca engolidas silenciosamente.
 */
export async function runPortfolioSnapshotTick(
  deps: SnapshotCronTickDependencies,
): Promise<SnapshotCronTickResult> {
  const logger = deps.logger ?? defaultSnapshotLogger;
  const now = deps.now ?? (() => new Date());

  try {
    const result = await deps.recordSnapshot.execute({
      referenceDate: now(),
      useHistoricalPrice: false,
    });
    logger.info('snapshot gravado', {
      weekStart: result.weekStart.toISOString(),
      totalUsd: result.totalUsd,
      totalBrl: result.totalBrl,
      breakdownSize: result.breakdown.length,
      created: result.created,
    });
    return {
      status: 'ok',
      weekStart: result.weekStart.toISOString(),
      totalUsd: result.totalUsd,
      totalBrl: result.totalBrl,
      breakdownSize: result.breakdown.length,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('falha ao gravar snapshot', { error: message });
    return {
      status: 'error',
      weekStart: null,
      totalUsd: null,
      totalBrl: null,
      breakdownSize: null,
      error: message,
    };
  }
}

export type SnapshotCronScheduler = (
  expression: string,
  handler: () => void | Promise<void>,
) => ScheduledTask;

export const defaultSnapshotScheduler: SnapshotCronScheduler = (expression, handler) =>
  cron.schedule(expression, handler);

export type CreatePortfolioSnapshotCronOptions = {
  recordSnapshot: Pick<RecordPortfolioSnapshotUseCase, 'execute'>;
  cronExpr?: string;
  scheduler?: SnapshotCronScheduler;
  now?: () => Date;
  logger?: SnapshotCronLogger;
};

export function createPortfolioSnapshotCron(options: CreatePortfolioSnapshotCronOptions) {
  const expression = options.cronExpr ?? DEFAULT_SNAPSHOT_CRON_EXPR;

  if (!cron.validate(expression)) {
    throw new Error(`Expressao cron invalida: ${expression}`);
  }

  const scheduler = options.scheduler ?? defaultSnapshotScheduler;
  const task = scheduler(expression, async () => {
    await runPortfolioSnapshotTick({
      recordSnapshot: options.recordSnapshot,
      now: options.now,
      logger: options.logger,
    });
  });

  return {
    expression,
    start: () => task.start(),
    stop: () => task.stop(),
  };
}
