import { prisma } from '@/infra/db/prisma';

export class SyncLogRepository {
  async hasRunning(walletId: string): Promise<boolean> {
    const running = await prisma.syncLog.findFirst({
      where: { walletId, finishedAt: null },
      select: { id: true },
    });
    return running !== null;
  }

  async start(walletId: string) {
    return prisma.syncLog.create({
      data: {
        walletId,
        startedAt: new Date(),
        txCount: 0,
      },
      select: { id: true },
    });
  }

  async finish(id: string, txCount: number) {
    return prisma.syncLog.update({
      where: { id },
      data: {
        finishedAt: new Date(),
        txCount,
      },
    });
  }

  async fail(id: string, error: string, txCount: number) {
    return prisma.syncLog.update({
      where: { id },
      data: {
        finishedAt: new Date(),
        txCount,
        error,
      },
    });
  }
}
