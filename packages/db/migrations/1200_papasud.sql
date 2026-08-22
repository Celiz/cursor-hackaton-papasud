-- 1200_papasud.sql
-- Modelo de dominio de Papasud: producción de semilla de papa.
--
-- Nota de vocabulario: en agro "lote" es la parcela de campo, pero el schema
-- heredado ya usa `lotes`/`productos_lotes` para lotes de STOCK. Para no
-- mezclarlos, la parcela de campo se llama `pap_parcelas` aunque la UI muestre
-- "Lote 8". El stock de semilla reusa el módulo de inventario que ya existe
-- (depositos / stock_depositos / productos_lotes / conteos_ciclicos).

-- ───────────────────────────────────────────────────────────────────────────
-- Catálogos
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pap_variedades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  nombre        varchar(100) NOT NULL,
  ciclo         varchar(50),           -- temprano / semitardio / tardio
  destino       varchar(50),           -- consumo / industria / baston / chips
  color_piel    varchar(50),
  notas         text,
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (org_id, nombre)
);

CREATE TABLE IF NOT EXISTS pap_establecimientos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  nombre        varchar(150) NOT NULL,
  localidad     varchar(100),
  provincia     varchar(100) DEFAULT 'Buenos Aires',
  latitud       numeric(10,8),
  longitud      numeric(11,8),
  superficie_ha numeric(10,2),
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (org_id, nombre)
);

-- Parcelas de campo. Lo que en la operación se llama "el lote 8".
CREATE TABLE IF NOT EXISTS pap_parcelas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  establecimiento_id  uuid REFERENCES pap_establecimientos(id) ON DELETE SET NULL,
  codigo              varchar(50) NOT NULL,   -- "Lote 8"
  nombre              varchar(150),
  superficie_ha       numeric(10,2) NOT NULL,
  latitud             numeric(10,8),
  longitud            numeric(11,8),
  poligono            jsonb,                  -- GeoJSON opcional
  tipo_suelo          varchar(100),
  estado              varchar(50) DEFAULT 'disponible',  -- disponible / sembrado / en_cosecha / descanso
  tiene_riego         boolean DEFAULT false,
  activo              boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (org_id, codigo)
);

CREATE TABLE IF NOT EXISTS pap_campanas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  anio          integer NOT NULL,       -- año de cosecha
  nombre        varchar(100),           -- "2025/26"
  fecha_inicio  date,
  fecha_fin     date,
  superficie_ha numeric(12,2),
  produccion_tn numeric(12,2),
  -- clima agregado del ciclo, para el modelo predictivo
  lluvia_mm     numeric(8,1),
  temp_media_c  numeric(5,2),
  dias_heladas  integer,
  notas         text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (org_id, anio)
);

-- Diccionario de insumos con dosis. Es el contexto que se le pasa al LLM
-- para que no invente productos ni dosis al interpretar el dictado.
CREATE TABLE IF NOT EXISTS pap_insumos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  nombre            varchar(150) NOT NULL,
  tipo              varchar(50),          -- fertilizante / fungicida / insecticida / herbicida / antibrotante
  principio_activo  varchar(200),
  unidad            varchar(20),          -- l/ha, kg/ha
  dosis_min         numeric(10,3),
  dosis_max         numeric(10,3),
  alias             text[] DEFAULT '{}',  -- como lo nombra el ingeniero en el campo
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (org_id, nombre)
);

CREATE TABLE IF NOT EXISTS pap_tareas_tipo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  codigo            varchar(50) NOT NULL,
  nombre            varchar(150) NOT NULL,
  requiere_insumos  boolean DEFAULT false,
  orden             integer DEFAULT 0,
  alias             text[] DEFAULT '{}',
  UNIQUE (org_id, codigo)
);

-- ───────────────────────────────────────────────────────────────────────────
-- Histórico productivo — la planilla de 20 años, normalizada
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pap_rendimientos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL,
  campana_id         uuid REFERENCES pap_campanas(id) ON DELETE CASCADE,
  parcela_id         uuid REFERENCES pap_parcelas(id) ON DELETE SET NULL,
  variedad_id        uuid REFERENCES pap_variedades(id) ON DELETE SET NULL,
  superficie_ha      numeric(10,2),
  produccion_tn      numeric(12,2),
  rendimiento_tn_ha  numeric(8,2),
  categoria_semilla  varchar(50),      -- Prebasica / Basica / Registrada / Certificada / Fiscalizada
  fecha_siembra      date,
  fecha_cosecha      date,
  -- clima del ciclo en esa parcela
  lluvia_mm          numeric(8,1),
  temp_media_c       numeric(5,2),
  dias_heladas       integer,
  -- calidad
  calibre_medio_mm   numeric(6,2),
  descarte_pct       numeric(5,2),
  observaciones      text,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pap_rend_org      ON pap_rendimientos(org_id);
