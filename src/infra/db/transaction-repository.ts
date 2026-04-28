import type { Direction, Network, Prisma, TxStatus, TxType } from '@prisma/client';
import type { NormalizedTransaction, NormalizedTransfer } from '@/core/domain/normalized-transaction';
import type { ClassifiedTransaction } from '@/core/services/tx-classifier';
import { prisma } from '@/infra/db/prisma';

export type ClassifiedEntry = {
  normalized: NormalizedTransaction;
  classification: ClassifiedTransaction;
};

export type TransactionListFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  network?: Network;
  assetSymbol?: string;
  walletId?: string;
  type?: TxType;
};

export type TransactionListPagination = {
  page: number;
  pageSize: number;
  sort: 'timestamp:asc' | 'timestamp:desc';
};

export type TransactionListRow = Prisma.TransactionGetPayload<{
  include: {
    asset: true;
    feeAsset: true;
    wallet: {
      select: { id: true; label: true; address: true; network: true };
    };
  };
}>;

export type TransactionListPage = {
  rows: TransactionListRow[];
  total: number;
};

export class TransactionRepository {
  async list(
    filters: TransactionListFilters,
    pagination: TransactionListPagination,
  ): Promise<TransactionListPage> {
    const where: Prisma.TransactionWhereInput = {};
    if (filters.walletId) where.walletId = filters.walletId;
    if (filters.network) where.network = filters.network;
    if (filters.type) where.type = filters.type;
    if (filters.assetSymbol) where.asset = { symbol: filters.assetSymbol };
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) where.timestamp.gte = filters.dateFrom;
      if (filters.dateTo) where.timestamp.lte = filters.dateTo;
    }

    const orderBy: Prisma.TransactionOrderByWithRelationInput = {
      timestamp: pagination.sort === 'timestamp:asc' ? 'asc' : 'desc',
    };

    const [rows, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          asset: true,
          feeAsset: true,
          wallet: {
            select: { id: true, label: true, address: true, network: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { rows, total };
  }

  async persistBatch(
    walletId: string,
    network: Network,
    entries: ClassifiedEntry[],
  ): Promise<number> {
    if (entries.length === 0) {
      return 0;
    }

    return prisma.$transaction(async (tx) => {
      let persisted = 0;

      for (const entry of entries) {
        for (const transfer of entry.normalized.transfers) {
          const direction = resolveDirection(transfer, entry.classification);
          if (!direction) {
            continue;
          }

          const alreadyPersisted = await tx.transaction.findUnique({
            where: {
              walletId_txHash_direction: {
                walletId,
                txHash: entry.normalized.txHash,
                direction,
              },
            },
            select: { id: true },
          });

          if (alreadyPersisted) {
            continue;
          }

          const assetId = await upsertAsset(
            tx,
            network,
            transfer.assetSymbol,
            transfer.assetAddress ?? null,
            transfer.decimals,
          );
          const feeAssetId = entry.normalized.fee
            ? await upsertAsset(tx, network, entry.normalized.fee.assetSymbol, null, undefined)
            : null;

          await tx.transaction.create({
            data: {
              walletId,
              network,
              txHash: entry.normalized.txHash,
              blockNumber: BigInt(entry.normalized.blockNumber),
              timestamp: new Date(entry.normalized.timestamp),
              direction,
              type: entry.classification.type,
              counterparty: resolveCounterparty(transfer),
              assetId,
              amount: transfer.amount,
              feeAmount: entry.normalized.fee?.amount ?? null,
              feeAssetId,
              status: entry.normalized.status as TxStatus,
              rawPayload: entry.normalized.rawPayload,
              classificationVersion: entry.classification.classificationVersion,
            },
          });

          persisted += 1;
        }
      }

      return persisted;
    });
  }
}

function resolveDirection(
  transfer: NormalizedTransfer,
  classification: ClassifiedTransaction,
): Direction | null {
  if (classification.type === 'INTERNAL') {
    return 'INTERNAL';
  }

  switch (transfer.direction) {
    case 'IN':
      return 'IN';
    case 'OUT':
      return 'OUT';
    case 'SELF':
      return 'SELF';
    case 'UNKNOWN':
      return null;
  }
}

function resolveCounterparty(transfer: NormalizedTransfer) {
  if (transfer.direction === 'IN') {
    return transfer.fromAddress ?? null;
  }
  if (transfer.direction === 'OUT') {
    return transfer.toAddress ?? null;
  }
  return null;
}

async function upsertAsset(
  tx: Prisma.TransactionClient,
  network: Network,
  symbol: string,
  contractAddress: string | null,
  providerDecimals: number | undefined,
): Promise<string> {
  const decimals = providerDecimals ?? defaultDecimals(network, contractAddress);

  if (contractAddress === null) {
    const existing = await tx.asset.findFirst({
      where: { network, contractAddress: null, symbol },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }

    const created = await tx.asset.create({
      data: {
        symbol,
        name: symbol,
        network,
        decimals,
        contractAddress: null,
      },
      select: { id: true },
    });
    return created.id;
  }

  const existing = await tx.asset.findUnique({
    where: { network_contractAddress: { network, contractAddress } },
    select: { id: true, decimals: true, symbol: true },
  });
  if (existing) {
    // Atualiza decimals/symbol se o provider trouxe valores melhores.
    if (
      providerDecimals !== undefined &&
      (existing.decimals !== providerDecimals || (symbol && symbol !== existing.symbol))
    ) {
      await tx.asset.update({
        where: { id: existing.id },
        data: { decimals: providerDecimals, symbol, name: symbol },
      });
    }
    return existing.id;
  }

  const created = await tx.asset.create({
    data: {
      symbol,
      name: symbol,
      network,
      decimals,
      contractAddress,
    },
    select: { id: true },
  });
  return created.id;
}

function defaultDecimals(network: Network, contractAddress: string | null) {
  if (contractAddress !== null) {
    return 18;
  }
  if (network === 'BTC') return 8;
  if (network === 'SOL') return 9;
  return 18;
}
