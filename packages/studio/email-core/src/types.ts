export interface EmailProvider {
  listThreads(options: ListThreadsOptions): Promise<ListThreadsResult>
  getThread(threadId: string): Promise<ThreadDetail>
  markAsRead(messageIds: string[]): Promise<void>
  markAsUnread(messageIds: string[]): Promise<void>
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>
  getUnreadCount(): Promise<number>
}

export interface ListThreadsOptions {
  maxResults?: number
  pageToken?: string
  query?: string
  folder: EmailFolder
}

export type EmailFolder = 'inbox' | 'sent' | 'starred' | 'trash' | 'spam' | 'unread'

export interface ListThreadsResult {
  threads: EmailThread[]
  nextPageToken?: string
}

export interface EmailThread {
  id: string
  subject: string
  snippet: string
  from_email: string
  from_name?: string
  participants: string[]
  message_count: number
  unread_count: number
  is_starred: boolean
  last_message_at: string
  labels: string[]
  has_attachments: boolean
}

export interface ThreadDetail {
  id: string
  subject: string
  messages: EmailMessageData[]
  participants: string[]
  message_count: number
}

export interface EmailMessageData {
  id: string
  from_email: string
  from_name?: string
  to: string[]
  cc?: string[]
  subject: string
  body_text?: string
  body_html?: string
  snippet: string
  date: string
  is_read: boolean
  is_starred: boolean
  labels: string[]
  attachments?: EmailAttachment[]
  message_id?: string
  in_reply_to?: string
  references?: string
}

export interface EmailAttachment {
  filename: string
  mime_type: string
  size: number
  attachment_id: string
  /** Para providers IMAP: contenido en base64 para servir inline.
   *  Gmail no lo usa (descarga por attachment_id contra Google). */
  content_base64?: string
  /** true si el adjunto está marcado como inline (Content-Disposition: inline
   *  o referenciado por cid: en el HTML). */
  is_inline?: boolean
  /** Content-ID del adjunto, sin <>. Necesario para resolver cid:… en el HTML. */
  content_id?: string
}

export interface SendEmailOptions {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text?: string
  html?: string
  inReplyTo?: string
  references?: string
}

export interface SendEmailResult {
  id: string
  threadId?: string
}

export interface EmailAccountRow {
  id: string
  user_id: string
  org_id: string
  tipo: 'gmail' | 'imap'
  nombre: string
  email: string
  activa: boolean
  es_predeterminada: boolean
  access_token?: string
  refresh_token?: string
  token_expiry?: string
  imap_host?: string
  imap_port?: number
  smtp_host?: string
  smtp_port?: number
  imap_user?: string
  imap_pass?: string
  smtp_user?: string
  smtp_pass?: string
}
