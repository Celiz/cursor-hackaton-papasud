import { Resend } from 'resend'
import { getFromEmail, bookingConfirmationHtml, welcomeEmailHtml, leadNotificationHtml } from './templates'
import type { EmailConfig, BookingConfirmationData, WelcomeEmailData, LeadNotificationData } from './templates'

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendBookingConfirmation(data: BookingConfirmationData, config: EmailConfig) {
  try {
    const result = await getResend().emails.send({
      from: getFromEmail(config),
      to: data.to,
      subject: `Llamada confirmada - ${data.date} a las ${data.time}`,
      html: bookingConfirmationHtml(data, config),
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending booking confirmation email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData, config: EmailConfig) {
  try {
    const result = await getResend().emails.send({
      from: getFromEmail(config),
      to: data.to,
      subject: `Bienvenida a ${config.orgName}`,
      html: welcomeEmailHtml(data, config),
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error }
  }
}

export async function sendLeadNotification(data: LeadNotificationData, config: EmailConfig) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.error('ADMIN_EMAIL not configured')
    return { success: false, error: 'ADMIN_EMAIL not configured' }
  }

  try {
    const result = await getResend().emails.send({
      from: getFromEmail(config),
      to: adminEmail,
      subject: `Nuevo lead: ${data.name}`,
      html: leadNotificationHtml(data),
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending lead notification:', error)
    return { success: false, error }
  }
}
