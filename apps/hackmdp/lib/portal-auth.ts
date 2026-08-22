/**
 * Auth del portal de cliente (separado del JWT del backoffice).
 *
 * Flow:
 *   1. Cliente entra a /portal/acceso y pide acceso con su email.
 *   2. Backend crea fila en portal_sesiones con token random + expira en 30 min.
 *   3. Mail con magic link /portal/auth/login?t=<token>.
 *   4. Click consume el token (un solo uso) y setea cookie portal_session=<sesion_id>
 *      (HTTPOnly, SameSite=Lax). La sesión vive 7 días.
 *   5. getPortalSession() lee la cookie y devuelve el contexto del cliente.
 *
 * Hardcoded a Uno mientras es single-tenant; cuando saltemos a multi-tenant,
 * org_id se resuelve por subdominio.
 */

import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";

const PORTAL_COOKIE = "portal_session";
const MAGIC_LINK_TTL_MIN = 30;
const SESSION_TTL_DAYS = 7;

// Mientras es single-tenant, el portal sirve solo a Uno Electromedicina.
export const PORTAL_ORG_ID = "48b2a35a-0cb8-4643-a1d6-045918f9704c";

export interface PortalSession {
  sesion_id: string;
  org_id: string;
  cliente_id: string | null;
  persona_id: string | null;
  email: string;
  expires_at: Date;
}

/**
 * Lee la cookie del portal y devuelve la sesión si es válida y no expiró.
 * Returns null si no hay cookie, si está expirada o si no se consumió todavía.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const sesionId = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!sesionId) return null;

  const result = await query(
    `SELECT id, org_id, cliente_id, persona_id, email, expires_at
       FROM portal_sesiones
      WHERE id = $1
        AND consumido_at IS NOT NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [sesionId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  // Touch last_seen_at (best effort, no bloquea el request si falla)
  query(
    `UPDATE portal_sesiones SET last_seen_at = NOW() WHERE id = $1`,
    [sesionId]
  ).catch(() => {});

  return {
    sesion_id: row.id,
    org_id: row.org_id,
    cliente_id: row.cliente_id,
    persona_id: row.persona_id,
    email: row.email,
    expires_at: new Date(row.expires_at),
  };
}

/**
 * Crea un magic link para `email` si está vinculado a algún cliente o persona
 * del org. Devuelve { token, sesion_id, matches } donde:
 *   - token: lo que va en la URL del mail (?t=<token>)
 *   - sesion_id: ID de la fila portal_sesiones (uso interno)
 *   - matches: cuántos cliente_id distintos matchean ese email (para mostrar
 *     selector de cuenta si > 1 al loguear).
 *
 * Si el email no matchea con nada del org, igual creamos la fila (con
 * cliente_id=null) para no filtrar info — el cliente recibe el mail pero al
 * loguear ve "Tu email no está asociado a ningún cliente". Esto evita
 * enumeración de emails válidos.
 */
