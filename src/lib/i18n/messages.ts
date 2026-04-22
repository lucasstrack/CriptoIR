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

  // Carteiras (TASK-310)
  'wallets.page.title': 'Carteiras',
  'wallets.page.description': 'Cadastre wallets on-chain e dispare sync manual por rede.',
  'wallets.action.add': 'Adicionar carteira',
  'wallets.action.sync': 'Sincronizar',
  'wallets.action.syncing': 'Sincronizando...',
  'wallets.empty.title': 'Nenhuma carteira cadastrada',
  'wallets.empty.body': 'Cadastre sua primeira wallet para começar a rastrear transações.',
  'wallets.error.title': 'Não foi possível carregar as carteiras',
  'wallets.error.body': 'Tente novamente em instantes.',
  'wallets.error.retry': 'Tentar novamente',
  'wallets.loading.aria': 'Carregando carteiras',
  'wallets.row.network': 'Rede',
  'wallets.row.lastSync': 'Último sync',
  'wallets.row.neverSynced': 'Nunca sincronizado',
  'wallets.row.syncAria': 'Sincronizar carteira',
  'wallets.form.title': 'Nova carteira',
  'wallets.form.description': 'Informe o endereço público e a rede para começar a rastrear.',
  'wallets.form.labelField': 'Nome',
  'wallets.form.labelPlaceholder': 'Ex.: Cold wallet BTC',
  'wallets.form.addressField': 'Endereço',
  'wallets.form.addressPlaceholder': 'Endereço público on-chain',
  'wallets.form.networkField': 'Rede',
  'wallets.form.submit': 'Cadastrar',
  'wallets.form.submitting': 'Salvando...',
  'wallets.form.cancel': 'Cancelar',
  'wallets.form.close': 'Fechar',
  'wallets.form.error.validation': 'Confira os campos e tente novamente.',
  'wallets.form.error.invalidAddress': 'Endereço inválido para a rede selecionada.',
  'wallets.form.error.duplicate': 'Já existe uma carteira cadastrada com esse endereço nessa rede.',
  'wallets.form.error.generic': 'Não foi possível cadastrar a carteira. Tente novamente.',
  'wallets.form.error.labelRequired': 'Informe um nome para a wallet.',
  'wallets.form.error.addressRequired': 'Informe um endereço.',
} as const;

export type MessageKey = keyof typeof ptBR;
