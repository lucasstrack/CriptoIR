'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  /** Se `true`, o dialog está visível. Controlado pelo consumidor. */
  open: boolean;
  /** Chamado quando o usuário solicita fechamento (overlay/Esc/botão). */
  onOpenChange: (open: boolean) => void;
  /** Título visível (já traduzido via `t(key)`). */
  title: string;
  /** Descrição auxiliar opcional (já traduzida). */
  description?: string;
  /** Rótulo do botão fechar (já traduzido). */
  closeLabel: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Primitiva mínima de modal — overlay + caixa centralizada + close button.
 *
 * Sem dependência externa (Radix, shadcn/dialog etc.) porque a Onda 3
 * quer superfície pequena e testável com `@testing-library/react`. O
 * consumidor controla `open`/`onOpenChange`.
 *
 * Teclado: `Escape` fecha. Foco é dado ao botão "fechar" na abertura.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  className,
}: DialogProps) {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div
      data-slot="dialog-overlay"
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'w-full max-w-md rounded-lg border border-border/60 bg-card p-6 shadow-lg',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={closeLabel}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
