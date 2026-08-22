-- 936_mood_campanas_leads.sql
-- Campañas QR para Mood MDP + captura de leads.
--
-- Objetivo: imprimir flyers con QR en distintos puntos de Mar del Plata.
-- Cada ubicación tiene su propio slug para trackear de dónde vienen los leads.
-- Todos los QR pueden compartir un mismo código de descuento (MOOD25), o tener uno propio.

-- ════════════════════════════════════════════════
-- 1. Campañas (una fila por flyer/ubicación)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mood_campanas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug            text NOT NULL,                  -- identifica ubicacion, va en la URL /c/<slug>
  codigo          text NOT NULL,                  -- codigo que menciona en whatsapp, puede repetirse entre campanas
  titulo          text NOT NULL,                  -- "Probá Mood gratis" / "Descuento bienvenida"
  ubicacion       text,                           -- "Bar Havanna Guemes" / "Cafe Boston"
  zona            text,                           -- "Centro" / "Guemes" / "Constitucion"
  descuento_tipo  text NOT NULL CHECK (descuento_tipo IN ('pct','monto','mes_gratis','clase_gratis','otro')),
  descuento_valor numeric(10,2),                  -- 25 (pct) / 5000 (monto). NULL si tipo='mes_gratis'
  descuento_texto text,                           -- "25% OFF primer mes" (lo que se muestra en landing/flyer)
  vigencia_desde  date,
  vigencia_hasta  date,
  cupo_max        int,                            -- NULL = sin tope
  usos_count      int NOT NULL DEFAULT 0,
  activa          boolean NOT NULL DEFAULT true,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_mood_campanas_org_activa ON mood_campanas(org_id, activa);
CREATE INDEX IF NOT EXISTS idx_mood_campanas_codigo ON mood_campanas(org_id, codigo);

-- ════════════════════════════════════════════════
-- 2. Leads capturados desde landing QR
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mood_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campana_id   uuid REFERENCES mood_campanas(id) ON DELETE SET NULL,
  persona_id   uuid REFERENCES personas(id) ON DELETE SET NULL,
  nombre       text NOT NULL,
  whatsapp     text,                              -- normalizado sin espacios ni guiones
  email        text,
  fuente       text NOT NULL DEFAULT 'qr' CHECK (fuente IN ('qr','directo','referido','instagram','otro')),
  user_agent   text,
  ip           inet,
  canjeado_at  timestamptz,                       -- se marca cuando efectivamente compra plan/clase con el codigo
  contactado_at timestamptz,                      -- cuando se le respondio por whatsapp
  nota         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mood_leads_org_created ON mood_leads(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_leads_campana ON mood_leads(campana_id);
CREATE INDEX IF NOT EXISTS idx_mood_leads_whatsapp ON mood_leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_mood_leads_sin_canjear ON mood_leads(org_id, canjeado_at) WHERE canjeado_at IS NULL;

-- ════════════════════════════════════════════════
-- 3. Seed inicial: 4 campañas piloto en Mar del Plata
--    Todas con mismo descuento y codigo MOOD25, distinto slug/ubicacion.
-- ════════════════════════════════════════════════
INSERT INTO mood_campanas (org_id, slug, codigo, titulo, ubicacion, zona, descuento_tipo, descuento_valor, descuento_texto, vigencia_desde, vigencia_hasta, notas)
SELECT o.id, v.slug, v.codigo, v.titulo, v.ubicacion, v.zona, v.dt, v.dv, v.dtxt, v.vd, v.vh, v.nota
FROM organizations o
CROSS JOIN (VALUES
  ('guemes',       'MOOD25', 'Probá Mood — 25% OFF primer mes', 'Güemes',         'Guemes',       'pct', 25::numeric, '25% OFF tu primer mes', DATE '2026-04-18', DATE '2026-07-31', 'Flyers en cafes/bares de Guemes'),
  ('constitucion', 'MOOD25', 'Probá Mood — 25% OFF primer mes', 'Constitución',   'Constitucion', 'pct', 25::numeric, '25% OFF tu primer mes', DATE '2026-04-18', DATE '2026-07-31', 'Flyers en comercios Constitucion'),
  ('centro',       'MOOD25', 'Probá Mood — 25% OFF primer mes', 'Centro',         'Centro',       'pct', 25::numeric, '25% OFF tu primer mes', DATE '2026-04-18', DATE '2026-07-31', 'Flyers centro / peatonal'),
  ('luro',         'MOOD25', 'Probá Mood — 25% OFF primer mes', 'Parque Luro',    'Parque Luro',  'pct', 25::numeric, '25% OFF tu primer mes', DATE '2026-04-18', DATE '2026-07-31', 'Barrio del estudio - puerta a puerta')
) AS v(slug, codigo, titulo, ubicacion, zona, dt, dv, dtxt, vd, vh, nota)
WHERE o.slug = 'mood'
  AND NOT EXISTS (
    SELECT 1 FROM mood_campanas c WHERE c.org_id = o.id AND c.slug = v.slug
  );
