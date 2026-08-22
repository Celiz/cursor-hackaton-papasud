"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { ProductosMultiPicker, type ProductoPick } from "@/components/core-ui/ProductosMultiPicker";
import { searchClientes } from "@/hooks/use-client-search";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2, Plus, Trash2, DollarSign, Percent, RefreshCw,
  Search, Package, Eye, FileText, User, Building2,
  CreditCard, Check, GripVertical, Sparkles, Target, BookOpen, ExternalLink
} from "lucide-react";
import { Presupuesto, Cliente } from "@/lib/types";
import { CrearClienteRapidoDialog } from "./CrearClienteRapidoDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";

interface DefaultEquipo {
  id: string;
  marca: string;
  modelo: string;
}

interface PresupuestoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuesto?: Presupuesto | null;
  defaultClienteId?: string;
  defaultPersonaId?: string;
  defaultOportunidadId?: string;
  defaultEquipo?: DefaultEquipo | null;
  onSuccess: () => void;
}

interface LineaPresupuesto {
  id: string;
  producto_id?: string;
  catalogo_item_id?: string;
  descripcion: string;
  cantidad: number;
  precio_costo: number;
  margen_manual?: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  moneda_original?: string;
  imagen_url?: string;
  codigo?: string;
}

interface ListaPrecios {
  id: string;
  nombre: string;
  codigo: string;
  margen_porcentaje: number;
}

interface Cotizacion {
  valor_venta: number;
  valor_compra: number;
  fecha: string;
  tipo: string;
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  precio_venta: number;
  precio_costo: number;
  stock_actual: number;
  imagen_url?: string;
  moneda?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
};

const fetcherArray = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return Array.isArray(data) ? data : [];
};

const generateId = () => Math.random().toString(36).substring(2, 9);

// Tipo de resultado unificado para busqueda
interface SearchResult {
  id: string;
  tipo: 'producto' | 'equipo' | 'equipo_unidad' | 'catalogo';
  codigo: string;
  nombre: string;
  precio_venta: number;
  precio_costo: number;
  stock_actual: number;
  imagen_url?: string;
  moneda?: string;
  // Campos adicionales de equipo
  marca?: string;
  modelo?: string;
  unidades_count?: number;
  // Campos adicionales de equipo_unidad (stock)
  numero_serie?: string;
  condicion?: string;
  tipo_equipo?: string;
  precio_lista?: number;
  equipo_unidad_id?: string;
  // Campos adicionales de catálogo de proveedores
  catalogo_item_id?: string;
  proveedor_nombre?: string;
  markup_default?: number;
}

