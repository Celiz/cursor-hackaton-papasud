'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { Loader2, Undo2, Pencil, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PrestamoGarantia } from '@/lib/prestamos-garantias';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registro: PrestamoGarantia | null;
  onEdit: (r: PrestamoGarantia) => void;
  onSuccess: () => void;
}

/** Estado como pill legible: texto oscuro sobre tinte suave + punto de color (no blanco sobre naranja). */
function EstadoBadge({ devuelto }: { devuelto: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
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

/** Campo con label chico en mayúsculas arriba y valor debajo. */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  const vacio = children == null || children === '' || children === '—';
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm break-words ${vacio ? 'text-muted-foreground/50' : 'text-gray-900 dark:text-gray-100'}`}>
        {vacio ? '—' : children}
      </div>
    </div>
  );
}

export function PrestamoGarantiaDetailSheet({ open, onOpenChange, registro, onEdit, onSuccess }: Props) {
  const [working, setWorking] = useState(false);
  if (!registro) return null;
  const esPrestamo = registro.tipo === 'prestamo';
  const hayAfuera = registro.items.some((i) => i.estado === 'afuera');
  const devuelto = registro.estado === 'devuelto';

  const devolver = async (item_ids?: string[]) => {
    setWorking(true);
    try {
      const res = await fetch(`/api/prestamos-garantias?id=${registro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'devolver', item_ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success('Devolución registrada');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  };

  const clienteNombre = registro.cliente?.nombre_fantasia || registro.cliente?.nombre || '—';
  const titulo = esPrestamo ? 'Préstamo' : 'Envío en garantía';
  const fechaSalida = registro.fecha_salida
    ? new Date(registro.fecha_salida).toLocaleDateString('es-AR')
    : '—';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[85vh] max-h-[85vh] flex-col overflow-hidden bg-white p-0 dark:bg-gray-950"
        title={`${titulo}${registro.codigo ? ` · ${registro.codigo}` : ''}`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 px-4 pb-3 pr-12 pt-4 dark:border-gray-800 sm:px-6 sm:pr-14">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">{titulo}</h2>
                {registro.codigo && (
                  <span className="font-mono text-sm text-muted-foreground">· {registro.codigo}</span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{clienteNombre}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ShareToInternalChatButton
                entity={{
                  type: 'prestamo_garantia',
                  id: registro.id,
                  label: clienteNombre,
                  number: registro.numero_orden || registro.codigo || registro.id.slice(0, 8),
                  link: `/dashboard/servicio-tecnico?tab=prestamos&id=${registro.id}`,
                }}
                variant="icon"
              />
              <EstadoBadge devuelto={devuelto} />
            </div>
          </div>
        </div>

        {/* Cuerpo: ficha (izq) + ítems (der) para llenar el sheet grande */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Ficha lateral */}
          <aside className="shrink-0 overflow-y-auto border-b border-gray-200 bg-gray-50/50 px-4 py-5 dark:border-gray-800 dark:bg-gray-900/30 sm:px-6 lg:w-[360px] lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-1">
              <Campo label="Cliente">{clienteNombre}</Campo>
              <Campo label="Fecha de salida">{fechaSalida}</Campo>
              {esPrestamo ? (
                <>
                  <Campo label="Remito salida">{registro.remito_salida}</Campo>
                  <Campo label="Remito entrada">{registro.remito_entrada}</Campo>
                </>
              ) : (
                <Campo label="Nº orden">{registro.numero_orden}</Campo>
              )}
              <Campo label="Transporte envío">{registro.transporte_envio}</Campo>
              <Campo label="Transporte retorno">{registro.transporte_retorno}</Campo>
            </div>

            {registro.observaciones && (
              <div className="mt-5 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Observaciones
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                  {registro.observaciones}
                </p>
              </div>
            )}
          </aside>

          {/* Panel principal: ítems */}
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">Ítems</span>
                <span className="text-xs text-muted-foreground">({registro.items.length})</span>
              </div>
              {hayAfuera && (
                <Button size="sm" variant="outline" disabled={working} onClick={() => devolver()}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  Devolver todo
                </Button>
              )}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
              {registro.items.map((it) => {
                const itDevuelto = it.estado === 'devuelto';
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
                  >
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 self-start rounded-full ${
                        itDevuelto ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">
                        {it.descripcion}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Cant. {it.cantidad}
                        {it.numero_serie ? ` · Serie ${it.numero_serie}` : ''}
                      </div>
                    </div>
                    {itDevuelto ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Devuelto
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={working}
                        onClick={() => devolver([it.id])}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Undo2 className="h-4 w-4" /> Devolver
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6">
          <Button variant="outline" onClick={() => onEdit(registro)}>
            <Pencil className="mr-1 h-4 w-4" /> Editar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
