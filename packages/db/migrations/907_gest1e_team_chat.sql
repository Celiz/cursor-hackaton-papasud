-- Gest1e como miembro virtual del team chat.
-- Agrega tipos de mensaje (text/status/proposal/action_result), expiración para
-- estados efímeros, y crea el usuario virtual Gest1e en users (UUID fijo).

ALTER TABLE mensajes_internos
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE mensajes_internos
  DROP CONSTRAINT IF EXISTS mensajes_internos_kind_check;

ALTER TABLE mensajes_internos
  ADD CONSTRAINT mensajes_internos_kind_check
  CHECK (kind IN ('text', 'status', 'proposal', 'action_result'));

CREATE INDEX IF NOT EXISTS idx_mensajes_internos_kind ON mensajes_internos(kind);
CREATE INDEX IF NOT EXISTS idx_mensajes_internos_expires ON mensajes_internos(expires_at)
  WHERE expires_at IS NOT NULL;

-- Usuario virtual Gest1e. UUID fijo para que el código pueda referenciarlo
-- como constante. encrypted_password queda en un placeholder no-login.
INSERT INTO users (id, email, encrypted_password, nombre_completo, cargo, metadata)
VALUES (
  '9e571eb0-7000-4000-8000-000000000001',
  'gest1e@aeterna.local',
  '!virtual-no-login',
  'Gest1e',
  'Asistente IA',
  '{"virtual": true, "kind": "ai_agent"}'::jsonb
)
ON CONFLICT (id) DO UPDATE
  SET nombre_completo = EXCLUDED.nombre_completo,
      cargo = EXCLUDED.cargo,
      metadata = EXCLUDED.metadata;
