'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { ColumnDef } from '@tanstack/react-table';
import { GenericDataTable } from '@/components/core-ui/GenericDataTable';
import { PrestamoGarantiaFormDialog } from '@/components/core-ui/PrestamoGarantiaFormDialog';
import { PrestamoGarantiaDetailSheet } from '@/components/core-ui/PrestamoGarantiaDetailSheet';
import type { PrestamoGarantia, TipoRegistro } from '@/lib/prestamos-garantias';
import { toast } from 'sonner';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar');
  return Array.isArray(data) ? data : [];
};

/** Estado como pill legible (texto oscuro sobre tinte + punto), igual que en el detalle. */
function EstadoBadge({ estado }: { estado: string }) {
  const devuelto = estado === 'devuelto';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        devuelto
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${devuelto ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {devuelto ? 'Devuelto' : 'Abierto'}
    </span>
  );
}

function getColumns(tipo: TipoRegistro): ColumnDef<PrestamoGarantia>[] {
  const esPrestamo = tipo === 'prestamo';
  return [
    {
      accessorKey: 'fecha_salida',
      header: 'Salida',
      cell: ({ row }) => {
        const f = row.original.fecha_salida;
        return <span>{f ? new Date(f).toLocaleDateString('es-AR') : '-'}</span>;
      },
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => {
        const c = row.original.cliente;
        return <span className="font-medium">{c?.nombre_fantasia || c?.nombre || '-'}</span>;
      },
    },
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.codigo || '-'}</span>,
    },
    {
      id: 'items',
      header: 'Ítems',
      cell: ({ row }) => {
        const items = row.original.items || [];
        const first = items[0]?.descripcion ?? '-';
        return <span className="text-sm">{first}{items.length > 1 ? ` +${items.length - 1}` : ''}</span>;
      },
    },
    {
      id: esPrestamo ? 'remito_salida' : 'numero_orden',
      header: esPrestamo ? 'Remito salida' : 'Nº orden',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {(esPrestamo ? row.original.remito_salida : row.original.numero_orden) || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        return <EstadoBadge estado={row.original.estado} />;
      },
    },
  ];
}

export function RegistroExternoView({ tipo }: { tipo: TipoRegistro }) {
  const esPrestamo = tipo === 'prestamo';
  const { data, isLoading, error, mutate } = useSWR<PrestamoGarantia[]>(
    `/api/prestamos-garantias?tipo=${tipo}`,
    fetcher
  );

  const [selected, setSelected] = useState<PrestamoGarantia | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const handleNew = () => { setSelected(null); setFormOpen(true); };
  const handleRowClick = (r: PrestamoGarantia) => { setSelected(r); setSheetOpen(true); };
  const handleEdit = (r: PrestamoGarantia) => { setSelected(r); setSheetOpen(false); setFormOpen(true); };
  const handleDelete = async (r: PrestamoGarantia) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      const res = await fetch(`/api/prestamos-garantias?id=${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Error');
      toast.success('Eliminado');
      mutate();
    } catch (e: any) { toast.error(e.message); }
  };

  if (error) {
    return <div className="p-6 text-sm text-muted-foreground">Error: {error.message}</div>;
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-hidden">
        <GenericDataTable
          columns={getColumns(tipo)}
          data={data || []}
          isLoading={isLoading}
          pageTitle={esPrestamo ? 'Préstamos' : 'Envíos en garantía'}
          pageDescription={esPrestamo
            ? 'Equipos y repuestos prestados a clientes'
            : 'Ítems enviados en garantía'}
          onRowClick={handleRowClick}
          onNew={handleNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          newLabel={esPrestamo ? 'Nuevo préstamo' : 'Nuevo envío'}
          enableGlobalSearch={true}
          enableAutoFilters={true}
        />
      </div>

      <PrestamoGarantiaDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        registro={selected}
        onEdit={handleEdit}
        onSuccess={() => mutate()}
      />

      <PrestamoGarantiaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tipo={tipo}
        registro={selected}
        onSuccess={() => mutate()}
      />
    </>
  );
}
