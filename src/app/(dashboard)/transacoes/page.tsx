import { EmptyState } from '@/ui/components/empty-state';
import { t } from '@/lib/i18n';

export default function TransacoesPage() {
  return (
    <EmptyState
      title={t('page.placeholder.heading')}
      description={t('page.placeholder.body')}
    />
  );
}
