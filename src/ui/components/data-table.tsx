'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/button';

export interface DataTableMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface DataTableLabels {
  previousPage: string;
  nextPage: string;
  pageOf: (input: { page: number; totalPages: number; total: number }) => string;
  empty?: string;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: DataTableMeta;
  onPageChange?: (nextPage: number) => void;
  onSortChange?: (sorting: SortingState) => void;
  sorting?: SortingState;
  labels: DataTableLabels;
  className?: string;
}

/**
 * Tabela genérica server-side sobre TanStack Table v8. Não reordena nem pagina
 * localmente — o caller é responsável por trocar `data`/`meta`/`sorting` e
 * traduzir `labels`.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  onPageChange,
  onSortChange,
  sorting,
  labels,
  className,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: sorting ? { sorting } : undefined,
    onSortingChange: (updater) => {
      if (!onSortChange) return;
      const next = typeof updater === 'function' ? updater(sorting ?? []) : updater;
      onSortChange(next);
    },
  });

  const totalPages = meta
    ? Math.max(1, Math.ceil(meta.total / Math.max(1, meta.pageSize)))
    : 1;
  const page = meta?.page ?? 1;
  const canPrev = meta !== undefined && page > 1;
  const canNext = meta !== undefined && page < totalPages;

  return (
    <div data-slot="data-table" className={cn('flex flex-col gap-3', className)}>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/40 text-left">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/60">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="h-10 px-3 align-middle font-medium text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span aria-hidden className="text-xs">
                            {header.column.getIsSorted() === 'asc'
                              ? '↑'
                              : header.column.getIsSorted() === 'desc'
                                ? '↓'
                                : ''}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 px-3 text-center text-muted-foreground"
                >
                  {labels.empty ?? ''}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-muted/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta ? (
        <div
          data-slot="data-table-pagination"
          className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
        >
          <span>{labels.pageOf({ page, totalPages, total: meta.total })}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev}
              onClick={() => onPageChange?.(page - 1)}
            >
              {labels.previousPage}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext}
              onClick={() => onPageChange?.(page + 1)}
            >
              {labels.nextPage}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
