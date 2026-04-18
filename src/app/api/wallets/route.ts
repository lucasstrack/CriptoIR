import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { CreateWalletError, CreateWalletUseCase } from '@/core/use-cases/create-wallet';
import { WalletRepository } from '@/infra/db/wallet-repository';
import { err, ok } from '@/lib/api-response';
import { createWalletSchema } from '@/lib/zod-schemas/wallet';

const walletRepository = new WalletRepository();
const createWalletUseCase = new CreateWalletUseCase(walletRepository);

export async function GET() {
  try {
    const wallets = await walletRepository.list();
    return ok(wallets);
  } catch {
    return err('INTERNAL_ERROR', 'Nao foi possivel listar as wallets.');
  }
}

export async function POST(request: Request) {
  try {
    const body = createWalletSchema.parse(await request.json());
    const wallet = await createWalletUseCase.execute(body);
    return ok(wallet, null, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return err('VALIDATION_ERROR', error.issues[0]?.message ?? 'Payload invalido.', 400);
    }

    if (error instanceof CreateWalletError) {
      const status = error.code === 'WALLET_ALREADY_EXISTS' ? 409 : 400;
      return err(error.code, error.message, status);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return err(
        'WALLET_ALREADY_EXISTS',
        'Ja existe uma wallet cadastrada com esse endereco nessa rede.',
        409,
      );
    }

    return err('INTERNAL_ERROR', 'Nao foi possivel criar a wallet.');
  }
}
