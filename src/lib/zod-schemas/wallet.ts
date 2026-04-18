import { z } from 'zod';

export const networkSchema = z.enum(['BTC', 'ETH', 'BASE', 'ARB', 'SOL']);

export const createWalletSchema = z.object({
  label: z.string().trim().min(1, 'Informe um nome para a wallet').max(80),
  address: z.string().trim().min(1, 'Informe um endereco'),
  network: networkSchema,
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
