import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DataTable, type DataTableLabels } from '@/ui/components/data-table';

interface Row {
  id: string;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: () => 'Nome',
    cell: ({ row }) => row.original.name,
  },
];

const labels: DataTableLabels = {
  previousPage: 'Anterior',
  nextPage: 'Próxima',
  pageOf: ({ page, totalPages }) => `Página ${page} de ${totalPages}`,
  empty: 'Nenhum registro',
};

describe('DataTable', () => {
  afterEach(() => cleanup());

  it('renderiza uma linha por item de data', () => {
    const data: Row[] = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Bravo' },
    ];
    render(<DataTable<Row, unknown> columns={columns} data={data} labels={labels} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('exibe empty label quando data esta vazio', () => {
    render(<DataTable<Row, unknown> columns={columns} data={[]} labels={labels} />);
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();
  });

  it('paginacao server-side: pageOf usa meta e botoes disparam onPageChange', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable<Row, unknown>
        columns={columns}
        data={[{ id: '1', name: 'Alpha' }]}
        meta={{ total: 60, page: 2, pageSize: 25 }}
        onPageChange={onPageChange}
        labels={labels}
      />,
    );

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('desabilita previous na primeira pagina e next na ultima', () => {
    const { rerender } = render(
      <DataTable<Row, unknown>
        columns={columns}
        data={[{ id: '1', name: 'A' }]}
        meta={{ total: 25, page: 1, pageSize: 25 }}
        labels={labels}
      />,
    );
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();

    rerender(
      <DataTable<Row, unknown>
        columns={columns}
        data={[{ id: '1', name: 'A' }]}
        meta={{ total: 50, page: 2, pageSize: 25 }}
        labels={labels}
      />,
    );
    expect(screen.getByRole('button', { name: 'Anterior' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('sem meta nao renderiza paginacao', () => {
    render(
      <DataTable<Row, unknown>
        columns={columns}
        data={[{ id: '1', name: 'A' }]}
        labels={labels}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
  });
});
