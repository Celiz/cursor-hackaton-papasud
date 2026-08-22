-- Invitaciones de un click para alumnos: QR único que los loguea directo al portal
CREATE TABLE IF NOT EXISTS nea_alumno_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  persona_id  uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_alumno_invites_persona
  ON nea_alumno_invites (org_id, persona_id);

-- Objetivo de bienestar del alumno. Se muestra en su portal y queda visible
-- para los profes en la ficha (fase 2). Sirve como contexto para que la IA
-- eventualmente haga seguimiento del progreso.
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS objetivo text;
