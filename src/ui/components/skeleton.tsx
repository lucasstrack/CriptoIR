import * as React from 'react';
import { cn } from '@/lib/utils';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Primitiva de skeleton visual — placeholder animado enquanto o conteúdo
 * real carrega. Aceita `className` para ditar dimensões; não renderiza
 * texto hardcoded.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      {...props}
    />
  );
}
