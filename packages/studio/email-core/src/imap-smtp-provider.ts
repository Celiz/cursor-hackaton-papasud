import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'
import { simpleParser } from 'mailparser'
import type {
  EmailProvider,
  EmailAccountRow,
  EmailAttachment,
  ListThreadsOptions,
  ListThreadsResult,
  EmailThread,
  ThreadDetail,
  EmailMessageData,
  SendEmailOptions,
  SendEmailResult,
  EmailFolder,
} from './types'

/**
 * Strip Re:/Fwd:/RV:/RE:/FW: prefixes from subject for thread grouping.
 */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd|rv|fw)\s*:\s*/gi, '')
    .replace(/^(re|fwd|rv|fw)\s*:\s*/gi, '') // double strip for "Re: Fwd: ..."
    .trim()
    .toLowerCase()
}

/**
 * Parse the raw MIME source of an email into text, html, and attachments using
 * mailparser. mailparser handles MIME edge cases (folded headers, nested
 * multipart, quoted-printable, base64, charsets, inline cid: images, etc.).
 *
 * Attachments come back with their bytes; the caller decides how to expose
 * them (e.g. inline base64 data URLs or a separate fetch endpoint).
 */
async function parseEmailSource(
  source: Buffer,
  uid: number,
): Promise<{ text: string; html: string; attachments: EmailAttachment[] }> {
  const parsed = await simpleParser(source)

  const html = typeof parsed.html === 'string' ? parsed.html : ''
  const text = parsed.text || ''

  const attachments: EmailAttachment[] = (parsed.attachments || []).map((a, i) => {
    const cid = a.cid ? a.cid.replace(/^<|>$/g, '') : undefined
    // Solo marcamos inline si Content-Disposition lo dice explícitamente.
    // Gmail incluye un Content-ID en TODOS sus adjuntos aunque estén marcados
    // como attachment, así que no podemos inferir inline desde la presencia
    // del cid. El consumer puede mirar si el HTML referencia cid:… para una
    // detección más fina.
    const isInline = a.contentDisposition === 'inline'
    return {
      filename: a.filename || `adjunto-${i + 1}`,
      mime_type: a.contentType || 'application/octet-stream',
      size: a.size ?? a.content.byteLength,
      // attachment_id estable por mensaje: combinamos uid + índice. Permite
      // que el frontend (o un endpoint futuro) sepa cuál es cuál.
      attachment_id: `${uid}-${i}`,
      content_base64: a.content.toString('base64'),
      is_inline: isInline,
      content_id: cid,
    }
  })

  return { text, html, attachments }
}

/**
 * Extract a snippet (first ~100 chars) from text body.
 */
function makeSnippet(text: string, html: string): string {
  const source = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  return source.substring(0, 160).trim()
}

/**
 * Build an IMAP message/thread ID that encodes the folder.
 * Format: imap-{encodedFolder}-{uid}
 */
function makeImapId(folder: string, uid: number): string {
  return `imap-${encodeURIComponent(folder)}-${uid}`
}

/**
 * Parse an IMAP ID back into { folder, uid }.
 * Supports both new format "imap-{folder}-{uid}" and legacy "imap-{uid}".
 */
function parseImapId(id: string): { folder: string; uid: number } {
  const withoutPrefix = id.replace(/^imap-/, '')
  // Try new format: last segment is uid, everything before is encoded folder
  const lastDash = withoutPrefix.lastIndexOf('-')
  if (lastDash > 0) {
    const uidStr = withoutPrefix.substring(lastDash + 1)
    const uid = parseInt(uidStr, 10)
    if (!isNaN(uid)) {
      const folder = decodeURIComponent(withoutPrefix.substring(0, lastDash))
      return { folder, uid }
    }
  }
  // Legacy format: imap-{uid}
  const uid = parseInt(withoutPrefix, 10)
  return { folder: 'INBOX', uid: isNaN(uid) ? 0 : uid }
}

/**
 * Map EmailFolder to IMAP mailbox name. Tries common variations.
 */
const FOLDER_CANDIDATES: Record<EmailFolder, string[]> = {
  inbox: ['INBOX'],
  sent: ['Sent', 'INBOX.Sent', 'Enviados', 'INBOX.Enviados'],
  starred: ['Flagged', 'INBOX.Flagged'],
  trash: ['Trash', 'INBOX.Trash', 'Papelera', 'INBOX.Papelera'],
  spam: ['Spam', 'Junk', 'INBOX.Spam', 'INBOX.Junk'],
  unread: ['INBOX'], // unread is filtered via search, not a separate folder
}

