"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Search,
  Filter,
  RefreshCw,
  X,
  Check,
  Box,
  Package,
  Sparkles,
  Zap,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import { Equipo } from "@/lib/types";

export type { Equipo };

// Badge de condición con colores
export const CondicionBadge = ({ condicion }: { condicion?: string }) => {
  const config: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
    nuevo: { label: 'Nuevo', className: 'bg-green-100 text-green-700 border-green-200', icon: <Sparkles className="w-3 h-3" /> },
    usado: { label: 'Usado', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    demo: { label: 'Demo', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Zap className="w-3 h-3" /> },
    reacondicionado: { label: 'Reacondicionado', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    outlet: { label: 'Outlet', className: 'bg-red-100 text-red-700 border-red-200', icon: <Tag className="w-3 h-3" /> },
  };
  const c = config[condicion || 'nuevo'] || config.nuevo;
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 flex items-center gap-1", c.className)}>
      {c.icon}
      {c.label}
    </Badge>
  );
};

// ============================================
// COMPONENTE: Selector de Equipo Mejorado
// ============================================
export function EquipoSelector({
  equipos,
  selectedId,
  onSelect,
  collapsible = false,
}: {
  equipos: Equipo[];
  selectedId: string;
  onSelect: (equipo: Equipo) => void;
  // Cuando es true, el buscador se colapsa si ya hay un equipo elegido (caso single,
  // p. ej. equipo que viene de un item) y se reabre con "Cambiar equipo".
  collapsible?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterCondicion, setFilterCondicion] = useState<string>('todos');
  const [showFilters, setShowFilters] = useState(false);
  // Buscador colapsable (solo modo single): si ya hay un equipo elegido arranca
  // colapsado y se reabre con "Cambiar equipo". Sin selección arranca abierto.
  const [showSearch, setShowSearch] = useState(collapsible ? !selectedId : true);
  const prevSelectedRef = useRef(selectedId);

  // Obtener tipos y condiciones únicas
  const tipos = useMemo(() => {
    const t = new Set(equipos.map(e => e.tipo).filter(Boolean));
    return Array.from(t).sort();
  }, [equipos]);

  const condiciones = useMemo(() => {
    const c = new Set(equipos.map(e => e.condicion || 'nuevo').filter(Boolean));
    return Array.from(c);
  }, [equipos]);

  // Filtrar equipos
  const filteredEquipos = useMemo(() => {
    return equipos.filter(equipo => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          equipo.marca?.toLowerCase().includes(searchLower) ||
          equipo.modelo?.toLowerCase().includes(searchLower) ||
          equipo.tipo?.toLowerCase().includes(searchLower) ||
          equipo.descripcion?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      // Tipo filter
      if (filterTipo !== 'todos' && equipo.tipo !== filterTipo) return false;
      // Condicion filter
      if (filterCondicion !== 'todos' && (equipo.condicion || 'nuevo') !== filterCondicion) return false;
      return true;
    });
  }, [equipos, search, filterTipo, filterCondicion]);

  const selectedEquipo = equipos.find(e => e.id === selectedId);
  const activeFiltersCount = (filterTipo !== 'todos' ? 1 : 0) + (filterCondicion !== 'todos' ? 1 : 0);

  // Si el equipo se precarga async (oportunidad) colapsamos el buscador; si se limpia
  // la selección lo reabrimos. Solo aplica en modo colapsable (single).
  useEffect(() => {
    if (!collapsible) return;
    if (selectedId && !prevSelectedRef.current) setShowSearch(false);
    if (!selectedId && prevSelectedRef.current) setShowSearch(true);
    prevSelectedRef.current = selectedId;
  }, [selectedId, collapsible]);

  return (
    <div className="space-y-3">
      {/* Selected equipment preview */}
      {selectedEquipo && (
        <div className="p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            {selectedEquipo.imagen_url ? (
              <img src={selectedEquipo.imagen_url} alt="" className="w-14 h-14 rounded-lg object-cover border" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Box className="w-6 h-6 text-emerald-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{selectedEquipo.marca} {selectedEquipo.modelo}</p>
                <CondicionBadge condicion={selectedEquipo.condicion} />
              </div>
              <p className="text-xs text-gray-500">{selectedEquipo.tipo}</p>
              {selectedEquipo.condicion === 'usado' && (selectedEquipo as any).numeros_serie?.length > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                  S/N: {((selectedEquipo as any).numeros_serie as string[]).join(', ')}
                </p>
              )}
              {selectedEquipo.precio_lista && (
                <p className="text-xs font-medium text-emerald-600 mt-0.5">
                  {formatCurrency(selectedEquipo.precio_lista, selectedEquipo.precio_lista_moneda || 'USD')}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelect({ ...selectedEquipo, id: '' } as Equipo)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Botón "Cambiar equipo": modo colapsado, cuando ya hay un equipo elegido. */}
      {collapsible && selectedEquipo && !showSearch && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSearch(true)}
          className="w-full gap-2 border-dashed"
        >
          <RefreshCw className="w-4 h-4" />
          Cambiar equipo
        </Button>
      )}

      {/* Buscador + grilla: visible sin selección o tras pulsar "Cambiar equipo". */}
      {showSearch && (
        <>
      {/* Search and filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por marca, modelo o tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border">
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1 block">Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {tipos.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1 block">Condición</Label>
              <Select value={filterCondicion} onValueChange={setFilterCondicion}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="nuevo">Nuevo</SelectItem>
                  <SelectItem value="usado">Usado</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="reacondicionado">Reacondicionado</SelectItem>
                  <SelectItem value="outlet">Outlet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeFiltersCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTipo('todos');
                  setFilterCondicion('todos');
                }}
                className="h-8 self-end text-xs"
              >
                Limpiar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Equipment grid */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="h-[280px]">
          <div className="grid grid-cols-1 gap-1 p-2">
            {filteredEquipos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Package className="w-8 h-8 mb-2" />
                <p className="text-sm">No se encontraron equipos</p>
              </div>
            ) : (
              filteredEquipos.map(equipo => (
                <button
                  key={equipo.id}
                  type="button"
                  onClick={() => { onSelect(equipo); if (collapsible) setShowSearch(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    selectedId === equipo.id && "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                  )}
                >
                  {equipo.imagen_url ? (
                    <img
                      src={equipo.imagen_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{equipo.marca} {equipo.modelo}</p>
                      <CondicionBadge condicion={equipo.condicion} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{equipo.tipo}</p>
                    {equipo.condicion === 'usado' && (equipo as any).numeros_serie?.length > 0 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate mt-0.5 font-mono">
                        S/N: {((equipo as any).numeros_serie as string[]).join(', ')}
                      </p>
                    )}
                  </div>
                  {equipo.precio_lista && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(equipo.precio_lista, equipo.precio_lista_moneda || 'USD')}
                      </p>
                    </div>
                  )}
                  {selectedId === equipo.id && (
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <p className="text-xs text-gray-400 text-center">
        {filteredEquipos.length} equipo{filteredEquipos.length !== 1 ? 's' : ''} disponible{filteredEquipos.length !== 1 ? 's' : ''}
      </p>
        </>
      )}
    </div>
  );
}
