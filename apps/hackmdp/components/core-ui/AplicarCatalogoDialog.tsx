'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  diffEspecificaciones,
  hayDiferencias,
  type Especificaciones,
} from '@/lib/especificaciones-diff';

interface AplicarCatalogoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipoId: string;
  /** Specs actuales del presupuesto (editadas en el form). */
  especificaciones: Especificaciones;
  /** Specs actuales del catálogo del equipo. */
  catalogo: Especificaciones;
  /** Se llama tras propagar con éxito, con las specs nuevas del catálogo. */
  onApplied: (nuevoCatalogo: Especificaciones) => void;
}

export function AplicarCatalogoDialog({
  open,
  onOpenChange,
  equipoId,
  especificaciones,
  catalogo,
  onApplied,
}: AplicarCatalogoDialogProps) {
  const diff = useMemo(
    () => diffEspecificaciones(especificaciones, catalogo),
    [especificaciones, catalogo],
  );

  // Todas las claves del diff, tildadas por defecto.
  const todasLasClaves = useMemo(
    () => [
      ...diff.agregadas.map((c) => c.clave),
      ...diff.cambiadas.map((c) => c.clave),
      ...diff.quitadas.map((c) => c.clave),
    ],
    [diff],
  );
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    () => new Set(todasLasClaves),
  );
  const [loading, setLoading] = useState(false);

  // Re-sincroniza la selección cuando cambian las specs (diálogo reabierto con
  // otros datos) o al abrirlo: todas las claves del diff quedan tildadas.
  const clavesKey = todasLasClaves.join(' ');
  useEffect(() => {
    setSeleccionadas(new Set(todasLasClaves));
  }, [clavesKey, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (clave: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  const aplicar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/presupuestos-equipos/aplicar-catalogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipo_id: equipoId,
          especificaciones,
          claves: Array.from(seleccionadas),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar en el catálogo');
      }
      const data = await res.json();
      toast.success('Catálogo actualizado');
      onApplied(data.especificaciones);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar en el catálogo');
    } finally {
      setLoading(false);
    }
  };

  const fila = (
    clave: string,
    etiqueta: string,
    detalle: string,
  ) => (
    <div
      key={clave}
      role="button"
      tabIndex={0}
      onClick={() => toggle(clave)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle(clave);
        }
      }}
      className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
    >
      <Checkbox
        checked={seleccionadas.has(clave)}
        className="mt-0.5 pointer-events-none"
        tabIndex={-1}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {clave} <span className="text-xs font-normal text-gray-400">· {etiqueta}</span>
        </p>
        <p className="text-xs text-gray-500 break-words">{detalle}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Guardar especificaciones en el catálogo</DialogTitle>
          <DialogDescription>
            Estos cambios se van a aplicar al catálogo del equipo y afectarán
            presupuestos futuros. Destildá los que sean solo para este cliente.
          </DialogDescription>
        </DialogHeader>

        {!hayDiferencias(diff) ? (
          <p className="text-sm text-gray-500 py-4">
            Las especificaciones del presupuesto ya coinciden con el catálogo.
          </p>
        ) : (
          <ScrollArea className="max-h-[320px] pr-2">
            <div className="space-y-0.5">
              {diff.agregadas.map((c) =>
                fila(c.clave, 'nueva', `Se agrega: ${c.valorPresupuesto}`),
              )}
              {diff.cambiadas.map((c) =>
                fila(
                  c.clave,
                  'cambiada',
                  `${c.valorCatalogo} → ${c.valorPresupuesto}`,
                ),
              )}
              {diff.quitadas.map((c) =>
                fila(c.clave, 'quitada', `Se elimina: ${c.valorCatalogo}`),
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={aplicar}
            disabled={loading || !hayDiferencias(diff) || seleccionadas.size === 0}
          >
            {loading ? 'Guardando...' : `Aplicar ${seleccionadas.size} al catálogo`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
