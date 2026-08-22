/**
 * Configuración de branding centralizada para UNO Electromedicina
 * Usado en emails, PDFs y documentos generados
 */

export const branding = {
  // Información de la empresa
  company: {
    name: 'UNO ELECTROMEDICINA',
    legalName: 'UNO ELECTROMEDICINA',
    cuit: '20-20490460-0',
    address: 'Chaco 801, Mar del Plata - Buenos Aires, Argentina',
    phone: '+54 223 473-9018',
    email: 'contacto@papasud.com.ar',
    website: 'www.papasud.com.ar',
    phoneAdmin: '223-5358602',
    // Logo para emails - URL pública de imgur
    logo: 'https://i.imgur.com/qCfPnBE.png',
  },

  // Colores de marca (estilo profesional con acentos violeta)
  colors: {
    primary: '#8b5cf6', // Violeta para acentos
    primaryDark: '#7c3aed',
    primaryLight: '#a78bfa',
    gradientStart: '#8b5cf6',
    gradientEnd: '#7c3aed',
    accent: '#dc2626', // Rojo Electromedicina para branding secundario
    text: {
      primary: '#1e293b', // Más oscuro como el template viejo
      secondary: '#475569',
      muted: '#64748b',
      light: '#94a3b8',
    },
    background: {
      white: '#ffffff',
      light: '#f8fafc',
      muted: '#f1f5f9',
      tableHeader: '#f3f4f6', // Gris para headers de tabla
    },
    border: {
      light: '#e2e8f0',
      default: '#cbd5e1',
    },
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },

  // Colores RGB para jsPDF (0-255)
  colorsRGB: {
    primary: [139, 92, 246], // Violeta
    primaryDark: [124, 58, 237],
    primaryLight: [167, 139, 250],
    accent: [220, 38, 38], // Rojo Electromedicina
    text: {
      primary: [30, 41, 59],
      secondary: [71, 85, 105],
      muted: [100, 116, 139],
    },
    status: {
      success: [34, 197, 94],
      warning: [245, 158, 11],
      error: [239, 68, 68],
    },
  },
} as const;

/**
 * Genera el header de email HTML con branding
 */
