import { randomBytes } from "crypto";
import { query } from "@/lib/db";

// =====================================================
// Types
// =====================================================

export type TipoEmail =
  | "factura"
  | "cuenta_corriente"
  | "presupuesto"
  | "servicio"
  | "general";

export type EstadoTracking = "enviado" | "click" | "bounce" | "error";

export interface EmailTrackingCreate {
  tipo_email: TipoEmail;
  factura_id?: string;
  presupuesto_id?: string;
  cliente_id?: string;
  destinatarios: string[];
  asunto: string;
  enviado_por?: string;
  metadata?: Record<string, any>;
  message_id?: string;
  org_id?: string;
}

export interface EmailTracking {
  id: string;
  tracking_token: string;
  tipo_email: TipoEmail;
  factura_id?: string;
  presupuesto_id?: string;
  cliente_id?: string;
  destinatarios: string[];
  asunto: string;
  enviado_por?: string;
  estado: EstadoTracking;
  enviado_at: string;
  metadata?: Record<string, any>;
  message_id?: string;
  created_at: string;
  updated_at: string;
  // Computed from joins
  clicks_count?: number;
  ultimo_click?: string;
  clicks?: EmailTrackingClick[];
}

export interface EmailTrackingClick {
  id: string;
  email_tracking_id: string;
  tipo_link: string;
  url_destino: string;
  clicked_at: string;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

// =====================================================
// Token Generation
// =====================================================

/**
 * Genera un token de tracking seguro de 32 caracteres (URL-safe)
 * Usa 24 bytes de entropía = 192 bits, prácticamente imposible de adivinar
 */
export function generateTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}

// =====================================================
// CRUD Operations
// =====================================================

/**
 * Crea un registro de tracking cuando se envía un email
 */
export async function createEmailTracking(
  data: EmailTrackingCreate
): Promise<EmailTracking> {
  const token = generateTrackingToken();

  const result = await query(
    `INSERT INTO email_tracking (
      tracking_token, tipo_email, factura_id, presupuesto_id, cliente_id,
      destinatarios, asunto, enviado_por, metadata, message_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      token,
      data.tipo_email,
      data.factura_id || null,
      data.presupuesto_id || null,
      data.cliente_id || null,
      data.destinatarios,
      data.asunto,
      data.enviado_por || "system",
      JSON.stringify(data.metadata || {}),
      data.message_id || null,
    ]
  );

  return result.rows[0];
}

/**
 * Crea un registro de tracking individual por cada destinatario
 * Retorna un Map de email -> tracking para poder generar links únicos
 */
export async function createEmailTrackingPerRecipient(
  data: Omit<EmailTrackingCreate, 'destinatarios'> & { destinatarios: string[] }
): Promise<Map<string, EmailTracking>> {
  const trackingMap = new Map<string, EmailTracking>();

  for (const email of data.destinatarios) {
    const token = generateTrackingToken();

    const result = await query(
      `INSERT INTO email_tracking (
        tracking_token, tipo_email, factura_id, presupuesto_id, cliente_id,
        destinatarios, asunto, enviado_por, metadata, message_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        token,
        data.tipo_email,
        data.factura_id || null,
        data.presupuesto_id || null,
        data.cliente_id || null,
        [email], // Solo este destinatario
        data.asunto,
        data.enviado_por || "system",
        JSON.stringify({ ...data.metadata, destinatario_individual: email }),
        data.message_id || null,
      ]
    );

    trackingMap.set(email, result.rows[0]);
  }

  return trackingMap;
}

/**
 * Actualiza el message_id después de enviar el email
 */
export async function updateEmailTrackingMessageId(
  trackingToken: string,
  messageId: string
): Promise<void> {
  await query(
    `UPDATE email_tracking SET message_id = $1, updated_at = NOW() WHERE tracking_token = $2`,
    [messageId, trackingToken]
  );
}

/**
 * Registra un click en un link trackeado
 */
