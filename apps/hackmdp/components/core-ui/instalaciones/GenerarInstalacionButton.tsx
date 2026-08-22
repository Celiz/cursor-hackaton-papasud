'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HardHat, Building2, Check, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FechaEstadoPicker } from './FechaEstadoPicker';
import type { FechaEstado } from '@locus/core/instalaciones';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Laboratorio {
  id: string;
  nombre: string;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
}

interface Props {
  oportunidadId: string;
  clienteId: string;
  clienteNombre: string;
  /** Si la oportunidad ya tiene un laboratorio vinculado, se usa como default. */
  laboratorioId?: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GenerarInstalacionButton({
  oportunidadId,
  clienteId,
  clienteNombre,
  laboratorioId: laboratorioIdInicial,
}: Props) {
  const [open, setOpen] = useState(false);
  const [laboratorioId, setLaboratorioId] = useState<string>(
    laboratorioIdInicial || ''
  );
  const [nuevoLabMode, setNuevoLabMode] = useState(false);
  const [nuevoLabNombre, setNuevoLabNombre] = useState('');
  const [nuevoLabDireccion, setNuevoLabDireccion] = useState('');
  const [nuevoLabLocalidad, setNuevoLabLocalidad] = useState('');
  const [nuevoLabProvincia, setNuevoLabProvincia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaEstado, setFechaEstado] = useState<FechaEstado>('a_confirmar');
  const [fechaPlanificada, setFechaPlanificada] = useState<string | null>(null);
  const [fechaNota, setFechaNota] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Sedes del cliente
  const { data: laboratorios = [] } = useSWR<Laboratorio[]>(
    open && clienteId
      ? `/api/laboratorios?razon_social_id=${clienteId}&completos=true`
      : null,
    fetcher
  );

  // Si el cliente no tiene labs, entrar directo a modo "crear nuevo"
  useEffect(() => {
    if (!open) return;
    if (laboratorioIdInicial) {
      setLaboratorioId(laboratorioIdInicial);
      setNuevoLabMode(false);
      return;
    }
    if (Array.isArray(laboratorios) && laboratorios.length === 0 && !nuevoLabMode) {
      setNuevoLabMode(true);
    }
  }, [open, laboratorios, laboratorioIdInicial, nuevoLabMode]);

  const selectedLab = Array.isArray(laboratorios)
    ? laboratorios.find((l) => l.id === laboratorioId)
    : null;

  const canSubmit = nuevoLabMode
    ? !!nuevoLabNombre.trim() && !!nuevoLabDireccion.trim()
    : !!laboratorioId;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        cliente_id: clienteId,
        oportunidad_id: oportunidadId,
        fecha_estado: fechaEstado,
        fecha_planificada: fechaPlanificada,
        fecha_nota: fechaNota,
        notas_planificacion: nota || null,
      };

      if (nuevoLabMode) {
        payload.nuevo_laboratorio = {
          nombre: nuevoLabNombre.trim(),
          direccion: nuevoLabDireccion.trim(),
          localidad: nuevoLabLocalidad.trim() || null,
          provincia: nuevoLabProvincia.trim() || null,
        };
      } else {
        payload.laboratorio_id = laboratorioId;
      }

      if (direccion.trim()) {
        payload.direccion_instalacion = direccion.trim();
      }

      const res = await fetch('/api/instalaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setOpen(false);
        router.push(`/dashboard/instalaciones?id=${data.id}`);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'No se pudo crear la instalación'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button size="tiny" icon={<HardHat />} onClick={() => setOpen(true)}>
        Generar instalación
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Generar instalación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto min-h-0 pr-1 -mr-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Cliente:</span>{' '}
              {clienteNombre}
            </div>

            {/* Selector de sede */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> Sede
              </Label>

              {!nuevoLabMode && Array.isArray(laboratorios) && laboratorios.length > 0 && (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
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
                              ? 'bg-purple-50 dark:bg-purple-950/30'
                              : 'hover:bg-muted'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {lab.nombre}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[lab.direccion, lab.localidad]
                                  .filter(Boolean)
                                  .join(', ') || 'Sin dirección'}
                              </p>
                            </div>
                            {selected && (
                              <Check className="h-4 w-4 text-purple-600 shrink-0" />
                            )}
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
                    Se va a crear una sede nueva linkeada al cliente.
                  </p>
                  <div>
                    <Label className="text-xs">Nombre de la sede *</Label>
                    <Input
                      placeholder="Ej: Hospital Central - Sede principal"
                      value={nuevoLabNombre}
                      onChange={(e) => setNuevoLabNombre(e.target.value)}
                      className="mt-1"
                    />
                  </div>
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
                      <Input
                        value={nuevoLabLocalidad}
                        onChange={(e) => setNuevoLabLocalidad(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Provincia</Label>
                      <Input
                        value={nuevoLabProvincia}
                        onChange={(e) => setNuevoLabProvincia(e.target.value)}
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

              {selectedLab && !nuevoLabMode && (
                <p className="text-xs text-muted-foreground">
                  Dirección: {[selectedLab.direccion, selectedLab.localidad]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              )}
            </div>

            <div>
              <Label>Dirección puntual (opcional)</Label>
              <Textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={2}
                placeholder="Si la instalación es en un lugar distinto a la sede..."
                className="mt-1"
              />
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
              <Input value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
              Los equipos reservados en la oportunidad se heredan automáticamente. Insumos se agregan después.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={submitting || !canSubmit}>
              {submitting ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
