-- Eventos / agenda pública manejada desde Nérea, consumida por la web pública del estudio.
CREATE TABLE IF NOT EXISTS nea_eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo        varchar(200) NOT NULL,
  descripcion   text,
  tipo          varchar(40),
  imagen_url    text,
  fecha_inicio  timestamptz NOT NULL,
  fecha_fin     timestamptz,
  ubicacion     varchar(200),
  profesional   varchar(200),
  cupo          integer,
  precio        numeric(12,2),
  link_inscripcion text,
  publicado     boolean NOT NULL DEFAULT true,
  destacado     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_eventos_org_fecha
  ON nea_eventos (org_id, publicado, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_nea_eventos_destacados
  ON nea_eventos (org_id, destacado, fecha_inicio) WHERE destacado = true;
