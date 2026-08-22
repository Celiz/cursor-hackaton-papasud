import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
})

export const registerSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres'),
  documento_tipo: z.enum(['DNI', 'CUIT', 'CUIL', 'PASSPORT', 'OTHER']).optional(),
  documento_nro: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
