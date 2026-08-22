import type { EmailProvider, EmailAccountRow } from './types'
import { GmailProvider } from './gmail-provider'
import { ImapSmtpProvider } from './imap-smtp-provider'

export function getEmailProvider(account: EmailAccountRow): EmailProvider {
  switch (account.tipo) {
    case 'gmail':
      return new GmailProvider(account)
    case 'imap':
      return new ImapSmtpProvider(account)
    default:
      throw new Error(`Tipo de cuenta no soportado: ${(account as any).tipo}`)
  }
}
