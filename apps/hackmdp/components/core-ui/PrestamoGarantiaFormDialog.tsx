'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { searchClientes } from '@/hooks/use-client-search';
import {
  ProductoEquipoCombobox, type ResultadoBusqueda,
} from '@/components/ui/producto-equipo-combobox';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { RenglonInput, TipoRegistro, PrestamoGarantia } from '@/lib/prestamos-garantias';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: TipoRegistro;
  registro?: PrestamoGarantia | null;
  onSuccess: () => void;
}

const emptyHeader = {
  cliente_id: '',
  codigo: '',
  fecha_salida: '',
  transporte_envio: '',
  remito_salida: '',
  remito_entrada: '',
  numero_orden: '',
  observaciones: '',
};

// Renglón con el id del ítem existente (presente sólo al editar) para poder
// actualizar/eliminar renglones puntuales sin recrear el registro.
type RenglonEditable = RenglonInput & { id?: string };

export function PrestamoGarantiaFormDialog({ open, onOpenChange, tipo, registro, onSuccess }: Props) {
  const esPrestamo = tipo === 'prestamo';
  const esEdicion = !!registro;

  const [header, setHeader] = useState({ ...emptyHeader });
  const [renglones, setRenglones] = useState<RenglonEditable[]>([]);
  const [pendingEquipo, setPendingEquipo] = useState<ResultadoBusqueda | null>(null);
  const [pendingUnidad, setPendingUnidad] = useState<string>('');
  const [comboKey, setComboKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (registro) {
      setHeader({
        cliente_id: registro.cliente_id || '',
        codigo: registro.codigo || '',
        fecha_salida: registro.fecha_salida ? new Date(registro.fecha_salida).toISOString().slice(0, 10) : '',
        transporte_envio: registro.transporte_envio || '',
        remito_salida: registro.remito_salida || '',
        remito_entrada: registro.remito_entrada || '',
        numero_orden: registro.numero_orden || '',
        observaciones: registro.observaciones || '',
      });
      setRenglones(
        registro.items.map((i) => ({
          id: i.id,
          tipo_item: i.tipo_item, equipo_id: i.equipo_id, equipo_unidad_id: i.equipo_unidad_id,
          producto_id: i.producto_id, numero_serie: i.numero_serie, descripcion: i.descripcion, cantidad: i.cantidad,
        }))
      );
    } else {
      setHeader({ ...emptyHeader });
      setRenglones([]);
    }
    setPendingEquipo(null);
    setPendingUnidad('');
  }, [open, registro]);

  const onSelectBusqueda = (r: ResultadoBusqueda | null, descripcion: string) => {
    if (!r) return;
    if (r.tipo === 'equipo') {
      // Requiere elegir unidad si hay stock serializado; si no, se agrega sin unidad.
      if (r.unidades_stock && r.unidades_stock.length > 0) {
        setPendingEquipo(r);
        // Default a la primera unidad para que el préstamo/garantía marque
        // inventario por defecto; "(sin unidad específica)" queda como opción explícita.
        setPendingUnidad(r.unidades_stock[0].id);
      } else {
        setRenglones((prev) => [
          ...prev,
          { tipo_item: 'equipo', equipo_id: r.id, equipo_unidad_id: null, producto_id: null, numero_serie: null, descripcion: descripcion || `${r.marca ?? ''} ${r.modelo ?? ''}`.trim(), cantidad: 1 },
        ]);
        setComboKey((k) => k + 1);
      }
    } else {
      setRenglones((prev) => [
        ...prev,
        { tipo_item: 'producto', equipo_id: null, equipo_unidad_id: null, producto_id: r.id, numero_serie: null, descripcion: descripcion || r.nombre, cantidad: 1 },
      ]);
      setComboKey((k) => k + 1);
    }
  };

  const confirmarEquipoUnidad = () => {
    if (!pendingEquipo) return;
    const u = pendingEquipo.unidades_stock?.find((x) => x.id === pendingUnidad);
    setRenglones((prev) => [
      ...prev,
      {
        tipo_item: 'equipo', equipo_id: pendingEquipo.id, equipo_unidad_id: u?.id ?? null,
        producto_id: null, numero_serie: u?.numero_serie ?? null,
        descripcion: `${pendingEquipo.marca ?? ''} ${pendingEquipo.modelo ?? ''}`.trim() + (u ? ` — ${u.numero_serie}` : ''),
        cantidad: 1,
      },
    ]);
    setPendingEquipo(null);
    setPendingUnidad('');
    setComboKey((k) => k + 1);
  };

  const setCantidad = (idx: number, v: number) =>
    setRenglones((prev) => prev.map((r, i) => (i === idx ? { ...r, cantidad: v } : r)));
  const setDescripcion = (idx: number, v: string) =>
    setRenglones((prev) => prev.map((r, i) => (i === idx ? { ...r, descripcion: v } : r)));
  const quitarRenglon = (idx: number) => setRenglones((prev) => prev.filter((_, i) => i !== idx));

  const guardar = async () => {
    if (renglones.length === 0) {
      toast.error(
        esEdicion
          ? 'Un préstamo debe tener al menos un ítem. Para eliminarlo, usá la papelera de la lista.'
          : 'Agregá al menos un ítem'
      );
      return;
    }
    if (renglones.some((r) => !r.descripcion.trim())) {
      toast.error('Cada ítem necesita una descripción');
      return;
    }
    setSaving(true);
    try {
      let res: Response;
      if (esEdicion) {
        res = await fetch(`/api/prestamos-garantias?id=${registro!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: header.cliente_id || null,
            codigo: header.codigo || null,
            fecha_salida: header.fecha_salida || null,
            transporte_envio: header.transporte_envio || null,
            remito_salida: esPrestamo ? header.remito_salida || null : null,
            remito_entrada: esPrestamo ? header.remito_entrada || null : null,
            numero_orden: !esPrestamo ? header.numero_orden || null : null,
            observaciones: header.observaciones || null,
            // Renglones existentes: se actualiza su texto/cantidad y se eliminan
            // los que el usuario quitó (los que ya no aparecen en la lista).
            items: renglones
              .filter((r) => r.id)
              .map((r) => ({ id: r.id, descripcion: r.descripcion.trim(), cantidad: r.cantidad })),
          }),
        });
      } else {
        res = await fetch('/api/prestamos-garantias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            cliente_id: header.cliente_id || null,
            codigo: header.codigo || null,
            fecha_salida: header.fecha_salida || null,
            transporte_envio: header.transporte_envio || null,
            remito_salida: header.remito_salida || null,
            remito_entrada: header.remito_entrada || null,
            numero_orden: header.numero_orden || null,
            observaciones: header.observaciones || null,
            renglones,
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      toast.success(esEdicion ? 'Actualizado' : 'Creado');
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const titulo = `${esEdicion ? 'Editar' : 'Nuevo'} ${esPrestamo ? 'préstamo' : 'envío en garantía'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <SearchableCombobox
                value={header.cliente_id}
                onValueChange={(v) => setHeader({ ...header, cliente_id: v })}
                searchFn={searchClientes}
                placeholder="Buscar cliente..."
                defaultSelectedOption={
                  registro?.cliente
                    ? {
                        value: registro.cliente.id,
                        label:
                          registro.cliente.nombre_fantasia || registro.cliente.nombre || 'Cliente',
                      }
                    : undefined
                }
              />
            </div>
            <div>
              <Label>Código / referencia</Label>
              <Input value={header.codigo} onChange={(e) => setHeader({ ...header, codigo: e.target.value })} />
            </div>
            <div>
              <Label>Fecha de salida</Label>
              <Input type="date" value={header.fecha_salida} onChange={(e) => setHeader({ ...header, fecha_salida: e.target.value })} />
            </div>
            <div>
              <Label>Transporte (envío)</Label>
              <Input value={header.transporte_envio} onChange={(e) => setHeader({ ...header, transporte_envio: e.target.value })} />
            </div>
            {esPrestamo ? (
              <>
                <div>
                  <Label>Remito de salida</Label>
                  <Input value={header.remito_salida} onChange={(e) => setHeader({ ...header, remito_salida: e.target.value })} />
                </div>
                <div>
                  <Label>Remito de entrada</Label>
                  <Input value={header.remito_entrada} onChange={(e) => setHeader({ ...header, remito_entrada: e.target.value })} />
                </div>
              </>
            ) : (
              <div>
                <Label>Número de orden</Label>
                <Input value={header.numero_orden} onChange={(e) => setHeader({ ...header, numero_orden: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea value={header.observaciones} onChange={(e) => setHeader({ ...header, observaciones: e.target.value })} rows={2} />
          </div>

          <div className="border-t pt-3">
            <Label className="mb-2 block">Ítems</Label>
            {esEdicion ? (
              <p className="text-xs text-muted-foreground mb-2">
                Podés editar el texto de cada ítem o quitarlo. Para agregar ítems nuevos, creá otro registro.
              </p>
            ) : (
              <>
                <ProductoEquipoCombobox
                  key={comboKey}
                  value=""
                  onSelect={onSelectBusqueda}
                  placeholder="Buscar equipo o repuesto/insumo..."
                />
                {pendingEquipo && (
                  <div className="flex items-end gap-2 mt-2 p-2 rounded-md bg-muted/40">
                    <div className="flex-1">
                      <Label className="text-xs">Unidad / serie</Label>
                      <select
                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                        value={pendingUnidad}
                        onChange={(e) => setPendingUnidad(e.target.value)}
                      >
                        <option value="">(sin unidad específica)</option>
                        {pendingEquipo.unidades_stock?.map((u) => (
                          <option key={u.id} value={u.id}>{u.numero_serie}</option>
                        ))}
                      </select>
                    </div>
                    <Button type="button" size="sm" onClick={confirmarEquipoUnidad}>
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPendingEquipo(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}

            <div className="mt-3 space-y-2">
              {renglones.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin ítems.</p>
              )}
              {renglones.map((r, idx) => (
                <div key={r.id ?? idx} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5">
                  <Input
                    className="flex-1 h-8"
                    value={r.descripcion}
                    placeholder="Descripción del ítem"
                    onChange={(e) => setDescripcion(idx, e.target.value)}
                  />
                  <Input
                    type="number" min={1} className="w-16 h-8"
                    value={r.cantidad}
                    onChange={(e) => setCantidad(idx, Number(e.target.value))}
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => quitarRenglon(idx)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {esEdicion ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
