import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { z } from 'zod'

const patchSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  nombre_fantasia: z.string().max(200).optional(),
  empresa: z.object({
    razon_social: z.string().max(200).optional(),
    cuit: z.string().max(20).optional(),
    direccion: z.string().max(300).optional(),
    telefono: z.string().max(50).optional(),
    email_contacto: z.string().email().or(z.literal('')).optional(),
    sitio_web: z.string().max(200).optional(),
  }).optional(),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await query<{
      id: string
      nombre: string
      nombre_fantasia: string | null
      tipo: string
      config: Record<string, unknown> | null
    }>(
      'SELECT id, nombre, nombre_fantasia, tipo, config FROM organizations WHERE id = $1',
      [session.org_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const org = result.rows[0]
    const empresa = (org.config?.empresa as Record<string, string>) || {}

    return NextResponse.json({
      id: org.id,
      nombre: org.nombre,
      nombre_fantasia: org.nombre_fantasia,
      tipo: org.tipo,
      empresa: {
        razon_social: empresa.razon_social || '',
        cuit: empresa.cuit || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email_contacto: empresa.email_contacto || '',
        sitio_web: empresa.sitio_web || '',
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/organizacion:', error)
    return NextResponse.json({ error: 'Error al cargar datos', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!session.is_admin) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { nombre, nombre_fantasia, empresa } = parsed.data

    // Update org name fields if provided
    if (nombre !== undefined || nombre_fantasia !== undefined) {
      const sets: string[] = []
      const vals: unknown[] = []
      let idx = 1

      if (nombre !== undefined) {
        sets.push(`nombre = $${idx++}`)
        vals.push(nombre)
      }
      if (nombre_fantasia !== undefined) {
        sets.push(`nombre_fantasia = $${idx++}`)
        vals.push(nombre_fantasia)
      }

      vals.push(session.org_id)
      await query(
        `UPDATE organizations SET ${sets.join(', ')} WHERE id = $${idx}`,
        vals
      )
    }

    // Update empresa config if provided
    if (empresa) {
      const orgResult = await query<{ config: Record<string, unknown> | null }>(
        'SELECT config FROM organizations WHERE id = $1',
        [session.org_id]
      )
      const currentConfig = orgResult.rows[0]?.config || {}
      const currentEmpresa = (currentConfig.empresa as Record<string, unknown>) || {}

      const updatedConfig = {
        ...currentConfig,
        empresa: { ...currentEmpresa, ...empresa },
      }

      await query(
        'UPDATE organizations SET config = $1 WHERE id = $2',
        [JSON.stringify(updatedConfig), session.org_id]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/organizacion:', error)
    return NextResponse.json({ error: 'Error al actualizar', details: error.message }, { status: 500 })
  }
}
