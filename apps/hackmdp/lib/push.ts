import webpush from "web-push";
import { query } from "@/lib/db";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ||
  "BPkokEnSwadueslcbrupKT6NbDZsf_1kdzJDuximi_uV_RTn9V9RUYAk8I2euN_-ZULpkfrZ23j0Ozma3aX0qQM";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ||
  "A1t7cmI5xB03E3tFDIgBLJWp91lyA-P42NkE5cM5_8Y";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@aeterna.ar";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

export const PUBLIC_VAPID_KEY = VAPID_PUBLIC;

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  data?: Record<string, any>;
}

/**
 * Send a push notification to a specific persona.
 * Silently removes broken subscriptions.
 */
export async function sendPushToPersona(
  personaId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subs = await query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE persona_id = $1`,
    [personaId]
  );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.rows.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        await query(
          `UPDATE push_subscriptions SET last_used_at = NOW(), failed_attempts = 0 WHERE id = $1`,
          [sub.id]
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = subscription expired, delete it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
        } else {
          await query(
            `UPDATE push_subscriptions SET failed_attempts = failed_attempts + 1 WHERE id = $1`,
            [sub.id]
          );
        }
      }
    })
  );

  return { sent, failed };
}

/**
 * Send to all members of an org (e.g. for broadcast alerts)
 */
export async function sendPushToOrg(
  orgId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subs = await query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE org_id = $1`,
    [orgId]
  );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.rows.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
        }
      }
    })
  );

  return { sent, failed };
}
