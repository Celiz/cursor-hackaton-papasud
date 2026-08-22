import { z } from 'zod'

export const createTurnoSchema = z.object({
  tipo: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  duracion_minutos: z.number().int().min(5).max(480).optional(),
  motivo: z.string().max(500).optional(),
  notas: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const updateTurnoSchema = z.object({
  estado: z.enum(['solicitada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio', 'rechazada']).optional(),
  motivo_rechazo: z.string().max(500).optional(),
  profesional_id: z.string().uuid().nullable().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duracion_minutos: z.number().int().min(5).max(480).optional(),
  notas: z.string().max(2000).optional(),
})

export const turnosConfigSchema = z.object({
  modo: z.enum(['self_service', 'confirmacion']),
  tipos_habilitados: z.array(z.string()),
  duracion_default: z.number().int().min(5).max(480),
  anticipo_min_horas: z.number().int().min(0),
  anticipo_max_dias: z.number().int().min(1).max(365),
  horarios: z.record(z.union([
    z.object({ inicio: z.string(), fin: z.string() }),
    z.null(),
  ])),
})
