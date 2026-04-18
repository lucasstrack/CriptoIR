import { describe, expect, it, vi } from 'vitest';
import { StartSyncError } from '@/core/use-cases/start-sync';
import {
  createSyncCron,
  runSyncCronTick,
  type CronLogger,
  type CronScheduler,
} from '@/infra/jobs/sync-cron';

function silentLogger(): CronLogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('runSyncCronTick', () => {
  it('chama startSync para cada wallet nao arquivada e conta sucessos', async () => {
    const execute = vi.fn(async (walletId: string) => ({ syncLogId: `log-${walletId}` }));
    const listWallets = vi.fn(async () => [
      { id: 'w1', address: '0xa', network: 'ETH' },
      { id: 'w2', address: '0xb', network: 'ETH' },
    ]);

    const result = await runSyncCronTick({
      startSync: { execute },
      listWallets,
      logger: silentLogger(),
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(1, 'w1');
    expect(execute).toHaveBeenNthCalledWith(2, 'w2');
    expect(result).toEqual({ total: 2, started: 2, skipped: 0, errors: 0 });
  });

  it('pula wallets com sync em andamento sem contar como erro', async () => {
    const execute = vi.fn(async (walletId: string) => {
      if (walletId === 'w2') {
        throw new StartSyncError('ja rodando', 'SYNC_ALREADY_RUNNING');
      }
      return { syncLogId: 'ok' };
    });

    const result = await runSyncCronTick({
      startSync: { execute },
      listWallets: async () => [
        { id: 'w1', address: '0xa', network: 'ETH' },
        { id: 'w2', address: '0xb', network: 'ETH' },
      ],
      logger: silentLogger(),
    });

    expect(result).toEqual({ total: 2, started: 1, skipped: 1, errors: 0 });
  });

  it('contabiliza erros inesperados sem interromper demais wallets', async () => {
    const execute = vi.fn(async (walletId: string) => {
      if (walletId === 'w1') {
        throw new Error('boom');
      }
      return { syncLogId: 'ok' };
    });
    const logger = silentLogger();

    const result = await runSyncCronTick({
      startSync: { execute },
      listWallets: async () => [
        { id: 'w1', address: '0xa', network: 'ETH' },
        { id: 'w2', address: '0xb', network: 'ETH' },
      ],
      logger,
    });

    expect(result).toEqual({ total: 2, started: 1, skipped: 0, errors: 1 });
    expect(logger.error).toHaveBeenCalledWith(
      'falha ao iniciar sync',
      expect.objectContaining({ walletId: 'w1', error: 'boom' }),
    );
  });
});

describe('createSyncCron', () => {
  it('valida a expressao cron e agenda tarefa que executa o tick', async () => {
    const execute = vi.fn(async () => ({ syncLogId: 'log' }));
    type Handler = () => void | Promise<void>;
    const captured: { handler: Handler | null } = { handler: null };
    const start = vi.fn();
    const stop = vi.fn();

    const scheduler: CronScheduler = (expression, handler) => {
      expect(expression).toBe('*/15 * * * *');
      captured.handler = handler;
      return { start, stop } as unknown as ReturnType<CronScheduler>;
    };

    const job = createSyncCron({
      startSync: { execute },
      cronExpr: '*/15 * * * *',
      scheduler,
      listWallets: async () => [{ id: 'w1', address: '0xa', network: 'ETH' }],
      logger: silentLogger(),
    });

    expect(job.expression).toBe('*/15 * * * *');

    await captured.handler?.();
    expect(execute).toHaveBeenCalledWith('w1');

    job.start();
    expect(start).toHaveBeenCalledTimes(1);
    job.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('rejeita expressao cron invalida', () => {
    expect(() =>
      createSyncCron({
        startSync: { execute: vi.fn() },
        cronExpr: 'not-a-cron',
      }),
    ).toThrow(/Expressao cron invalida/);
  });
});
