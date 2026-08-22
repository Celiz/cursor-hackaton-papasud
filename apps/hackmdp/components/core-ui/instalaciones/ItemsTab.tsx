'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, AlertTriangle, Package, Wrench, MoreVertical, Trash2, ChevronDown } from 'lucide-react';
import { ItemPicker } from './ItemPicker';
import { CambioEstadoDialog } from './CambioEstadoDialog';
import { ItemHistorialTimeline } from './ItemHistorialTimeline';
import { useInstalacionItems } from '@/lib/hooks/use-instalacion-items';
import type { EstadoCompra, InstalacionItem, InstalacionItemInput } from '@locus/core/instalaciones';

interface Props {
  instalacionId: string;
}

const estadoCompraLabels: Record<EstadoCompra, string> = {
  en_stock: 'En stock',
  por_pedir: 'Por pedir',
  pedido: 'Pedido',
  en_camino: 'En camino',
  recibido: 'Recibido',
};

const estadoCompraColors: Record<EstadoCompra, string> = {
  en_stock: 'bg-green-100 text-green-700',
  por_pedir: 'bg-yellow-100 text-yellow-700',
  pedido: 'bg-blue-100 text-blue-700',
  en_camino: 'bg-indigo-100 text-indigo-700',
  recibido: 'bg-teal-100 text-teal-700',
};

function ItemRow({
  item,
  instalacionId,
  isExpanded,
  onToggle,
  onRequestEstadoChange,
  onDelete,
}: {
  item: InstalacionItem & { fuente?: string };
  instalacionId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRequestEstadoChange: (id: string, estado: EstadoCompra) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const Icon = item.tipo_item.startsWith('equipo') ? Package : Wrench;
  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer" onClick={onToggle}>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.es_placeholder && <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />}
            <p className="text-sm font-medium truncate">{item.descripcion}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {item.numero_serie && <span>s/n {item.numero_serie}</span>}
            {item.codigo && <span>· {item.codigo}</span>}
            <span>· cant. {item.cantidad_requerida}</span>
          </div>
        </div>
        <Badge variant="secondary" className={estadoCompraColors[item.estado_compra]}>
          {estadoCompraLabels[item.estado_compra]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(estadoCompraLabels) as EstadoCompra[])
              .filter((e) => e !== item.estado_compra)
              .map((e) => (
                <DropdownMenuItem
                  key={e}
                  onClick={(ev) => { ev.stopPropagation(); onRequestEstadoChange(item.id, e); }}
                >
                  Marcar: {estadoCompraLabels[e]}
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem
              onClick={(ev) => { ev.stopPropagation(); onDelete(item.id); }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Quitar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && (
        <div className="bg-muted/20 border-t">
          <ItemHistorialTimeline instalacionId={instalacionId} itemId={item.id} />
        </div>
      )}
    </div>
  );
}

export function ItemsTab({ instalacionId }: Props) {
  const { equipos, items, mutate, isLoading } = useInstalacionItems(instalacionId);
  const [pickerOpen, setPickerOpen] = useState<'equipo' | 'insumo' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{
    itemId: string;
    itemDescripcion: string;
    estadoActual: EstadoCompra;
    estadoNuevo: EstadoCompra;
  } | null>(null);

  const insumos = items.filter((i) =>
    ['insumo', 'material', 'herramienta'].includes(i.tipo_item)
  );
  const equiposPlaceholder = items.filter((i) =>
    ['equipo_principal', 'equipo_adicional'].includes(i.tipo_item)
  );
  const todosEquipos = [...equipos, ...equiposPlaceholder];

  const handleAdd = async (tipo: 'equipo' | 'insumo', input: InstalacionItemInput) => {
    const res = await fetch(`/api/instalaciones/${instalacionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al agregar');
    }
    await mutate();
  };

  const handleRequestEstadoChange = (itemId: string, estadoNuevo: EstadoCompra) => {
    const allItems = [...todosEquipos, ...insumos];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;
    setDialogState({
      itemId,
      itemDescripcion: item.descripcion,
      estadoActual: item.estado_compra,
      estadoNuevo,
    });
  };

  const handleConfirmEstadoChange = async (data: {
    nota?: string;
    email_thread_id?: string;
    email_subject?: string;
    email_account_id?: string;
  }) => {
    if (!dialogState) return;
    const body: Record<string, any> = {
      estado_compra: dialogState.estadoNuevo,
      ...data,
    };
    if (dialogState.estadoNuevo === 'pedido') body.fecha_pedido = new Date().toISOString();
    if (dialogState.estadoNuevo === 'recibido') body.fecha_recibido = new Date().toISOString();

    const res = await fetch(
      `/api/instalaciones/${instalacionId}/items/${dialogState.itemId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error('Error al cambiar estado');
    await mutate();
    setDialogState(null);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('¿Quitar este item?')) return;
    const res = await fetch(`/api/instalaciones/${instalacionId}/items/${itemId}`, {
      method: 'DELETE',
    });
    if (res.ok) await mutate();
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Cargando items...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Equipos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Equipos ({todosEquipos.length})</h3>
          <Button size="tiny" icon={<Plus />} onClick={() => setPickerOpen('equipo')}>
            Agregar equipo
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          {todosEquipos.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Sin equipos. Agregá uno del stock o como placeholder.
            </div>
          ) : (
            todosEquipos.map((eq) => (
              <ItemRow
                key={eq.id}
                item={eq}
                instalacionId={instalacionId}
                isExpanded={expandedId === eq.id}
                onToggle={() => setExpandedId(expandedId === eq.id ? null : eq.id)}
                onRequestEstadoChange={handleRequestEstadoChange}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Insumos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Insumos y materiales ({insumos.length})</h3>
          <Button size="tiny" icon={<Plus />} onClick={() => setPickerOpen('insumo')}>
            Agregar insumo
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          {insumos.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Sin insumos.
            </div>
          ) : (
            insumos.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                instalacionId={instalacionId}
                isExpanded={expandedId === it.id}
                onToggle={() => setExpandedId(expandedId === it.id ? null : it.id)}
                onRequestEstadoChange={handleRequestEstadoChange}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {pickerOpen && (
        <ItemPicker
          open={true}
          onOpenChange={(o) => !o && setPickerOpen(null)}
          instalacionId={instalacionId}
          tipo={pickerOpen}
          onAdd={(input) => handleAdd(pickerOpen, input)}
        />
      )}

      {dialogState && (
        <CambioEstadoDialog
          open={true}
          onOpenChange={(o) => !o && setDialogState(null)}
          itemDescripcion={dialogState.itemDescripcion}
          estadoActual={dialogState.estadoActual}
          estadoNuevo={dialogState.estadoNuevo}
          estadoLabels={estadoCompraLabels}
          onConfirm={handleConfirmEstadoChange}
        />
      )}
    </div>
  );
}
