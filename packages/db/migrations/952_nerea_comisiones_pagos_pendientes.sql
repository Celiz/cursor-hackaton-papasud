-- Comisiones del centro por (profesor, disciplina). El complemento es lo que
-- cobra el profe. Si no hay fila para una disciplina específica, se asume 0%.
CREATE TABLE IF NOT EXISTS nea_profesional_comisiones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES nea_profesionales(id) ON DELETE CASCADE,
  disciplina_id  uuid NOT NULL REFERENCES nea_disciplinas(id) ON DELETE CASCADE,
  comision_pct   numeric(5,2) NOT NULL DEFAULT 0
                   CHECK (comision_pct >= 0 AND comision_pct <= 100),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profesional_id, disciplina_id)
);

CREATE INDEX IF NOT EXISTS idx_nea_prof_comisiones_org
  ON nea_profesional_comisiones (org_id, profesional_id);

-- Estado de un cobro. 'confirmado' = el admin lo dio por válido (default).
-- 'pendiente' = el alumno subió comprobante de transferencia desde el portal
-- y falta que el admin lo apruebe. 'rechazado' = admin rechazó el comprobante.
ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'confirmado'
    CHECK (estado IN ('pendiente','confirmado','rechazado'));

ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS comprobante_url text;

ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS confirmado_at  timestamptz;

ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS confirmado_por uuid REFERENCES personas(id);

CREATE INDEX IF NOT EXISTS idx_cobros_pendientes_org
  ON cobros (org_id, created_at DESC) WHERE estado = 'pendiente';
