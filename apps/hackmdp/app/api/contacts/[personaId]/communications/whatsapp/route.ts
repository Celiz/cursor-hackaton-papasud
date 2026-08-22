import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { personaId } = await params

  const result = await query(`
    SELECT
      wm.id, wm.conversation_id, wm.direccion, wm.tipo,
      wm.contenido, wm.estado, wm.created_at, wc.telefono
    FROM whatsapp_messages wm
    JOIN whatsapp_conversations wc ON wc.id = wm.conversation_id
    WHERE wc.persona_id = $1 AND wc.org_id = $2
    ORDER BY wm.created_at DESC
    LIMIT 20
  `, [personaId, session.org_id])

  return NextResponse.json({ messages: result.rows })
}
