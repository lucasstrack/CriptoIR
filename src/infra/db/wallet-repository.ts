import type { Prisma, Wallet } from '@prisma/client';
import { prisma } from '@/infra/db/prisma';

export type WalletRecord = Pick<
  Wallet,
  'id' | 'label' | 'address' | 'network' | 'createdAt' | 'lastSyncedAt' | 'lastSyncedCursor'
>;

export class WalletRepository {
  async list() {
    return prisma.wallet.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: walletSelect,
    });
  }

  async findByNetworkAndAddress(network: Wallet['network'], address: string) {
    return prisma.wallet.findUnique({
      where: {
        network_address: {
          network,
          address,
        },
      },
      select: walletSelect,
    });
  }

  async create(data: Prisma.WalletCreateInput) {
    return prisma.wallet.create({
      data,
      select: walletSelect,
    });
  }
}

const walletSelect = {
  id: true,
  label: true,
  address: true,
  network: true,
  createdAt: true,
  lastSyncedAt: true,
  lastSyncedCursor: true,
} satisfies Prisma.WalletSelect;
