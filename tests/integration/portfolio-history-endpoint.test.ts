import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/portfolio/history/route';
import { prisma } from '@/infra/db/prisma';
import { ensureTestSchema } from '@/../tests/integration/helpers/ensure-test-schema';

describe('GET /api/portfolio/history', () => {
  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    await prisma.portfolioSnapshot.deleteMany();
  });

  it('retorna lista vazia quando nao ha snapshot (pre-TASK-240)', async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([]);
    expect(payload.error).toBeNull();
  });

  it('retorna serie temporal ordenada por weekStart asc', async () => {
    await prisma.portfolioSnapshot.create({
      data: {
        weekStart: new Date('2026-04-13T00:00:00.000Z'),
        totalUsd: '15000.00000000',
        totalBrl: '75000.00000000',
        breakdown: JSON.stringify([
          {
            assetId: 'asset-eth',
            symbol: 'ETH',
            amount: '3',
            valueUsd: '15000.00000000',
            valueBrl: '75000.00000000',
          },
        ]),
      },
    });
    await prisma.portfolioSnapshot.create({
      data: {
        weekStart: new Date('2026-04-06T00:00:00.000Z'),
        totalUsd: '10000.00000000',
        totalBrl: '50000.00000000',
        breakdown: JSON.stringify([]),
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0].weekStart).toBe('2026-04-06T00:00:00.000Z');
    expect(payload.data[1].weekStart).toBe('2026-04-13T00:00:00.000Z');
    // Datas em ISO 8601 UTC
    expect(payload.data[0].weekStart).toMatch(/Z$/);
    // Valores monetarios em string decimal
    expect(typeof payload.data[0].totalUsd).toBe('string');
    expect(typeof payload.data[0].totalBrl).toBe('string');
    expect(payload.data[1].breakdown).toEqual([
      {
        assetId: 'asset-eth',
        symbol: 'ETH',
        amount: '3',
        valueUsd: '15000.00000000',
        valueBrl: '75000.00000000',
      },
    ]);
  });

  it('retorna breakdown vazio se o JSON persistido for invalido', async () => {
    await prisma.portfolioSnapshot.create({
      data: {
        weekStart: new Date('2026-04-20T00:00:00.000Z'),
        totalUsd: '1.00000000',
        totalBrl: '5.00000000',
        breakdown: 'not-json',
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0].breakdown).toEqual([]);
  });
});
