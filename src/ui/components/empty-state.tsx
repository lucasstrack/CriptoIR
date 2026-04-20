import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título curto do estado vazio. */
  title: string;
  /** Mensagem auxiliar opcional. */
  description?: string;
  /** Ícone opcional renderizado acima do título. */
  icon?: React.ReactNode;
  /** Ação opcional (ex.: botão "Adicionar carteira"). */
  action?: React.ReactNode;
}

/**
 * Primitiva genérica de "vazio" usada por Patrimônio, Carteiras e
 * Transações. Não embute cópia — recebe `title`/`description` já
 * traduzidos via `t(key)`.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
