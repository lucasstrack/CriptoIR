import { describe, expect, it, vi } from 'vitest';
import {
  createPortfolioSnapshotCron,
  runPortfolioSnapshotTick,
  type SnapshotCronLogger,
  type SnapshotCronScheduler,
} from '@/infra/jobs/portfolio-snapshot-cron';
import type { RecordPortfolioSnapshotUseCase } from '@/core/use-cases/record-portfolio-snapshot';

function silentLogger(): SnapshotCronLogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

type RecordSnapshotStub = Pick<RecordPortfolioSnapshotUseCase, 'execute'>;

describe('runPortfolioSnapshotTick', () => {
  it('chama o use-case com referenceDate atual e useHistoricalPrice=false e loga o resultado', async () => {
    const fixedDate = new Date('2026-04-19T00:00:00.000Z');
    const weekStart = new Date('2026-04-19T00:00:00.000Z');
    const execute = vi.fn(async () => ({
      weekStart,
      totalUsd: '15000.000000000000000000',
      totalBrl: '75000.000000000000000000',
      breakdown: [
        {
          assetId: 'asset-1',
          symbol: 'ETH',
          amount: '3.000000000000000000',
          valueUsd: '15000.000000000000000000',
          valueBrl: '75000.000000000000000000',
        },
      ],
      created: true,
    }));
    const recordSnapshot: RecordSnapshotStub = { execute };
    const logger = silentLogger();

    const result = await runPortfolioSnapshotTick({
      recordSnapshot,
      now: () => fixedDate,
      logger,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      referenceDate: fixedDate,
      useHistoricalPrice: false,
    });
    expect(result).toEqual({
      status: 'ok',
      weekStart: weekStart.toISOString(),
      totalUsd: '15000.000000000000000000',
      totalBrl: '75000.000000000000000000',
      breakdownSize: 1,
      error: null,
    });
    expect(logger.info).toHaveBeenCalledWith(
      'snapshot gravado',
      expect.objectContaining({
        weekStart: weekStart.toISOString(),
        breakdownSize: 1,
        created: true,
      }),
    );
  });

  it('captura falhas do use-case sem lancar, loga no canal error e retorna status=error', async () => {
    const execute = vi.fn(async () => {
      throw new Error('db down');
    });
    const logger = silentLogger();

    const result = await runPortfolioSnapshotTick({
      recordSnapshot: { execute },
      logger,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBe('db down');
    expect(result.weekStart).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      'falha ao gravar snapshot',
      expect.objectContaining({ error: 'db down' }),
    );
  });
});

describe('createPortfolioSnapshotCron', () => {
  it('valida a expressao cron default (0 0 * * 0) e agenda o handler', async () => {
    const execute = vi.fn(async () => ({
      weekStart: new Date('2026-04-19T00:00:00.000Z'),
      totalUsd: '0.000000000000000000',
      totalBrl: '0.000000000000000000',
      breakdown: [],
      created: true,
    }));
    type Handler = () => void | Promise<void>;
    const captured: { handler: Handler | null; expression: string | null } = {
      handler: null,
      expression: null,
    };
    const start = vi.fn();
    const stop = vi.fn();

    const scheduler: SnapshotCronScheduler = (expression, handler) => {
      captured.expression = expression;
      captured.handler = handler;
      return { start, stop } as unknown as ReturnType<SnapshotCronScheduler>;
    };

    const job = createPortfolioSnapshotCron({
      recordSnapshot: { execute },
      scheduler,
      logger: silentLogger(),
    });

    expect(captured.expression).toBe('0 0 * * 0');
    expect(job.expression).toBe('0 0 * * 0');

    await captured.handler?.();
    expect(execute).toHaveBeenCalledTimes(1);

    job.start();
    expect(start).toHaveBeenCalledTimes(1);
    job.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('aceita override via cronExpr e rejeita expressao cron invalida', () => {
    const execute = vi.fn();
    const scheduler: SnapshotCronScheduler = () =>
      ({ start: vi.fn(), stop: vi.fn() }) as unknown as ReturnType<SnapshotCronScheduler>;

    const job = createPortfolioSnapshotCron({
      recordSnapshot: { execute },
      cronExpr: '0 6 * * 0',
      scheduler,
      logger: silentLogger(),
    });
    expect(job.expression).toBe('0 6 * * 0');

    expect(() =>
      createPortfolioSnapshotCron({
        recordSnapshot: { execute },
        cronExpr: 'not-a-cron',
      }),
    ).toThrow(/Expressao cron invalida/);
  });
});
