'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Box, ChevronDown, Copy, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format-currency';
import { EquipoSelector, CondicionBadge, type Equipo } from './EquipoSelector';
import { EspecificacionesEditor } from '@/components/core-ui/EspecificacionesEditor';
import {
  type EquipoLinea,
  deriveGanancia,
  costoEnMoneda,
  cardSubtotal,
  lineasATotales,
} from '@/lib/precios/equipo-lineas';
import { normalizarMoneda, esMixto } from '@/lib/presupuesto-equipo-totales';
import {
  ProductoEquipoCombobox,
  type ResultadoBusqueda,
} from '@/components/ui/producto-equipo-combobox';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface EquipoLineasEditorProps {
  value: EquipoLinea[];
  onChange: (lineas: EquipoLinea[]) => void;
  moneda: 'ARS' | 'USD';
  onMonedaChange: (m: 'ARS' | 'USD') => void;
  cotizacion: { tipo_cotizacion: 'oficial' | 'blue' | 'mep'; cotizacion_usd: number };
  onCotizacionChange: (c: {
    tipo_cotizacion: 'oficial' | 'blue' | 'mep';
    cotizacion_usd: number;
  }) => void;
  allowProductos?: boolean;
}

export function EquipoLineasEditor({
  value,
  onChange,
  moneda,
  onMonedaChange,
  cotizacion,
  onCotizacionChange,
  allowProductos,
}: EquipoLineasEditorProps) {
  const { data: equiposData } = useSWR<Equipo[]>('/api/equipos', fetcher, {
    dedupingInterval: 60000,
  });
  const equipos = Array.isArray(equiposData) ? equiposData : [];
  const totales = useMemo(() => lineasATotales(value), [value]);
  const mixto = esMixto(totales);

  const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());
  const [mostrarAgregarEquipo, setMostrarAgregarEquipo] = useState(false);
  const [insumoQuery, setInsumoQuery] = useState('');

  // ─── Mutadores ───────────────────────────────────────────────────────────────

  const patch = (id: string, p: Partial<EquipoLinea>) =>
    onChange(value.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const setCosto = (id: string, v: number) => {
    const l = value.find((x) => x.id === id);
    if (!l) return;
    patch(id, { precio_costo: v, ganancia: deriveGanancia(l.precio_unitario, v) });
  };

  const setGanancia = (id: string, val: string) => {
    const l = value.find((x) => x.id === id);
    if (!l) return;
    const g = parseFloat(val);
    const precio =
      l.precio_costo > 0 && !isNaN(g)
        ? Number((l.precio_costo * (1 + g / 100)).toFixed(2))
        : l.precio_unitario;
    patch(id, { ganancia: val, precio_unitario: precio });
  };

  const setPrecio = (id: string, v: number) => {
    const l = value.find((x) => x.id === id);
    if (!l) return;
    patch(id, { precio_unitario: v, ganancia: deriveGanancia(v, l.precio_costo) });
  };

  const quitar = (id: string) => onChange(value.filter((l) => l.id !== id));

  const agregarEquipo = (equipo: Equipo) => {
    if (!equipo?.id) return;
    if (value.some((l) => l.equipo_id === equipo.id)) {
      toast.info('Ese equipo ya está');
      return;
    }
    const lineMoneda = normalizarMoneda((equipo as any).precio_lista_moneda);
    const precio = Number(equipo.precio_lista) || 0;
    const costo = costoEnMoneda(equipo as any, lineMoneda, cotizacion.cotizacion_usd);
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        equipo_id: equipo.id,
        equipo: equipo as any,
        descripcion: `${equipo.marca ?? ''} ${equipo.modelo ?? ''}`.trim(),
        cantidad: 1,
        precio_unitario: precio,
        precio_costo: costo,
        ganancia: deriveGanancia(precio, costo),
        iva_porcentaje: Number((equipo as any).iva) || 10.5,
        descuento_porcentaje: 0,
        moneda: lineMoneda,
        especificaciones: ((equipo as any).especificaciones || {}) as Record<string, unknown>,
        especificaciones_personalizada: false,
        producto_id: null,
      },
    ]);
    setMostrarAgregarEquipo(false);
  };

  const agregarInsumo = (resultado: ResultadoBusqueda, descripcion: string) => {
    const precio = resultado.precio_venta || 0;
    const costo = resultado.precio_costo || 0;
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        equipo_id: null,
        equipo: null,
        producto_id: resultado.id,
        cantidad: 1,
        precio_unitario: precio,
        precio_costo: costo,
        ganancia: deriveGanancia(precio, costo),
        iva_porcentaje: 21,
        descuento_porcentaje: 0,
        moneda: (resultado.moneda ?? 'ARS') as 'ARS' | 'USD',
        descripcion,
        especificaciones: null,
        especificaciones_personalizada: false,
      },
    ]);
    setInsumoQuery('');
  };

  const copyMonto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const toggleSpecs = (id: string) => {
    setExpandedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Box className="w-4 h-4" />
        Equipos
        <Badge variant="outline" className="ml-1 text-[10px]">
          {value.length}
        </Badge>
      </div>

      {/* Cards por línea */}
      {value.map((l) => {
        const isInsumo = !l.equipo_id;
        const sub = cardSubtotal(l);
        const isExpanded = expandedSpecs.has(l.id);

        return (
          <div
            key={l.id}
            className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-3">
              {/* Imagen del equipo (solo equipos) */}
              {!isInsumo && (
                <>
                  {(l.equipo as any)?.imagen_url ? (
                    <img
                      src={(l.equipo as any).imagen_url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Box className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                {/* Header de la línea */}
                <div className="flex items-center gap-2">
                  {isInsumo ? (
                    <p className="font-semibold text-sm truncate">{l.descripcion ?? 'Insumo'}</p>
                  ) : (
                    <>
                      <p className="font-semibold text-sm truncate">
                        {(l.equipo as any)?.marca} {(l.equipo as any)?.modelo}
                      </p>
                      <CondicionBadge condicion={(l.equipo as any)?.condicion} />
                    </>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-medium tabular-nums"
                    title="Moneda de esta línea"
                  >
                    {l.moneda}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => quitar(l.id)}
                    className="ml-auto h-7 w-7 p-0 text-gray-400 hover:text-red-600 flex-shrink-0"
                    title="Quitar"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Campos numéricos */}
                {isInsumo ? (
                  /* Insumo: cantidad / costo / precio / IVA / descuento */
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-500">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={l.cantidad}
                        onChange={(e) =>
                          patch(l.id, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Costo</Label>
                      <NumberInput
                        value={l.precio_costo || ''}
                        onValueChange={(v) => setCosto(l.id, v)}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Precio venta</Label>
                      <NumberInput
                        value={l.precio_unitario || ''}
                        onValueChange={(v) => setPrecio(l.id, v)}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">IVA</Label>
                      <Select
                        value={String(l.iva_porcentaje ?? 21)}
                        onValueChange={(v) => patch(l.id, { iva_porcentaje: parseFloat(v) })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="10.5">10,5%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                          <SelectItem value="27">27%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Descuento %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={l.descuento_porcentaje || ''}
                        onChange={(e) =>
                          patch(l.id, {
                            descuento_porcentaje: Math.min(
                              100,
                              Math.max(0, parseFloat(e.target.value) || 0),
                            ),
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ) : (
                  /* Equipo: cantidad / costo / ganancia% / precio / descuento / IVA */
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-500">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={l.cantidad}
                        onChange={(e) =>
                          patch(l.id, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Costo</Label>
                      <NumberInput
                        value={l.precio_costo || ''}
                        onValueChange={(v) => setCosto(l.id, v)}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Ganancia %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={l.ganancia}
                        onChange={(e) => setGanancia(l.id, e.target.value)}
                        className="h-8 text-sm"
                        placeholder={l.precio_costo > 0 ? '0' : 'Sin costo'}
                        disabled={!(l.precio_costo > 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Precio venta</Label>
                      <NumberInput
                        value={l.precio_unitario || ''}
                        onValueChange={(v) => setPrecio(l.id, v)}
                        className="h-8 text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Descuento %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={l.descuento_porcentaje || ''}
                        onChange={(e) =>
                          patch(l.id, {
                            descuento_porcentaje: Math.min(
                              100,
                              Math.max(0, parseFloat(e.target.value) || 0),
                            ),
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">IVA</Label>
                      <Select
                        value={String(l.iva_porcentaje ?? 10.5)}
                        onValueChange={(v) => patch(l.id, { iva_porcentaje: parseFloat(v) })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="10.5">10,5%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                          <SelectItem value="27">27%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Subtotal de la línea */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-2">
                  <span className="text-[11px] text-gray-500">Subtotal</span>
                  <span
                    className="text-sm font-semibold select-all tabular-nums"
                    title="Clic para seleccionar el monto"
                  >
                    {formatCurrency(sub, l.moneda)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMonto(formatCurrency(sub, l.moneda))}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600 flex-shrink-0"
                    title="Copiar subtotal"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Toggle ficha técnica (solo equipos) */}
            {!isInsumo && (
              <div className="border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => toggleSpecs(l.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
                >
                  <ChevronDown
                    className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')}
                  />
                  <span>Ficha técnica</span>
                  {l.especificaciones_personalizada && (
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 px-1 border-amber-300 text-amber-700"
                    >
                      modificada
                    </Badge>
                  )}
                  {l.especificaciones_personalizada && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        patch(l.id, {
                          especificaciones: ((l.equipo as any)?.especificaciones ||
                            {}) as Record<string, unknown>,
                          especificaciones_personalizada: false,
                        });
                      }}
                      className="ml-auto text-[10px] text-gray-500 hover:text-emerald-600 underline-offset-2 hover:underline"
                    >
                      restaurar del catálogo
                    </button>
                  )}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3">
                    <EspecificacionesEditor
                      value={l.especificaciones ?? {}}
                      onChange={(v) =>
                        patch(l.id, { especificaciones: v, especificaciones_personalizada: true })
                      }
                      categoria={(l.equipo as any)?.categoria}
                      compact
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Agregar equipo */}
      <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 p-3 space-y-2 bg-emerald-50/30 dark:bg-emerald-950/10">
        {mostrarAgregarEquipo ? (
          <>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              {value.length === 0
                ? 'Agregar equipo'
                : 'Agregar equipo (clic en el buscador para sumar)'}
            </span>
            <EquipoSelector
              equipos={equipos.filter((e) => !value.some((l) => l.equipo_id === e.id))}
              selectedId=""
              onSelect={(eq) => {
                if (eq.id) agregarEquipo(eq);
              }}
            />
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMostrarAgregarEquipo(true)}
            className="w-full gap-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            <Plus className="w-4 h-4" />
            {value.length === 0 ? 'Agregar equipo' : 'Agregar otro equipo'}
          </Button>
        )}
      </div>

      {/* Agregar insumo / producto (solo si allowProductos) */}
      {allowProductos && (
        <div className="rounded-lg border border-dashed border-purple-300 dark:border-purple-800 p-3 space-y-2 bg-purple-50/30 dark:bg-purple-950/10">
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Agregar insumo / producto
          </span>
          <ProductoEquipoCombobox
            value={insumoQuery}
            onSelect={(resultado, descripcion) => {
              if (resultado) {
                agregarInsumo(resultado, descripcion);
              } else {
                setInsumoQuery(descripcion);
              }
            }}
            placeholder="Buscar insumo o producto..."
          />
        </div>
      )}

      {/* Moneda + cotización (global al editor) */}
      {mixto ? (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Equipos en <strong>{totales.map((t) => t.moneda).join(' y ')}</strong>. Cada equipo
              se cotiza en su moneda; los totales se muestran por separado y{' '}
              <strong>no se convierten</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-1.5">
            <Label className="text-xs">Moneda</Label>
            <Select value={moneda} onValueChange={(v) => onMonedaChange(v as 'ARS' | 'USD')}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD (Dólares)</SelectItem>
                <SelectItem value="ARS">ARS (Pesos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {moneda === 'USD' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Cotización (1 USD =)</Label>
              <div className="flex gap-1">
                <NumberInput
                  value={cotizacion.cotizacion_usd || ''}
                  onValueChange={(n) =>
                    onCotizacionChange({ ...cotizacion, cotizacion_usd: n || 0 })
                  }
                  className="h-9 text-sm"
                  placeholder="$"
                />
                <Select
                  value={cotizacion.tipo_cotizacion}
                  onValueChange={(v) =>
                    onCotizacionChange({
                      ...cotizacion,
                      tipo_cotizacion: v as 'oficial' | 'blue' | 'mep',
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-sm w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oficial">Oficial</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="mep">MEP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Totales */}
      {value.length > 0 &&
        (mixto ? (
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            {totales.map((t) => (
              <div key={t.moneda} className="flex items-end justify-end gap-4 text-sm">
                <span className="mr-auto text-xs font-semibold text-gray-600 dark:text-gray-300 self-center">
                  Total {t.moneda}
                </span>
                <div className="text-right">
                  <span className="text-gray-500">Subtotal</span>
                  <p className="font-medium select-all tabular-nums">
                    {formatCurrency(t.subtotal, t.moneda)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">IVA</span>
                  <p className="font-medium select-all tabular-nums">
                    {formatCurrency(t.iva, t.moneda)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-600 font-medium">Total</span>
                  <p className="font-bold text-emerald-600 text-base select-all tabular-nums">
                    {formatCurrency(t.total, t.moneda)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyMonto(formatCurrency(t.total, t.moneda))}
                  className="h-7 w-7 p-0 mb-0.5 text-gray-400 hover:text-emerald-600 flex-shrink-0"
                  title={`Copiar total ${t.moneda}`}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          totales.length > 0 && (
            <div className="flex items-end justify-end gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="text-right">
                <span className="text-gray-500">Subtotal</span>
                <p className="font-medium select-all tabular-nums">
                  {formatCurrency(totales[0].subtotal, totales[0].moneda)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">IVA</span>
                <p className="font-medium select-all tabular-nums">
                  {formatCurrency(totales[0].iva, totales[0].moneda)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-emerald-600 font-medium">Total</span>
                <p className="font-bold text-emerald-600 text-base select-all tabular-nums">
                  {formatCurrency(totales[0].total, totales[0].moneda)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyMonto(formatCurrency(totales[0].total, totales[0].moneda))}
                className="h-7 w-7 p-0 mb-0.5 text-gray-400 hover:text-emerald-600 flex-shrink-0"
                title="Copiar total"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          )
        ))}
    </div>
  );
}
