import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

type ContactInput = {
  nombre: string
  telefono: string
  email?: string
  empresa?: string
}

// Normaliza a dígitos puros. Matching en el lookup se hace por los últimos 10 dígitos
// para tolerar prefijos variables (54 vs 549 vs 0 para Argentina).
function toDigits(s: string): string {
  return (s || '').replace(/\D+/g, '')
}

// Parser de vCard minimalista. Soporta 3.0 y 4.0, líneas plegadas, múltiples TEL por entry.
function parseVCard(text: string): ContactInput[] {
  // Unfolding: líneas que empiezan con espacio/tab son continuación de la anterior
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1)
  const out: ContactInput[] = []

  for (const block of blocks) {
    const body = block.split(/END:VCARD/i)[0]
    if (!body) continue
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean)

    let fn = ''
    let n = ''
    let org = ''
    let email = ''
    const tels: string[] = []

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const head = line.slice(0, colonIdx).toUpperCase()
      const value = line.slice(colonIdx + 1)
      const prop = head.split(';')[0]

      if (prop === 'FN') fn = value
      else if (prop === 'N' && !fn) {
        // N: apellido;nombre;...
        const parts = value.split(';').filter(Boolean)
        n = [parts[1], parts[0]].filter(Boolean).join(' ')
      }
      else if (prop === 'ORG') org = value.split(';')[0]
      else if (prop === 'EMAIL' && !email) email = value
      else if (prop === 'TEL') tels.push(value)
    }

    const nombre = (fn || n || '').trim()
    if (!nombre || tels.length === 0) continue

    for (const tel of tels) {
      out.push({ nombre, telefono: tel, email: email || undefined, empresa: org || undefined })
    }
  }

  return out
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.persona_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''
    let contacts: ContactInput[] = []

    if (contentType.includes('application/json')) {
      const body = await req.json()
      if (Array.isArray(body?.contacts)) {
        contacts = body.contacts
      } else if (typeof body?.vcard === 'string') {
        contacts = parseVCard(body.vcard)
      } else {
        return NextResponse.json({ error: 'Formato inválido: enviar { contacts: [...] } o { vcard: "..." }' }, { status: 400 })
      }
    } else if (contentType.includes('text/')) {
      const text = await req.text()
      contacts = parseVCard(text)
    } else {
      return NextResponse.json({ error: 'Content-Type no soportado' }, { status: 400 })
    }

    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const c of contacts) {
      const nombre = (c.nombre || '').trim()
      const telefono = (c.telefono || '').trim()
      const digits = toDigits(telefono)

      if (!nombre || digits.length < 7) {
        skipped++
        continue
      }

      const result = await query(
        `INSERT INTO persona_contactos (persona_id, telefono, telefono_digits, nombre, email, empresa, raw)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (persona_id, telefono_digits)
         DO UPDATE SET
           nombre = EXCLUDED.nombre,
           email = COALESCE(EXCLUDED.email, persona_contactos.email),
           empresa = COALESCE(EXCLUDED.empresa, persona_contactos.empresa),
           telefono = EXCLUDED.telefono,
           updated_at = now()
         RETURNING (xmax = 0) AS inserted`,
        [
          session.persona_id,
          telefono,
          digits,
          nombre,
          c.email || null,
          c.empresa || null,
          JSON.stringify(c),
        ]
      )

      if (result.rows[0]?.inserted) inserted++
      else updated++
    }

    return NextResponse.json({ ok: true, inserted, updated, skipped, total: contacts.length })
  } catch (error) {
    console.error('Error importing persona contactos:', error)
    return NextResponse.json({ error: 'Error al importar contactos' }, { status: 500 })
  }
}