export function getEmailHeader(title?: string): string {
  return `
    <tr>
      <td style="background-color: ${branding.colors.background.white}; padding: 24px 32px; border-bottom: 1px solid ${branding.colors.border.light};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: middle;">
              <img src="${branding.company.logo}" alt="${branding.company.name}" style="max-width: 180px; height: auto;" />
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <p style="margin: 0; color: ${branding.colors.text.primary}; font-size: 13px; font-weight: 600;">
                ${branding.company.name}
              </p>
              <p style="margin: 4px 0 0 0; color: ${branding.colors.text.muted}; font-size: 12px;">
                Tel: ${branding.company.phone}
              </p>
            </td>
          </tr>
        </table>
        ${title ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
          <tr>
            <td style="background-color: ${branding.colors.background.tableHeader}; padding: 12px 16px; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: ${branding.colors.text.primary}; font-size: 16px; font-weight: 600;">
                ${title}
              </p>
            </td>
          </tr>
        </table>
        ` : ''}
      </td>
    </tr>
  `;
}

/**
 * Genera el footer de email HTML con branding
 */
export function getEmailFooter(): string {
  return `
    <tr>
      <td style="background-color: ${branding.colors.background.light}; padding: 24px 40px; text-align: center; border-top: 1px solid ${branding.colors.border.light};">
        <p style="margin: 0; color: ${branding.colors.text.muted}; font-size: 13px; font-weight: 500;">
          ${branding.company.name} - CUIT ${branding.company.cuit}
        </p>
        <p style="margin: 6px 0 0 0; color: ${branding.colors.text.light}; font-size: 12px;">
          <a href="https://maps.google.com/?q=${encodeURIComponent(branding.company.address)}" style="color: ${branding.colors.primary}; text-decoration: none;">${branding.company.address}</a>
        </p>
        <p style="margin: 6px 0 0 0; color: ${branding.colors.text.light}; font-size: 12px;">
          Tel: ${branding.company.phone} | Email: <a href="mailto:${branding.company.email}" style="color: ${branding.colors.primary}; text-decoration: none;">${branding.company.email}</a>
        </p>
        <p style="margin: 12px 0 0 0; color: ${branding.colors.text.muted}; font-size: 12px;">
          Gracias por confiar en nosotros!
        </p>
        <p style="margin: 8px 0 0 0; color: ${branding.colors.text.light}; font-size: 11px;">
          © ${new Date().getFullYear()} ${branding.company.name}
        </p>
      </td>
    </tr>
  `;
}

/**
 * Genera un botón CTA para emails
 */
export function getEmailButton(text: string, url: string): string {
  return `
    <a href="${url}" style="display: inline-block; background-color: ${branding.colors.primary}; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
      ${text}
    </a>
  `;
}

/**
 * Construye una URL trackeada para email tracking
 */
export function buildTrackedEmailUrl(
  trackingToken: string,
  tipoLink: string,
  destinationUrl: string,
  baseUrl?: string
): string {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    t: trackingToken,
    l: tipoLink,
    url: destinationUrl,
  });
  return `${appUrl}/api/email-track?${params.toString()}`;
}

/**
 * Genera un botón CTA trackeado para emails
 * El click se registra antes de redirigir al destino
 */
export function getTrackedEmailButton(
  text: string,
  trackingToken: string,
  tipoLink: string,
  destinationUrl: string,
  baseUrl?: string
): string {
  const trackedUrl = buildTrackedEmailUrl(trackingToken, tipoLink, destinationUrl, baseUrl);
  return `
    <a href="${trackedUrl}" style="display: inline-block; background-color: ${branding.colors.primary}; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);">
      ${text}
    </a>
  `;
}

/**
 * Genera un link de texto trackeado para emails
 */
export function getTrackedEmailLink(
  text: string,
  trackingToken: string,
  tipoLink: string,
  destinationUrl: string,
  baseUrl?: string
): string {
  const trackedUrl = buildTrackedEmailUrl(trackingToken, tipoLink, destinationUrl, baseUrl);
  return `<a href="${trackedUrl}" style="color: ${branding.colors.primary}; text-decoration: none;">${text}</a>`;
}

/**
 * Formatea moneda en formato argentino
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}

/**
 * Formatea fecha en formato argentino
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatea fecha corta
 */
export function formatDateShort(date: string | Date): string {
  // Handle string dates without timezone conversion
  if (typeof date === 'string') {
    const [year, month, day] = date.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface EmailTemplateOptions {
  title: string;
  subtitle?: string;
  greeting: string;
  content: string;
  infoCard?: {
    rows: Array<{ label: string; value: string; highlight?: boolean }>;
  };
  ctaButton?: {
    text: string;
    url: string;
  };
  footer?: string;
  legalFooter?: string;
  baseUrl?: string; // Para construir URLs absolutas del logo
}

/**
 * Genera un email completo con branding
 */
export function generateEmailTemplate(options: EmailTemplateOptions): string {
  const {
    title,
    subtitle,
    greeting,
    content,
    infoCard,
    ctaButton,
    footer,
    legalFooter,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  } = options;

  // Construir URL absoluta del logo
  const logoUrl = branding.company.logo
    ? (branding.company.logo.startsWith('http') ? branding.company.logo : `${baseUrl}${branding.company.logo}`)
    : null;

  const infoCardHtml = infoCard ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${branding.colors.background.light}; border-radius: 8px; margin-bottom: 32px;">
      <tr>
        <td style="padding: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoCard.rows.map((row, index) => `
              <tr>
                <td style="padding: 8px 0;${index < infoCard.rows.length - 1 ? ` border-bottom: 1px solid ${branding.colors.border.light};` : ''}">
                  <span style="color: ${branding.colors.text.muted}; font-size: 14px;">${row.label}</span>
                </td>
                <td style="padding: 8px 0;${index < infoCard.rows.length - 1 ? ` border-bottom: 1px solid ${branding.colors.border.light};` : ''} text-align: right;">
                  <strong style="color: ${row.highlight ? branding.colors.primary : branding.colors.text.primary}; font-size: ${row.highlight ? '24px' : '14px'};">${row.value}</strong>
                </td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    </table>
  ` : '';

  const ctaHtml = ctaButton ? `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 8px 0 32px 0;">
          ${getEmailButton(ctaButton.text, ctaButton.url)}
        </td>
      </tr>
    </table>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${branding.colors.background.muted};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${branding.colors.background.muted}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${branding.colors.background.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Logo (estilo profesional blanco) -->
          <tr>
            <td style="background-color: ${branding.colors.background.white}; padding: 24px 32px; border-bottom: 1px solid ${branding.colors.border.light};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle; width: 50%;">
                    ${logoUrl ? `
                    <img src="${logoUrl}" alt="${branding.company.name}" style="max-width: 180px; height: auto;" />
                    ` : `
                    <h1 style="margin: 0; color: ${branding.colors.text.primary}; font-size: 20px; font-weight: 700;">
                      ${branding.company.name}
                    </h1>
                    `}
                  </td>
                  <td style="vertical-align: middle; text-align: right;">
                    <p style="margin: 0; color: ${branding.colors.text.primary}; font-size: 13px; font-weight: 600;">
                      ${branding.company.name}
                    </p>
                    <p style="margin: 4px 0 0 0; color: ${branding.colors.text.muted}; font-size: 12px;">
                      ${branding.company.address}
                    </p>
                    <p style="margin: 2px 0 0 0; color: ${branding.colors.text.muted}; font-size: 12px;">
                      Tel: ${branding.company.phone}
                    </p>
                  </td>
                </tr>
              </table>
              ${subtitle ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                <tr>
                  <td style="background-color: ${branding.colors.background.tableHeader}; padding: 12px 16px; border-radius: 6px;">
                    <p style="margin: 0; color: ${branding.colors.text.primary}; font-size: 16px; font-weight: 600; text-align: center;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; color: ${branding.colors.text.secondary}; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>

              <p style="margin: 0 0 32px 0; color: ${branding.colors.text.secondary}; font-size: 16px; line-height: 1.6;">
                ${content}
              </p>

              ${infoCardHtml}

              ${ctaHtml}

              ${footer ? `
              <hr style="border: none; border-top: 1px solid ${branding.colors.border.light}; margin: 32px 0;">
              <p style="margin: 0; color: ${branding.colors.text.secondary}; font-size: 14px; line-height: 1.6;">
                ${footer}
              </p>
              ` : ''}

              <p style="margin: ${footer ? '16px' : '32px'} 0 0 0; color: ${branding.colors.text.secondary}; font-size: 14px; line-height: 1.6;">
                Saludos cordiales,<br>
                <strong>Equipo ${branding.company.name}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          ${getEmailFooter()}

          ${legalFooter ? `
          <!-- Legal Footer (RGPD) -->
          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.4;">
                ${legalFooter}
              </p>
            </td>
          </tr>
          ` : ''}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Genera texto plano para emails (fallback)
 */
export function generateEmailText(options: {
  greeting: string;
  content: string;
  infoItems?: Array<{ label: string; value: string }>;
  ctaUrl?: string;
  footer?: string;
}): string {
  const { greeting, content, infoItems, ctaUrl, footer } = options;

  let text = `${greeting}\n\n${content}\n\n`;

  if (infoItems && infoItems.length > 0) {
    infoItems.forEach(item => {
      text += `${item.label}: ${item.value}\n`;
    });
    text += '\n';
  }

  if (ctaUrl) {
    text += `Ver más: ${ctaUrl}\n\n`;
  }

  if (footer) {
    text += `${footer}\n\n`;
  }

  text += `Saludos cordiales,\nEquipo ${branding.company.name}\n`;
  text += `\n---\n${branding.company.name}\n${branding.company.phone}\n${branding.company.email}`;

  return text;
}
