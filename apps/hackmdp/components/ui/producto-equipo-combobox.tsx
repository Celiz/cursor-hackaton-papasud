"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Loader2, Package, Search, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";

interface ProductoLite {
  id: string;
  nombre: string;
  codigo: string;
  precio_venta: number;
  precio_costo?: number;
  stock_actual: number;
}

type Tipo = "insumo" | "equipo";

export interface ResultadoBusqueda extends ProductoLite {
  tipo: Tipo;
  /** Moneda del precio (equipos: precio_lista_moneda; insumos: ARS por defecto) */
  moneda?: "ARS" | "USD";
  /** Para equipos: marca/modelo/unidades */
  marca?: string;
  modelo?: string;
  unidades_count?: number;
  /** Para equipos: nuevo/usado/demo/reacondicionado/outlet */
  condicion?: string;
  /** Para equipos usados: seriales de las unidades en stock */
  numeros_serie?: string[];
  /** Unidades en stock disponibles (id + serial) */
  unidades_stock?: Array<{ id: string; numero_serie: string }>;
  /** Para equipos: oportunidades abiertas donde ya está cotizado/reservado */
  cotizado_en?: Array<{ oportunidad_id: string; oportunidad_nombre: string; estado_item: string }>;
  /** Para equipos: unidades específicas reservadas */
  reservado_en?: Array<{ unidad_id: string; numero_serie: string; oportunidad_id: string; oportunidad_nombre: string }>;
}