export async function crearMagicLink(
  email: string,
  meta: { user_agent?: string; ip?: string } = {}
): Promise<{ token: string; sesion_id: string; matches: number }> {
  const emailNorm = email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000);

  // clientes.email es TEXT[] (array real). personas.email es TEXT con
  // contenido mixto (string plano o literal de array PG "{a@b,c@d}"). Por
  // eso para clientes usamos unnest + LOWER, para personas un LIKE sobre
  // el texto entero.
  const matchRes = await query(
    `WITH clientes_match AS (
       SELECT id AS cliente_id, NULL::uuid AS persona_id
         FROM clientes
        WHERE org_id = $1
          AND activo = true
          AND email IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM unnest(email) e
            WHERE LOWER(e) = $2
          )
     ),
     personas_match AS (
       SELECT NULL::uuid AS cliente_id, id AS persona_id
         FROM personas
        WHERE email IS NOT NULL
          AND LOWER(email) LIKE '%' || $2 || '%'
     )
     SELECT * FROM clientes_match
     UNION ALL
     SELECT * FROM personas_match`,
    [PORTAL_ORG_ID, emailNorm]
  );

  // Si hay un único cliente_id resuelto, lo guardamos ya en la sesión.
  // Si hay varios o ninguno, dejamos cliente_id null y se resuelve al consumir.
  const clienteIds = [
    ...new Set(matchRes.rows.map((r: any) => r.cliente_id).filter(Boolean)),
  ];
  const personaIds = [
    ...new Set(matchRes.rows.map((r: any) => r.persona_id).filter(Boolean)),
  ];

  const result = await query(
    `INSERT INTO portal_sesiones
       (org_id, cliente_id, persona_id, email, token, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      PORTAL_ORG_ID,
      clienteIds.length === 1 ? clienteIds[0] : null,
      personaIds.length === 1 ? personaIds[0] : null,
      emailNorm,
      token,
      expiresAt,
      meta.user_agent || null,
      meta.ip || null,
    ]
  );

  return {
    token,
    sesion_id: result.rows[0].id,
    matches: clienteIds.length,
  };
}

/**
 * Consume un magic link. Marca consumido_at, extiende expires_at a 7 días y
 * devuelve el ID de sesión que va a la cookie. Lanza Error si el token no
 * existe, ya se consumió, o expiró.
 */
export async function consumirMagicLink(token: string): Promise<{
  sesion_id: string;
  matches: number;
  cliente_id: string | null;
}> {
  const sel = await query(
    `SELECT id, consumido_at, expires_at, email
       FROM portal_sesiones
      WHERE token = $1
      LIMIT 1`,
    [token]
  );
  if (sel.rows.length === 0) {
    throw new Error("Link inválido");
  }
  const row = sel.rows[0];
  if (row.consumido_at) throw new Error("Este link ya fue usado");
  if (new Date(row.expires_at) < new Date()) throw new Error("Link vencido");

  // Marcar consumido y extender expiración a la vida de la sesión (7 días)
  const nuevaExpiracion = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const upd = await query(
    `UPDATE portal_sesiones
        SET consumido_at = NOW(),
            expires_at = $2,
            last_seen_at = NOW()
      WHERE id = $1
      RETURNING id, cliente_id`,
    [row.id, nuevaExpiracion]
  );

  // Recalcular matches con el email guardado (por si cambiaron datos)
  const matchRes = await query(
    `SELECT DISTINCT id AS cliente_id
       FROM clientes
      WHERE org_id = $1
        AND activo = true
        AND email IS NOT NULL
        AND EXISTS (SELECT 1 FROM unnest(email) e WHERE LOWER(e) = LOWER($2))`,
    [PORTAL_ORG_ID, row.email]
  );

  return {
    sesion_id: upd.rows[0].id,
    matches: matchRes.rows.length,
    cliente_id: upd.rows[0].cliente_id,
  };
}

export async function logoutPortal(): Promise<void> {
  const cookieStore = await cookies();
  const sesionId = cookieStore.get(PORTAL_COOKIE)?.value;
  if (sesionId) {
    await query(
      `UPDATE portal_sesiones SET expires_at = NOW() WHERE id = $1`,
      [sesionId]
    );
  }
  cookieStore.delete(PORTAL_COOKIE);
}

export async function setPortalCookie(sesionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE, sesionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/**
 * Setea cliente_id de la sesión actual. Sirve para el selector de cuenta
 * cuando un email matchea con múltiples clientes.
 */
export async function setSesionCliente(
  sesion_id: string,
  cliente_id: string
): Promise<void> {
  await query(
    `UPDATE portal_sesiones SET cliente_id = $1 WHERE id = $2`,
    [cliente_id, sesion_id]
  );
}

/**
 * Log de evento del portal (auditoría liviana).
 */
export async function logPortalEvento(
  evento: string,
  ctx: {
    org_id: string;
    cliente_id?: string | null;
    sesion_id?: string | null;
    metadata?: any;
  }
): Promise<void> {
  await query(
    `INSERT INTO portal_eventos (org_id, cliente_id, sesion_id, evento, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      ctx.org_id,
      ctx.cliente_id || null,
      ctx.sesion_id || null,
      evento,
      ctx.metadata ? JSON.stringify(ctx.metadata) : null,
    ]
  ).catch((e) => console.error("portal_eventos log failed:", e));
}
