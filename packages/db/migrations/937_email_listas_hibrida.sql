-- ============================================================================
-- Migration 937: Listas híbridas (email marketing)
-- Agrega soporte para listas dinámicas e híbridas sincronizadas por criterios
-- sobre personas (tags, tipo_persona, cliente vinculado, email válido, activo).
-- ============================================================================

-- 1. email_listas.tipo ahora soporta 'manual' | 'dinamica' | 'hibrida'.
--    Normalizamos valor legacy 'automatica' → 'dinamica' antes del CHECK.
UPDATE email_listas SET tipo = 'dinamica' WHERE tipo = 'automatica';

ALTER TABLE email_listas
  DROP CONSTRAINT IF EXISTS email_listas_tipo_check;
ALTER TABLE email_listas
  ADD CONSTRAINT email_listas_tipo_check
  CHECK (tipo IN ('manual', 'dinamica', 'hibrida'));

-- 2. email_contactos.origen: distingue miembros manuales vs auto-generados.
--    'manual'          → agregado a mano (listas manual e híbrida)
--    'auto'            → resuelto por criterios (dinamica e híbrida)
--    'excluido_manual' → cumple criterios pero fue excluido a mano (híbrida)
--    'incluido_manual' → NO cumple criterios pero fue agregado a mano (híbrida)
ALTER TABLE email_contactos
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'manual'
    CHECK (origen IN ('manual', 'auto', 'excluido_manual', 'incluido_manual'));

CREATE INDEX IF NOT EXISTS idx_email_contactos_lista_origen
  ON email_contactos(lista_id, origen);

-- 3. email_listas: timestamps de sync para saber cuándo se regeneró.
ALTER TABLE email_listas
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_stale BOOLEAN NOT NULL DEFAULT false;

-- 4. email_bounces.resuelto: permite rehabilitar manualmente (falso positivo).
ALTER TABLE email_bounces
  ADD COLUMN IF NOT EXISTS resuelto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resuelto_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resuelto_por UUID REFERENCES personas(id);

CREATE INDEX IF NOT EXISTS idx_email_bounces_org_email_type_activo
  ON email_bounces(org_id, email, bounce_type)
  WHERE resuelto = false;

-- 5. Vista materializada sería overkill; en cambio, una función helper para
--    chequear si un email está quemado per-org.
CREATE OR REPLACE FUNCTION email_is_burned(p_org_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_hard_count INT;
  v_soft_count INT;
BEGIN
  -- Hard bounce no resuelto = quemado
  SELECT COUNT(*) INTO v_hard_count
  FROM email_bounces
  WHERE org_id = p_org_id
    AND LOWER(email) = LOWER(p_email)
    AND bounce_type = 'hard'
    AND resuelto = false;

  IF v_hard_count > 0 THEN RETURN true; END IF;

  -- 3 soft bounces en los últimos 30 días = quemado
  SELECT COUNT(*) INTO v_soft_count
  FROM email_bounces
  WHERE org_id = p_org_id
    AND LOWER(email) = LOWER(p_email)
    AND bounce_type = 'soft'
    AND resuelto = false
    AND created_at >= NOW() - INTERVAL '30 days';

  RETURN v_soft_count >= 3;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Backfill: filas existentes son manuales por default (ya lo son por
--    el DEFAULT, pero dejamos el UPDATE explícito por claridad).
UPDATE email_contactos SET origen = 'manual' WHERE origen IS NULL;

COMMENT ON COLUMN email_listas.tipo IS
  'manual | dinamica | hibrida. Dinamica e hibrida resuelven miembros via criterios JSONB.';

COMMENT ON COLUMN email_listas.criterios IS
  'Estructura: { tags_any: uuid[], tags_all: uuid[], tipo_persona: text[], cliente_ids: uuid[], email_valido: bool, estado_activo: bool }';

COMMENT ON COLUMN email_contactos.origen IS
  'manual | auto | excluido_manual | incluido_manual. Controla comportamiento en resync.';

COMMENT ON FUNCTION email_is_burned(UUID, TEXT) IS
  'Devuelve true si el email tiene hard bounce o 3+ soft bounces en 30 días (per-org).';
