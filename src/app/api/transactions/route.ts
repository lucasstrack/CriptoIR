import { ZodError } from 'zod';
import { ListTransactionsUseCase } from '@/core/use-cases/list-transactions';
import { err, ok } from '@/lib/api-response';
import { transactionQuerySchema } from '@/lib/zod-schemas/transaction-query';

const listTransactionsUseCase = new ListTransactionsUseCase();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const query = transactionQuerySchema.parse(raw);
    const { data, meta } = await listTransactionsUseCase.execute(query);
    return ok(data, meta);
  } catch (error) {
    if (error instanceof ZodError) {
      return err('VALIDATION_ERROR', error.issues[0]?.message ?? 'Query invalida.', 400);
    }
    return err('INTERNAL_ERROR', 'Nao foi possivel listar transacoes.');
  }
}
