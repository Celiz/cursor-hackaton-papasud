import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import { query } from '@locus/db'

export interface OrgEmailConfig {
  smtp_host: string
  smtp_port?: number
  smtp_user: string
  smtp_pass: string
  from_name?: string
  from_email?: string
  emails_per_hour?: number
  emails_per_day?: number
}

export interface SendEmailResult {
  messageId: string
  response: string
  accepted: string[]
  rejected: string[]
}

export async function getOrgEmailConfig(orgId: string): Promise<OrgEmailConfig | null> {
  const result = await query<{ config: Record<string, unknown> }>(
    `SELECT config FROM organizations WHERE id = $1`,
    [orgId]
  )
  const config = result.rows[0]?.config
  if (!config || typeof config !== 'object') return null
  const email = (config as Record<string, unknown>).email as OrgEmailConfig | undefined
  return email ?? null
}

export function createTransport(config: OrgEmailConfig): nodemailer.Transporter {
  const port = config.smtp_port ?? 587
  return nodemailer.createTransport({
    host: config.smtp_host,
    port,
    secure: port === 465,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  })
}

export async function sendEmail(
  orgId: string,
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer }>
): Promise<void> {
  const config = await getOrgEmailConfig(orgId)
  if (!config) {
    throw new Error(`No email config for org ${orgId}. Set organizations.config.email in DB.`)
  }

  const transport = createTransport(config)

  await transport.sendMail({
    from: `${config.from_name ?? 'Aeterna'} <${config.from_email ?? config.smtp_user}>`,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  })
}

export async function sendEmailWithInfo(
  config: OrgEmailConfig,
  mailOptions: Mail.Options
): Promise<SendEmailResult> {
  const transport = createTransport(config)
  const from = `${config.from_name ?? 'Aeterna'} <${config.from_email ?? config.smtp_user}>`
  const info = await transport.sendMail({ ...mailOptions, from })
  return {
    messageId: info.messageId,
    response: info.response,
    accepted: (info.accepted || []) as string[],
    rejected: (info.rejected || []) as string[],
  }
}

export async function testSmtpConnection(config: OrgEmailConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = createTransport(config)
    await transport.verify()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' }
  }
}