// ============================================
// COMPONENTE: Fila de resultado del buscador
// ============================================
function ResultRow({
  result,
  active,
  precioMostrar,
  onSelect,
}: {
  result: SearchResult;
  active: boolean;
  precioMostrar: number;
  onSelect: (r: SearchResult) => void;
}) {
  return (
    <div
      onClick={() => onSelect(result)}
      className={cn(
        "px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-center gap-3",
        active ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      )}
    >
      {/* Icono de tipo */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        result.tipo === 'equipo_unidad'
          ? "bg-emerald-100 dark:bg-emerald-900/40"
          : result.tipo === 'equipo'
            ? "bg-blue-100 dark:bg-blue-900/40"
            : result.tipo === 'catalogo'
              ? "bg-amber-100 dark:bg-amber-900/40"
              : "bg-emerald-100 dark:bg-emerald-900/40"
      )}>
        {result.tipo === 'equipo_unidad' ? (
          <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : result.tipo === 'equipo' ? (
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : result.tipo === 'catalogo' ? (
          <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            result.tipo === 'equipo_unidad'
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : result.tipo === 'equipo'
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : result.tipo === 'catalogo'
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          )}>
            {result.tipo === 'equipo_unidad' ? 'EN STOCK' : result.tipo === 'equipo' ? 'EQUIPO' : result.tipo === 'catalogo' ? 'CATALOGO' : result.codigo}
          </span>
          {result.tipo === 'equipo_unidad' && result.condicion && (
            <span className="text-[9px] px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
              {result.condicion}
            </span>
          )}
          {result.moneda === 'USD' && (
            <span className="text-[9px] px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">USD</span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
          {result.nombre}
        </p>
        {(result.tipo === 'producto' || result.tipo === 'catalogo') && result.marca && (
          <p className="text-[10px] text-muted-foreground truncate">{result.marca}</p>
        )}
        {result.tipo === 'equipo_unidad' && result.numero_serie && (
          <p className="text-[10px] text-muted-foreground font-mono">
            S/N: {result.numero_serie}
          </p>
        )}
        {result.tipo === 'catalogo' && result.proveedor_nombre && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Proveedor: {result.proveedor_nombre}
          </p>
        )}
      </div>

      {/* Precio/Stock */}
      <div className="text-right flex-shrink-0">
        {result.tipo === 'catalogo' && result.precio_costo > 0 ? (
          <>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(result.precio_venta)}
            </p>
            <p className="text-[10px] text-gray-400">
              Costo: {formatCurrency(result.precio_costo)}
            </p>
          </>
        ) : result.tipo === 'catalogo' ? (
          <p className="text-xs text-gray-400">A cotizar</p>
        ) : result.tipo === 'equipo_unidad' && result.precio_lista ? (
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(result.precio_lista)}
          </p>
        ) : result.tipo === 'producto' && precioMostrar > 0 ? (
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(precioMostrar)}
          </p>
        ) : result.tipo === 'equipo' ? (
          <>
            {result.precio_lista ? (
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(result.precio_lista)}
              </p>
            ) : null}
            <p className="text-[10px] text-blue-600 dark:text-blue-400">
              {result.unidades_count || 0} unid.
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">A cotizar</p>
        )}
        {result.tipo === 'producto' && (
          <p className="text-[10px] text-gray-400">Stock: {result.stock_actual}</p>
        )}
      </div>

      {/* Link a ficha: solo productos con id real */}
      {result.tipo === 'producto' && result.id && (
        <button
          type="button"
          title="Ver ficha del producto"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/dashboard/productos/${result.id}`, '_blank', 'noopener,noreferrer');
          }}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Buscador de Productos y Equipos
// ============================================
function ProductoSearchInput({
  linea,
  onSelect,
  cotizacionUsd,
  listaMargen,
}: {
  linea: LineaPresupuesto;
  onSelect: (producto: Producto | null, descripcion: string) => void;
  cotizacionUsd: number;
  listaMargen: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(linea.descripcion);
  const [resultados, setResultados] = useState<SearchResult[]>([]);
  const [insumosPorEquipo, setInsumosPorEquipo] = useState<
    Array<{ equipo: { id: string; marca: string | null; modelo: string | null }; insumos: SearchResult[] }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'productos' | 'equipos' | 'catalogo'>('todos');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Search productos, equipos catálogo y unidades en stock con debounce
  const searchAll = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResultados([]);
      setInsumosPorEquipo([]);
      return;
    }

    setLoading(true);
    try {
      // Buscar en paralelo productos, equipos catálogo, unidades en stock, catálogo proveedores e insumos por equipo
      const [productosRes, equiposRes, stockRes, catalogoRes, insumosEquipoRes] = await Promise.all([
        fetch(`/api/productos?search=${encodeURIComponent(q)}&pageSize=10`),
        fetch(`/api/equipos?search=${encodeURIComponent(q)}`),
        fetch(`/api/oportunidades-equipos?tipo=disponibles`),
        fetch(`/api/catalogo-items?search=${encodeURIComponent(q)}&activo=true&limit=10`),
        fetch(`/api/cotizacion/insumos-equipo?search=${encodeURIComponent(q)}`),
      ]);

      const results: SearchResult[] = [];

      // Procesar productos
      if (productosRes.ok) {
        const json = await productosRes.json();
        const productos = json.data || json;
        if (Array.isArray(productos)) {
          productos.slice(0, 10).forEach((p: any) => {
            results.push({
              id: p.id,
              tipo: 'producto',
              codigo: p.codigo || '',
              nombre: p.nombre,
              marca: p.marca_nombre || undefined,
              precio_venta: p.precio_venta || 0,
              precio_costo: p.precio_costo || 0,
              stock_actual: p.stock_actual || 0,
              imagen_url: p.imagen_url,
              moneda: p.moneda,
            });
          });
        }
      }

      // Procesar unidades en stock (antes del catálogo para que aparezcan primero)
      if (stockRes.ok) {
        const stock = await stockRes.json();
        if (Array.isArray(stock)) {
          const term = q.toLowerCase();
          stock
            .filter((u: any) =>
              u.marca?.toLowerCase().includes(term) ||
              u.modelo?.toLowerCase().includes(term) ||
              u.numero_serie?.toLowerCase().includes(term) ||
              u.tipo?.toLowerCase().includes(term)
            )
            .slice(0, 10)
            .forEach((u: any) => {
              results.push({
                id: u.equipo_id || u.id,
                tipo: 'equipo_unidad',
                codigo: u.numero_serie || '',
                nombre: `${u.marca} ${u.modelo}`,
                precio_venta: u.precio_lista || 0,
                precio_costo: u.precio_lista || 0,
                stock_actual: 1,
                imagen_url: u.imagen_url,
                marca: u.marca,
                modelo: u.modelo,
                numero_serie: u.numero_serie,
                condicion: u.condicion,
                tipo_equipo: u.tipo,
                precio_lista: u.precio_lista,
                equipo_unidad_id: u.equipo_unidad_id || u.id,
              });
            });
        }
      }

      // Procesar equipos catálogo (excluir los que ya tienen unidades en stock mostradas)
      if (equiposRes.ok) {
        const equipos = await equiposRes.json();
        if (Array.isArray(equipos)) {
          const stockEquipoIds = new Set(results.filter(r => r.tipo === 'equipo_unidad').map(r => r.id));
          equipos.slice(0, 10).forEach((e: any) => {
            results.push({
              id: e.id,
              tipo: 'equipo',
              codigo: e.codigo || `${e.marca}-${e.modelo}`.toUpperCase().replace(/\s+/g, '-'),
              nombre: `${e.marca} ${e.modelo}`,
              precio_venta: e.precio_lista || 0,
              precio_costo: e.precio_lista || 0,
              stock_actual: e.unidades_count || 0,
              imagen_url: e.imagen_url,
              marca: e.marca,
              modelo: e.modelo,
              unidades_count: e.unidades_count,
              precio_lista: e.precio_lista,
            });
          });
        }
      }

      // Procesar catálogo de proveedores (excluir items ya promovidos a producto)
      if (catalogoRes.ok) {
        const catalogoItems = await catalogoRes.json();
        if (Array.isArray(catalogoItems)) {
          catalogoItems.forEach((ci: any) => {
            // Skip items already promoted to product (they show as products)
            if (ci.producto_id) return;
            const precioCosto = ci.precio_costo || 0;
            const markup = ci.markup_default || 40;
            const precioVenta = precioCosto > 0 ? precioCosto * (1 + markup / 100) : 0;
            results.push({
              id: ci.id,
              tipo: 'catalogo',
              codigo: ci.codigo_proveedor || '',
              nombre: ci.nombre,
              precio_venta: precioVenta,
              precio_costo: precioCosto,
              stock_actual: 0,
              catalogo_item_id: ci.id,
              proveedor_nombre: ci.proveedor_nombre,
              markup_default: markup,
            });
          });
        }
      }

      // Insumos por equipo (cada insumo es un producto real -> tipo 'producto')
      const grupos: Array<{ equipo: any; insumos: SearchResult[] }> = [];
      if (insumosEquipoRes.ok) {
        const data = await insumosEquipoRes.json();
        if (Array.isArray(data)) {
          data.forEach((g: any) => {
            const insumos: SearchResult[] = (g.insumos || []).map((p: any) => ({
              id: p.id,
              tipo: 'producto' as const,
              codigo: p.codigo || '',
              nombre: p.nombre,
              precio_venta: p.precio_venta || 0,
              precio_costo: p.precio_costo || 0,
              stock_actual: p.stock_actual || 0,
              moneda: p.moneda,
            }));
            if (insumos.length > 0) grupos.push({ equipo: g.equipo, insumos });
          });
        }
      }
      setInsumosPorEquipo(grupos);

      setResultados(results);
    } catch {
      setResultados([]);
      setInsumosPorEquipo([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar resultados por tipo
  const resultadosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return resultados;
    if (filtroTipo === 'productos') return resultados.filter(r => r.tipo === 'producto');
    if (filtroTipo === 'catalogo') return resultados.filter(r => r.tipo === 'catalogo');
    return resultados.filter(r => r.tipo === 'equipo' || r.tipo === 'equipo_unidad');
  }, [resultados, filtroTipo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSelect(null, value);
    setSelectedIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 2) {
        await searchAll(value);
        setOpen(true);
      } else {
        setOpen(false);
        setResultados([]);
        setInsumosPorEquipo([]);
      }
    }, 250);
  };

  const handleSelectResult = (result: SearchResult) => {
    let descripcion: string;

    if (result.tipo === 'equipo_unidad') {
      descripcion = `${result.marca} ${result.modelo}${result.numero_serie ? ` (S/N: ${result.numero_serie})` : ''}`;
    } else if (result.tipo === 'equipo') {
      descripcion = `${result.marca} ${result.modelo}`;
    } else if (result.tipo === 'catalogo') {
      descripcion = result.codigo ? `${result.codigo} - ${result.nombre}` : result.nombre;
    } else {
      descripcion = `${result.codigo} - ${result.nombre}`;
    }

    setQuery(descripcion);

    if (result.tipo === 'catalogo') {
      // Catálogo de proveedores: pasar con catalogo_item_id
      const productoLike: Producto & { catalogo_item_id?: string } = {
        id: '', // No es un producto real
        nombre: result.nombre,
        codigo: result.codigo || '',
        precio_venta: result.precio_venta,
        precio_costo: result.precio_costo,
        stock_actual: 0,
        catalogo_item_id: result.catalogo_item_id,
      };
      onSelect(productoLike, descripcion);
    } else if (result.tipo === 'equipo_unidad' || result.tipo === 'equipo') {
      // Equipos: pasar como "producto" usando el precio_lista del equipo.
      // es_equipo evita que el handler aplique listas/márgenes/overrides de PRODUCTOS
      // (eso pisaba el precio del equipo con el de productos).
      const precioLista = result.precio_lista || 0;
      const productoLike: Producto & { es_equipo?: boolean } = {
        id: result.id,
        nombre: result.nombre,
        codigo: result.codigo || '',
        precio_venta: precioLista,
        precio_costo: precioLista,
        stock_actual: result.tipo === 'equipo_unidad' ? 1 : (result.unidades_count || 0),
        imagen_url: result.imagen_url,
        es_equipo: true,
      };
      onSelect(productoLike, descripcion);
    } else {
      // Productos: pasamos el objeto completo con ID
      const productoLike: Producto = {
        id: result.id,
        nombre: result.nombre,
        codigo: result.codigo,
        precio_venta: result.precio_venta,
        precio_costo: result.precio_costo,
        stock_actual: result.stock_actual,
        imagen_url: result.imagen_url,
        moneda: result.moneda,
      };
      onSelect(productoLike, descripcion);
    }
    setOpen(false);
    setResultados([]);
    setInsumosPorEquipo([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || resultadosFiltrados.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, resultadosFiltrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultadosFiltrados[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(resultadosFiltrados[selectedIndex]);
    }
  };

  // Sync with external value
  useEffect(() => {
    setQuery(linea.descripcion);
  }, [linea.descripcion]);

  // Contar por tipo
  const countProductos =
    resultados.filter(r => r.tipo === 'producto').length +
    insumosPorEquipo.reduce((acc, g) => acc + g.insumos.length, 0);
  const countTodos = resultados.length + insumosPorEquipo.reduce((acc, g) => acc + g.insumos.length, 0);
  const countEquipos = resultados.filter(r => r.tipo === 'equipo' || r.tipo === 'equipo_unidad').length;
  const countCatalogo = resultados.filter(r => r.tipo === 'catalogo').length;

  // Solo mostrar popover si hay resultados o si está cargando con query suficiente
  const shouldShowPopover = open && (resultados.length > 0 || insumosPorEquipo.length > 0 || (loading && query.length >= 2));

  return (
    <Popover open={shouldShowPopover} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
            {linea.imagen_url ? (
              <img
                src={linea.imagen_url}
                alt=""
                className="w-6 h-6 rounded object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : linea.producto_id ? (
              <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              </div>
            ) : (
              <Search className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (query.length >= 2 && (resultados.length > 0 || insumosPorEquipo.length > 0)) {
                setOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar producto, equipo o escribir descripcion..."
            className={cn(
              "w-full h-11 pl-11 pr-10 text-sm rounded-xl border transition-all duration-200",
              "bg-white dark:bg-gray-900",
              "border-gray-200 dark:border-gray-700",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500",
              "group-hover:border-gray-300 dark:group-hover:border-gray-600",
              linea.producto_id && "border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/20"
            )}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 animate-spin" />
          )}
          {linea.producto_id && !loading && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(560px,90vw)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Solo cerrar si no es el input
          const target = e.target as HTMLElement;
          if (target === inputRef.current) {
            e.preventDefault();
          }
        }}
      >
        {loading ? (
          <div className="py-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-violet-500" />
            <p className="text-sm">Buscando...</p>
          </div>
        ) : (resultados.length > 0 || insumosPorEquipo.length > 0) ? (
          <>
            {/* Tabs de filtro */}
            <div className="px-2 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFiltroTipo('todos')}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg transition-colors",
                  filtroTipo === 'todos'
                    ? "bg-violet-600 text-white"
                    : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                )}
              >
                Todos ({countTodos})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('productos')}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg transition-colors",
                  filtroTipo === 'productos'
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                )}
              >
                Insumos ({countProductos})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('equipos')}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg transition-colors",
                  filtroTipo === 'equipos'
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                )}
              >
                Equipos ({countEquipos})
              </button>
              {countCatalogo > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroTipo('catalogo')}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-lg transition-colors",
                    filtroTipo === 'catalogo'
                      ? "bg-amber-600 text-white"
                      : "text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                >
                  Catalogo ({countCatalogo})
                </button>
              )}
            </div>

            {/* Lista de resultados */}
            <div
              className="max-h-[320px] overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {(filtroTipo === 'todos' || filtroTipo === 'productos') &&
                insumosPorEquipo.map((grupo) => (
                  <div key={`grupo-${grupo.equipo.id}`}>
                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sticky top-0">
                      Insumos del {grupo.equipo.marca} {grupo.equipo.modelo}
                    </div>
                    {grupo.insumos.map((insumo, idx) => {
                      let precioMostrar = insumo.precio_venta;
                      if (insumo.moneda === 'USD' && cotizacionUsd > 0) {
                        precioMostrar = insumo.precio_venta * cotizacionUsd;
                      }
                      if (listaMargen > 0 && insumo.precio_costo) {
                        let costo = insumo.precio_costo;
                        if (insumo.moneda === 'USD' && cotizacionUsd > 0) costo = costo * cotizacionUsd;
                        precioMostrar = costo * (1 + listaMargen / 100);
                      }
                      return (
                        <ResultRow
                          key={`insumo-${grupo.equipo.id}-${insumo.id}-${idx}`}
                          result={insumo}
                          active={false}
                          precioMostrar={precioMostrar}
                          onSelect={handleSelectResult}
                        />
                      );
                    })}
                  </div>
                ))}
              {resultadosFiltrados.map((result, index) => {
                // Calcular precio con margen para productos
                let precioMostrar = result.precio_venta;
                if (result.tipo === 'producto') {
                  if (result.moneda === 'USD' && cotizacionUsd > 0) {
                    precioMostrar = result.precio_venta * cotizacionUsd;
                  }
                  if (listaMargen > 0 && result.precio_costo) {
                    let costo = result.precio_costo;
                    if (result.moneda === 'USD' && cotizacionUsd > 0) {
                      costo = costo * cotizacionUsd;
                    }
                    precioMostrar = costo * (1 + listaMargen / 100);
                  }
                }

                return (
                  <ResultRow
                    key={`${result.tipo}-${result.equipo_unidad_id || result.id}-${index}`}
                    result={result}
                    active={index === selectedIndex}
                    precioMostrar={precioMostrar}
                    onSelect={handleSelectResult}
                  />
                );
              })}
            </div>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// COMPONENTE: Vista Previa del PDF (simplificada)
// ============================================
function PreviewPanel({
  cliente,
  lineas,
  total,
  subtotal,
  formData,
  cotizacionUsd,
}: {
  cliente: Cliente | null;
  lineas: LineaPresupuesto[];
  total: number;
  subtotal: number;
  formData: any;
  usuario: any;
  cotizacionUsd: number;
}) {
  const itemsFiltrados = lineas.filter(l => l.descripcion || l.precio_unitario > 0);
  const division = (cliente as any)?.division || 'humanos';
  const isVeterinaria = division === 'veterinaria';

  // Colores segun division
  const accentColor = isVeterinaria ? 'text-violet-700' : 'text-red-700';
  const accentBg = isVeterinaria ? 'bg-violet-700' : 'bg-red-700';

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-950 overflow-hidden">
      {/* Header del panel */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-shrink-0">
        <Eye className={cn("w-4 h-4", isVeterinaria ? "text-violet-500" : "text-red-500")} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vista Previa</span>
        <Badge variant="outline" className={cn("ml-auto text-xs", isVeterinaria ? "border-violet-300 text-violet-600" : "border-red-300 text-red-600")}>
          {isVeterinaria ? 'Veterinaria' : 'Humanos'}
        </Badge>
      </div>

      {/* Contenido del preview simplificado */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="bg-white rounded-lg shadow-lg mx-auto overflow-hidden" style={{ maxWidth: '380px' }}>

            {/* ========== ENCABEZADO SIMPLE ========== */}
            <div className={cn("px-3 py-2 flex justify-between items-center", accentBg)}>
              <span className="text-white text-xs font-bold">PRESUPUESTO</span>
              <span className="text-white/80 text-xs">N° {formData.numero || 'NUEVO'}</span>
            </div>

            {/* ========== CLIENTE ========== */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <p className="text-[9px] font-semibold text-gray-400 uppercase">Cliente</p>
              {cliente ? (
                <p className="text-xs font-medium text-gray-900 truncate">{cliente.nombre}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin cliente</p>
              )}
            </div>

            {/* ========== TABLA DE ITEMS ========== */}
            <div className="px-3 py-2">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-1 text-left font-semibold text-gray-500">Descripción</th>
                    <th className="py-1 text-center font-semibold text-gray-500 w-8">Qty</th>
                    <th className="py-1 text-right font-semibold text-gray-500 w-14">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsFiltrados.length > 0 ? (
                    itemsFiltrados.slice(0, 5).map((linea, idx) => (
                      <tr key={linea.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1 text-gray-700 truncate max-w-[120px]">
                          {linea.descripcion || '-'}
                        </td>
                        <td className="py-1 text-center text-gray-500">{linea.cantidad}</td>
                        <td className="py-1 text-right font-medium text-gray-700">
                          ${linea.subtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-3 text-center text-gray-400 italic">
                        Sin items
                      </td>
                    </tr>
                  )}
                  {itemsFiltrados.length > 5 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-center text-[8px] text-gray-400">
                        +{itemsFiltrados.length - 5} items más...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totales */}
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                <div className="text-right">
                  <div className="text-[9px] text-gray-500">
                    Subtotal: {formatCurrency(subtotal)}
                  </div>
                  <div className={cn("text-sm font-bold", accentColor)}>
                    TOTAL: {formatCurrency(total)}
                  </div>
                  {formData.mostrar_en_usd && cotizacionUsd > 0 && total > 0 && (
                    <div className="text-[8px] text-gray-400">
                      ~ {formatCurrency(total / cotizacionUsd, 'USD')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========== NOTA FOOTER ========== */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[8px] text-gray-400 text-center">
                Header y firma se mostrarán en el PDF final
              </p>
            </div>

          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function PresupuestoFormDialog({
  open,
  onOpenChange,
  presupuesto,
  defaultClienteId,
  defaultPersonaId,
  defaultOportunidadId,
  defaultEquipo,
  onSuccess,
}: PresupuestoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [autoCrearOportunidad, setAutoCrearOportunidad] = useState(true); // Auto-create pipeline opportunity
  const [comboboxResetKey, setComboboxResetKey] = useState(0);
  const [showCrearCliente, setShowCrearCliente] = useState(false);
  const [formData, setFormData] = useState({
    numero: "",
    cliente_id: "",
    oportunidad_id: "",
    fecha_emision: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "",
    validez_dias: 30,
    condiciones_pago: "",
    notas: "",
    estado: "borrador" as 'borrador' | 'enviado' | 'visto' | 'aceptado' | 'rechazado' | 'vencido' | 'convertido',
    lista_precios_id: "",
    moneda: "ARS" as "ARS" | "USD",
    tipo_cotizacion: "oficial",
    cotizacion_usd: 0,
    mostrar_en_usd: false,
  });
  const [lineas, setLineas] = useState<LineaPresupuesto[]>([
    { id: generateId(), descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 }
  ]);

  // Fetch cliente seleccionado
  const { data: clienteSeleccionado } = useSWR<Cliente>(
    formData.cliente_id ? `/api/clientes/${formData.cliente_id}` : null,
    fetcher
  );

  // Fetch persona (contacto) si viene por defaultPersonaId y no hay cliente
  const { data: personaSeleccionada } = useSWR<any>(
    open && !formData.cliente_id && defaultPersonaId
      ? `/api/personas/${defaultPersonaId}`
      : null,
    fetcher
  );

  // Fetch listas de precios
  const { data: listasPrecios } = useSWR<ListaPrecios[]>(
    open ? '/api/listas-precios' : null,
    fetcherArray
  );

  // Fetch cotizacion
  const { data: cotizacion, mutate: mutateCotizacion } = useSWR<Cotizacion>(
    open ? `/api/cotizaciones?tipo=${formData.tipo_cotizacion}` : null,
    fetcher
  );

  // Fetch usuario actual para la firma
  const { data: usuario } = useSWR(
    open ? '/api/users/me' : null,
    fetcher
  );

  // Update cotizacion_usd when cotizacion changes
  useEffect(() => {
    if (cotizacion?.valor_venta && formData.cotizacion_usd === 0) {
      setFormData(prev => ({ ...prev, cotizacion_usd: cotizacion.valor_venta }));
    }
  }, [cotizacion, formData.cotizacion_usd]);

  // Get selected lista margen
  const listaSeleccionada = useMemo(() => {
    return listasPrecios?.find(l => l.id === formData.lista_precios_id);
  }, [listasPrecios, formData.lista_precios_id]);

  // Calculate totals
  const subtotal = lineas.reduce((sum, l) => sum + l.subtotal, 0);
  const total = subtotal;

  // Calculate USD equivalent
  const totalUsd = formData.cotizacion_usd > 0 ? total / formData.cotizacion_usd : 0;

  // Auto-calculate vencimiento based on validez_dias
  useEffect(() => {
    if (formData.fecha_emision && formData.validez_dias > 0) {
      const fecha = new Date(formData.fecha_emision);
      fecha.setDate(fecha.getDate() + formData.validez_dias);
      setFormData(prev => ({
        ...prev,
        fecha_vencimiento: fecha.toISOString().split("T")[0]
      }));
    }
  }, [formData.fecha_emision, formData.validez_dias]);

  useEffect(() => {
    if (!open) return;

    // Force SearchableCombobox remount so it picks up the new value
    setComboboxResetKey(prev => prev + 1);

    if (presupuesto) {
      setFormData({
        numero: presupuesto.numero || "",
        cliente_id: presupuesto.cliente_id || "",
        oportunidad_id: (presupuesto as any).oportunidad_id || "",
        fecha_emision: presupuesto.fecha_emision?.split("T")[0] || new Date().toISOString().split("T")[0],
        fecha_vencimiento: presupuesto.fecha_vencimiento?.split("T")[0] || "",
        validez_dias: presupuesto.validez_dias || 30,
        condiciones_pago: presupuesto.condiciones_pago || "",
        notas: presupuesto.notas || "",
        estado: presupuesto.estado || "borrador",
        lista_precios_id: (presupuesto as any).lista_precios_id || "",
        moneda: (presupuesto as any).moneda || "ARS",
        tipo_cotizacion: (presupuesto as any).tipo_cotizacion || "oficial",
        cotizacion_usd: (presupuesto as any).cotizacion_usd || 0,
        mostrar_en_usd: (presupuesto as any).mostrar_en_usd || false,
      });
      if (presupuesto.lineas && Array.isArray(presupuesto.lineas) && presupuesto.lineas.length > 0) {
        setLineas(presupuesto.lineas.map((l: any) => ({
          id: l.id || generateId(),
          producto_id: l.producto_id,
          catalogo_item_id: l.catalogo_item_id,
          descripcion: l.descripcion || "",
          cantidad: l.cantidad || 1,
          precio_costo: l.precio_costo || 0,
          precio_unitario: l.precio_unitario || 0,
          descuento: l.descuento || 0,
          subtotal: l.subtotal || 0,
          moneda_original: l.moneda_original,
          imagen_url: l.imagen_url,
          codigo: l.codigo,
        })));
      } else {
        setLineas([{ id: generateId(), descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 }]);
      }
    } else {
      setFormData({
        numero: "",
        cliente_id: defaultClienteId || "",
        oportunidad_id: defaultOportunidadId || "",
        fecha_emision: new Date().toISOString().split("T")[0],
        fecha_vencimiento: "",
        validez_dias: 30,
        condiciones_pago: "",
        notas: "",
        estado: "borrador",
        lista_precios_id: "",
        moneda: "ARS",
        tipo_cotizacion: "oficial",
        cotizacion_usd: 0,
        mostrar_en_usd: false,
      });
      // Si hay un equipo por defecto, crear una línea con su descripción
      // NOTA: No guardamos producto_id porque los equipos no están en la tabla productos
      if (defaultEquipo) {
        setLineas([{
          id: generateId(),
          // producto_id NO se guarda para equipos (solo para productos de la tabla productos)
          descripcion: `${defaultEquipo.marca} ${defaultEquipo.modelo}`,
          cantidad: 1,
          precio_costo: 0,
          precio_unitario: 0,
          descuento: 0,
          subtotal: 0,
        }]);
      } else if (defaultOportunidadId) {
        // Pre-cargar items de la oportunidad como líneas del presupuesto
        fetch(`/api/oportunidades-items?oportunidad_id=${defaultOportunidadId}`)
          .then(res => res.ok ? res.json() : [])
          .then((items: any[]) => {
            if (items.length > 0) {
              const preloadedLineas = items.map((item: any) => {
                const precio = Number(item.precio_unitario) || Number(item.producto_precio) || Number(item.equipo_precio_lista) || 0;
                const cantidad = item.cantidad || 1;
                const baseDesc = item.producto_nombre || (item.equipo_marca ? `${item.equipo_marca} ${item.equipo_modelo}` : item.descripcion) || '';
                const descripcion = item.unidad_numero_serie
                  ? `${baseDesc} — S/N: ${item.unidad_numero_serie}`
                  : baseDesc;
                return {
                  id: generateId(),
                  producto_id: item.producto_id || undefined,
                  descripcion,
                  cantidad,
                  precio_costo: 0,
                  precio_unitario: precio,
                  descuento: 0,
                  subtotal: cantidad * precio,
                  codigo: item.producto_codigo || undefined,
                };
              });
              setLineas(preloadedLineas);
            } else {
              setLineas([{ id: generateId(), descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 }]);
            }
          })
          .catch(() => {
            setLineas([{ id: generateId(), descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 }]);
          });
      } else {
        setLineas([{ id: generateId(), descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 }]);
      }
    }
  }, [presupuesto, open, defaultClienteId, defaultOportunidadId, defaultEquipo]);

  // Recalculate prices when lista changes
  useEffect(() => {
    if (!listaSeleccionada || !formData.lista_precios_id) return;

    setLineas(prev => prev.map(l => {
      if (l.precio_costo > 0) {
        const precioVenta = l.precio_costo * (1 + listaSeleccionada.margen_porcentaje / 100);
        const precioConDescuento = precioVenta * (1 - l.descuento / 100);
        return {
          ...l,
          margen_manual: listaSeleccionada.margen_porcentaje,
          precio_unitario: precioVenta,
          subtotal: l.cantidad * precioConDescuento,
        };
      }
      return l;
    }));
  }, [formData.lista_precios_id, listaSeleccionada]);

  const updateLinea = (id: string, field: keyof LineaPresupuesto, value: any) => {
    setLineas(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      // Recalculate subtotal
      const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
      updated.subtotal = updated.cantidad * precioConDescuento;
      return updated;
    }));
  };

  const handleProductoSelect = async (lineaId: string, producto: Producto | null, descripcion: string) => {
    if (!producto) {
      setLineas(prev => prev.map(l =>
        l.id === lineaId
          ? { ...l, descripcion, producto_id: undefined, catalogo_item_id: undefined, imagen_url: undefined, codigo: undefined }
          : l
      ));
      return;
    }

    // Get precio based on margen if lista is selected
    let precioCosto = producto.precio_costo || 0;
    let precioVenta = producto.precio_venta || 0;
    const monedaProducto = producto.moneda || 'ARS';

    // Convert USD to ARS if needed
    if (monedaProducto === 'USD' && formData.cotizacion_usd > 0) {
      precioCosto = precioCosto * formData.cotizacion_usd;
      precioVenta = precioVenta * formData.cotizacion_usd;
    }

    const esEquipo = !!(producto as any).es_equipo;
    let margenAplicado: number | undefined = undefined;
    if (listaSeleccionada && precioCosto > 0 && !esEquipo) {
      margenAplicado = listaSeleccionada.margen_porcentaje;
      precioVenta = precioCosto * (1 + margenAplicado / 100);
    }

    const catalogoItemId = (producto as any).catalogo_item_id;

    setLineas(prev => prev.map(l => {
      if (l.id !== lineaId) return l;
      const updated = {
        ...l,
        producto_id: catalogoItemId ? undefined : producto.id || undefined,
        catalogo_item_id: catalogoItemId || undefined,
        descripcion: descripcion,
        precio_costo: precioCosto,
        margen_manual: margenAplicado,
        precio_unitario: precioVenta || l.precio_unitario,
        moneda_original: monedaProducto,
        imagen_url: producto.imagen_url,
        codigo: producto.codigo,
      };
      const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
      updated.subtotal = updated.cantidad * precioConDescuento;
      return updated;
    }));

    // Honor per-product overrides via resolver. Pass the form's lista_precios_id
    // explicitly so it overrides the cliente's lista. If no producto.id (catalogo
    // item) we cant resolve, just keep the manual margen calc above.
    // Los equipos NO pasan por el resolver de precios de productos (usan precio_lista).
    if (!producto.id || esEquipo) return;
    try {
      const params = new URLSearchParams();
      params.set('producto_ids', String(producto.id));
      if (formData.cliente_id) params.set('cliente_id', formData.cliente_id);
      if (formData.lista_precios_id) params.set('lista_id', formData.lista_precios_id);
      const res = await fetch(`/api/precios/resolver?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const r = (data.results || [])[0];
      if (!r) return;
      // Only override if there's an actual lista or override; producto_default
      // is the same as what we already computed.
      if (r.fuente === 'producto_default') return;
      let precioResuelto = Number(r.precio_venta) || 0;
      // Convert USD if needed
      if (monedaProducto === 'USD' && formData.cotizacion_usd > 0 && r.fuente === 'override_fijo') {
        // override_fijo is stored in product currency convention; respect it.
        // (No conversion — assumes ARS in DB. Adjust if multi-currency overrides are introduced.)
      }
      setLineas(prev => prev.map(l => {
        if (l.id !== lineaId) return l;
        const updated = {
          ...l,
          precio_unitario: precioResuelto,
          margen_manual: r.fuente === 'override_margen' ? undefined : l.margen_manual,
        };
        const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
        updated.subtotal = updated.cantidad * precioConDescuento;
        return updated;
      }));
    } catch {
      // ignore — the manually-computed price stays
    }
  };

  const addLinea = () => {
    setLineas(prev => [...prev, { id: generateId(), descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 }]);
  };

  const [multiPickerOpen, setMultiPickerOpen] = useState(false);

  // Agregar VARIOS productos de una (cada uno como una línea nueva del presupuesto).
  // Reusa handleProductoSelect (precio/margen/resolver) por cada línea creada.
  const handleAddMultiple = async (productos: ProductoPick[]) => {
    if (!productos.length) return;
    const nuevas = productos.map((p) => ({
      id: generateId(),
      producto: {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo || "",
        precio_venta: p.precio_venta || 0,
        precio_costo: p.precio_costo || 0,
        stock_actual: p.stock_actual || 0,
        moneda: p.moneda || "ARS",
      } as Producto,
      descripcion: p.codigo ? `${p.codigo} - ${p.nombre}` : p.nombre,
    }));
    // Primero creo las líneas vacías; los functional updates encadenan, así que
    // handleProductoSelect (que mapea por id) encuentra cada línea recién creada.
    setLineas((prev) => [
      ...prev,
      ...nuevas.map((n) => ({ id: n.id, descripcion: "", cantidad: 1, precio_costo: 0, precio_unitario: 0, descuento: 0, subtotal: 0 })),
    ]);
    for (const n of nuevas) {
      await handleProductoSelect(n.id, n.producto, n.descripcion);
    }
  };

  const removeLinea = (id: string) => {
    if (lineas.length > 1) {
      setLineas(prev => prev.filter(l => l.id !== id));
    }
  };

  const updateCotizacion = async () => {
    try {
      const res = await fetch('/api/cotizaciones/actualizar');
      if (!res.ok) throw new Error('Error al actualizar');
      await mutateCotizacion();
      toast.success('Cotizacion actualizada');
    } catch {
      toast.error('Error al actualizar cotizacion');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id && !defaultPersonaId) {
      toast.error("Seleccioná un cliente o contacto");
      return;
    }
    if (lineas.every(l => !l.descripcion && l.precio_unitario === 0)) {
      toast.error("Por favor agrega al menos un item al presupuesto");
      return;
    }

    setLoading(true);

    try {
      const body = {
        ...formData,
        cliente_id: formData.cliente_id || null,
        persona_id: !formData.cliente_id ? defaultPersonaId || null : null,
        lineas: lineas.filter(l => l.descripcion || l.precio_unitario > 0).map(l => ({
          ...l,
          margen_aplicado: listaSeleccionada?.margen_porcentaje || null,
        })),
        subtotal,
        total,
        // Auto-create pipeline opportunity if enabled and no existing oportunidad
        auto_crear_oportunidad: !presupuesto && !formData.oportunidad_id && autoCrearOportunidad && !!formData.cliente_id,
      };

      const url = "/api/presupuestos";
      const method = presupuesto ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presupuesto ? { ...body, id: presupuesto.id } : body),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Error al guardar presupuesto");
      }

      // Show success message with oportunidad info if created
      if (responseData.oportunidad_creada) {
        toast.success("Presupuesto creado y agregado al Pipeline de Ventas");
      } else {
        toast.success(presupuesto ? "Presupuesto actualizado" : "Presupuesto creado");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar presupuesto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-0 gap-0",
        "w-full h-[100dvh] sm:h-[90vh] sm:max-w-[1400px] sm:w-[95vw] flex flex-col overflow-hidden",
        "sm:rounded-2xl rounded-none"
      )}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 pr-14 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {presupuesto ? "Editar Presupuesto" : "Nuevo Presupuesto"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {presupuesto
                    ? `Modificando presupuesto ${presupuesto.numero}`
                    : "Crea un presupuesto con vista previa en tiempo real"}
                </DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                htmlType="button"
                variant="outline"
                size="small"
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "h-9 gap-2",
                  showPreview && "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800"
                )}
              >
                <Eye className="w-4 h-4" />
                Vista Previa
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Formulario */}
          <div className={cn(
            "flex-1 min-h-0 flex flex-col overflow-hidden",
            showPreview ? "border-r border-gray-200 dark:border-gray-800" : ""
          )}>
            <ScrollArea className="flex-1 min-h-0">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Destinatario: persona (contacto) cuando viene desde CRM sin cliente */}
                {!formData.cliente_id && personaSeleccionada && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Destinatario (contacto de la oportunidad)
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {personaSeleccionada.nombre_completo ||
                        `${personaSeleccionada.nombre || ''} ${personaSeleccionada.apellido || ''}`.trim() ||
                        'Contacto sin nombre'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {personaSeleccionada.email && <span>{personaSeleccionada.email}</span>}
                      {personaSeleccionada.telefono && <span>{personaSeleccionada.telefono}</span>}
                      {personaSeleccionada.documento_nro && (
                        <span>{personaSeleccionada.documento_tipo || 'Doc'} {personaSeleccionada.documento_nro}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                      Este presupuesto queda asociado al contacto. Podés convertirlo a cliente cuando se formalice.
                    </p>
                  </div>
                )}

                {/* Cliente y Configuracion de Precios */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      Cliente {!defaultPersonaId && <span className="text-red-500">*</span>}
                      {defaultPersonaId && !formData.cliente_id && (
                        <span className="text-xs font-normal text-gray-400">(opcional — hay contacto)</span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableCombobox
                          key={`presupuesto-cliente-${comboboxResetKey}`}
                          value={formData.cliente_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, cliente_id: value })
                          }
                          searchFn={searchClientes}
                          placeholder="Buscar cliente por nombre o CUIT..."
                          emptyMessage="No se encontraron clientes"
                          defaultSelectedOption={clienteSeleccionado ? {
                            label: clienteSeleccionado.nombre_fantasia || clienteSeleccionado.nombre || 'Cliente',
                            value: clienteSeleccionado.id,
                            badge: clienteSeleccionado.identificador_unico || clienteSeleccionado.identificador_legacy || undefined,
                            secondaryLabel: clienteSeleccionado.cuit || undefined,
                          } : undefined}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setShowCrearCliente(true)}
                        title="Crear cliente nuevo"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {clienteSeleccionado && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {clienteSeleccionado.cuit}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            (clienteSeleccionado as any).division === 'veterinaria'
                              ? "border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300"
                              : "border-red-200 text-red-700 dark:border-red-800 dark:text-red-300"
                          )}
                        >
                          {(clienteSeleccionado as any).division === 'veterinaria' ? 'Veterinaria' : 'Humanos'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Lista de Precios */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-400" />
                      Lista de Precios
                    </Label>
                    <Select
                      value={formData.lista_precios_id || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, lista_precios_id: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Sin lista (precio manual)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin lista (precio manual)</SelectItem>
                        {listasPrecios?.map((lista) => (
                          <SelectItem key={lista.id} value={lista.id}>
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              {lista.nombre}
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                +{lista.margen_porcentaje}%
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Moneda, Cotización y Fechas */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 space-y-4">
                  {/* Fila 1: Moneda principal + Fechas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Moneda principal — prominente */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        Moneda
                      </Label>
                      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, moneda: 'ARS' })}
                          className={cn(
                            "flex-1 text-sm font-medium transition-colors",
                            formData.moneda === 'ARS'
                              ? "bg-emerald-600 text-white"
                              : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          $ ARS
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, moneda: 'USD' })}
                          className={cn(
                            "flex-1 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700",
                            formData.moneda === 'USD'
                              ? "bg-blue-600 text-white"
                              : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          US$
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                        Moneda en que se emite el presupuesto
                      </p>
                    </div>

                    {/* Fecha Emisión */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fecha Emisión</Label>
                      <Input
                        type="date"
                        value={formData.fecha_emision}
                        onChange={(e) =>
                          setFormData({ ...formData, fecha_emision: e.target.value })
                        }
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Validez */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Validez</Label>
                      <Select
                        value={formData.validez_dias.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, validez_dias: parseInt(value) })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 días</SelectItem>
                          <SelectItem value="15">15 días</SelectItem>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="45">45 días</SelectItem>
                          <SelectItem value="60">60 días</SelectItem>
                          <SelectItem value="90">90 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mostrar equivalente */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">En PDF mostrar</Label>
                      <div className="flex items-start gap-2 h-9">
                        <Switch
                          checked={formData.mostrar_en_usd}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, mostrar_en_usd: checked })
                          }
                        />
                        <div className="text-xs leading-tight">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Mostrar equivalente en {formData.moneda === 'USD' ? 'ARS' : 'USD'} en el PDF
                          </span>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            Opcional — no cambia la moneda del presupuesto
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Cotización USD (visible cuando moneda es USD o se muestra equivalente) */}
                  {(formData.moneda === 'USD' || formData.mostrar_en_usd) && (
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                        <DollarSign className="w-3.5 h-3.5" />
                        Cotización USD
                      </div>
                      <Select
                        value={formData.tipo_cotizacion}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo_cotizacion: value, cotizacion_usd: 0 })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oficial">Oficial</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="mep">MEP</SelectItem>
                          <SelectItem value="ccl">CCL</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <NumberInput
                          step="0.01"
                          value={formData.cotizacion_usd || cotizacion?.valor_venta || ''}
                          onValueChange={(n) =>
                            setFormData({ ...formData, cotizacion_usd: n || 0 })
                          }
                          className="h-8 text-xs w-28"
                          placeholder="$"
                        />
                        <Button
                          htmlType="button"
                          variant="outline"
                          size="small"
                          onClick={updateCotizacion}
                          className="h-8 w-8 p-0"
                          title="Actualizar cotización"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                      {formData.cotizacion_usd > 0 && (
                        <span className="text-xs text-gray-400">
                          1 USD = {formatCurrency(formData.cotizacion_usd)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Auto-crear oportunidad en pipeline */}
                  {!presupuesto && !formData.oportunidad_id && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Agregar al Pipeline de Ventas
                          </p>
                          <p className="text-xs text-gray-500">
                            Crea una oportunidad automáticamente
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={autoCrearOportunidad}
                        onCheckedChange={setAutoCrearOportunidad}
                      />
                    </div>
                  )}
                </div>

                {/* Items del Presupuesto */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      Items del Presupuesto
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        htmlType="button"
                        variant="outline"
                        size="small"
                        onClick={() => setMultiPickerOpen(true)}
                        className="h-8 gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar varios
                      </Button>
                      <Button
                        htmlType="button"
                        variant="outline"
                        size="small"
                        onClick={addLinea}
                        className="h-8 gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar item
                      </Button>
                    </div>
                  </div>

                  <ProductosMultiPicker
                    open={multiPickerOpen}
                    onOpenChange={setMultiPickerOpen}
                    onConfirm={handleAddMultiple}
                    excludeIds={new Set(lineas.map((l) => l.producto_id).filter(Boolean) as string[])}
                    title="Agregar varios productos al presupuesto"
                  />

                  {/* Header de la tabla - solo desktop */}
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-t-xl px-4 py-2.5 hidden md:grid grid-cols-12 gap-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <div className="col-span-4">Producto / Descripcion</div>
                    <div className="col-span-1 text-center">Cant.</div>
                    <div className="col-span-2 text-right">Costo</div>
                    <div className="col-span-1 text-center">%</div>
                    <div className="col-span-2 text-right">Precio</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                  </div>
                  {/* Header mobile */}
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-t-xl px-4 py-2.5 md:hidden text-xs font-medium text-gray-600 dark:text-gray-400">
                    Items del presupuesto
                  </div>

                  {/* Filas de items */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-b-xl divide-y divide-gray-100 dark:divide-gray-800">
                    {lineas.map((linea, index) => (
                      <div key={linea.id}>
                      <div
                        className={cn(
                          "px-4 py-3 group transition-colors",
                          "hidden md:grid grid-cols-12 gap-3 items-center",
                          index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/20"
                        )}
                      >
                        {/* Producto/Descripcion */}
                        <div className="col-span-4 flex items-center gap-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                          </div>
                          <ProductoSearchInput
                            linea={linea}
                            onSelect={(producto, descripcion) => handleProductoSelect(linea.id, producto, descripcion)}
                            cotizacionUsd={formData.cotizacion_usd}
                            listaMargen={listaSeleccionada?.margen_porcentaje || 0}
                          />
                        </div>

                        {/* Cantidad */}
                        <div className="col-span-1">
                          <NumberInput
                            min="1"
                            decimals={0}
                            value={linea.cantidad}
                            onValueChange={(n) => updateLinea(linea.id, "cantidad", n || 1)}
                            className="h-9 text-sm text-center px-2"
                          />
                        </div>

                        {/* Costo */}
                        <div className="col-span-2">
                          <NumberInput
                            min="0"
                            step="0.01"
                            value={linea.precio_costo || ''}
                            onValueChange={(costo) => {
                              // Use manual margen first, fallback to lista margen
                              const margen = linea.margen_manual ?? listaSeleccionada?.margen_porcentaje ?? 0;
                              const precioVenta = margen > 0 ? costo * (1 + margen / 100) : linea.precio_unitario;
                              setLineas(prev => prev.map(l => {
                                if (l.id !== linea.id) return l;
                                const updated = { ...l, precio_costo: costo };
                                if (margen > 0) {
                                  updated.precio_unitario = precioVenta;
                                }
                                const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
                                updated.subtotal = updated.cantidad * precioConDescuento;
                                return updated;
                              }));
                            }}
                            className="h-9 text-sm text-right bg-gray-50 dark:bg-gray-800/50"
                            placeholder="Costo"
                          />
                        </div>

                        {/* Margen % */}
                        <div className="col-span-1">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={linea.margen_manual ?? ''}
                            onChange={(e) => {
                              const margen = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              const costo = linea.precio_costo || 0;
                              if (margen !== undefined && costo > 0) {
                                const nuevoPrecio = costo * (1 + margen / 100);
                                setLineas(prev => prev.map(l => {
                                  if (l.id !== linea.id) return l;
                                  const updated = { ...l, margen_manual: margen, precio_unitario: nuevoPrecio };
                                  const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
                                  updated.subtotal = updated.cantidad * precioConDescuento;
                                  return updated;
                                }));
                              } else {
                                updateLinea(linea.id, "margen_manual" as any, margen);
                              }
                            }}
                            className="h-9 text-sm text-center px-1"
                            placeholder="%"
                          />
                        </div>

                        {/* Precio */}
                        <div className="col-span-2">
                          <NumberInput
                            min="0"
                            step="0.01"
                            value={linea.precio_unitario}
                            onValueChange={(precio) => {
                              const costo = linea.precio_costo || 0;
                              // Recalculate margen when precio is edited manually
                              const nuevoMargen = costo > 0 ? Math.round(((precio / costo) - 1) * 100) : undefined;
                              setLineas(prev => prev.map(l => {
                                if (l.id !== linea.id) return l;
                                const updated = { ...l, precio_unitario: precio, margen_manual: nuevoMargen };
                                const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
                                updated.subtotal = updated.cantidad * precioConDescuento;
                                return updated;
                              }));
                            }}
                            className="h-9 text-sm text-right"
                          />
                        </div>

                        {/* Subtotal + Delete */}
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(linea.subtotal, formData.moneda)}
                            </p>
                            {linea.moneda_original && linea.moneda_original !== formData.moneda && (
                              <p className="text-[10px] text-gray-400">orig: {linea.moneda_original}</p>
                            )}
                          </div>
                          <Button
                            htmlType="button"
                            variant="ghost"
                            size="small"
                            onClick={() => removeLinea(linea.id)}
                            disabled={lineas.length === 1}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Mobile card layout */}
                      <div
                        className={cn(
                          "px-3 py-3 md:hidden space-y-3",
                          index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProductoSearchInput
                              linea={linea}
                              onSelect={(producto, descripcion) => handleProductoSelect(linea.id, producto, descripcion)}
                              cotizacionUsd={formData.cotizacion_usd}
                              listaMargen={listaSeleccionada?.margen_porcentaje || 0}
                            />
                          </div>
                          <Button
                            htmlType="button"
                            variant="ghost"
                            size="small"
                            onClick={() => removeLinea(linea.id)}
                            disabled={lineas.length === 1}
                            className="h-8 w-8 p-0 flex-shrink-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-gray-500">Cant.</Label>
                            <NumberInput
                              min="1"
                              decimals={0}
                              value={linea.cantidad}
                              onValueChange={(n) => updateLinea(linea.id, "cantidad", n || 1)}
                              className="h-8 text-xs text-center px-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-gray-500">Costo</Label>
                            <NumberInput
                              min="0"
                              step="0.01"
                              value={linea.precio_costo || ''}
                              onValueChange={(costo) => {
                                const margen = linea.margen_manual ?? listaSeleccionada?.margen_porcentaje ?? 0;
                                const precioVenta = margen > 0 ? costo * (1 + margen / 100) : linea.precio_unitario;
                                setLineas(prev => prev.map(l => {
                                  if (l.id !== linea.id) return l;
                                  const updated = { ...l, precio_costo: costo };
                                  if (margen > 0) updated.precio_unitario = precioVenta;
                                  const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
                                  updated.subtotal = updated.cantidad * precioConDescuento;
                                  return updated;
                                }));
                              }}
                              className="h-8 text-xs text-right px-1"
                              placeholder="$"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-gray-500">Precio</Label>
                            <NumberInput
                              min="0"
                              step="0.01"
                              value={linea.precio_unitario}
                              onValueChange={(precio) => {
                                const costo = linea.precio_costo || 0;
                                const nuevoMargen = costo > 0 ? Math.round(((precio / costo) - 1) * 100) : undefined;
                                setLineas(prev => prev.map(l => {
                                  if (l.id !== linea.id) return l;
                                  const updated = { ...l, precio_unitario: precio, margen_manual: nuevoMargen };
                                  const precioConDescuento = updated.precio_unitario * (1 - updated.descuento / 100);
                                  updated.subtotal = updated.cantidad * precioConDescuento;
                                  return updated;
                                }));
                              }}
                              className="h-8 text-xs text-right px-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-gray-500">Subtotal</Label>
                            <div className="h-8 flex items-center justify-end">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(linea.subtotal, formData.moneda)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 min-w-[260px] border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatCurrency(subtotal, formData.moneda)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Total</span>
                        <span className={cn(
                          "text-xl font-bold",
                          formData.moneda === 'USD' ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400"
                        )}>
                          {formatCurrency(total, formData.moneda)}
                        </span>
                      </div>
                      {formData.cotizacion_usd > 0 && total > 0 && (
                        <div className="flex items-center justify-end gap-1 mt-1 text-xs text-gray-500">
                          {formData.moneda === 'ARS' ? (
                            <>{formatCurrency(totalUsd, 'USD')}</>
                          ) : (
                            <>{formatCurrency(total * formData.cotizacion_usd)}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Condiciones y Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      Condiciones de Pago
                    </Label>
                    <Select
                      value={formData.condiciones_pago || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, condiciones_pago: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin especificar</SelectItem>
                        <SelectItem value="contado">Contado</SelectItem>
                        <SelectItem value="15_dias">15 dias</SelectItem>
                        <SelectItem value="30_dias">30 dias</SelectItem>
                        <SelectItem value="60_dias">60 dias</SelectItem>
                        <SelectItem value="50_50">50% anticipo, 50% contra entrega</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notas</Label>
                    <Textarea
                      placeholder="Notas adicionales para el cliente..."
                      value={formData.notas}
                      onChange={(e) =>
                        setFormData({ ...formData, notas: e.target.value })
                      }
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </form>
            </ScrollArea>

            {/* Footer con botones */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {listaSeleccionada && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    Margen: {listaSeleccionada.margen_porcentaje}%
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  htmlType="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  htmlType="submit"
                  onClick={handleSubmit}
                  disabled={loading || (!formData.cliente_id && !defaultPersonaId)}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {(!formData.cliente_id && !defaultPersonaId)
                    ? "Seleccioná cliente o contacto"
                    : presupuesto ? "Guardar Cambios" : "Crear Presupuesto"}
                </Button>
              </div>
            </div>
          </div>

          {/* Panel de Vista Previa */}
          {showPreview && (
            <div className="w-[400px] flex-shrink-0">
              <PreviewPanel
                cliente={clienteSeleccionado || null}
                lineas={lineas}
                total={total}
                subtotal={subtotal}
                formData={formData}
                usuario={usuario}
                cotizacionUsd={formData.cotizacion_usd}
              />
            </div>
          )}
        </div>
      </DialogContent>

      <CrearClienteRapidoDialog
        open={showCrearCliente}
        onOpenChange={setShowCrearCliente}
        onSuccess={(clienteId) => {
          setFormData({ ...formData, cliente_id: clienteId });
          setComboboxResetKey(prev => prev + 1);
        }}
      />
    </Dialog>
  );
}
