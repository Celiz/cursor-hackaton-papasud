import { z } from 'zod'

export const documentoTipoSchema = z.enum(['DNI', 'CUIT', 'CUIL', 'PASSPORT', 'OTHER'])

export const createPersonaSchema = z.object({
  documento_tipo: documentoTipoSchema.optional(),
  documento_nro: z.string().min(1).optional(),
  nombre: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  telefono: z.string().optional().nullable(),
  fecha_nacimiento: z.coerce.date().optional().nullable(),
})

export const updatePersonaSchema = z.object({
  documento_tipo: documentoTipoSchema.optional(),
  documento_nro: z.string().min(1).optional(),
  nombre: z.string().min(1).optional(),
  email: z.string().email('Email inválido').optional().nullable(),
  telefono: z.string().optional().nullable(),
  fecha_nacimiento: z.coerce.date().optional().nullable(),
})

export type CreatePersonaInput = z.infer<typeof createPersonaSchema>
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>
