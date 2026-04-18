import { z } from 'zod';
import { networkSchema } from '@/lib/zod-schemas/wallet';

export const txTypeSchema = z.enum([
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INTERNAL',
  'SWAP',
  'FEE',
  'LIQUIDITY_ADD',
  'LIQUIDITY_REMOVE',
  'STAKING_IN',
  'STAKING_OUT',
  'UNKNOWN',
]);

export const sortSchema = z
  .enum(['timestamp:asc', 'timestamp:desc'])
  .default('timestamp:desc');

export const transactionQuerySchema = z.object({
  dateFrom: z.iso.datetime({ offset: true }).optional(),
  dateTo: z.iso.datetime({ offset: true }).optional(),
  network: networkSchema.optional(),
  assetSymbol: z
    .string()
    .trim()
    .min(1, 'assetSymbol nao pode ser vazio')
    .optional(),
  walletId: z.string().trim().min(1).optional(),
  type: txTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: sortSchema,
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
