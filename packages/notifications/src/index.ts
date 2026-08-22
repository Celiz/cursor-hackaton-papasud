// Register all queries and actions via side-effect imports
import './queries/index'
import './actions/index'

export * from './types'
export * as catalog from './registry'
export * from './subscriptions'
export * from './messages'
export { sendEmail, sendEmailWithInfo, getOrgEmailConfig, createTransport, testSmtpConnection } from './email/index'
export type { OrgEmailConfig, SendEmailResult } from './email/index'
export { extractContact, extractEmail, queryClientesZona, type ClienteZona } from './helpers/index'
