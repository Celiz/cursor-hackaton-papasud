import {
  GmailTokens,
  listThreads as gmailListThreads,
  getThread as gmailGetThread,
  markAsRead as gmailMarkAsRead,
  markAsUnread as gmailMarkAsUnread,
  sendEmail as gmailSendEmail,
  listMessages as gmailListMessages,
  refreshAccessToken,
} from './gmail-api'
import { query } from '@locus/db'
import type {
  EmailProvider,
  EmailAccountRow,
  ListThreadsOptions,
  ListThreadsResult,
  ThreadDetail,
  SendEmailOptions,
  SendEmailResult,
  EmailFolder,
} from './types'

export class GmailProvider implements EmailProvider {
  private account: EmailAccountRow
  private tokens: GmailTokens

  constructor(account: EmailAccountRow) {
    this.account = account
    this.tokens = {
      access_token: account.access_token!,
      refresh_token: account.refresh_token ?? undefined,
      expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : undefined,
    }
  }

  /**
   * Ensure the access token is valid, refreshing if expired.
   */
  private async ensureValidToken(): Promise<void> {
    if (this.tokens.expiry_date && this.tokens.expiry_date < Date.now()) {
      if (!this.tokens.refresh_token) {
        throw new Error('Token expirado y sin refresh token')
      }

      const refreshed = await refreshAccessToken(this.tokens.refresh_token)
      this.tokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? this.tokens.refresh_token,
        expiry_date: refreshed.expiry_date,
      }

      // Update tokens in DB
      await query(
        `UPDATE email_accounts
         SET access_token = $1, refresh_token = $2, token_expiry = $3, updated_at = NOW()
         WHERE id = $4`,
        [
          this.tokens.access_token,
          this.tokens.refresh_token,
          this.tokens.expiry_date ? new Date(this.tokens.expiry_date).toISOString() : null,
          this.account.id,
        ]
      )
    }
  }

  /**
   * Map EmailFolder to Gmail labelIds and query modifier.
   */
  private folderToGmail(folder: EmailFolder, searchQuery?: string): {
    labelIds?: string[]
    query?: string
  } {
    let gmailQuery = searchQuery || ''
    let labelIds: string[] | undefined

    switch (folder) {
      case 'inbox':
        labelIds = ['INBOX']
        break
      case 'sent':
        labelIds = ['SENT']
        break
      case 'starred':
        labelIds = ['STARRED']
        break
      case 'trash':
        labelIds = ['TRASH']
        break
      case 'spam':
        labelIds = ['SPAM']
        break
      case 'unread':
        gmailQuery = gmailQuery ? `${gmailQuery} is:unread` : 'is:unread'
        labelIds = ['INBOX']
        break
      default:
        labelIds = ['INBOX']
    }

    return { labelIds, query: gmailQuery || undefined }
  }

  async listThreads(options: ListThreadsOptions): Promise<ListThreadsResult> {
    await this.ensureValidToken()

    const { labelIds, query: gmailQuery } = this.folderToGmail(options.folder, options.query)

    // List thread IDs from Gmail
    const { threads: threadsList, nextPageToken } = await gmailListThreads(this.tokens, {
      maxResults: options.maxResults || 20,
      pageToken: options.pageToken,
      query: gmailQuery,
      labelIds,
    })

    // Fetch details for first 10 threads (same as current inbox route)
    const threadsWithDetails = await Promise.all(
      threadsList.slice(0, 10).map(async (t) => {
        try {
          const thread = await gmailGetThread(this.tokens, t.id)
          const lastMessage = thread.messages[thread.messages.length - 1]
          const firstMessage = thread.messages[0]
          const unreadCount = thread.messages.filter((m) => !m.read).length

          // Extract unique participants
          const participants = new Set<string>()
          thread.messages.forEach((m) => {
            participants.add(m.from)
            m.to?.forEach((to) => participants.add(to))
          })

          return {
            id: thread.id,
            subject: firstMessage.subject || '(Sin asunto)',
            snippet: lastMessage.snippet,
            from_email: lastMessage.from,
            from_name: lastMessage.fromName,
            participants: Array.from(participants),
            message_count: thread.messages.length,
            unread_count: unreadCount,
            is_starred: thread.messages.some((m) => m.labels.includes('STARRED')),
            last_message_at: lastMessage.date.toISOString(),
            labels: [...new Set(thread.messages.flatMap((m) => m.labels))],
            has_attachments: thread.messages.some(
              (m) => m.attachments && m.attachments.length > 0
            ),
          }
        } catch (error) {
          console.error(`Error getting thread ${t.id}:`, error)
          return {
            id: t.id,
            subject: '(Error al cargar)',
            snippet: t.snippet,
            from_email: '',
            from_name: '',
            participants: [],
            message_count: 0,
            unread_count: 0,
            is_starred: false,
            last_message_at: new Date().toISOString(),
            labels: [],
            has_attachments: false,
          }
        }
      })
    )

    // Update last sync timestamp
    await query(`UPDATE email_accounts SET ultimo_sync = NOW() WHERE id = $1`, [this.account.id])

    return {
      threads: threadsWithDetails,
      nextPageToken,
    }
  }

  async getThread(threadId: string): Promise<ThreadDetail> {
    await this.ensureValidToken()

    const thread = await gmailGetThread(this.tokens, threadId)

    return {
      id: thread.id,
      subject: thread.messages[0]?.subject || '(Sin asunto)',
      messages: thread.messages.map((m) => ({
        id: m.id,
        from_email: m.from,
        from_name: m.fromName,
        to: m.to,
        cc: m.cc,
        subject: m.subject,
        body_text: m.bodyText,
        body_html: m.bodyHtml,
        snippet: m.snippet,
        date: m.date.toISOString(),
        is_read: m.read,
        is_starred: m.labels.includes('STARRED'),
        labels: m.labels,
        attachments: m.attachments?.map((a) => ({
          filename: a.filename,
          mime_type: a.mimeType,
          size: a.size,
          attachment_id: a.attachmentId,
        })),
      })),
      participants: [...new Set(thread.messages.flatMap((m) => [m.from, ...m.to]))],
      message_count: thread.messages.length,
    }
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    await this.ensureValidToken()
    await Promise.all(messageIds.map((id) => gmailMarkAsRead(this.tokens, id)))
  }

  async markAsUnread(messageIds: string[]): Promise<void> {
    await this.ensureValidToken()
    await Promise.all(messageIds.map((id) => gmailMarkAsUnread(this.tokens, id)))
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    await this.ensureValidToken()

    const result = await gmailSendEmail(this.tokens, {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    return {
      id: result.id,
      threadId: result.threadId,
    }
  }

  async getUnreadCount(): Promise<number> {
    await this.ensureValidToken()

    const result = await gmailListMessages(this.tokens, {
      maxResults: 1,
      query: 'is:unread in:inbox',
    })

    // Gmail's list returns resultSizeEstimate but our wrapper doesn't expose it.
    // Instead, count unread messages by listing with maxResults=0 won't work.
    // Use a simple approach: list unread messages and count them.
    // For a more accurate count, we'd need the Gmail labels.get API.
    // For now, list up to 500 to get a count.
    const countResult = await gmailListMessages(this.tokens, {
      maxResults: 500,
      query: 'is:unread in:inbox',
    })

    return countResult.messages.length
  }
}
