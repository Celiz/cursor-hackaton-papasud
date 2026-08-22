'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Heart,
  HeartOff,
  Search,
  Plus,
  Trash2,
  Loader2,
  Package,
  Cpu,
  Tag,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClienteInsumosPreferidosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre: string;
}

interface InsumoPreferido {
  id: string;
  cliente_id: string;
  equipo_unidad_id: string | null;
  equipo_codigo: string | null;
  equipo_descripcion: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  producto_categoria: string | null;
  precio_venta: number;
  es_favorito: boolean;
  marca_preferida: string | null;
  marcas_alternativas: any[];
  cantidad_habitual: number | null;
  notas: string | null;
}

interface Equipo {
  id: string;
  codigo: string;
  numero_serie: string;
  marca: string;
  modelo: string;
  descripcion: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string | null;
  precio_venta: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error');
  return data;
};

export function ClienteInsumosPreferidosDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
}: ClienteInsumosPreferidosDialogProps) {
  const [equipoFiltro, setEquipoFiltro] = useState<string | null>(null);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarAgregarForm, setMostrarAgregarForm] = useState(false);
  const [nuevoInsumo, setNuevoInsumo] = useState({
    producto_id: '',
    equipo_unidad_id: null as string | null,
    es_favorito: false,
    marca_preferida: '',
    cantidad_habitual: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Obtener insumos preferidos del cliente
  const {
    data: insumosData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    open && clienteId ? `/api/clientes/${clienteId}/insumos-preferidos` : null,
    fetcher
  );

  // Obtener todos los productos para el selector
  const { data: productosData } = useSWR(
    open && mostrarAgregarForm && busquedaProducto.length >= 2
      ? `/api/productos?busqueda=${busquedaProducto}&limite=20`
      : null,
    fetcher
  );

  const insumos: InsumoPreferido[] = insumosData?.insumos || [];
  const equipos: Equipo[] = insumosData?.equipos || [];
  const productosDisponibles: Producto[] = Array.isArray(productosData)
    ? productosData
    : productosData?.data || [];

  // Filtrar insumos por equipo
  const insumosFiltrados = useMemo(() => {
    if (!equipoFiltro) return insumos;
    if (equipoFiltro === '_general') {
      return insumos.filter((i) => !i.equipo_unidad_id);
    }
    return insumos.filter(
      (i) => i.equipo_unidad_id === equipoFiltro || !i.equipo_unidad_id
    );
  }, [insumos, equipoFiltro]);

  const handleToggleFavorito = async (insumoId: string, nuevoValor: boolean) => {
    try {
      await fetch(`/api/clientes/${clienteId}/insumos-preferidos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: insumoId, es_favorito: nuevoValor }),
      });
      mutate();
      toast.success(nuevoValor ? 'Marcado como favorito' : 'Favorito removido');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleEliminar = async (insumoId: string) => {
    setEliminandoId(insumoId);
    try {
      await fetch(
        `/api/clientes/${clienteId}/insumos-preferidos?insumo_id=${insumoId}`,
        { method: 'DELETE' }
      );
      mutate();
      toast.success('Insumo eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setEliminandoId(null);
    }
  };

  const handleAgregar = async () => {
    if (!nuevoInsumo.producto_id) {
      toast.error('Selecciona un producto');
      return;
    }

    setGuardando(true);
    try {
      await fetch(`/api/clientes/${clienteId}/insumos-preferidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: nuevoInsumo.producto_id,
          equipo_unidad_id: nuevoInsumo.equipo_unidad_id,
          es_favorito: nuevoInsumo.es_favorito,
          marca_preferida: nuevoInsumo.marca_preferida || null,
          cantidad_habitual: nuevoInsumo.cantidad_habitual
            ? parseFloat(nuevoInsumo.cantidad_habitual)
            : null,
        }),
      });

      mutate();
      toast.success('Insumo agregado');
      setNuevoInsumo({
        producto_id: '',
        equipo_unidad_id: null,
        es_favorito: false,
        marca_preferida: '',
        cantidad_habitual: '',
      });
      setMostrarAgregarForm(false);
      setBusquedaProducto('');
    } catch (error) {
      toast.error('Error al agregar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Insumos Preferidos
          </DialogTitle>
          <DialogDescription>
            Configura los productos/insumos que usa habitualmente{' '}
            <span className="font-medium text-foreground">{clienteNombre}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Filtros y acciones */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <Select
              value={equipoFiltro || '_todos'}
              onValueChange={(v) => setEquipoFiltro(v === '_todos' ? null : v)}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_todos">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Todos los insumos
                  </span>
                </SelectItem>
                <SelectItem value="_general">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Generales (sin equipo)
                  </span>
                </SelectItem>
                {equipos.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    <span className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      {eq.descripcion}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <motion.button
            type="button"
            onClick={() => setMostrarAgregarForm(!mostrarAgregarForm)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              mostrarAgregarForm
                ? 'bg-gray-100 text-gray-700'
                : 'bg-pink-600 text-white hover:bg-pink-700'
            )}
            whileTap={{ scale: 0.96 }}
          >
            {mostrarAgregarForm ? (
              <>
                <X className="h-4 w-4" />
                Cancelar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Agregar Insumo
              </>
            )}
          </motion.button>
        </div>

        {/* Formulario para agregar */}
        <AnimatePresence>
          {mostrarAgregarForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Buscador de producto */}
                  <div className="space-y-2">
                    <Label>Producto *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        placeholder="Buscar producto..."
                        className="pl-9"
                      />
                    </div>
                    {busquedaProducto.length >= 2 && productosDisponibles.length > 0 && (
                      <div className="mt-1 max-h-40 overflow-y-auto border rounded-md bg-white dark:bg-gray-900">
                        {productosDisponibles.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setNuevoInsumo({ ...nuevoInsumo, producto_id: p.id });
                              setBusquedaProducto(p.nombre);
                            }}
                            className={cn(
                              'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between',
                              nuevoInsumo.producto_id === p.id && 'bg-pink-50 dark:bg-pink-900/20'
                            )}
                          >
                            <span>
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                {p.codigo}
                              </span>
                              {p.nombre}
                            </span>
                            {nuevoInsumo.producto_id === p.id && (
                              <Check className="h-4 w-4 text-pink-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selector de equipo */}
                  <div className="space-y-2">
                    <Label>Equipo (opcional)</Label>
                    <Select
                      value={nuevoInsumo.equipo_unidad_id || '_ninguno'}
                      onValueChange={(v) =>
                        setNuevoInsumo({
                          ...nuevoInsumo,
                          equipo_unidad_id: v === '_ninguno' ? null : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="General (todos los equipos)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_ninguno">
                          General (todos los equipos)
                        </SelectItem>
                        {equipos.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Marca preferida */}
                  <div className="space-y-2">
                    <Label>Marca preferida</Label>
                    <Input
                      value={nuevoInsumo.marca_preferida}
                      onChange={(e) =>
                        setNuevoInsumo({ ...nuevoInsumo, marca_preferida: e.target.value })
                      }
                      placeholder="Ej: Roche, Abbott..."
                    />
                  </div>

                  {/* Cantidad habitual */}
                  <div className="space-y-2">
                    <Label>Cantidad habitual</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={nuevoInsumo.cantidad_habitual}
                      onChange={(e) =>
                        setNuevoInsumo({ ...nuevoInsumo, cantidad_habitual: e.target.value })
                      }
                      placeholder="Ej: 10"
                    />
                  </div>
                </div>

                {/* Favorito toggle y botón guardar */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevoInsumo.es_favorito}
                      onChange={(e) =>
                        setNuevoInsumo({ ...nuevoInsumo, es_favorito: e.target.checked })
                      }
                      className="sr-only"
                    />
                    <motion.div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        nuevoInsumo.es_favorito
                          ? 'bg-pink-500 border-pink-500'
                          : 'border-gray-300'
                      )}
                      whileTap={{ scale: 0.9 }}
                    >
                      {nuevoInsumo.es_favorito && <Heart className="h-3 w-3 text-white fill-white" />}
                    </motion.div>
                    <span className="text-sm">Marcar como favorito</span>
                  </label>

                  <Button
                    onClick={handleAgregar}
                    disabled={!nuevoInsumo.producto_id || guardando}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Insumo
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de insumos */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              Error al cargar insumos
            </div>
          ) : insumosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Sin insumos configurados</p>
              <p className="text-sm">
                Agrega los productos que este cliente usa habitualmente
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {insumosFiltrados.map((insumo, idx) => (
                  <motion.div
                    key={insumo.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      'p-3 border rounded-lg flex items-center gap-3 transition-colors',
                      insumo.es_favorito
                        ? 'bg-pink-50 border-pink-200 dark:bg-pink-950/20 dark:border-pink-800'
                        : 'bg-white dark:bg-gray-900 border-gray-200'
                    )}
                  >
                    {/* Botón favorito */}
                    <motion.button
                      type="button"
                      onClick={() => handleToggleFavorito(insumo.id, !insumo.es_favorito)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        insumo.es_favorito
                          ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-pink-500'
                      )}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Heart
                        className={cn('h-4 w-4', insumo.es_favorito && 'fill-current')}
                      />
                    </motion.button>

                    {/* Info del producto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          {insumo.producto_codigo}
                        </span>
                        <span className="font-medium text-sm">{insumo.producto_nombre}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {insumo.equipo_descripcion && insumo.equipo_descripcion !== 'Todos los equipos' && (
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            <Cpu className="h-3 w-3 mr-1" />
                            {insumo.equipo_descripcion}
                          </Badge>
                        )}
                        {insumo.marca_preferida && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            <Tag className="h-3 w-3 mr-1" />
                            {insumo.marca_preferida}
                          </Badge>
                        )}
                        {insumo.cantidad_habitual && (
                          <span className="text-xs text-green-600">
                            Cant: {insumo.cantidad_habitual}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precio */}
                    <div className="text-right shrink-0">
                      <p className="font-medium text-sm">
                        ${insumo.precio_venta?.toLocaleString('es-AR') || '0'}
                      </p>
                    </div>

                    {/* Botón eliminar */}
                    <motion.button
                      type="button"
                      onClick={() => handleEliminar(insumo.id)}
                      disabled={eliminandoId === insumo.id}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      whileTap={{ scale: 0.9 }}
                    >
                      {eliminandoId === insumo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer con estadísticas */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <span>
            {insumos.length} insumo{insumos.length !== 1 ? 's' : ''} configurado
            {insumos.length !== 1 ? 's' : ''}
          </span>
          <span>
            {insumos.filter((i) => i.es_favorito).length} favorito
            {insumos.filter((i) => i.es_favorito).length !== 1 ? 's' : ''}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
