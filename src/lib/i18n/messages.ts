/**
 * Dicionário central de strings pt-BR da UI.
 *
 * Toda string visível ao usuário deve viver aqui e ser consumida via `t(key)`.
 * Quando migrarmos para next-intl/react-intl basta trocar o helper em
 * `src/lib/i18n/index.ts` — os call sites continuam iguais.
 */
export const ptBR = {
  // App / metadados
  'app.title': 'CriptoIR',
  'app.description':
    'Rastreador local de transações on-chain e agregador de patrimônio em cripto.',

  // Navegação
  'nav.patrimonio': 'Patrimônio',
  'nav.carteiras': 'Carteiras',
  'nav.transacoes': 'Transações',
  'nav.brand': 'CriptoIR',
  'nav.aria.primary': 'Navegação principal',

  // Toggle de moeda
  'currency.toggle.label': 'Moeda',
  'currency.toggle.usd': 'USD',
  'currency.toggle.brl': 'BRL',
  'currency.toggle.aria': 'Alternar moeda',

  // Placeholders de tela
  'page.placeholder.heading': 'Em construção',
  'page.placeholder.body': 'Esta tela será entregue em uma task posterior da Onda 3.',

  // Estados padrão (empty / error)
  'state.empty.title': 'Nada por aqui ainda',
  'state.empty.body': 'Conforme você adicionar dados, eles aparecerão nesta lista.',
  'state.error.title': 'Algo deu errado',
  'state.error.body': 'Tente novamente em instantes. Se persistir, verifique os logs do servidor.',
  'state.error.retry': 'Tentar novamente',
  'state.loading': 'Carregando...',
} as const;

export type MessageKey = keyof typeof ptBR;
