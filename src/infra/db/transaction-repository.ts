import type { Direction, Network, Prisma, TxStatus } from '@prisma/client';
import type { NormalizedTransaction, NormalizedTransfer } from '@/core/domain/normalized-transaction';
import type { ClassifiedTransaction } from '@/core/services/tx-classifier';
import { prisma } from '@/infra/db/prisma';

export type ClassifiedEntry = {
  normalized: NormalizedTransaction;
  classification: ClassifiedTransaction;
};

export class TransactionRepository {
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

          const assetId = await upsertAsset(tx, network, transfer.assetSymbol, transfer.assetAddress ?? null);
          const feeAssetId = entry.normalized.fee
            ? await upsertAsset(tx, network, entry.normalized.fee.assetSymbol, null)
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
): Promise<string> {
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
        decimals: defaultDecimals(network, null),
        contractAddress: null,
      },
      select: { id: true },
    });
    return created.id;
  }

  const existing = await tx.asset.findUnique({
    where: { network_contractAddress: { network, contractAddress } },
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
      decimals: defaultDecimals(network, contractAddress),
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
