import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título curto (ex.: "Algo deu errado"). */
  title: string;
  /** Mensagem auxiliar opcional. */
  description?: string;
  /** Handler do botão de retry. Se ausente, o botão não aparece. */
  onRetry?: () => void;
  /** Rótulo do botão de retry (já traduzido pelo caller). */
  retryLabel?: string;
}

/**
 * Primitiva genérica de erro. Igual ao EmptyState: a cópia nunca vem
 * hardcoded, o consumidor passa strings via `t(key)`.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-10 text-center',
        className,
      )}
      {...props}
    >
      <h3 className="text-lg font-medium text-destructive">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {onRetry && retryLabel ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
