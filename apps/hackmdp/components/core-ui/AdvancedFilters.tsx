"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  SlidersHorizontal,
  Calendar as CalendarIcon,
  X,
  Users,
  Tag,
  Receipt,
  Package,
  Sparkles,
  Filter,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import useSWR from "swr";

interface OpcionesServiciosFilter {
  tecnicos: Array<{ valor: string; usos: number }>;
  estados_contables: Array<{ valor: string; usos: number }>;
  tipos_servicio: Array<{ valor: string; usos: number }>;
  marcas?: Array<{ valor: string; usos: number }>;
  tipos_equipo?: Array<{ valor: string; usos: number }>;
  subtipos_equipo?: Array<{ valor: string; categoria: string | null; usos: number }>;
  equipos?: Array<{ id: string | null; valor: string; usos: number }>;
  clientes?: Array<{ id: string | null; valor: string; usos: number }>;
}
const fetcherOpcionesFilter = (url: string) => fetch(url).then((r) => r.json());

interface AdvancedFiltersProps {
  onApplyFilters: (filters: FilterValues) => void;
  technicians?: string[];
  estados?: string[];
  estadosContables?: string[];
}

export interface FilterValues {
  dateRange?: {
    from: Date;
    to: Date;
  };
  technicians?: string[];
  estados?: string[];
  searchText?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  hasInsumos?: boolean;
  estadoContable?: string[];
  tipoServicio?: string[];
  mantenimiento?: boolean;
  marcas?: string[];
  equiposIds?: string[];
  tiposEquipo?: string[];
  subtiposEquipo?: string[];
  clientesIds?: string[];
}

// Filter section component — compacta, sin gradientes ni cápsulas grandes
function FilterSection({
  icon: Icon,
  title,
  count,
  children,
  defaultExpanded = true
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-200/70 dark:border-gray-800/50 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors -mx-2 px-2 rounded"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold">
              {count}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="pb-3 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Lista buscable con chips multi-select. Selected siempre arriba.
// items: { id?: string | null; valor: string; usos: number }. El id se usa
// como key cuando existe (equipos, clientes); sino se usa el valor (marcas,
// tipos).
function SearchableChipList({
  items,
  selected,
  onToggle,
  placeholder,
  maxShown = 40,
}: {
  items: Array<{ id?: string | null; valor: string; usos?: number }>;
  selected: string[];
  onToggle: (key: string) => void;
  placeholder: string;
  maxShown?: number;
}) {
  const [search, setSearch] = useState("");
  const selectedSet = new Set(selected);

  const filtered = search.trim()
    ? items.filter((i) =>
        i.valor.toLowerCase().includes(search.trim().toLowerCase())
      )
    : items;

  const selKey = (i: { id?: string | null; valor: string }) => i.id ?? i.valor;
  const selectedItems = filtered.filter((i) => selectedSet.has(selKey(i)));
  const unselectedItems = filtered.filter((i) => !selectedSet.has(selKey(i)));
  const shown = [...selectedItems, ...unselectedItems.slice(0, maxShown)];
  const hiddenCount = Math.max(0, unselectedItems.length - maxShown);

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 px-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-300 dark:focus:border-purple-700"
      />
      {shown.length === 0 ? (
        <p className="text-[11px] text-gray-400 dark:text-gray-600 italic pt-0.5">
          {items.length === 0 ? "Sin opciones" : "Sin coincidencias"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
          {shown.map((item) => (
            <FilterChip
              key={selKey(item)}
              label={item.valor}
              selected={selectedSet.has(selKey(item))}
              onClick={() => onToggle(selKey(item))}
            />
          ))}
        </div>
      )}
      {hiddenCount > 0 && (
        <p className="text-[11px] text-gray-400 dark:text-gray-600 italic">
          +{hiddenCount} más — refiná con la búsqueda
        </p>
      )}
    </div>
  );
}

// Chip-style toggle — compacto
function FilterChip({
  label,
  selected,
  onClick
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-md text-xs font-medium transition-colors",
        "border focus:outline-none focus:ring-1 focus:ring-purple-500/50",
        selected
          ? "bg-purple-600 text-white border-purple-600"
          : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
      )}
    >
      {label}
    </button>
  );
}

