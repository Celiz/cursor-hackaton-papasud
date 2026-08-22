-- Migration 996 — Portal de cliente: auth y auditoría.
--
-- Crea la infra mínima para el portal de cliente de Uno:
--   - portal_sesiones: magic link + cookie de sesión (7d).
--   - portal_eventos:  auditoría de accesos y acciones.
--
-- Las tablas de funcionalidad (solicitudes_cotizacion, pedidos_recurrentes)
-- viven en migraciones posteriores, cuando se implemente cada fase.

BEGIN;

-- =================================================================
-- portal_sesiones
-- =================================================================
-- Una fila por intento de login. El token de magic link vive en `token`
-- (de un solo uso, expira en 30 min). Una vez consumido (`consumido_at`
-- set), la fila representa una sesión activa cuyo identificador se
-- guarda en la cookie `portal_session=<id>`. `expires_at` controla la
-- vida total de la sesión (7 días por defecto).
CREATE TABLE IF NOT EXISTS portal_sesiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id      UUID REFERENCES clientes(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES personas(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  token           TEXT UNIQUE NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumido_at    TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ,
  user_agent      TEXT,
  ip              TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_sesiones_token
  ON portal_sesiones(token);

CREATE INDEX IF NOT EXISTS idx_portal_sesiones_cliente
  ON portal_sesiones(cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_sesiones_email
  ON portal_sesiones(LOWER(email));

-- Para limpieza periódica de sesiones expiradas.
CREATE INDEX IF NOT EXISTS idx_portal_sesiones_expires
  ON portal_sesiones(expires_at);

-- =================================================================
-- portal_eventos
-- =================================================================
-- Auditoría liviana: cada acción del cliente en el portal deja una fila.
-- Sirve para analytics ("qué se usa más"), debugging y seguridad.
CREATE TABLE IF NOT EXISTS portal_eventos (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID NOT NULL,
  cliente_id  UUID,
  sesion_id   UUID REFERENCES portal_sesiones(id) ON DELETE SET NULL,
  evento      TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_eventos_cliente_fecha
  ON portal_eventos(cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_eventos_evento
  ON portal_eventos(evento);

COMMIT;