export async function recordEmailClick(
  trackingToken: string,
  tipoLink: string,
  urlDestino: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ success: boolean; tracking?: EmailTracking }> {
  // Buscar registro de tracking
  const trackingResult = await query(
    `SELECT * FROM email_tracking WHERE tracking_token = $1`,
    [trackingToken]
  );

  if (trackingResult.rows.length === 0) {
    return { success: false };
  }

  const tracking = trackingResult.rows[0] as EmailTracking;

  // Insertar registro de click
  await query(
    `INSERT INTO email_tracking_clicks (email_tracking_id, tipo_link, url_destino, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [tracking.id, tipoLink, urlDestino, userAgent || "", ipAddress || ""]
  );

  // Actualizar estado a 'click' si es el primer click
  if (tracking.estado === "enviado") {
    await query(
      `UPDATE email_tracking SET estado = 'click', updated_at = NOW() WHERE id = $1`,
      [tracking.id]
    );
  }

  return { success: true, tracking };
}

/**
 * Marca un email como error (bounce, fallo de envío, etc.)
 */
export async function markEmailAsError(
  trackingToken: string,
  errorDetails?: Record<string, any>
): Promise<void> {
  await query(
    `UPDATE email_tracking
     SET estado = 'error',
         metadata = metadata || $1,
         updated_at = NOW()
     WHERE tracking_token = $2`,
    [JSON.stringify({ error: errorDetails || {} }), trackingToken]
  );
}

// =====================================================
// Query Operations
// =====================================================

/**
 * Obtiene el historial de tracking para una factura
 */
export async function getFacturaEmailTracking(
  facturaId: string
): Promise<EmailTracking[]> {
  const result = await query(
    `SELECT et.*,
      COALESCE(
        (SELECT COUNT(*) FROM email_tracking_clicks WHERE email_tracking_id = et.id),
        0
      )::int as clicks_count,
      (SELECT MAX(clicked_at) FROM email_tracking_clicks WHERE email_tracking_id = et.id) as ultimo_click
     FROM email_tracking et
     WHERE et.factura_id = $1
     ORDER BY et.enviado_at DESC`,
    [facturaId]
  );
  return result.rows;
}

/**
 * Obtiene el historial de tracking para un cliente
 */
export async function getClienteEmailTracking(
  clienteId: string
): Promise<EmailTracking[]> {
  const result = await query(
    `SELECT et.*,
      COALESCE(
        (SELECT COUNT(*) FROM email_tracking_clicks WHERE email_tracking_id = et.id),
        0
      )::int as clicks_count,
      (SELECT MAX(clicked_at) FROM email_tracking_clicks WHERE email_tracking_id = et.id) as ultimo_click
     FROM email_tracking et
     WHERE et.cliente_id = $1
     ORDER BY et.enviado_at DESC`,
    [clienteId]
  );
  return result.rows;
}

/**
 * Obtiene el historial de tracking para un presupuesto
 */
export async function getPresupuestoEmailTracking(
  presupuestoId: string
): Promise<EmailTracking[]> {
  const result = await query(
    `SELECT et.*,
      COALESCE(
        (SELECT COUNT(*) FROM email_tracking_clicks WHERE email_tracking_id = et.id),
        0
      )::int as clicks_count,
      (SELECT MAX(clicked_at) FROM email_tracking_clicks WHERE email_tracking_id = et.id) as ultimo_click
     FROM email_tracking et
     WHERE et.presupuesto_id = $1
     ORDER BY et.enviado_at DESC`,
    [presupuestoId]
  );
  return result.rows;
}

/**
 * Obtiene un tracking específico por token con sus clicks
 */
export async function getTrackingByToken(
  token: string
): Promise<EmailTracking | null> {
  const result = await query(
    `SELECT et.*,
      COALESCE(
        (SELECT COUNT(*) FROM email_tracking_clicks WHERE email_tracking_id = et.id),
        0
      )::int as clicks_count,
      (SELECT MAX(clicked_at) FROM email_tracking_clicks WHERE email_tracking_id = et.id) as ultimo_click,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', etc.id,
          'tipo_link', etc.tipo_link,
          'clicked_at', etc.clicked_at,
          'url_destino', etc.url_destino
        ) ORDER BY etc.clicked_at DESC) FROM email_tracking_clicks etc WHERE etc.email_tracking_id = et.id),
        '[]'::json
      ) as clicks
     FROM email_tracking et
     WHERE et.tracking_token = $1`,
    [token]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

// =====================================================
// URL Building
// =====================================================

/**
 * Construye una URL trackeada que redirige después de registrar el click
 */
export function buildTrackedUrl(
  trackingToken: string,
  tipoLink: string,
  destinationUrl: string,
  baseUrl?: string
): string {
  const appUrl =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({
    t: trackingToken,
    l: tipoLink,
    url: destinationUrl,
  });
  return `${appUrl}/api/email-track?${params.toString()}`;
}

/**
 * Genera HTML para un botón trackeado (CTA principal)
 */
export function getTrackedButtonHtml(
  text: string,
  trackingToken: string,
  tipoLink: string,
  destinationUrl: string,
  options?: {
    baseUrl?: string;
    backgroundColor?: string;
    textColor?: string;
  }
): string {
  const trackedUrl = buildTrackedUrl(
    trackingToken,
    tipoLink,
    destinationUrl,
    options?.baseUrl
  );
  const bgColor = options?.backgroundColor || "#8b5cf6"; // Violet-500
  const txtColor = options?.textColor || "#ffffff";

  return `
    <a href="${trackedUrl}"
       style="display: inline-block;
              background-color: ${bgColor};
              color: ${txtColor};
              text-decoration: none;
              padding: 14px 40px;
              border-radius: 6px;
              font-size: 15px;
              font-weight: 600;
              box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);">
      ${text}
    </a>
  `;
}

/**
 * Genera HTML para un link de texto trackeado
 */
export function getTrackedLinkHtml(
  text: string,
  trackingToken: string,
  tipoLink: string,
  destinationUrl: string,
  options?: {
    baseUrl?: string;
    color?: string;
  }
): string {
  const trackedUrl = buildTrackedUrl(
    trackingToken,
    tipoLink,
    destinationUrl,
    options?.baseUrl
  );
  const color = options?.color || "#8b5cf6";

  return `<a href="${trackedUrl}" style="color: ${color}; text-decoration: none;">${text}</a>`;
}
