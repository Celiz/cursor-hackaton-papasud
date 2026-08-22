// Email templates for Escuela/Platform
// Uses Resend for delivery
// All org-specific references are parameterized

export interface EmailConfig {
  orgName: string
  senderName: string
  senderEmail: string
}

export interface BookingConfirmationData {
  to: string
  name: string
  date: string
  time: string
  meetingUrl?: string
}

export interface WelcomeEmailData {
  to: string
  name: string
  portalUrl: string
}

export interface LeadNotificationData {
  name: string
  email: string
  phone: string
  instagram?: string
  adminUrl: string
}

export function getFromEmail(config: EmailConfig) {
  return `${config.senderName} - ${config.orgName} <${config.senderEmail}>`
}

export function bookingConfirmationHtml(data: BookingConfirmationData, config: EmailConfig) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#fffbf5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;">
        <tr><td style="text-align:center;padding-bottom:30px;">
          <h1 style="margin:0;font-size:28px;color:#1f1f1f;font-weight:600;">${config.orgName}</h1>
        </td></tr>
        <tr><td>
          <table role="presentation" style="width:100%;border-collapse:collapse;background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(219,112,147,0.1);">
            <tr><td style="background:linear-gradient(135deg,#fb7185,#f43f5e);padding:30px;text-align:center;">
              <h2 style="margin:0;color:white;font-size:24px;font-weight:600;">Tu llamada está confirmada</h2>
            </td></tr>
            <tr><td style="padding:40px 30px;">
              <p style="margin:0 0 20px;color:#6b7280;font-size:16px;line-height:1.6;">
                Hola <strong style="color:#1f1f1f;">${data.name}</strong>,
              </p>
              <p style="margin:0 0 30px;color:#6b7280;font-size:16px;line-height:1.6;">
                Gracias por dar este paso. Tu llamada de descubrimiento está agendada:
              </p>
              <table role="presentation" style="width:100%;border-collapse:collapse;background:#fff1f2;border-radius:16px;margin-bottom:30px;">
                <tr><td style="padding:24px;text-align:center;">
                  <p style="margin:0 0 8px;color:#f43f5e;font-size:20px;font-weight:600;">${data.date}</p>
                  <p style="margin:0;color:#1f1f1f;font-size:18px;">a las ${data.time} hs</p>
                </td></tr>
              </table>
              ${data.meetingUrl ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:30px;">
                <tr><td align="center">
                  <a href="${data.meetingUrl}" style="display:inline-block;background:linear-gradient(135deg,#fb7185,#f43f5e);color:white;text-decoration:none;padding:16px 32px;border-radius:9999px;font-weight:600;font-size:16px;">Unirme a la llamada</a>
                </td></tr>
              </table>` : ''}
              <p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6;">Nos vemos pronto,<br><strong style="color:#1f1f1f;">${config.senderName}</strong></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function welcomeEmailHtml(data: WelcomeEmailData, config: EmailConfig) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#fffbf5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;">
        <tr><td style="text-align:center;padding-bottom:30px;">
          <h1 style="margin:0;font-size:28px;color:#1f1f1f;font-weight:600;">${config.orgName}</h1>
        </td></tr>
        <tr><td>
          <table role="presentation" style="width:100%;border-collapse:collapse;background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(219,112,147,0.1);">
            <tr><td style="background:linear-gradient(135deg,#fb7185,#f43f5e);padding:30px;text-align:center;">
              <h2 style="margin:0;color:white;font-size:24px;font-weight:600;">Bienvenida a tu transformación</h2>
            </td></tr>
            <tr><td style="padding:40px 30px;">
              <p style="margin:0 0 20px;color:#6b7280;font-size:16px;line-height:1.6;">
                Hola <strong style="color:#1f1f1f;">${data.name}</strong>,
              </p>
              <p style="margin:0 0 30px;color:#6b7280;font-size:16px;line-height:1.6;">
                Bienvenida a ${config.orgName}. Ya podés acceder a tu portal de miembro.
              </p>
              <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:30px;">
                <tr><td align="center">
                  <a href="${data.portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#fb7185,#f43f5e);color:white;text-decoration:none;padding:16px 32px;border-radius:9999px;font-weight:600;font-size:16px;">Ir a mi portal</a>
                </td></tr>
              </table>
              <p style="margin:0;color:#6b7280;font-size:16px;line-height:1.6;">Con amor,<br><strong style="color:#1f1f1f;">${config.senderName}</strong></p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function leadNotificationHtml(data: LeadNotificationData) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" style="width:100%;max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#f43f5e;padding:20px;text-align:center;">
      <h2 style="margin:0;color:white;font-size:20px;">Nuevo Lead</h2>
    </td></tr>
    <tr><td style="padding:24px;">
      <p style="margin:0 0 16px;"><strong>Nombre:</strong> ${data.name}</p>
      <p style="margin:0 0 16px;"><strong>Email:</strong> ${data.email}</p>
      <p style="margin:0 0 16px;"><strong>Teléfono:</strong> ${data.phone}</p>
      ${data.instagram ? `<p style="margin:0 0 16px;"><strong>Instagram:</strong> @${data.instagram.replace('@', '')}</p>` : ''}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p style="margin:0;text-align:center;">
        <a href="${data.adminUrl}" style="color:#f43f5e;text-decoration:none;font-weight:600;">Ver en el panel</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`
}
