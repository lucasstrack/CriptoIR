import { permanentRedirect } from 'next/navigation';

/**
 * A landing da app é o Patrimônio. Qualquer acesso a `/` redireciona
 * permanentemente para `/patrimonio`.
 */
export default function RootPage(): never {
  permanentRedirect('/patrimonio');
}