CREATE INDEX IF NOT EXISTS idx_pap_rend_campana  ON pap_rendimientos(campana_id);
CREATE INDEX IF NOT EXISTS idx_pap_rend_parcela  ON pap_rendimientos(parcela_id);
CREATE INDEX IF NOT EXISTS idx_pap_rend_variedad ON pap_rendimientos(variedad_id);

-- ───────────────────────────────────────────────────────────────────────────
-- Órdenes de trabajo
-- ───────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS pap_ot_numero_seq;

CREATE TABLE IF NOT EXISTS pap_ordenes_trabajo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  numero              integer NOT NULL DEFAULT nextval('pap_ot_numero_seq'),
  parcela_id          uuid REFERENCES pap_parcelas(id) ON DELETE SET NULL,
  campana_id          uuid REFERENCES pap_campanas(id) ON DELETE SET NULL,
  tarea               varchar(150) NOT NULL,
  tarea_tipo_id       uuid REFERENCES pap_tareas_tipo(id) ON DELETE SET NULL,
  descripcion         text,
  fecha               date NOT NULL DEFAULT CURRENT_DATE,
  responsable_id      uuid,
  responsable_nombre  varchar(150),
  maquinaria          varchar(150),
  horas               numeric(6,2),
  superficie_ha       numeric(10,2),
  estado              varchar(50) DEFAULT 'registrada',  -- registrada / en_curso / completada / anulada
  -- trazabilidad del origen: es lo que hace demostrable el dictado por voz
  origen              varchar(20) DEFAULT 'manual',      -- manual / voz / texto
  origen_texto        text,                              -- lo que dijo el ingeniero, literal
  extraccion          jsonb,                             -- salida del LLM + confianza por campo
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pap_ot_org     ON pap_ordenes_trabajo(org_id);
CREATE INDEX IF NOT EXISTS idx_pap_ot_parcela ON pap_ordenes_trabajo(parcela_id);
CREATE INDEX IF NOT EXISTS idx_pap_ot_fecha   ON pap_ordenes_trabajo(fecha DESC);

CREATE TABLE IF NOT EXISTS pap_ot_insumos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id       uuid NOT NULL REFERENCES pap_ordenes_trabajo(id) ON DELETE CASCADE,
  insumo_id      uuid REFERENCES pap_insumos(id) ON DELETE SET NULL,
  insumo_nombre  varchar(150),     -- se guarda el nombre aunque no matchee el diccionario
  cantidad       numeric(12,3),
  unidad         varchar(20),
  dosis_ha       numeric(10,3),
  fuera_de_rango boolean DEFAULT false,  -- la dosis cae fuera de lo recomendado
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pap_ot_insumos_orden ON pap_ot_insumos(orden_id);

CREATE TABLE IF NOT EXISTS pap_ot_fotos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  orden_id     uuid REFERENCES pap_ordenes_trabajo(id) ON DELETE CASCADE,
  parcela_id   uuid REFERENCES pap_parcelas(id) ON DELETE SET NULL,
  url          text NOT NULL,
  thumb_url    text,
  latitud      numeric(10,8),
  longitud     numeric(11,8),
  tomada_at    timestamptz,
  analisis_ia  text,             -- nota agronómica generada a partir de la imagen
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pap_ot_fotos_orden ON pap_ot_fotos(orden_id);

-- ───────────────────────────────────────────────────────────────────────────
-- Vista para el copiloto: una sola tabla ancha, legible, sin joins.
-- El text-to-SQL acierta mucho más contra esto que contra el modelo normalizado.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vista_pap_historico AS
SELECT
  r.id,
  r.org_id,
  c.anio                      AS campana_anio,
  c.nombre                    AS campana,
  p.codigo                    AS lote,
  p.nombre                    AS lote_nombre,
  e.nombre                    AS establecimiento,
  e.localidad,
  v.nombre                    AS variedad,
  v.ciclo                     AS variedad_ciclo,
  v.destino                   AS variedad_destino,
  r.categoria_semilla,
  r.superficie_ha,
  r.produccion_tn,
  r.rendimiento_tn_ha,
  r.fecha_siembra,
  r.fecha_cosecha,
  r.lluvia_mm,
  r.temp_media_c,
  r.dias_heladas,
  r.calibre_medio_mm,
  r.descarte_pct,
  r.observaciones
FROM pap_rendimientos r
LEFT JOIN pap_campanas       c ON c.id = r.campana_id
LEFT JOIN pap_parcelas       p ON p.id = r.parcela_id
LEFT JOIN pap_establecimientos e ON e.id = p.establecimiento_id
LEFT JOIN pap_variedades     v ON v.id = r.variedad_id;

-- El CHECK de organizations.tipo viene del inquilino anterior y no contempla agro.
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_tipo_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_tipo_check
  CHECK (tipo = ANY (ARRAY['electromedicina','veterinaria','growshop','petshop',
                           'hemocentro','inanna','estudio','other','medspa','agro']));
