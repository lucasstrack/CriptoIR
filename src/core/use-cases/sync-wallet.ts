import { prisma } from '@/infra/db/prisma';
import { ProviderRegistry } from '@/infra/blockchain/provider-registry';
import { SyncLogRepository } from '@/infra/db/sync-log-repository';
import { SyncOrchestrator } from '@/core/services/sync-orchestrator';

export class SyncWalletError extends Error {
  constructor(
    message: string,
    public readonly code: 'WALLET_NOT_FOUND' | 'SYNC_ALREADY_RUNNING' | 'PROVIDER_UNAVAILABLE',
  ) {
    super(message);
    this.name = 'SyncWalletError';
  }
}

export type SyncWalletDependencies = {
  orchestrator?: SyncOrchestrator;
  registry?: ProviderRegistry;
  syncLogRepository?: SyncLogRepository;
};

export type SyncWalletResult = {
  syncLogId: string;
  persisted: number;
};

export class SyncWalletUseCase {
  private readonly orchestrator: SyncOrchestrator;
  private readonly registry: ProviderRegistry;
  private readonly syncLogRepository: SyncLogRepository;

  constructor(dependencies: SyncWalletDependencies = {}) {
    this.orchestrator = dependencies.orchestrator ?? new SyncOrchestrator();
    this.registry = dependencies.registry ?? new ProviderRegistry();
    this.syncLogRepository = dependencies.syncLogRepository ?? new SyncLogRepository();
  }

  async execute(walletId: string): Promise<SyncWalletResult> {
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
      throw new SyncWalletError('Wallet nao encontrada.', 'WALLET_NOT_FOUND');
    }

    if (await this.syncLogRepository.hasRunning(wallet.id)) {
      throw new SyncWalletError(
        'Sync ja em andamento para essa wallet.',
        'SYNC_ALREADY_RUNNING',
      );
    }

    const syncLog = await this.syncLogRepository.start(wallet.id);

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

      return { syncLogId: syncLog.id, persisted };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar.';
      await this.syncLogRepository.fail(syncLog.id, message, 0);
      throw new SyncWalletError(message, 'PROVIDER_UNAVAILABLE');
    }
  }
}
