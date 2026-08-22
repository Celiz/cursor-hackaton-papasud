import { generateEmailTemplate } from '@/lib/branding';

interface SolicitudDatosEmailOptions {
  orgNombre: string
  clienteNombre: string
  formUrl: string
  baseUrl?: string
}

export function getSolicitudDatosEmailHtml(options: SolicitudDatosEmailOptions): string {
  const { orgNombre, clienteNombre, formUrl, baseUrl } = options;

  return generateEmailTemplate({
    title: 'Datos de facturacion',
    greeting: `Hola ${clienteNombre},`,
    content: `
      <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
        Desde <strong>${orgNombre}</strong> necesitamos completar sus datos de facturacion
        para poder emitir comprobantes correctamente.
      </p>
      <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
        Por favor, complete el siguiente formulario con sus datos fiscales.
        Solo le tomara unos minutos.
      </p>
    `,
    ctaButton: {
      text: 'Completar datos de facturacion',
      url: formUrl,
    },
    footer: `
      <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
        Este enlace es personal y expira en 30 dias.
        Si tiene alguna duda, responda directamente a este email.
      </p>
    `,
    baseUrl,
  });
}

export function getSolicitudDatosEmailText(options: SolicitudDatosEmailOptions): string {
  const { orgNombre, clienteNombre, formUrl } = options;

  return [
    `Hola ${clienteNombre},`,
    '',
    `Desde ${orgNombre} necesitamos completar sus datos de facturacion para poder emitir comprobantes correctamente.`,
    '',
    `Por favor, complete el formulario en el siguiente enlace:`,
    formUrl,
    '',
    `Este enlace es personal y expira en 30 dias.`,
    `Si tiene alguna duda, responda directamente a este email.`,
  ].join('\n');
}
