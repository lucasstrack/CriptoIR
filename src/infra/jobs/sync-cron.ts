import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '@/infra/db/prisma';
import { StartSyncError, type StartSyncUseCase } from '@/core/use-cases/start-sync';

export const DEFAULT_SYNC_CRON_EXPR = '*/30 * * * *';

type WalletRow = { id: string; address: string; network: string };

export type WalletLister = () => Promise<WalletRow[]>;

export const defaultWalletLister: WalletLister = async () =>
  prisma.wallet.findMany({
    where: { archivedAt: null },
    select: { id: true, address: true, network: true },
  });

export type CronLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export const defaultLogger: CronLogger = {
  info: (message, meta) => console.log(`[sync-cron] ${message}`, meta ?? ''),
  warn: (message, meta) => console.warn(`[sync-cron] ${message}`, meta ?? ''),
  error: (message, meta) => console.error(`[sync-cron] ${message}`, meta ?? ''),
};

export type SyncCronTickDependencies = {
  startSync: Pick<StartSyncUseCase, 'execute'>;
  listWallets?: WalletLister;
  logger?: CronLogger;
};

export type SyncCronTickResult = {
  total: number;
  started: number;
  skipped: number;
  errors: number;
};

export async function runSyncCronTick(
  deps: SyncCronTickDependencies,
): Promise<SyncCronTickResult> {
  const listWallets = deps.listWallets ?? defaultWalletLister;
  const logger = deps.logger ?? defaultLogger;

  const wallets = await listWallets();
  let started = 0;
  let skipped = 0;
  let errors = 0;

  for (const wallet of wallets) {
    try {
      const { syncLogId } = await deps.startSync.execute(wallet.id);
      started += 1;
      logger.info('sync iniciado', { walletId: wallet.id, syncLogId });
    } catch (error) {
      if (error instanceof StartSyncError && error.code === 'SYNC_ALREADY_RUNNING') {
        skipped += 1;
        continue;
      }
      errors += 1;
      const message = error instanceof Error ? error.message : String(error);
      logger.error('falha ao iniciar sync', { walletId: wallet.id, error: message });
    }
  }

  logger.info('tick concluido', {
    total: wallets.length,
    started,
    skipped,
    errors,
  });

  return { total: wallets.length, started, skipped, errors };
}

export type CronScheduler = (
  expression: string,
  handler: () => void | Promise<void>,
) => ScheduledTask;

export const defaultScheduler: CronScheduler = (expression, handler) =>
  cron.schedule(expression, handler);

export type CreateSyncCronOptions = {
  startSync: Pick<StartSyncUseCase, 'execute'>;
  cronExpr?: string;
  scheduler?: CronScheduler;
  listWallets?: WalletLister;
  logger?: CronLogger;
};

export function createSyncCron(options: CreateSyncCronOptions) {
  const expression = options.cronExpr ?? DEFAULT_SYNC_CRON_EXPR;

  if (!cron.validate(expression)) {
    throw new Error(`Expressao cron invalida: ${expression}`);
  }

  const scheduler = options.scheduler ?? defaultScheduler;
  const task = scheduler(expression, async () => {
    await runSyncCronTick({
      startSync: options.startSync,
      listWallets: options.listWallets,
      logger: options.logger,
    });
  });

  return {
    expression,
    start: () => task.start(),
    stop: () => task.stop(),
  };
}
