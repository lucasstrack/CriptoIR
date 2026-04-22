import { permanentRedirect } from 'next/navigation';

/**
 * A landing da app é o Patrimônio. Qualquer acesso a `/` redireciona
 * permanentemente para `/patrimonio`.
 *
 * O retorno `: never` não é um bug — `permanentRedirect` interrompe o
 * render lançando uma exceção especial do Next, então nada depois dele
 * executa. Tipar como `never` deixa o TS ciente disso e evita warnings
 * de "função não retorna JSX".
 */
export default function RootPage(): never {
  permanentRedirect('/patrimonio');
}