export class ImapSmtpProvider implements EmailProvider {
  private account: EmailAccountRow

  constructor(account: EmailAccountRow) {
    this.account = account
  }

  private createImapClient(): ImapFlow {
    return new ImapFlow({
      host: this.account.imap_host!,
      port: this.account.imap_port || 993,
      secure: true,
      auth: {
        user: this.account.imap_user!,
        pass: this.account.imap_pass!,
      },
      logger: false,
      tls: {
        rejectUnauthorized: false,
      },
    })
  }

  /**
   * Resolve an EmailFolder to an actual mailbox path that exists on the server.
   */
  private async resolveMailbox(client: ImapFlow, folder: EmailFolder): Promise<string> {
    const candidates = FOLDER_CANDIDATES[folder] || ['INBOX']

    if (folder === 'inbox' || folder === 'unread') return 'INBOX'

    // List available mailboxes and try to match candidates
    const mailboxes = await client.list()
    const available = new Set(mailboxes.map((m) => m.path))

    for (const candidate of candidates) {
      if (available.has(candidate)) return candidate
    }

    // Fallback to INBOX
    return 'INBOX'
  }

  async listThreads(options: ListThreadsOptions): Promise<ListThreadsResult> {
    const client = this.createImapClient()
    const maxResults = options.maxResults || 20

    try {
      await client.connect()

      const mailbox = await this.resolveMailbox(client, options.folder)
      const lock = await client.getMailboxLock(mailbox)

      try {
        // Build search criteria
        const searchCriteria: any = {}
        if (options.folder === 'unread') {
          searchCriteria.seen = false
        }
        if (options.query) {
          // Simple text search
          searchCriteria.or = [
            { subject: options.query },
            { from: options.query },
            { to: options.query },
          ]
        }

        const hasSearchCriteria = Object.keys(searchCriteria).length > 0

        // Determine fetch range: for plain listing (no search), only fetch the
        // most recent messages using a sequence-number range to avoid downloading
        // the entire mailbox. We fetch maxResults*3 raw messages because subject-
        // based thread grouping reduces the final count.
        const fetchLimit = Math.min(maxResults * 3, 200)
        let fetchRange: string | object

        if (hasSearchCriteria) {
          // Server-side search — let IMAP filter
          fetchRange = searchCriteria
        } else {
          // Use mailbox status to build a narrow sequence range
          const total = (client.mailbox && client.mailbox.exists) || 0
          if (total === 0) {
            return { threads: [] }
          }
          const startSeq = Math.max(1, total - fetchLimit + 1)
          fetchRange = `${startSeq}:*`
        }

        // Fetch envelope + flags for the selected range
        interface ImapMsg {
          uid: number
          envelope: {
            from?: Array<{ name?: string; address?: string }>
            to?: Array<{ name?: string; address?: string }>
            subject?: string
            date?: Date
            messageId?: string
            inReplyTo?: string
          }
          flags: Set<string>
          size: number
        }
        const messages: ImapMsg[] = []

        for await (const msg of client.fetch(fetchRange, {
          uid: true,
          envelope: true,
          flags: true,
          size: true,
        })) {
          messages.push(msg as unknown as ImapMsg)
        }

        if (messages.length === 0) {
          return { threads: [] }
        }

        // Sort by date descending
        messages.sort((a, b) => {
          const dateA = a.envelope.date ? new Date(a.envelope.date).getTime() : 0
          const dateB = b.envelope.date ? new Date(b.envelope.date).getTime() : 0
          return dateB - dateA
        })

        // Group into threads by normalized subject
        const threadMap = new Map<string, ImapMsg[]>()
        const threadOrder: string[] = []

        for (const msg of messages) {
          const subject = msg.envelope.subject || ''
          const key = normalizeSubject(subject) || `_uid_${msg.uid}`

          if (!threadMap.has(key)) {
            threadMap.set(key, [])
            threadOrder.push(key)
          }
          threadMap.get(key)!.push(msg)
        }

        // Build thread list, limited to maxResults
        const threads: EmailThread[] = []

        for (const key of threadOrder.slice(0, maxResults)) {
          const threadMsgs = threadMap.get(key)!
          // Sort messages in thread by date ascending
          threadMsgs.sort((a, b) => {
            const dateA = a.envelope.date ? new Date(a.envelope.date).getTime() : 0
            const dateB = b.envelope.date ? new Date(b.envelope.date).getTime() : 0
            return dateA - dateB
          })

          const firstMsg = threadMsgs[0]
          const lastMsg = threadMsgs[threadMsgs.length - 1]
          const unreadCount = threadMsgs.filter((m) => !m.flags.has('\\Seen')).length

          const participants = new Set<string>()
          threadMsgs.forEach((m) => {
            m.envelope.from?.forEach((f) => { if (f.address) participants.add(f.address) })
            m.envelope.to?.forEach((t) => { if (t.address) participants.add(t.address) })
          })

          const lastFrom = lastMsg.envelope.from?.[0]
          const firstSubject = firstMsg.envelope.subject || '(Sin asunto)'

          threads.push({
            id: makeImapId(mailbox, firstMsg.uid),
            subject: firstSubject,
            snippet: '', // IMAP envelopes don't include snippets; would need source fetch
            from_email: lastFrom?.address || '',
            from_name: lastFrom?.name,
            participants: Array.from(participants),
            message_count: threadMsgs.length,
            unread_count: unreadCount,
            is_starred: threadMsgs.some((m) => m.flags.has('\\Flagged')),
            last_message_at: lastMsg.envelope.date
              ? new Date(lastMsg.envelope.date).toISOString()
              : new Date().toISOString(),
            labels: [],
            has_attachments: false, // Would need bodyStructure to determine
          })
        }

        return { threads }
      } finally {
        lock.release()
      }
    } catch (err) {
      console.error('[imap] Error listing threads:', (err as Error).message)
      throw err
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
  }

  async getThread(threadId: string): Promise<ThreadDetail> {
    const client = this.createImapClient()

    // Extract the folder and anchor UID from "imap-{folder}-{uid}"
    const { folder, uid: anchorUid } = parseImapId(threadId)
    if (anchorUid === 0) {
      throw new Error(`ID de thread invalido: ${threadId}`)
    }

    try {
      await client.connect()
      const lock = await client.getMailboxLock(folder)

      try {
        // First, fetch the anchor message to get its subject
        let anchorSubject = ''
        for await (const msg of client.fetch(String(anchorUid), {
          uid: true,
          envelope: true,
        }, { uid: true })) {
          anchorSubject = (msg as any).envelope?.subject || ''
        }

        const normalizedTarget = normalizeSubject(anchorSubject)

        // Fetch all messages to find those with matching subject
        interface ImapFetchMsg {
          uid: number
          envelope: {
            from?: Array<{ name?: string; address?: string }>
            to?: Array<{ name?: string; address?: string }>
            cc?: Array<{ name?: string; address?: string }>
            subject?: string
            date?: Date
            messageId?: string
            inReplyTo?: string
          }
          flags: Set<string>
          source?: Buffer
        }

        const threadMessages: ImapFetchMsg[] = []

        // Para encontrar los otros mensajes del hilo NO escaneamos el inbox
        // entero (eso era O(n) sobre todo el buzón y hacía lento abrir cada
        // mail). Pedimos al servidor un SEARCH SUBJECT — server-side e
        // indexado. Recoge "Re:", "Fwd:", etc. por substring; el filtro fino
        // por subject normalizado lo hacemos abajo.
        let candidateUids: number[] = [anchorUid]
        if (normalizedTarget) {
          try {
            const found = await client.search(
              { subject: anchorSubject },
              { uid: true },
            )
            if (found && found.length > 0) candidateUids = found
          } catch (e) {
            console.warn(
              '[imap] SEARCH subject failed, falling back to anchor only:',
              (e as Error).message,
            )
          }
        }

        if (candidateUids.length > 0) {
          for await (const msg of client.fetch(
            candidateUids.join(','),
            { uid: true, envelope: true, flags: true },
            { uid: true },
          )) {
            const m = msg as unknown as ImapFetchMsg
            const subject = m.envelope?.subject || ''
            if (normalizeSubject(subject) === normalizedTarget) {
              threadMessages.push(m)
            }
          }
        }

        // Sort by date ascending
        threadMessages.sort((a, b) => {
          const dateA = a.envelope.date ? new Date(a.envelope.date).getTime() : 0
          const dateB = b.envelope.date ? new Date(b.envelope.date).getTime() : 0
          return dateA - dateB
        })

        // Batch-fetch full source for all thread messages in a single IMAP call
        const messages: EmailMessageData[] = []
        const sourceByUid = new Map<number, Buffer>()

        if (threadMessages.length > 0) {
          const uidSet = threadMessages.map(m => m.uid)
          for await (const msg of client.fetch(uidSet as any, {
            uid: true,
            source: true,
          })) {
            if ((msg as any).source) {
              sourceByUid.set(msg.uid, (msg as any).source)
            }
          }
        }

        for (const tmsg of threadMessages) {
          const source = sourceByUid.get(tmsg.uid)
          const parsed = source
            ? await parseEmailSource(source, tmsg.uid)
            : { text: '', html: '', attachments: [] as EmailAttachment[] }
          const { text, html, attachments } = parsed
          const from = tmsg.envelope.from?.[0]
          const to = tmsg.envelope.to?.map((t) => t.address || '').filter(Boolean) || []
          const cc = tmsg.envelope.cc?.map((c) => c.address || '').filter(Boolean)

          messages.push({
            id: makeImapId(folder, tmsg.uid),
            from_email: from?.address || '',
            from_name: from?.name,
            to,
            cc: cc && cc.length > 0 ? cc : undefined,
            subject: tmsg.envelope.subject || '',
            body_text: text || undefined,
            body_html: html || undefined,
            snippet: makeSnippet(text, html),
            date: tmsg.envelope.date
              ? new Date(tmsg.envelope.date).toISOString()
              : new Date().toISOString(),
            is_read: tmsg.flags.has('\\Seen'),
            is_starred: tmsg.flags.has('\\Flagged'),
            labels: [],
            attachments: attachments.length > 0 ? attachments : undefined,
            message_id: tmsg.envelope.messageId || undefined,
            in_reply_to: tmsg.envelope.inReplyTo || undefined,
          })
        }

        const participants = [...new Set(messages.flatMap((m) => [m.from_email, ...m.to]))]

        return {
          id: threadId,
          subject: anchorSubject || '(Sin asunto)',
          messages,
          participants,
          message_count: messages.length,
        }
      } finally {
        lock.release()
      }
    } catch (err) {
      console.error('[imap] Error getting thread:', (err as Error).message)
      throw err
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    const client = this.createImapClient()

    try {
      await client.connect()

      // Group message IDs by folder
      const byFolder = new Map<string, number[]>()
      for (const id of messageIds) {
        const { folder, uid } = parseImapId(id)
        if (uid === 0) continue
        if (!byFolder.has(folder)) byFolder.set(folder, [])
        byFolder.get(folder)!.push(uid)
      }

      for (const [folder, uids] of byFolder) {
        const lock = await client.getMailboxLock(folder)
        try {
          for (const uid of uids) {
            await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
          }
        } finally {
          lock.release()
        }
      }
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
  }

  async markAsUnread(messageIds: string[]): Promise<void> {
    const client = this.createImapClient()

    try {
      await client.connect()

      // Group message IDs by folder
      const byFolder = new Map<string, number[]>()
      for (const id of messageIds) {
        const { folder, uid } = parseImapId(id)
        if (uid === 0) continue
        if (!byFolder.has(folder)) byFolder.set(folder, [])
        byFolder.get(folder)!.push(uid)
      }

      for (const [folder, uids] of byFolder) {
        const lock = await client.getMailboxLock(folder)
        try {
          for (const uid of uids) {
            await client.messageFlagsRemove(String(uid), ['\\Seen'], { uid: true })
          }
        } finally {
          lock.release()
        }
      }
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const smtpPort = this.account.smtp_port || 587
    const secure = smtpPort === 465

    const transporter = nodemailer.createTransport({
      host: this.account.smtp_host!,
      port: smtpPort,
      secure,
      auth: {
        user: this.account.smtp_user!,
        pass: this.account.smtp_pass!,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.account.email,
      to: options.to.join(', '),
      cc: options.cc?.join(', '),
      bcc: options.bcc?.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
    }

    if (options.inReplyTo) {
      mailOptions.inReplyTo = options.inReplyTo
    }
    if (options.references) {
      mailOptions.references = options.references
    }

    const info = await transporter.sendMail(mailOptions)

    return {
      id: info.messageId || '',
      threadId: undefined,
    }
  }

  async getUnreadCount(): Promise<number> {
    const client = this.createImapClient()

    try {
      await client.connect()
      const status = await client.status('INBOX', { unseen: true })
      return status.unseen || 0
    } catch (err) {
      console.error('[imap] Error getting unread count:', (err as Error).message)
      return 0
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
  }
}
