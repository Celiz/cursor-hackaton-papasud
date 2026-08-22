-- Beneficios para alumnos: control desde Nerea, visibilidad para alumnos autenticados en Locus.
-- Partners: negocios aliados que ofrecen descuentos.
CREATE TABLE IF NOT EXISTS nea_partners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nombre       varchar(200) NOT NULL,
  rubro        varchar(80),
  logo_url     text,
  link         text,
  direccion    varchar(300),
  contacto     varchar(200),
  descripcion  text,
  activo       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_partners_org
  ON nea_partners (org_id, activo);

-- Beneficios: una promo/descuento ofrecido por un partner.
CREATE TABLE IF NOT EXISTS nea_beneficios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_id    uuid NOT NULL REFERENCES nea_partners(id) ON DELETE CASCADE,
  titulo        varchar(200) NOT NULL,
  descripcion   text,
  tipo          varchar(30) NOT NULL DEFAULT 'descuento', -- descuento | promo | regalo | otro
  descuento_pct numeric(5,2),
  codigo        varchar(80),
  condiciones   text,
  vigencia_desde date,
  vigencia_hasta date,
  publicado     boolean NOT NULL DEFAULT true,
  destacado     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_beneficios_org_pub
  ON nea_beneficios (org_id, publicado, vigencia_hasta);
CREATE INDEX IF NOT EXISTS idx_nea_beneficios_partner
  ON nea_beneficios (partner_id);
