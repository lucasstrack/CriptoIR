import { prisma } from '@/infra/db/prisma';
import { ProviderRegistry } from '@/infra/blockchain/provider-registry';
import { SyncLogRepository } from '@/infra/db/sync-log-repository';
import { SyncOrchestrator } from '@/core/services/sync-orchestrator';

export class StartSyncError extends Error {
  constructor(
    message: string,
    public readonly code: 'WALLET_NOT_FOUND' | 'SYNC_ALREADY_RUNNING',
  ) {
    super(message);
    this.name = 'StartSyncError';
  }
}

export type BackgroundRunner = (task: () => Promise<void>) => void;

export const fireAndForgetRunner: BackgroundRunner = (task) => {
  void task().catch((error) => {
    console.error('[sync] background task failed', error);
  });
};

export type StartSyncDependencies = {
  orchestrator?: SyncOrchestrator;
  registry?: ProviderRegistry;
  syncLogRepository?: SyncLogRepository;
  runner?: BackgroundRunner;
};

export type StartSyncResult = { syncLogId: string };

export class StartSyncUseCase {
  private readonly orchestrator: SyncOrchestrator;
  private readonly registry: ProviderRegistry;
  private readonly syncLogRepository: SyncLogRepository;
  private readonly runner: BackgroundRunner;

  constructor(deps: StartSyncDependencies = {}) {
    this.orchestrator = deps.orchestrator ?? new SyncOrchestrator();
    this.registry = deps.registry ?? new ProviderRegistry();
    this.syncLogRepository = deps.syncLogRepository ?? new SyncLogRepository();
    this.runner = deps.runner ?? fireAndForgetRunner;
  }

  async execute(walletId: string): Promise<StartSyncResult> {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        address: true,
        network: true,
        lastSyncedCursor: true,
        archivedAt: true,
      },
    });

    if (!wallet || wallet.archivedAt) {
      throw new StartSyncError('Wallet nao encontrada.', 'WALLET_NOT_FOUND');
    }

    if (await this.syncLogRepository.hasRunning(wallet.id)) {
      throw new StartSyncError(
        'Sync ja em andamento para essa wallet.',
        'SYNC_ALREADY_RUNNING',
      );
    }

    const syncLog = await this.syncLogRepository.start(wallet.id);

    this.runner(async () => {
      try {
        const provider = this.registry.resolve(wallet.network);
        const owned = await prisma.wallet.findMany({
          where: { archivedAt: null },
          select: { address: true },
        });

        const { persisted, finalCursor } = await this.orchestrator.sync({
          provider,
          wallet: {
            id: wallet.id,
            address: wallet.address,
            network: wallet.network,
            lastSyncedCursor: wallet.lastSyncedCursor,
          },
          ownedAddresses: owned.map((item) => item.address),
        });

        await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            lastSyncedAt: new Date(),
            lastSyncedCursor: finalCursor ?? wallet.lastSyncedCursor,
          },
        });
        await this.syncLogRepository.finish(syncLog.id, persisted);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar.';
        await this.syncLogRepository.fail(syncLog.id, message, 0);
      }
    });

    return { syncLogId: syncLog.id };
  }
}
