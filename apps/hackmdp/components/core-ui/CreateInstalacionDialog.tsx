'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Check, Loader2, X, Building2, Plus, Package } from 'lucide-react';
import { searchClientes, type ClienteComboboxOption } from '@/hooks/use-client-search';
import { CiudadCombobox } from './CiudadCombobox';
import { FechaEstadoPicker } from './instalaciones/FechaEstadoPicker';
import type { FechaEstado } from '@locus/core/instalaciones';
import { cn } from '@/lib/utils';

interface Laboratorio {
  id: string;
  nombre: string;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  clientes: Array<{ id: string; nombre: string }>;
  // tiposEquipos y ubicacionesTipos ya no se usan pero los dejamos como prop
  // opcional para compatibilidad con el caller hasta que también se limpie.
  tiposEquipos?: any[];
  ubicacionesTipos?: any[];
}

type Step = 'cliente' | 'sede' | 'oportunidad' | 'equipo' | 'datos';

type EquipoSel = {
  tipo: 'unidad' | 'catalogo';
  equipo_unidad_id?: string;
  equipo_id?: string;
  label: string;
  sublabel?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CreateInstalacionDialog({ isOpen, onClose, onCreate, clientes }: Props) {
  const [step, setStep] = useState<Step>('cliente');
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteLabel, setClienteLabel] = useState<string>('');
  const [clienteSearch, setClienteSearch] = useState<string>('');
  const [clienteResults, setClienteResults] = useState<ClienteComboboxOption[]>([]);
  const [clienteSearching, setClienteSearching] = useState(false);
  const clienteDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [oportunidadId, setOportunidadId] = useState<string>('auto');

  // Sede (laboratorio): se elige entre las del cliente o se crea nueva inline
  const [laboratorioId, setLaboratorioId] = useState<string>('');
  const [nuevoLabMode, setNuevoLabMode] = useState(false);
  const [nuevoLabNombre, setNuevoLabNombre] = useState('');
  const [nuevoLabDireccion, setNuevoLabDireccion] = useState('');
  const [nuevoLabLocalidad, setNuevoLabLocalidad] = useState('');
  const [nuevoLabProvincia, setNuevoLabProvincia] = useState('');

  // Equipo inicial (opcional): unidad del stock (con serie) o modelo del catálogo
  const [equipoModo, setEquipoModo] = useState<'stock' | 'catalogo'>('stock');
  const [equipoSearch, setEquipoSearch] = useState('');
  const [equipoSel, setEquipoSel] = useState<EquipoSel | null>(null);

  const [direccion, setDireccion] = useState('');
  const [fechaEstado, setFechaEstado] = useState<FechaEstado>('a_confirmar');
  const [fechaPlanificada, setFechaPlanificada] = useState<string | null>(null);
  const [fechaNota, setFechaNota] = useState<string | null>(null);
  const [notaInicial, setNotaInicial] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Búsqueda async de clientes (debounced)
  useEffect(() => {
    if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current);
    if (!isOpen || clienteId) {
      // No buscar si hay uno seleccionado o el dialog está cerrado
      return;
    }
    setClienteSearching(true);
    clienteDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchClientes(clienteSearch);
        setClienteResults(results);
      } catch {
        setClienteResults([]);
      } finally {
        setClienteSearching(false);
      }
    }, 250);
    return () => {
      if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current);
    };
  }, [clienteSearch, isOpen, clienteId]);

  // Traer oportunidades del cliente seleccionado
  const { data: oportunidades = [] } = useSWR(
    clienteId ? `/api/oportunidades?cliente_id=${clienteId}` : null,
    fetcher
  );

  // Traer laboratorios/sedes del cliente seleccionado
  const { data: laboratorios = [] } = useSWR<Laboratorio[]>(
    clienteId ? `/api/laboratorios?razon_social_id=${clienteId}&completos=true` : null,
    fetcher
  );

  // Dirección propia del cliente (para pre-llenar la sede cuando no tiene lab guardado)
  const { data: clienteData } = useSWR<{ direccion?: string | null; localidad?: string | null; provincia?: string | null }>(
    clienteId ? `/api/clientes/${clienteId}` : null,
    fetcher
  );

  // Búsqueda de equipo inicial (paso opcional "Equipo")
  const { data: unidadesStock = [] } = useSWR<any[]>(
    isOpen && step === 'equipo' && equipoModo === 'stock' && equipoSearch.trim()
      ? `/api/equipos-unidades?estado=stock&search=${encodeURIComponent(equipoSearch.trim())}`
      : null,
    fetcher
  );
  const { data: catalogoEquipos = [] } = useSWR<any[]>(
    isOpen && step === 'equipo' && equipoModo === 'catalogo' && equipoSearch.trim()
      ? `/api/equipos?search=${encodeURIComponent(equipoSearch.trim())}`
      : null,
    fetcher
  );

  // Auto-entrar al modo "nuevo lab" si el cliente no tiene ninguno
  useEffect(() => {
    if (step === 'sede' && Array.isArray(laboratorios) && laboratorios.length === 0 && !nuevoLabMode) {
      setNuevoLabMode(true);
    }
  }, [step, laboratorios, nuevoLabMode]);

  // Al entrar en modo "nueva sede", pre-llenar con la dirección guardada del cliente.
  // El nombre por defecto es "Casa Central" (la sede = el laboratorio del cliente).
  // Usa updater funcional (v || ...) para NO pisar lo que el usuario ya editó.
  useEffect(() => {
    if (!nuevoLabMode) return;
    setNuevoLabNombre((v) => v || 'Casa Central');
    setNuevoLabDireccion((v) => v || clienteData?.direccion || '');
    setNuevoLabLocalidad((v) => v || clienteData?.localidad || '');
    setNuevoLabProvincia((v) => v || clienteData?.provincia || '');
  }, [nuevoLabMode, clienteData]);

  const reset = () => {
    setStep('cliente');
    setClienteId('');
    setClienteLabel('');
    setClienteSearch('');
    setClienteResults([]);
    setOportunidadId('auto');
    setLaboratorioId('');
    setNuevoLabMode(false);
    setNuevoLabNombre('');
    setNuevoLabDireccion('');
    setNuevoLabLocalidad('');
    setNuevoLabProvincia('');
    setEquipoModo('stock');
    setEquipoSearch('');
    setEquipoSel(null);
    setDireccion('');
    setFechaEstado('a_confirmar');
    setFechaPlanificada(null);
    setFechaNota(null);
    setNotaInicial('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sedeLista =
    (laboratorioId && !nuevoLabMode) ||
    (nuevoLabMode && nuevoLabNombre.trim() && (nuevoLabDireccion.trim() || direccion.trim()));

  const handleSubmit = async () => {
    if (!clienteId) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        cliente_id: clienteId,
        oportunidad_id: oportunidadId,
        fecha_estado: fechaEstado,
        fecha_planificada: fechaPlanificada,
        fecha_nota: fechaNota,
        notas_planificacion: notaInicial || null,
      };

      if (nuevoLabMode) {
        payload.nuevo_laboratorio = {
          nombre: nuevoLabNombre.trim(),
          direccion: nuevoLabDireccion.trim() || direccion.trim() || null,
          localidad: nuevoLabLocalidad.trim() || null,
          provincia: nuevoLabProvincia.trim() || null,
        };
      } else if (laboratorioId) {
        payload.laboratorio_id = laboratorioId;
      }

      // direccion override (opcional): solo si difiere explícitamente
      if (direccion.trim()) {
        payload.direccion_instalacion = direccion.trim();
      }

      // Equipo inicial (opcional)
      if (equipoSel) {
        payload.equipo =
          equipoSel.tipo === 'unidad'
            ? { equipo_unidad_id: equipoSel.equipo_unidad_id, label: equipoSel.label }
            : { equipo_id: equipoSel.equipo_id, label: equipoSel.label };
      }

      await onCreate(payload);
      handleClose();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nueva instalación</DialogTitle>
          <DialogDescription>
            {step === 'cliente' && 'Seleccioná el cliente.'}
            {step === 'sede' && 'Elegí o cargá la sede donde se realiza la instalación.'}
            {step === 'oportunidad' && '¿Esta instalación viene de una oportunidad existente?'}
            {step === 'equipo' && 'Elegí el equipo a instalar (opcional, se puede agregar después).'}
            {step === 'datos' && 'Datos básicos de la instalación.'}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1"
          onKeyDown={(e) => {
            // No guardar/avanzar con Enter desde un input (el buscador de ciudad
            // maneja su propio Enter y corta la propagación).
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
              e.preventDefault();
            }
          }}
        >
        {step === 'cliente' && (
          <div className="space-y-3">
            <Label>Cliente</Label>
            {clienteId ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{clienteLabel}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setClienteId('');
                    setClienteLabel('');
                    setClienteSearch('');
                  }}
                  className="h-7 w-7 shrink-0"
                  aria-label="Cambiar cliente"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Buscar por nombre, razón social o CUIT..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="pl-9"
                  />
                  {clienteSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  {clienteResults.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {clienteSearching
                        ? 'Buscando...'
                        : clienteSearch
                        ? 'Sin resultados'
                        : 'Escribí para buscar un cliente'}
                    </div>
                  ) : (
                    clienteResults.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setClienteId(c.value);
                          setClienteLabel(c.label);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted border-b last:border-b-0 transition-colors'
                        )}
                      >
                        {c.badge && (
                          <span className="shrink-0 text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 rounded px-1.5 py-0.5">
                            {c.badge}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.label}</p>
                          {c.secondaryLabel && (
                            <p className="text-xs text-muted-foreground truncate">
                              {c.secondaryLabel}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {step === 'sede' && (
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> Sede / Laboratorio
            </Label>

            {Array.isArray(laboratorios) && laboratorios.length > 0 && !nuevoLabMode && (
              <div className="space-y-2">
                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  {laboratorios.map((lab) => {
                    const selected = laboratorioId === lab.id;
                    return (
                      <button
                        key={lab.id}
                        type="button"
                        onClick={() => setLaboratorioId(lab.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 border-b last:border-b-0 transition-colors',
                          selected
                            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{lab.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[lab.direccion, lab.localidad].filter(Boolean).join(', ') || 'Sin dirección'}
                            </p>
                          </div>
                          {selected && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="outline"
                  onClick={() => {
                    setLaboratorioId('');
                    setNuevoLabMode(true);
                  }}
                  className="w-full justify-center gap-1.5 border-dashed"
                >
                  <Plus className="h-4 w-4" />
                  Cargar nueva sede
                </Button>
              </div>
            )}

            {nuevoLabMode && (
              <div className="space-y-3 p-3 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20">
                <p className="text-xs text-muted-foreground">
                  Se usa la dirección guardada del cliente como sede ({nuevoLabNombre || 'Casa Central'}). Podés editarla.
                </p>
                <div>
                  <Label className="text-xs">Dirección *</Label>
                  <Input
                    placeholder="Calle, número, piso, depto"
                    value={nuevoLabDireccion}
                    onChange={(e) => setNuevoLabDireccion(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Localidad</Label>
                    <div className="mt-1">
                      <CiudadCombobox
                        value={nuevoLabLocalidad}
                        onChange={setNuevoLabLocalidad}
                        onSelect={(loc, prov) => { setNuevoLabLocalidad(loc); setNuevoLabProvincia(prov); }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Provincia</Label>
                    <Input
                      value={nuevoLabProvincia}
                      onChange={(e) => setNuevoLabProvincia(e.target.value.toUpperCase())}
                      placeholder="(se completa con la ciudad)"
                      className="mt-1"
                    />
                  </div>
                </div>
                {Array.isArray(laboratorios) && laboratorios.length > 0 && (
                  <Button
                    type="outline"
                    onClick={() => {
                      setNuevoLabMode(false);
                      setNuevoLabNombre('');
                      setNuevoLabDireccion('');
                      setNuevoLabLocalidad('');
                      setNuevoLabProvincia('');
                    }}
                    className="w-full"
                  >
                    Elegir sede existente
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'oportunidad' && (
          <div className="space-y-3">
            <Label>Oportunidad</Label>
            <Select value={oportunidadId} onValueChange={setOportunidadId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Instalación directa (auto-crear oportunidad)
                </SelectItem>
                {(Array.isArray(oportunidades) ? oportunidades : []).map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre} — {o.etapa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 'equipo' && (
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <Package className="h-4 w-4" /> Equipo a instalar
              <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </Label>

            {equipoSel ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{equipoSel.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {equipoSel.tipo === 'unidad'
                      ? equipoSel.sublabel || 'Unidad del stock'
                      : 'Del catálogo — se confirma la unidad después'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEquipoSel(null)}
                  className="h-7 w-7 shrink-0"
                  aria-label="Quitar equipo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={equipoModo === 'stock' ? 'default' : 'outline'}
                    onClick={() => {
                      setEquipoModo('stock');
                      setEquipoSearch('');
                    }}
                    className="justify-center"
                  >
                    Del stock (con serie)
                  </Button>
                  <Button
                    type="button"
                    variant={equipoModo === 'catalogo' ? 'default' : 'outline'}
                    onClick={() => {
                      setEquipoModo('catalogo');
                      setEquipoSearch('');
                    }}
                    className="justify-center"
                  >
                    Del catálogo
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder={
                      equipoModo === 'stock'
                        ? 'Buscar por serie, código o modelo...'
                        : 'Buscar modelo del catálogo...'
                    }
                    value={equipoSearch}
                    onChange={(e) => setEquipoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  {equipoModo === 'stock' ? (
                    !equipoSearch.trim() ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Escribí para buscar una unidad del stock
                      </div>
                    ) : (Array.isArray(unidadesStock) ? unidadesStock : []).length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Sin unidades en stock para esa búsqueda
                      </div>
                    ) : (
                      (unidadesStock as any[]).map((u) => {
                        const modelo =
                          [u.equipos?.marca, u.equipos?.modelo].filter(Boolean).join(' ') ||
                          u.equipos?.tipo ||
                          'Equipo';
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setEquipoSel({
                                tipo: 'unidad',
                                equipo_unidad_id: u.id,
                                label: modelo,
                                sublabel: `${u.codigo || '—'} · s/n ${u.numero_serie || '—'}`,
                              })
                            }
                            className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 transition-colors"
                          >
                            <p className="text-sm font-medium truncate">{modelo}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.codigo || '—'} · s/n {u.numero_serie || '—'}
                            </p>
                          </button>
                        );
                      })
                    )
                  ) : !equipoSearch.trim() ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Escribí para buscar un modelo del catálogo
                    </div>
                  ) : (Array.isArray(catalogoEquipos) ? catalogoEquipos : []).length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Sin modelos para esa búsqueda
                    </div>
                  ) : (
                    (catalogoEquipos as any[]).map((e) => {
                      const modelo =
                        [e.marca, e.modelo].filter(Boolean).join(' ') || e.nombre || 'Modelo';
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() =>
                            setEquipoSel({ tipo: 'catalogo', equipo_id: e.id, label: modelo })
                          }
                          className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 transition-colors"
                        >
                          <p className="text-sm font-medium truncate">{modelo}</p>
                          {e.tipo && (
                            <p className="text-xs text-muted-foreground truncate">{e.tipo}</p>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Podés omitir este paso y agregar el equipo después desde el detalle.
                </p>
              </>
            )}
          </div>
        )}

        {step === 'datos' && (
          <div className="space-y-4">
            {(() => {
              const selectedLab = Array.isArray(laboratorios)
                ? laboratorios.find((l) => l.id === laboratorioId)
                : null;
              const sedeLabel = nuevoLabMode
                ? nuevoLabNombre || 'Nueva sede (sin nombre)'
                : selectedLab?.nombre || 'Sin sede';
              const sedeDir = nuevoLabMode
                ? [nuevoLabDireccion, nuevoLabLocalidad, nuevoLabProvincia].filter(Boolean).join(', ')
                : [selectedLab?.direccion, selectedLab?.localidad].filter(Boolean).join(', ');
              return (
                <div className="p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/40">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{sedeLabel}</p>
                      {sedeDir && (
                        <p className="text-xs text-muted-foreground truncate">{sedeDir}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <Label>Dirección puntual (opcional)</Label>
              <Textarea
                placeholder="Si la instalación es en un lugar distinto a la sede, aclaralo acá..."
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={2}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dejalo vacío para usar la dirección de la sede.
              </p>
            </div>
            <FechaEstadoPicker
              fechaEstado={fechaEstado}
              fechaPlanificada={fechaPlanificada}
              fechaNota={fechaNota}
              onChange={(u) => {
                setFechaEstado(u.fecha_estado);
                setFechaPlanificada(u.fecha_planificada);
                setFechaNota(u.fecha_nota);
              }}
            />
            <div>
              <Label>Nota inicial (opcional)</Label>
              <Textarea
                placeholder="Cualquier información relevante..."
                value={notaInicial}
                onChange={(e) => setNotaInicial(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
              {equipoSel
                ? `Equipo: ${equipoSel.label}${equipoSel.tipo === 'catalogo' ? ' (a confirmar unidad)' : ''}. Podés agregar más equipos e insumos desde el detalle.`
                : 'Los equipos e insumos se agregan después desde el detalle de la instalación.'}
            </p>
          </div>
        )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-2">
          {step !== 'cliente' && (
            <Button
              type="outline"
              onClick={() => {
                if (step === 'sede') setStep('cliente');
                else if (step === 'oportunidad') setStep('sede');
                else if (step === 'equipo') setStep('oportunidad');
                else if (step === 'datos') setStep('equipo');
              }}
            >
              Atrás
            </Button>
          )}
          {step === 'cliente' && (
            <Button disabled={!clienteId} onClick={() => setStep('sede')}>
              Siguiente
            </Button>
          )}
          {step === 'sede' && (
            <Button
              disabled={
                nuevoLabMode
                  ? !nuevoLabNombre.trim() || !nuevoLabDireccion.trim()
                  : !laboratorioId
              }
              onClick={() => setStep('oportunidad')}
            >
              Siguiente
            </Button>
          )}
          {step === 'oportunidad' && (
            <Button onClick={() => setStep('equipo')}>Siguiente</Button>
          )}
          {step === 'equipo' && (
            <Button onClick={() => setStep('datos')}>
              {equipoSel ? 'Siguiente' : 'Omitir'}
            </Button>
          )}
          {step === 'datos' && (
            <Button disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Creando...' : 'Crear instalación'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
