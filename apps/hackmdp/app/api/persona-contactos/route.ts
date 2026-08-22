import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.persona_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, nombre, telefono, email, empresa, updated_at
       FROM persona_contactos
       WHERE persona_id = $1
       ORDER BY nombre ASC`,
      [session.persona_id]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error listing persona contactos:', error)
    return NextResponse.json({ error: 'Error al listar contactos' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.persona_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const all = searchParams.get('all') === 'true'

    if (all) {
      const result = await query(
        `DELETE FROM persona_contactos WHERE persona_id = $1`,
        [session.persona_id]
      )
      return NextResponse.json({ ok: true, deleted: result.rowCount })
    }

    if (!id) {
      return NextResponse.json({ error: 'Falta id o all=true' }, { status: 400 })
    }

    await query(
      `DELETE FROM persona_contactos WHERE id = $1 AND persona_id = $2`,
      [id, session.persona_id]
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting persona contacto:', error)
    return NextResponse.json({ error: 'Error al borrar' }, { status: 500 })
  }
}
