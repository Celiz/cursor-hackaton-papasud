'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, ChevronDown, ChevronRight, Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  derivarOpciones,
  filtrar,
  contarActivos,
  estadoInicial,
  type FiltroDef,
  type FiltroEstado,
  type ValorFiltro,
} from '@/lib/filtros';

/**
 * Hook: filtra `data` en memoria según `defs`. La página lo usa para obtener las
 * filas filtradas (para la tabla) y el estado que le pasa al panel.
 *
 * Arranca en el `defecto` de cada def (y "Limpiar" vuelve ahí, no a vacío), así
 * una lista puede traer de todo y mostrar igual un recorte por defecto.
 * `defs` tiene que ser estable (useMemo en la página): el estado inicial se fija
 * en el primer render.
 */
export function useFiltros<T>(data: T[], defs: FiltroDef<T>[]) {
  const [estado, setEstado] = useState<FiltroEstado>(() => estadoInicial(defs));
  const filtered = useMemo(() => filtrar(data, defs, estado), [data, defs, estado]);
  const activos = contarActivos(estado, defs);
  const setFiltro = (id: string, val: ValorFiltro | undefined) =>
    setEstado((e) => ({ ...e, [id]: val }));
  const limpiar = () => setEstado(estadoInicial(defs));
  return { filtered, estado, setFiltro, limpiar, activos };
}

interface FiltrosSidebarProps<T> {
  data: T[];
  defs: FiltroDef<T>[];
  estado: FiltroEstado;
  setFiltro: (id: string, val: ValorFiltro | undefined) => void;
  limpiar: () => void;
  activos: number;
}

export function FiltrosSidebar<T>({
  data,
  defs,
  estado,
  setFiltro,
  limpiar,
  activos,
}: FiltrosSidebarProps<T>) {
  const [abierto, setAbierto] = useState(true);

  if (!abierto) {
    return (
      <div className="shrink-0">
        <Button
          type="default"
          size="tiny"
          icon={<Filter />}
          onClick={() => setAbierto(true)}
          className="relative"
        >
          Filtros
          {activos > 0 && (
            <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
              {activos}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[264px] shrink-0 rounded-lg border bg-card flex flex-col self-start max-h-[calc(100vh-180px)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Filtros
          {activos > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
              {activos}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activos > 0 && (
            <button
              onClick={limpiar}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAbierto(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {defs.map((def) => (
            <GrupoFiltro
              key={def.id}
              def={def}
              data={data}
              valor={estado[def.id]}
              onChange={(val) => setFiltro(def.id, val)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function GrupoFiltro<T>({
  def,
  data,
  valor,
  onChange,
}: {
  def: FiltroDef<T>;
  data: T[];
  valor: ValorFiltro | undefined;
  onChange: (val: ValorFiltro | undefined) => void;
}) {
  const [expandido, setExpandido] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const opciones = useMemo(() => derivarOpciones(data, def), [data, def]);

  const seleccionados = Array.isArray(valor) ? valor : [];
  const activoEnGrupo = def.tipo === 'bool' ? valor === 'si' || valor === 'no' : seleccionados.length > 0;

  const opcionesFiltradas =
    def.buscable && busqueda.trim()
      ? opciones.filter((o) => o.toLowerCase().includes(busqueda.trim().toLowerCase()))
      : opciones;

  const toggleOpcion = (op: string) => {
    const set = new Set(seleccionados);
    if (set.has(op)) set.delete(op);
    else set.add(op);
    onChange(set.size ? Array.from(set) : undefined);
  };

  return (
    <div className="rounded-md">
      <button
        onClick={() => setExpandido((e) => !e)}
        className="w-full flex items-center gap-1.5 px-1.5 py-1.5 text-sm hover:bg-muted/60 rounded-md"
      >
        {expandido ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="font-medium">{def.label}</span>
        {activoEnGrupo && (
          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
            {def.tipo === 'bool' ? (valor === 'si' ? 'Sí' : 'No') : seleccionados.length}
          </Badge>
        )}
      </button>

      {expandido && (
        <div className="pl-5 pr-1 pb-2 pt-0.5">
          {def.tipo === 'bool' ? (
            <div className="flex gap-1">
              {(['todos', 'si', 'no'] as const).map((op) => {
                const activo = op === 'todos' ? !activoEnGrupo : valor === op;
                return (
                  <button
                    key={op}
                    onClick={() => onChange(op === 'todos' ? undefined : op)}
                    className={cn(
                      'flex-1 text-xs py-1 rounded-md border transition-colors',
                      activo
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                  >
                    {op === 'todos' ? 'Todos' : op === 'si' ? 'Sí' : 'No'}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {def.buscable && opciones.length > 8 && (
                <div className="relative mb-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar…"
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              )}
              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
                {opcionesFiltradas.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">Sin opciones</p>
                ) : (
                  opcionesFiltradas.map((op) => (
                    <label
                      key={op}
                      className="flex items-center gap-2 py-0.5 text-xs cursor-pointer hover:bg-muted/50 rounded px-1"
                    >
                      <Checkbox
                        checked={seleccionados.includes(op)}
                        onCheckedChange={() => toggleOpcion(op)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate" title={op}>{op}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