export function AdvancedFilters({
  onApplyFilters,
  technicians = [],
  estados = [],
  estadosContables = []
}: AdvancedFiltersProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedEstados, setSelectedEstados] = useState<string[]>([]);
  const [selectedEstadosContables, setSelectedEstadosContables] = useState<string[]>([]);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [selectedEquipos, setSelectedEquipos] = useState<string[]>([]);
  const [selectedTiposEquipo, setSelectedTiposEquipo] = useState<string[]>([]);
  const [selectedSubtiposEquipo, setSelectedSubtiposEquipo] = useState<string[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [hasInsumos, setHasInsumos] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar opciones reales desde la BD. Esto reemplaza la dependencia de las
  // props `technicians` / `estados` / `estadosContables`, que solo contenían
  // los valores presentes en los servicios visibles en la página actual y por
  // eso aparecían incompletos. SWR solo dispara cuando el sheet está abierto.
  const { data: opcionesData } = useSWR<OpcionesServiciosFilter>(
    isOpen ? "/api/servicios/opciones" : null,
    fetcherOpcionesFilter,
    { dedupingInterval: 2 * 60 * 1000 }
  );

  // Mergeamos con las props que vinieron del padre (por si tienen algún valor
  // muy nuevo no persistido todavía o por compat con la API previa).
  const mergeUnique = (a: string[], b: string[]) =>
    Array.from(new Set([...a, ...b])).sort((x, y) => x.localeCompare(y, "es"));
  const allTechnicians = mergeUnique(
    technicians,
    (opcionesData?.tecnicos || []).map((t) => t.valor)
  );
  const allEstados = mergeUnique(estados, []);
  const allEstadosContables = mergeUnique(
    estadosContables,
    (opcionesData?.estados_contables || []).map((e) => e.valor)
  );
  const allMarcas = (opcionesData?.marcas || []).map((m) => ({
    valor: m.valor,
    usos: m.usos,
  }));
  const allTiposEquipo = (opcionesData?.tipos_equipo || []).map((t) => ({
    valor: t.valor,
    usos: t.usos,
  }));
  // Subtipos (UI "Tipo") en cascada: si hay categorías seleccionadas, mostrar
  // solo los subtipos cuya categoría coincida (case-insensitive). Sin categoría
  // seleccionada, se muestran todos.
  const subtiposEquipoVisibles = (opcionesData?.subtipos_equipo || []).filter(
    (s) =>
      selectedTiposEquipo.length === 0 ||
      (s.categoria &&
        selectedTiposEquipo.some(
          (c) => c.toLowerCase() === s.categoria!.toLowerCase()
        ))
  );
  const allEquipos = (opcionesData?.equipos || []).filter((e) => e.id);
  const allClientes = (opcionesData?.clientes || []).filter((c) => c.id);

  // Al cambiar las categorías seleccionadas, podar los subtipos elegidos que ya
  // no apliquen (evita un filtro "fantasma" que devolvería 0 resultados).
  useEffect(() => {
    setSelectedSubtiposEquipo((prev) => {
      if (prev.length === 0 || selectedTiposEquipo.length === 0) return prev;
      const cats = selectedTiposEquipo.map((c) => c.toLowerCase());
      const visibles = new Set(
        (opcionesData?.subtipos_equipo || [])
          .filter((s) => s.categoria && cats.includes(s.categoria.toLowerCase()))
          .map((s) => s.valor)
      );
      const next = prev.filter((v) => visibles.has(v));
      return next.length === prev.length ? prev : next;
    });
  }, [selectedTiposEquipo, opcionesData]);

  const handleApply = () => {
    const newFilters: FilterValues = {
      ...((dateRange.from || dateRange.to) && {
        dateRange: {
          from: dateRange.from as Date,
          to: dateRange.to as Date,
        },
      }),
      ...(selectedTechnicians.length > 0 && { technicians: selectedTechnicians }),
      ...(selectedEstados.length > 0 && { estados: selectedEstados }),
      ...(selectedEstadosContables.length > 0 && { estadoContable: selectedEstadosContables }),
      ...(selectedMarcas.length > 0 && { marcas: selectedMarcas }),
      ...(selectedEquipos.length > 0 && { equiposIds: selectedEquipos }),
      ...(selectedTiposEquipo.length > 0 && { tiposEquipo: selectedTiposEquipo }),
      ...(selectedSubtiposEquipo.length > 0 && { subtiposEquipo: selectedSubtiposEquipo }),
      ...(selectedClientes.length > 0 && { clientesIds: selectedClientes }),
      hasInsumos,
    };

    onApplyFilters(newFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDateRange({});
    setSelectedTechnicians([]);
    setSelectedEstados([]);
    setSelectedEstadosContables([]);
    setSelectedMarcas([]);
    setSelectedEquipos([]);
    setSelectedTiposEquipo([]);
    setSelectedSubtiposEquipo([]);
    setSelectedClientes([]);
    setPriceRange([0, 100000]);
    setHasInsumos(false);
    onApplyFilters({});
  };

  const toggleTechnician = (tech: string) => {
    setSelectedTechnicians(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  const toggleEstado = (estado: string) => {
    setSelectedEstados(prev =>
      prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
    );
  };

  const toggleEstadoContable = (estadoContable: string) => {
    setSelectedEstadosContables(prev =>
      prev.includes(estadoContable) ? prev.filter(e => e !== estadoContable) : [...prev, estadoContable]
    );
  };

  const toggleListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (key: string) => {
    setter((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const activeFiltersCount =
    (dateRange.from || dateRange.to ? 1 : 0) +
    selectedTechnicians.length +
    selectedEstados.length +
    selectedEstadosContables.length +
    selectedMarcas.length +
    selectedEquipos.length +
    selectedTiposEquipo.length +
    selectedSubtiposEquipo.length +
    selectedClientes.length +
    (hasInsumos ? 1 : 0);

  if (!mounted) {
    return (
      <Button type="outline" size="tiny" icon={<SlidersHorizontal className="h-4 w-4" />}>
        <span className="font-semibold">Filtros</span>
      </Button>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button type="outline" size="tiny" icon={<Filter className="h-4 w-4" />}>
          <span className="flex items-center gap-1.5">
            <span className="font-semibold">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-full sm:max-w-md overflow-hidden p-0 border-l border-gray-200 dark:border-gray-800"
        side="right"
      >
        {/* Header — compacto */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3">
            <SheetHeader className="space-y-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <SheetTitle className="text-base font-semibold text-gray-900 dark:text-white">
                    Filtros
                  </SheetTitle>
                  {activeFiltersCount > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-purple-600 text-white text-[11px] font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Limpiar
                  </button>
                )}
              </div>
              <SheetDescription className="sr-only">Filtros avanzados de búsqueda</SheetDescription>
            </SheetHeader>
          </div>
        </div>

        {/* Content — más denso */}
        <div className="overflow-y-auto h-[calc(100vh-120px)] px-4">
          {/* Date Range */}
          <FilterSection icon={CalendarIcon} title="Período" count={(dateRange.from || dateRange.to) ? 1 : 0}>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full h-8 px-2 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5",
                      dateRange.from
                        ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 opacity-60" />
                    {dateRange.from
                      ? format(dateRange.from, "dd/MM/yyyy", { locale: es })
                      : "Desde"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full h-8 px-2 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5",
                      dateRange.to
                        ? "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500"
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 opacity-60" />
                    {dateRange.to
                      ? format(dateRange.to, "dd/MM/yyyy", { locale: es })
                      : "Hasta"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                    disabled={(date) => (dateRange.from ? date < dateRange.from : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(dateRange.from || dateRange.to) && (
              <button
                onClick={() => setDateRange({})}
                className="mt-1.5 text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-800 flex items-center gap-1"
              >
                <X className="h-2.5 w-2.5" />
                Limpiar fechas
              </button>
            )}
          </FilterSection>

          {/* Marca */}
          <FilterSection icon={Tag} title="Marca" count={selectedMarcas.length}>
            <SearchableChipList
              items={allMarcas}
              selected={selectedMarcas}
              onToggle={toggleListItem(setSelectedMarcas)}
              placeholder="Buscar marca..."
            />
          </FilterSection>

          {/* Equipo / Modelo */}
          <FilterSection icon={Package} title="Equipo / Modelo" count={selectedEquipos.length}>
            <SearchableChipList
              items={allEquipos}
              selected={selectedEquipos}
              onToggle={toggleListItem(setSelectedEquipos)}
              placeholder="Buscar equipo (marca, modelo)..."
            />
          </FilterSection>

          {/* Categoría (familia del equipo) */}
          <FilterSection icon={Package} title="Categoría" count={selectedTiposEquipo.length}>
            <SearchableChipList
              items={allTiposEquipo}
              selected={selectedTiposEquipo}
              onToggle={toggleListItem(setSelectedTiposEquipo)}
              placeholder="Buscar categoría..."
            />
          </FilterSection>

          {/* Tipo (subtipo, en cascada con Categoría) */}
          <FilterSection icon={Package} title="Tipo" count={selectedSubtiposEquipo.length}>
            <SearchableChipList
              items={subtiposEquipoVisibles}
              selected={selectedSubtiposEquipo}
              onToggle={toggleListItem(setSelectedSubtiposEquipo)}
              placeholder="Buscar tipo..."
            />
          </FilterSection>

          {/* Cliente */}
          <FilterSection icon={Users} title="Cliente" count={selectedClientes.length}>
            <SearchableChipList
              items={allClientes}
              selected={selectedClientes}
              onToggle={toggleListItem(setSelectedClientes)}
              placeholder="Buscar cliente..."
            />
          </FilterSection>

          {/* Técnicos */}
          <FilterSection icon={Users} title="Técnicos" count={selectedTechnicians.length}>
            {allTechnicians.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic">Sin técnicos cargados</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allTechnicians.map((tech) => (
                  <FilterChip
                    key={tech}
                    label={tech}
                    selected={selectedTechnicians.includes(tech)}
                    onClick={() => toggleTechnician(tech)}
                  />
                ))}
              </div>
            )}
          </FilterSection>

          {/* Estados del Servicio */}
          <FilterSection icon={Tag} title="Estado del Servicio" count={selectedEstados.length}>
            {allEstados.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic">Sin estados cargados</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allEstados.map((estado) => (
                  <FilterChip
                    key={estado}
                    label={estado}
                    selected={selectedEstados.includes(estado)}
                    onClick={() => toggleEstado(estado)}
                  />
                ))}
              </div>
            )}
          </FilterSection>

          {/* Estados Contables */}
          <FilterSection icon={Receipt} title="Estado Contable" count={selectedEstadosContables.length}>
            {allEstadosContables.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600 italic">Sin estados contables cargados</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allEstadosContables.map((estadoContable) => (
                  <FilterChip
                    key={estadoContable}
                    label={estadoContable}
                    selected={selectedEstadosContables.includes(estadoContable)}
                    onClick={() => toggleEstadoContable(estadoContable)}
                  />
                ))}
              </div>
            )}
          </FilterSection>

          {/* Opciones Adicionales */}
          <FilterSection icon={Package} title="Opciones Adicionales" count={hasInsumos ? 1 : 0} defaultExpanded={false}>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="has-insumos"
                checked={hasInsumos}
                onCheckedChange={(checked) => setHasInsumos(checked as boolean)}
                className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-3.5 w-3.5"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Solo servicios con insumos registrados
              </span>
            </label>
          </FilterSection>
        </div>

        {/* Footer — compacto */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              disabled={activeFiltersCount === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs transition-colors"
            >
              <Filter className="h-3 w-3" />
              Aplicar {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
