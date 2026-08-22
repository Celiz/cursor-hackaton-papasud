'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Package, Search } from 'lucide-react';
import type { InstalacionItemInput } from '@locus/core/instalaciones';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instalacionId: string;
  tipo: 'equipo' | 'insumo';
  onAdd: (input: InstalacionItemInput) => Promise<void>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

export function ItemPicker({ open, onOpenChange, instalacionId, tipo, onAdd }: Props) {
  const [tab, setTab] = useState<'stock' | 'placeholder'>('stock');
  const [search, setSearch] = useState('');
  const [placeholderDesc, setPlaceholderDesc] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Stock source: equipos_unidades (para equipos) o productos (para insumos)
  const stockUrl =
    tipo === 'equipo'
      ? `/api/equipos-unidades?estado=stock${search ? `&search=${encodeURIComponent(search)}` : ''}`
      : `/api/productos?q=${encodeURIComponent(search)}&stock_positive=true`;

  const { data: stockData = [] } = useSWR(open ? stockUrl : null, fetcher);
  const stockList = Array.isArray(stockData) ? stockData : stockData?.rows || [];

  const handleSelectStock = async (row: any) => {
    setSubmitting(true);
    try {
      const equipoLabel =
        tipo === 'equipo'
          ? [row.equipo_marca, row.equipo_modelo].filter(Boolean).join(' ') ||
            row.equipo_tipo ||
            'Equipo'
          : '';
      const input: InstalacionItemInput =
        tipo === 'equipo'
          ? {
              tipo_item: 'equipo_principal',
              equipo_unidad_id: row.id,
              es_placeholder: false,
              descripcion: equipoLabel,
              cantidad_requerida: 1,
              estado_compra: 'en_stock',
            }
          : {
              tipo_item: 'insumo',
              producto_id: row.id,
              es_placeholder: false,
              descripcion: row.descripcion || row.nombre || 'Producto',
              cantidad_requerida: cantidad,
              estado_compra: 'en_stock',
            };
      await onAdd(input);
      onOpenChange(false);
      setSearch('');
      setCantidad(1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPlaceholder = async () => {
    if (!placeholderDesc.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({
        tipo_item: tipo === 'equipo' ? 'equipo_principal' : 'insumo',
        es_placeholder: true,
        placeholder_descripcion: placeholderDesc,
        descripcion: placeholderDesc,
        cantidad_requerida: cantidad,
        estado_compra: 'por_pedir',
      });
      onOpenChange(false);
      setPlaceholderDesc('');
      setCantidad(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Agregar {tipo === 'equipo' ? 'equipo' : 'insumo'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'stock' | 'placeholder')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="stock">
              <Package className="h-4 w-4 mr-2" /> Del stock
            </TabsTrigger>
            <TabsTrigger value="placeholder">
              <AlertTriangle className="h-4 w-4 mr-2" /> Placeholder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  tipo === 'equipo'
                    ? 'Buscar por código, número de serie o modelo...'
                    : 'Buscar por código o descripción...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {tipo === 'insumo' && (
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                />
              </div>
            )}

            <div className="max-h-80 overflow-y-auto border rounded">
              {stockList.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Sin resultados
                </div>
              ) : (
                stockList.map((row: any) => {
                  const equipoLabel =
                    tipo === 'equipo'
                      ? [row.equipo_marca, row.equipo_modelo]
                          .filter(Boolean)
                          .join(' ') ||
                        row.equipo_tipo ||
                        'Equipo sin marca/modelo'
                      : row.descripcion || row.nombre || 'Producto';
                  return (
                    <button
                      key={row.id}
                      disabled={submitting}
                      onClick={() => handleSelectStock(row)}
                      className="w-full text-left px-4 py-3 hover:bg-muted border-b last:border-b-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">{equipoLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {tipo === 'equipo'
                            ? `${row.codigo || '—'} · s/n ${row.numero_serie || '—'}${row.equipo_tipo ? ` · ${row.equipo_tipo}` : ''}`
                            : `${row.codigo || '—'} · Stock: ${row.stock_actual ?? row.stock ?? '?'}`}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="placeholder" className="space-y-3">
            <div>
              <Label>Descripción</Label>
              <Input
                placeholder={
                  tipo === 'equipo'
                    ? 'Ej: Split 3000 frigorías (pendiente de confirmar unidad)'
                    : 'Ej: Caño especial 3m — pedir a proveedor X'
                }
                value={placeholderDesc}
                onChange={(e) => setPlaceholderDesc(e.target.value)}
              />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value) || 1)}
              />
            </div>
            <Button
              onClick={handleSubmitPlaceholder}
              disabled={submitting || !placeholderDesc.trim()}
              className="w-full"
            >
              Agregar placeholder
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
