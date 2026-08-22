import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getOrgFeatures, orgFeaturesPatchSchema } from '@studio/erp-core/organizations'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const features = await getOrgFeatures(session.org_id, session.org_tipo)
    return NextResponse.json({ features })
  } catch (error: any) {
    console.error('Error in GET /api/org-features:', error)
    return NextResponse.json({ error: 'Error al cargar features', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!session.is_admin) {
      return NextResponse.json({ error: 'Solo administradores pueden modificar features' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = orgFeaturesPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    // Read current config
    const orgResult = await query<{ config: Record<string, unknown> | null }>(
      'SELECT config FROM organizations WHERE id = $1',
      [session.org_id]
    )
    const currentConfig = orgResult.rows[0]?.config || {}
    const currentFeatures = (currentConfig.features || {}) as Record<string, unknown>

    // Section-level shallow merge of all validated sections
    const newFeatures: Record<string, unknown> = { ...currentFeatures }
    for (const [section, value] of Object.entries(parsed.data)) {
      if (value) {
        newFeatures[section] = { ...(currentFeatures[section] as object || {}), ...value }
      }
    }

    // Write back
    const updatedConfig = { ...currentConfig, features: newFeatures }
    await query(
      'UPDATE organizations SET config = $1 WHERE id = $2',
      [JSON.stringify(updatedConfig), session.org_id]
    )

    // Return resolved features
    const features = await getOrgFeatures(session.org_id, session.org_tipo)
    return NextResponse.json({ features })
  } catch (error: any) {
    console.error('Error in PATCH /api/org-features:', error)
    return NextResponse.json({ error: 'Error al actualizar features', details: error.message }, { status: 500 })
  }
}
