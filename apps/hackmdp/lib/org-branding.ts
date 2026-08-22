import { query } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export interface OrgBranding {
  nombre: string
  cuit: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logoBase64: string | null
  primaryColor: [number, number, number]
  secondaryColor: [number, number, number] | null
  slug: string
  tagline: string | null
}

const THEME_COLORS: Record<string, [number, number, number]> = {
  purple: [139, 92, 246],
  amber: [245, 158, 11],
  emerald: [16, 185, 129],
  rose: [244, 63, 94],
  cyan: [6, 182, 212],
  blue: [59, 130, 246],
}

export async function getOrgBranding(orgId: string): Promise<OrgBranding> {
  const result = await query(
    `SELECT slug, nombre, cuit, config FROM organizations WHERE id = $1`,
    [orgId]
  )

  const org = result.rows[0]
  if (!org) throw new Error('Organización no encontrada')

  const config = (org.config || {}) as Record<string, any>
  const theme = config.theme || 'emerald'
  const primaryColor = THEME_COLORS[theme] || THEME_COLORS.emerald

  let logoBase64: string | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'org-logos', `${org.slug}.png`)
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
    }
  } catch {
    // Logo not found, continue without it
  }

  // PDF colors: support per-org overrides
  const pdfPrimary = config.pdf_color_primary as [number, number, number] | undefined
  const pdfSecondary = config.pdf_color_secondary as [number, number, number] | undefined

  // Coerce a string-only (evita volcar objetos como "[object Object]" en el PDF)
  const pickString = (v: any): string | null => {
    if (v == null) return null
    if (typeof v === 'string') return v.trim() || null
    if (typeof v === 'object') {
      // config.email a veces viene como objeto SMTP { from_email, smtp_host, ... }
      return v.from_email || v.email || v.display || null
    }
    return String(v)
  }

  // Per-org PDF brand name override (e.g. white-label).
  const pdfBrandName = pickString(config.pdf_brand_name)

  // Email para el pie de PDF. config.email suele ser el objeto SMTP (su
  // from_email es la casilla de envío); pdf_email permite mostrar otra
  // dirección de contacto en los documentos sin tocar el envío.
  const pdfEmail = pickString(config.pdf_email) || pickString(config.email)

  return {
    nombre: pdfBrandName || org.nombre,
    cuit: org.cuit || null,
    direccion: pickString(config.direccion),
    telefono: pickString(config.telefono),
    email: pdfEmail,
    logoBase64,
    primaryColor: pdfPrimary || primaryColor,
    secondaryColor: pdfSecondary || null,
    slug: org.slug,
    tagline: pickString(config.pdf_tagline),
  }
}
