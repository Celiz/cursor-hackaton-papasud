import { z } from 'zod'

export const orgTipoSchema = z.enum(['electromedicina', 'veterinaria', 'growshop', 'inanna', 'other'])
export const orgMemberRolSchema = z.enum(['owner', 'admin', 'employee'])
export const orgContactTipoSchema = z.enum(['cliente', 'proveedor', 'ambos'])

export const createOrganizationSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug debe ser lowercase con guiones'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  cuit: z.string().optional().nullable(),
  tipo: orgTipoSchema.optional(),
  config: z.record(z.unknown()).optional(),
})

export const updateOrganizationSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  nombre: z.string().min(1).optional(),
  cuit: z.string().optional().nullable(),
  tipo: orgTipoSchema.optional(),
  config: z.record(z.unknown()).optional(),
})

export const addOrgMemberSchema = z.object({
  org_id: z.string().uuid(),
  persona_id: z.string().uuid(),
  rol: orgMemberRolSchema,
  permisos: z.record(z.boolean()).optional(),
})

export const addOrgContactSchema = z.object({
  org_id: z.string().uuid(),
  persona_id: z.string().uuid(),
  tipo: orgContactTipoSchema,
  datos_extra: z.record(z.unknown()).optional(),
  credito_limite: z.number().optional(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type AddOrgMemberInput = z.infer<typeof addOrgMemberSchema>
export type AddOrgContactInput = z.infer<typeof addOrgContactSchema>