interface Props {
  value: string;
  productoId?: string | null;
  onSelect: (resultado: ResultadoBusqueda | null, descripcion: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type Filtro = "todos" | "insumo" | "equipo";

export function ProductoEquipoCombobox({
  value,
  productoId,
  onSelect,
  placeholder = "Buscar producto o equipo...",
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [resultados, setResultados] = React.useState<ResultadoBusqueda[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const isMouseOverDropdownRef = React.useRef(false);

  React.useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open, resultados]);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const buscar = React.useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResultados([]);
      return;
    }
    setIsLoading(true);
    try {
      const [prodRes, equipoRes] = await Promise.all([
        fetch(`/api/productos?search=${encodeURIComponent(query)}&pageSize=10`),
        fetch(`/api/equipos?search=${encodeURIComponent(query)}`),
      ]);

      const out: ResultadoBusqueda[] = [];

      if (prodRes.ok) {
        const data = await prodRes.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        list.slice(0, 10).forEach((p: any) => {
          out.push({
            id: p.id,
            tipo: "insumo",
            codigo: p.codigo || "",
            nombre: p.nombre,
            precio_venta: Number(p.precio_venta) || 0,
            precio_costo: Number(p.precio_costo) || 0,
            stock_actual: p.stock_actual || 0,
          });
        });
      }

      if (equipoRes.ok) {
        const data = await equipoRes.json();
        if (Array.isArray(data)) {
          data.slice(0, 10).forEach((e: any) => {
            out.push({
              id: e.id,
              tipo: "equipo",
              codigo: e.codigo || `${e.marca}-${e.modelo}`.toUpperCase().replace(/\s+/g, "-"),
              nombre: `${e.marca ?? ""} ${e.modelo ?? ""}`.trim() || e.nombre,
              moneda: (e.precio_lista_moneda === "USD" ? "USD" : "ARS"),
              precio_venta: Number(e.precio_lista) || 0,
              precio_costo: Number(e.precio_costo) || 0,
              stock_actual: e.unidades_count || 0,
              marca: e.marca,
              modelo: e.modelo,
              unidades_count: e.unidades_count,
              condicion: e.condicion,
              numeros_serie: e.numeros_serie,
              unidades_stock: e.unidades_stock || [],
              cotizado_en: e.cotizado_en || [],
              reservado_en: e.reservado_en || [],
            });
          });
        }
      }

      setResultados(out);
    } catch (err) {
      console.error("Error en búsqueda:", err);
      setResultados([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onSelect(null, newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(newValue), 300);

    if (newValue.length >= 2 && !open) setOpen(true);
  };

  const handleSelect = (r: ResultadoBusqueda) => {
    const descripcion = r.codigo ? `${r.codigo} - ${r.nombre}` : r.nombre;
    setInputValue(descripcion);
    onSelect(r, descripcion);
    setOpen(false);
  };

  const handleBlur = () => {
    if (isMouseOverDropdownRef.current) return;
    setTimeout(() => {
      if (!isMouseOverDropdownRef.current) setOpen(false);
    }, 150);
  };

  const filtrados = React.useMemo(() => {
    if (filtro === "todos") return resultados;
    return resultados.filter((r) => r.tipo === filtro);
  }, [resultados, filtro]);

  const countInsumos = resultados.filter((r) => r.tipo === "insumo").length;
  const countEquipos = resultados.filter((r) => r.tipo === "equipo").length;

  return (
    <div className={cn("relative space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Filtrar:</span>
        <div className="flex rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 p-0.5 gap-0.5">
          {(
            [
              { value: "todos", label: "Todos", count: resultados.length, Icon: null },
              { value: "insumo", label: "Insumos", count: countInsumos, Icon: Package },
              { value: "equipo", label: "Equipos", count: countEquipos, Icon: Wrench },
            ] as const
          ).map(({ value: v, label, count, Icon }) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => setFiltro(v)}
              className={cn(
                "px-2 py-1 text-[11px] font-semibold rounded transition-all flex items-center gap-1 disabled:opacity-50",
                filtro === v
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.length >= 2) {
              buscar(inputValue);
              setOpen(true);
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-10 pl-9 pr-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600",
            "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
            "placeholder:text-gray-500 dark:placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          )}
        />
        {productoId && (
          <Package className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500 animate-spin" />
        )}
      </div>

      {open && filtrados.length > 0 && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 360),
              maxHeight: "320px",
              zIndex: 99999,
              pointerEvents: "auto",
            }}
            onMouseEnter={() => { isMouseOverDropdownRef.current = true; }}
            onMouseLeave={() => { isMouseOverDropdownRef.current = false; }}
          >
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 rounded-t-lg">
              {filtrados.length} resultado{filtrados.length === 1 ? "" : "s"}
            </div>
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "260px", overscrollBehavior: "contain" }}
              onWheel={(e) => e.stopPropagation()}
            >
              {filtrados.map((r) => (
                <div
                  key={`${r.tipo}-${r.id}`}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(r);
                  }}
                  className="w-full text-left px-3 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer select-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                            r.tipo === "equipo"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          )}
                        >
                          {r.tipo === "equipo" ? "EQUIPO" : "INSUMO"}
                        </span>
                        {r.codigo && (
                          <span className="text-xs font-mono text-gray-500">{r.codigo}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {r.tipo === "equipo"
                            ? `${r.unidades_count ?? 0} unid.`
                            : `Stock: ${r.stock_actual}`}
                        </span>
                        {r.tipo === "equipo" && r.condicion && (
                          <span
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                              r.condicion === 'usado'
                                ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'
                                : r.condicion === 'demo'
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
                                : r.condicion === 'reacondicionado'
                                ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'
                                : r.condicion === 'outlet'
                                ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                            )}
                          >
                            {r.condicion.charAt(0).toUpperCase() + r.condicion.slice(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                        {r.nombre}
                      </p>
                      {r.tipo === 'equipo' && r.condicion === 'usado' && r.numeros_serie && r.numeros_serie.length > 0 && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                          S/N: {r.numeros_serie.join(', ')}
                        </p>
                      )}
                      {r.tipo === 'equipo' && ((r.cotizado_en && r.cotizado_en.length > 0) || (r.reservado_en && r.reservado_en.length > 0)) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.reservado_en?.map((rv, i) => (
                            <span
                              key={`rv-${i}`}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                            >
                              ⚠ Reservado en “{rv.oportunidad_nombre}”
                            </span>
                          ))}
                          {r.cotizado_en?.filter(c => !(r.reservado_en?.some(rv => rv.oportunidad_id === c.oportunidad_id))).map((c, i) => (
                            <span
                              key={`co-${i}`}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                            >
                              ⚠ Cotizado en “{c.oportunidad_nombre}”
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                      {formatCurrency(r.precio_venta)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
