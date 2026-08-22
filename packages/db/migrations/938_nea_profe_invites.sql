-- Invitaciones de un click para profesores: QR único que los loguea directo
CREATE TABLE IF NOT EXISTS nea_profe_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  persona_id  uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_profe_invites_persona
  ON nea_profe_invites (org_id, persona_id);
