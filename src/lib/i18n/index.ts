import { ptBR, type MessageKey } from './messages';

/**
 * Retorna a string localizada (pt-BR) para a chave informada.
 *
 * A assinatura força o uso de `keyof typeof ptBR`, então uma chave
 * inexistente quebra o build em vez de produzir string vazia em runtime.
 * Quando formos ativar i18n dinâmico (next-intl), basta trocar o corpo
 * deste helper — nada muda nos call sites.
 */
export function t(key: MessageKey): string {
  return ptBR[key];
}

export { ptBR };
export type { MessageKey };
