import { ImapFlow } from 'imapflow'
import { query } from '@locus/db'

export interface UnreadEmail {
  from: string
  subject: string
}

export interface ImapResult {
  connected: boolean
  emails: UnreadEmail[]
}

interface ImapAccount {
  persona_id: string
  imap_host: string
  imap_port: number
  imap_user: string
  imap_pass: string
}

/**
 * Get IMAP account config for a persona from organizations.config.imap_accounts
 */
async function getImapAccount(orgId: string, personaId: string): Promise<ImapAccount | null> {
  const res = await query<{ imap_accounts: ImapAccount[] | null }>(`
    SELECT config->'imap_accounts' AS imap_accounts
    FROM organizations
    WHERE id = $1
  `, [orgId])

  const accounts = res.rows[0]?.imap_accounts
  if (!Array.isArray(accounts)) return null
  return accounts.find(a => a.persona_id === personaId) ?? null
}

/**
 * Fetch unread emails from IMAP inbox (max 10)
 * Returns { connected: false } if IMAP fails, so caller can distinguish
 * "no unread emails" from "couldn't check".
 */
export async function fetchUnreadEmails(orgId: string, personaId: string): Promise<ImapResult> {
  const account = await getImapAccount(orgId, personaId)
  if (!account) return { connected: false, emails: [] }

  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: {
      user: account.imap_user,
      pass: account.imap_pass,
    },
    logger: false,
    // Hostinger/ferozo may need explicit TLS options
    tls: {
      rejectUnauthorized: false,
    },
  })

  const emails: UnreadEmail[] = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const results: any[] = []
      for await (const message of client.fetch({ seen: false }, {
        uid: true,
        envelope: true,
      })) {
        results.push(message)
        if (results.length >= 10) break
      }

      for (const msg of results) {
        const from = msg.envelope?.from?.[0]
        const fromStr = from?.name || from?.address || 'Desconocido'
        emails.push({
          from: fromStr,
          subject: msg.envelope?.subject || '(sin asunto)',
        })
      }
    } finally {
      lock.release()
    }

    await client.logout()
    return { connected: true, emails }
  } catch (err) {
    console.error('[imap] Error fetching unread emails:', (err as Error).message)
    try { await client.logout() } catch {}
    return { connected: false, emails: [] }
  }
}
