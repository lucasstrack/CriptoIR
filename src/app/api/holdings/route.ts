import { ComputeHoldingsUseCase } from '@/core/use-cases/compute-holdings';
import { err, ok } from '@/lib/api-response';

let computeHoldingsUseCase = new ComputeHoldingsUseCase();

export async function GET() {
  try {
    const holdings = await computeHoldingsUseCase.execute();
    return ok(holdings);
  } catch {
    return err('INTERNAL_ERROR', 'Nao foi possivel calcular holdings.');
  }
}

export function __setComputeHoldingsUseCaseForTests(useCase: ComputeHoldingsUseCase) {
  computeHoldingsUseCase = useCase;
}

export function __resetComputeHoldingsUseCaseForTests() {
  computeHoldingsUseCase = new ComputeHoldingsUseCase();
}
