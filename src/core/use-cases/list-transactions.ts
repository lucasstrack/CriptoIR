import type { Direction, Network, TxStatus, TxType } from '@prisma/client';
import {
  TransactionRepository,
  type TransactionListRow,
} from '@/infra/db/transaction-repository';
import type { TransactionQuery } from '@/lib/zod-schemas/transaction-query';

export type AssetDTO = {
  id: string;
  symbol: string;
  name: string;
  network: Network;
  contractAddress: string | null;
  decimals: number;
};

export type WalletDTO = {
  id: string;
  label: string;
  address: string;
  network: Network;
};

export type TransactionDTO = {
  id: string;
  walletId: string;
  network: Network;
  txHash: string;
  blockNumber: string;
  timestamp: string;
  direction: Direction;
  type: TxType;
  counterparty: string | null;
  amount: string;
  feeAmount: string | null;
  status: TxStatus;
  asset: AssetDTO;
  feeAsset: AssetDTO | null;
  wallet: WalletDTO;
};

export type ListTransactionsResult = {
  data: TransactionDTO[];
  meta: { page: number; pageSize: number; total: number };
};

export class ListTransactionsUseCase {
  constructor(
    private readonly repository: TransactionRepository = new TransactionRepository(),
  ) {}

  async execute(query: TransactionQuery): Promise<ListTransactionsResult> {
    const { rows, total } = await this.repository.list(
      {
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        network: query.network,
        assetSymbol: query.assetSymbol,
        walletId: query.walletId,
        type: query.type,
      },
      { page: query.page, pageSize: query.pageSize, sort: query.sort },
    );

    return {
      data: rows.map(toDTO),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }
}

function toDTO(row: TransactionListRow): TransactionDTO {
  return {
    id: row.id,
    walletId: row.walletId,
    network: row.network,
    txHash: row.txHash,
    blockNumber: row.blockNumber.toString(),
    timestamp: row.timestamp.toISOString(),
    direction: row.direction,
    type: row.type,
    counterparty: row.counterparty,
    amount: row.amount,
    feeAmount: row.feeAmount,
    status: row.status,
    asset: toAssetDTO(row.asset),
    feeAsset: row.feeAsset ? toAssetDTO(row.feeAsset) : null,
    wallet: row.wallet,
  };
}

function toAssetDTO(asset: TransactionListRow['asset']): AssetDTO {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    network: asset.network,
    contractAddress: asset.contractAddress,
    decimals: asset.decimals,
  };
}
