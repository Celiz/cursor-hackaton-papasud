import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getEmailProvider } from '@studio/email-core'
import type { EmailAccountRow } from '@studio/email-core'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const session = await getSession()
  if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { personaId } = await params

  // 1. Get persona's email
  const personaResult = await query(
    `SELECT email FROM personas WHERE id = $1`, [personaId]
  )
  if (personaResult.rows.length === 0) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
  }
  const email = personaResult.rows[0].email
  if (!email) {
    return NextResponse.json({ threads: [], noEmail: true })
  }

  // 2. Get user's email account
  const accountResult = await query(`
    SELECT * FROM email_accounts
    WHERE user_id = $1 AND org_id = $2 AND activa = true
    ORDER BY es_predeterminada DESC LIMIT 1
  `, [session.id, session.org_id])

  if (accountResult.rows.length === 0) {
    return NextResponse.json({ threads: [], noAccount: true })
  }

  const account = accountResult.rows[0] as EmailAccountRow
  const provider = getEmailProvider(account)

  // 3. Search threads involving this email
  const searchQuery = account.tipo === 'gmail'
    ? `from:${email} OR to:${email}`
    : email  // IMAP search checks from + to + subject

  try {
    const result = await provider.listThreads({
      maxResults: 10,
      query: searchQuery,
      folder: 'inbox',
    })
    return NextResponse.json({
      threads: result.threads,
      contactEmail: email,
    })
  } catch {
    return NextResponse.json({ threads: [], error: 'Error buscando emails' })
  }
}
