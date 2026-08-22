import { z } from 'zod'
import { query } from '@locus/db'
import type { Organization } from '@locus/db'

// ==================== TYPES ====================

export interface OrgFeaturesEntregas {
  trackingEnabled: boolean
  ecommerceFlow: boolean
  autoEmailOnDespacho: boolean
  transportistaSelector: boolean
  transportistas: string[]
}

export interface OrgFeaturesEmail {
  enabled: boolean
  brandName: string
  brandColor: string
  brandBgColor: string
  footerText: string
  footerLinks: { label: string; url: string }[]
}

export interface OrgFeaturesPreparacion {
  itemWorkflow: 'equipment' | 'simple'
  itemLabel: string
}

export interface OrgFeaturesEscuela {
  enabled: boolean
  contenido: boolean
  membresias: boolean
  comunidad: boolean
  engagement: boolean
  journal: boolean
  mentoria: boolean
  social: boolean
  leads: boolean
  recursos: boolean
}

export interface OrgFeaturesAgencias {
  enabled: boolean
  agencias_habilitadas: string[] // ['presencia', 'ventas', ...]
}

export interface OrgFeaturesBancoDeSangre {
  enabled: boolean
}

export interface OrgFeaturesClinica {
  enabled: boolean
}

export interface OrgFeaturesDerivacionesExternas {
  enabled: boolean
}

export interface OrgFeaturesGrooming {
  enabled: boolean
}

export interface OrgFeaturesCrm {
  enabled: boolean;
}

export interface OrgFeaturesTurnos {
  enabled: boolean;
  duracion_default: number; // minutos
}

export interface OrgFeaturesVetlab {
  enabled: boolean;
  facturacion_implicita?: boolean;
}

export interface OrgFeaturesCannabis {
  enabled: boolean;
}

export interface OrgFeaturesFacturacion {
  enabled: boolean;
  ambiente: 'homologacion' | 'produccion';
}

export interface OrgFeaturesPresupuestos {
  enabled: boolean;
  requiere_aprobacion: boolean;
}

export interface OrgFeaturesServiciosTecnicos {
  enabled: boolean;
}

export interface OrgFeaturesVentas {
  kpis_habilitados: boolean;
  tiene_recurrencia: boolean;
}

export interface OrgFeatures {
  entregas: OrgFeaturesEntregas
  email: OrgFeaturesEmail
  preparacion: OrgFeaturesPreparacion
  escuela?: OrgFeaturesEscuela
  agencias: OrgFeaturesAgencias
  bancoDeSangre?: OrgFeaturesBancoDeSangre
  clinica?: OrgFeaturesClinica
  derivacionesExternas?: OrgFeaturesDerivacionesExternas
  grooming?: OrgFeaturesGrooming
  crm?: OrgFeaturesCrm;
  turnos?: OrgFeaturesTurnos;
  vetlab?: OrgFeaturesVetlab;
  cannabis?: OrgFeaturesCannabis;
  facturacion?: OrgFeaturesFacturacion;
  presupuestos?: OrgFeaturesPresupuestos;
  servicios_tecnicos?: OrgFeaturesServiciosTecnicos;
  ventas?: OrgFeaturesVentas;
}

export type OrgTipo = 'electromedicina' | 'veterinaria' | 'growshop' | 'inanna' | 'petshop' | 'hemocentro' | 'other'

// ==================== DEFAULTS ====================

