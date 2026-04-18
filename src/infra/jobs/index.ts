import { StartSyncUseCase } from '@/core/use-cases/start-sync';
import { createSyncCron, DEFAULT_SYNC_CRON_EXPR } from '@/infra/jobs/sync-cron';

type JobHandle = { expression: string; stop: () => void };

const GLOBAL_KEY = '__criptoir_background_jobs__';

type GlobalSlot = { syncCron?: JobHandle };

function globalSlot(): GlobalSlot {
  const holder = globalThis as typeof globalThis & Record<string, GlobalSlot>;
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = {};
  }
  return holder[GLOBAL_KEY];
}

export function startBackgroundJobs(): JobHandle | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const slot = globalSlot();
  if (slot.syncCron) {
    return slot.syncCron;
  }

  const cronExpr = process.env.SYNC_CRON_EXPR?.trim() || DEFAULT_SYNC_CRON_EXPR;
  const startSync = new StartSyncUseCase();
  const job = createSyncCron({ startSync, cronExpr });
  job.start();

  const handle: JobHandle = { expression: job.expression, stop: job.stop };
  slot.syncCron = handle;
  console.log(`[sync-cron] agendado com expressao "${handle.expression}"`);
  return handle;
}

export function stopBackgroundJobs(): void {
  const slot = globalSlot();
  if (slot.syncCron) {
    slot.syncCron.stop();
    slot.syncCron = undefined;
  }
}
