import { ListPortfolioHistoryUseCase } from '@/core/use-cases/list-portfolio-history';
import { err, ok } from '@/lib/api-response';

const listPortfolioHistoryUseCase = new ListPortfolioHistoryUseCase();

export async function GET() {
  try {
    const history = await listPortfolioHistoryUseCase.execute();
    return ok(history);
  } catch {
    return err('INTERNAL_ERROR', 'Nao foi possivel listar o historico de patrimonio.');
  }
}
