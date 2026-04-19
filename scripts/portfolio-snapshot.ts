import { RecordPortfolioSnapshotUseCase } from '@/core/use-cases/record-portfolio-snapshot';

type CliArgs = {
  week: Date | null;
  useHistoricalPrice: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let week: Date | null = null;
  let useHistoricalPrice: boolean | null = null;

  for (const arg of argv) {
    if (arg.startsWith('--week=')) {
      const value = arg.slice('--week='.length);
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Valor invalido para --week: "${value}". Use YYYY-MM-DD.`);
      }
      week = parsed;
    } else if (arg === '--current-price') {
      useHistoricalPrice = false;
    } else if (arg === '--historical-price') {
      useHistoricalPrice = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }
  }

  // Default: backfill com --week usa preco historico; sem --week (semana
  // corrente) usa preco atual, equivalente ao que o cron faz.
  const resolvedUseHistorical = useHistoricalPrice ?? week !== null;

  return { week, useHistoricalPrice: resolvedUseHistorical };
}

function printHelpAndExit(): never {
  console.log(`Uso: npm run snapshot [-- --week=YYYY-MM-DD] [--current-price | --historical-price]

Sem flags: grava snapshot da semana corrente com precos atuais (CoinGecko).
Com --week: backfill da semana contendo a data informada, usando PriceSnapshot
historico. Se nao houver preco daquela data, o asset entra no breakdown com
valueUsd/valueBrl null.
`);
  process.exit(0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const useCase = new RecordPortfolioSnapshotUseCase();

  const result = await useCase.execute({
    referenceDate: args.week ?? undefined,
    useHistoricalPrice: args.useHistoricalPrice,
  });

  console.log(
    JSON.stringify(
      {
        weekStart: result.weekStart.toISOString(),
        totalUsd: result.totalUsd,
        totalBrl: result.totalBrl,
        breakdownSize: result.breakdown.length,
        created: result.created,
        mode: args.useHistoricalPrice ? 'historical-price' : 'current-price',
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
