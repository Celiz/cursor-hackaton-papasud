import { query } from '@/lib/db';
import { sendPushToPersona, type PushNotificationPayload } from '@/lib/push';

export interface NotificacionInput {
  persona_id: string;
  org_id?: string;
  titulo: string;
  mensaje: string;
  tipo?: string; // 'info' | 'crm_actividad' | 'mantenimiento' | 'servicio' | ...
  /** URL relativa a donde debería ir al hacer click. Se guarda en metadata.url */
  url?: string;
  metadata?: Record<string, any>;
  /** Si es true, además del insert en BD envía push notification al device */
  sendPush?: boolean;
}

/**
 * Crea una notificación persistente en la tabla `notificaciones` para que
 * aparezca en el bell dropdown del usuario. Si `sendPush=true` además
 * dispara una push notification al service worker del navegador.
 *
 * El create del registro en BD es best-effort: un fallo no debe bloquear
 * el endpoint que la llama. Por eso catchea internamente.
 */
export async function createNotificacion(
  input: NotificacionInput
): Promise<string | null> {
  try {
    const metadata = {
      ...(input.metadata || {}),
      ...(input.url ? { url: input.url } : {}),
    };

    const result = await query(
      `INSERT INTO notificaciones (persona_id, org_id, titulo, mensaje, tipo, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        input.persona_id,
        input.org_id || null,
        input.titulo,
        input.mensaje,
        input.tipo || 'info',
        JSON.stringify(metadata),
      ]
    );

    const id = result.rows[0]?.id || null;

    if (input.sendPush) {
      const pushPayload: PushNotificationPayload = {
        title: input.titulo,
        body: input.mensaje,
        tag: id ? `notif-${id}` : undefined,
        url: input.url,
        data: {
          notif_id: id,
          type: input.tipo || 'info',
          ...(input.metadata || {}),
        },
      };
      // Best-effort: fallo de push no invalida la notificación persistida
      sendPushToPersona(input.persona_id, pushPayload).catch((err) => {
        console.error('sendPushToPersona failed (non-fatal):', err);
      });
    }

    return id;
  } catch (err) {
    console.error('createNotificacion failed:', err);
    return null;
  }
}