const DEFAULTS: Record<OrgTipo, OrgFeatures> = {
  growshop: {
    entregas: {
      trackingEnabled: true,
      ecommerceFlow: true,
      autoEmailOnDespacho: true,
      transportistaSelector: true,
      transportistas: ['andreani', 'correo_argentino', 'otro'],
    },
    email: {
      enabled: true,
      brandName: 'Papasud',
      brandColor: '#dc2626',
      brandBgColor: '#0a0a0a',
      footerText: 'Genética de calidad desde la costa argentina',
      footerLinks: [
                      ],
    },
    preparacion: {
      itemWorkflow: 'simple',
      itemLabel: 'Items',
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
    cannabis: {
      enabled: true,
    },
  },
  electromedicina: {
    entregas: {
      trackingEnabled: true,
      ecommerceFlow: false,
      autoEmailOnDespacho: false,
      transportistaSelector: true,
      transportistas: ['andreani', 'correo_argentino', 'otro'],
    },
    email: {
      enabled: false,
      brandName: 'Uno Electromedicina',
      brandColor: '#7c3aed',
      brandBgColor: '#ffffff',
      footerText: '',
      footerLinks: [],
    },
    preparacion: {
      itemWorkflow: 'equipment',
      itemLabel: 'Equipos',
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
    crm: {
      enabled: true,
    },
    servicios_tecnicos: {
      enabled: true,
    },
    presupuestos: {
      enabled: true,
      requiere_aprobacion: false,
    },
    facturacion: {
      enabled: true,
      ambiente: 'produccion',
    },
  },
  veterinaria: {
    entregas: {
      trackingEnabled: true,
      ecommerceFlow: false,
      autoEmailOnDespacho: false,
      transportistaSelector: true,
      transportistas: ['andreani', 'correo_argentino', 'otro'],
    },
    email: {
      enabled: false,
      brandName: '',
      brandColor: '#059669',
      brandBgColor: '#ffffff',
      footerText: '',
      footerLinks: [],
    },
    preparacion: {
      itemWorkflow: 'simple',
      itemLabel: 'Items',
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
    clinica: {
      enabled: true,
    },
    derivacionesExternas: {
      enabled: true,
    },
    grooming: {
      enabled: true,
    },
    vetlab: {
      enabled: true,
      facturacion_implicita: false,
    },
    turnos: {
      enabled: true,
      duracion_default: 30,
    },
  },
  inanna: {
    entregas: {
      trackingEnabled: false,
      ecommerceFlow: false,
      autoEmailOnDespacho: false,
      transportistaSelector: false,
      transportistas: [],
    },
    email: {
      enabled: true,
      brandName: 'Círculo Inanna',
      brandColor: '#e11d48',
      brandBgColor: '#fff1f2',
      footerText: 'Círculo Inanna — Tu espacio de transformación',
      footerLinks: [],
    },
    preparacion: {
      itemWorkflow: 'simple',
      itemLabel: 'Items',
    },
    escuela: {
      enabled: true,
      contenido: true,
      membresias: true,
      comunidad: true,
      engagement: true,
      journal: true,
      mentoria: true,
      social: true,
      leads: true,
      recursos: true,
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
    facturacion: {
      enabled: true,
      ambiente: 'produccion',
    },
    ventas: {
      kpis_habilitados: true,
      tiene_recurrencia: true,
    },
  },
  petshop: {
    entregas: {
      trackingEnabled: false,
      ecommerceFlow: false,
      autoEmailOnDespacho: false,
      transportistaSelector: false,
      transportistas: [],
    },
    email: {
      enabled: false,
      brandName: '',
      brandColor: '#3b82f6',
      brandBgColor: '#ffffff',
      footerText: '',
      footerLinks: [],
    },
    preparacion: {
      itemWorkflow: 'simple',
      itemLabel: 'Productos',
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
    grooming: {
      enabled: true,
    },
    turnos: {
      enabled: true,
      duracion_default: 30,
    },
  },
  hemocentro: {
    entregas: {
      trackingEnabled: true,
      ecommerceFlow: false,
      autoEmailOnDespacho: false,
      transportistaSelector: false,
      transportistas: [],
    },
    email: {
      enabled: false,
      brandName: '',
      brandColor: '#e11d48',
      brandBgColor: '#ffffff',
      footerText: '',
      footerLinks: [],
    },
    preparacion: {
      itemWorkflow: 'simple',
      itemLabel: 'Unidades',
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
    bancoDeSangre: {
      enabled: true,
    },
  },
  other: {
    entregas: {
      trackingEnabled: true,
      ecommerceFlow: false,
      autoEmailOnDespacho: false,
      transportistaSelector: true,
      transportistas: ['andreani', 'correo_argentino', 'otro'],
    },
    email: {
      enabled: false,
      brandName: '',
      brandColor: '#7c3aed',
      brandBgColor: '#ffffff',
      footerText: '',
      footerLinks: [],
    },
    preparacion: {
      itemWorkflow: 'simple',
      itemLabel: 'Items',
    },
    agencias: {
      enabled: false,
      agencias_habilitadas: [],
    },
  },
}

// ==================== RESOLVE ====================

/**
 * Pure function: merge orgTipo defaults with per-org overrides.
 * Section-level shallow merge — arrays replace entirely.
 */
export function resolveOrgFeatures(
  orgTipo: string | null | undefined,
  orgConfig: Record<string, unknown> | null | undefined
): OrgFeatures {
  const tipo = (orgTipo as OrgTipo) || 'other'
  const defaults = DEFAULTS[tipo] || DEFAULTS.other

  const overrides = (orgConfig?.features ?? {}) as Partial<Record<keyof OrgFeatures, Record<string, unknown>>>

  const result: OrgFeatures = {
    entregas: { ...defaults.entregas, ...overrides.entregas },
    email: { ...defaults.email, ...overrides.email },
    preparacion: { ...defaults.preparacion, ...overrides.preparacion },
    agencias: { ...defaults.agencias, ...overrides.agencias },
  }

  if (defaults.escuela || overrides.escuela) {
    result.escuela = { ...(defaults.escuela ?? {}), ...overrides.escuela } as OrgFeaturesEscuela
  }

  if (defaults.bancoDeSangre || overrides.bancoDeSangre) {
    result.bancoDeSangre = { ...(defaults.bancoDeSangre ?? {}), ...overrides.bancoDeSangre } as OrgFeaturesBancoDeSangre
  }

  if (defaults.clinica || overrides.clinica) {
    result.clinica = { ...(defaults.clinica ?? {}), ...overrides.clinica } as OrgFeaturesClinica
  }

  if (defaults.derivacionesExternas || overrides.derivacionesExternas) {
    result.derivacionesExternas = { ...(defaults.derivacionesExternas ?? {}), ...overrides.derivacionesExternas } as OrgFeaturesDerivacionesExternas
  }

  if (defaults.grooming || overrides.grooming) {
    result.grooming = { ...(defaults.grooming ?? {}), ...overrides.grooming } as OrgFeaturesGrooming
  }

  if (defaults.crm || overrides.crm) {
    result.crm = { ...(defaults.crm ?? {}), ...overrides.crm } as OrgFeaturesCrm
  }

  if (defaults.turnos || overrides.turnos) {
    result.turnos = { ...(defaults.turnos ?? {}), ...overrides.turnos } as OrgFeaturesTurnos
  }

  if (defaults.vetlab || overrides.vetlab) {
    result.vetlab = { ...(defaults.vetlab ?? {}), ...overrides.vetlab } as OrgFeaturesVetlab
  }

  if (defaults.cannabis || overrides.cannabis) {
    result.cannabis = { ...(defaults.cannabis ?? {}), ...overrides.cannabis } as OrgFeaturesCannabis
  }

  if (defaults.facturacion || overrides.facturacion) {
    result.facturacion = { ...(defaults.facturacion ?? {}), ...overrides.facturacion } as OrgFeaturesFacturacion
  }

  if (defaults.presupuestos || overrides.presupuestos) {
    result.presupuestos = { ...(defaults.presupuestos ?? {}), ...overrides.presupuestos } as OrgFeaturesPresupuestos
  }

  if (defaults.servicios_tecnicos || overrides.servicios_tecnicos) {
    result.servicios_tecnicos = { ...(defaults.servicios_tecnicos ?? {}), ...overrides.servicios_tecnicos } as OrgFeaturesServiciosTecnicos
  }

  const ventasBase = defaults.ventas ?? { kpis_habilitados: true, tiene_recurrencia: false }
  result.ventas = { ...ventasBase, ...overrides.ventas } as OrgFeaturesVentas

  return result
}

/** Get defaults for a given orgTipo (no DB call). */
export function getOrgFeaturesDefaults(orgTipo: string | null | undefined): OrgFeatures {
  const tipo = (orgTipo as OrgTipo) || 'other'
  return DEFAULTS[tipo] || DEFAULTS.other
}

// ==================== SERVER HELPER ====================

/**
 * Server-side: 1 query to get org config, then resolve features.
 * Use in API routes: const features = await getOrgFeatures(session.org_id, session.org_tipo)
 */
export async function getOrgFeatures(
  orgId: string,
  orgTipo: string | null | undefined
): Promise<OrgFeatures> {
  const result = await query<Pick<Organization, 'config'>>(
    'SELECT config FROM organizations WHERE id = $1',
    [orgId]
  )

  const orgConfig = result.rows[0]?.config ?? null
  return resolveOrgFeatures(orgTipo, orgConfig)
}

// ==================== ZOD SCHEMAS ====================

const footerLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
})

export const orgFeaturesEntregasSchema = z.object({
  trackingEnabled: z.boolean().optional(),
  ecommerceFlow: z.boolean().optional(),
  autoEmailOnDespacho: z.boolean().optional(),
  transportistaSelector: z.boolean().optional(),
  transportistas: z.array(z.string()).optional(),
}).partial()

export const orgFeaturesEmailSchema = z.object({
  enabled: z.boolean().optional(),
  brandName: z.string().optional(),
  brandColor: z.string().optional(),
  brandBgColor: z.string().optional(),
  footerText: z.string().optional(),
  footerLinks: z.array(footerLinkSchema).optional(),
}).partial()

export const orgFeaturesPreparacionSchema = z.object({
  itemWorkflow: z.enum(['equipment', 'simple']).optional(),
  itemLabel: z.string().optional(),
}).partial()

export const orgFeaturesEscuelaSchema = z.object({
  enabled: z.boolean().optional(),
  contenido: z.boolean().optional(),
  membresias: z.boolean().optional(),
  comunidad: z.boolean().optional(),
  engagement: z.boolean().optional(),
  journal: z.boolean().optional(),
  mentoria: z.boolean().optional(),
  social: z.boolean().optional(),
  leads: z.boolean().optional(),
  recursos: z.boolean().optional(),
}).partial()

export const orgFeaturesAgenciasSchema = z.object({
  enabled: z.boolean().optional(),
  agencias_habilitadas: z.array(z.string()).optional(),
}).partial()

export const orgFeaturesBancoDeSangreSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesClinicaSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesDerivacionesExternasSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesGroomingSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesCrmSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesTurnosSchema = z.object({
  enabled: z.boolean().optional(),
  duracion_default: z.number().min(5).max(480).optional(),
}).partial()

export const orgFeaturesVetlabSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesCannabisSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

export const orgFeaturesFacturacionSchema = z.object({
  enabled: z.boolean().optional(),
  ambiente: z.enum(['homologacion', 'produccion']).optional(),
}).partial()

export const orgFeaturesPresupuestosSchema = z.object({
  enabled: z.boolean().optional(),
  requiere_aprobacion: z.boolean().optional(),
}).partial()

export const orgFeaturesServiciosTecnicosSchema = z.object({
  enabled: z.boolean().optional(),
}).partial()

/** Schema for PATCH /api/org-features — only overrides, all optional */
export const orgFeaturesPatchSchema = z.object({
  entregas: orgFeaturesEntregasSchema.optional(),
  email: orgFeaturesEmailSchema.optional(),
  preparacion: orgFeaturesPreparacionSchema.optional(),
  escuela: orgFeaturesEscuelaSchema.optional(),
  agencias: orgFeaturesAgenciasSchema.optional(),
  bancoDeSangre: orgFeaturesBancoDeSangreSchema.optional(),
  clinica: orgFeaturesClinicaSchema.optional(),
  derivacionesExternas: orgFeaturesDerivacionesExternasSchema.optional(),
  grooming: orgFeaturesGroomingSchema.optional(),
  crm: orgFeaturesCrmSchema.optional(),
  turnos: orgFeaturesTurnosSchema.optional(),
  vetlab: orgFeaturesVetlabSchema.optional(),
  cannabis: orgFeaturesCannabisSchema.optional(),
  facturacion: orgFeaturesFacturacionSchema.optional(),
  presupuestos: orgFeaturesPresupuestosSchema.optional(),
  servicios_tecnicos: orgFeaturesServiciosTecnicosSchema.optional(),
})

export type OrgFeaturesPatchInput = z.infer<typeof orgFeaturesPatchSchema>
