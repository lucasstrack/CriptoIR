import { StartSyncError, StartSyncUseCase } from '@/core/use-cases/start-sync';
import { err, ok } from '@/lib/api-response';

const defaultUseCase = new StartSyncUseCase();
let activeUseCase: StartSyncUseCase = defaultUseCase;

export function __setStartSyncUseCaseForTests(useCase: StartSyncUseCase): void {
  activeUseCase = useCase;
}

export function __resetStartSyncUseCaseForTests(): void {
  activeUseCase = defaultUseCase;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const result = await activeUseCase.execute(id);
    return ok(result, null, 202);
  } catch (error) {
    if (error instanceof StartSyncError) {
      const status = error.code === 'WALLET_NOT_FOUND' ? 404 : 409;
      return err(error.code, error.message, status);
    }
    return err('INTERNAL_ERROR', 'Nao foi possivel iniciar o sync.');
  }
}
