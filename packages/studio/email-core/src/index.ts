export { getEmailProvider } from './provider-factory'
export { GmailProvider } from './gmail-provider'
export { ImapSmtpProvider } from './imap-smtp-provider'
export type {
  EmailProvider,
  EmailAccountRow,
  ListThreadsOptions,
  ListThreadsResult,
  EmailThread,
  ThreadDetail,
  EmailMessageData,
  EmailAttachment,
  SendEmailOptions,
  SendEmailResult,
  EmailFolder,
} from './types'

// Gmail API utilities needed by consumer apps
export {
  getAuthUrl,
  getTokensFromCode,
  getUserInfo,
  refreshAccessToken,
  getOAuth2Client,
  listMessages,
  getMessage,
  sendEmail,
  markAsRead,
  markAsUnread,
  getAttachment,
  listThreads,
  getThread,
  getHistory,
} from './gmail-api'
export type { GmailTokens, GmailMessage, GmailThread } from './gmail-api'

// Templates
export {
  getTemplates,
  getTemplateById,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  type EmailTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from './templates'

// Automations
export {
  getAutomaticos,
  getAutomaticoById,
  createAutomatico,
  updateAutomatico,
  deleteAutomatico,
  dispararAutomatico,
  EVENTOS_DISPONIBLES,
  type EmailAutomatico,
  type CreateAutomaticoInput,
  type UpdateAutomaticoInput,
} from './automations'
