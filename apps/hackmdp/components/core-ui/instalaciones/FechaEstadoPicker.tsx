'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FechaEstado } from '@locus/core/instalaciones';

interface Props {
  fechaEstado: FechaEstado;
  fechaPlanificada: string | null;
  fechaNota: string | null;
  onChange: (updates: { fecha_estado: FechaEstado; fecha_planificada: string | null; fecha_nota: string | null }) => void;
}

const estadoLabels: Record<FechaEstado, string> = {
  a_confirmar: 'A confirmar con cliente',
  aproximada: 'Aproximada',
  confirmada: 'Confirmada',
};

export function FechaEstadoPicker({
  fechaEstado,
  fechaPlanificada,
  fechaNota,
  onChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Estado de fecha</Label>
        <Select
          value={fechaEstado}
          onValueChange={(v) =>
            onChange({
              fecha_estado: v as FechaEstado,
              fecha_planificada: fechaPlanificada,
              fecha_nota: fechaNota,
            })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(estadoLabels) as FechaEstado[]).map((k) => (
              <SelectItem key={k} value={k}>
                {estadoLabels[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fechaEstado !== 'a_confirmar' && (
        <div>
          <Label>
            Fecha {fechaEstado === 'aproximada' ? '(aproximada)' : 'planificada'}
          </Label>
          <Input
            type="date"
            value={fechaPlanificada || ''}
            onChange={(e) =>
              onChange({
                fecha_estado: fechaEstado,
                fecha_planificada: e.target.value || null,
                fecha_nota: fechaNota,
              })
            }
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label>Nota de fecha (opcional)</Label>
        <Input
          placeholder='Ej: "cuando llegue el material", "semana del 15"'
          value={fechaNota || ''}
          onChange={(e) =>
            onChange({
              fecha_estado: fechaEstado,
              fecha_planificada: fechaPlanificada,
              fecha_nota: e.target.value || null,
            })
          }
          className="mt-1"
        />
      </div>
    </div>
  );
}
