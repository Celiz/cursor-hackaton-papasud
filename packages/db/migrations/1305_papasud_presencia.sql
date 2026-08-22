-- 1305_papasud_presencia.sql
--
-- Dónde está cada teléfono, en vivo.
--
-- Cada dispositivo manda su posición cada pocos segundos y la pantalla los
-- muestra moverse sobre el plano del pivote. Es una tabla de ESTADO, no un
-- historial: una fila por dispositivo, que se pisa. El rastro completo, si
-- alguna vez hace falta, va en otra tabla — acá lo que importa es el ahora, y
-- una fila por lectura llenaría la base sin que nadie la mire.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS pap_presencia (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  /** Identificador del teléfono, generado y guardado en el propio dispositivo. */
  dispositivo  varchar(64) NOT NULL,
  nombre       varchar(80),
  latitud      numeric(10,7) NOT NULL,
  longitud     numeric(11,7) NOT NULL,
  precision_m  numeric(8,2),
  velocidad_ms numeric(8,2),
  rumbo        numeric(6,2),
  /** Ubicación derivada, para no recalcularla en cada consulta. */
  pivote       varchar(10),
  cuadrante    integer,
  tercio       integer,
  parcela_id   uuid REFERENCES pap_parcelas(id) ON DELETE SET NULL,
  visto_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, dispositivo)
);

CREATE INDEX IF NOT EXISTS idx_pap_presencia_org   ON pap_presencia(org_id);
CREATE INDEX IF NOT EXISTS idx_pap_presencia_visto ON pap_presencia(visto_at DESC);

-- Las fotos ya tienen lat/lng; falta saber quién y con qué las sacó, para
-- poder mostrarlas al lado del punto de esa persona.
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS dispositivo varchar(64);
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS tomada_por  varchar(80);
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS hallazgo    varchar(40);
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS confianza   numeric(4,3);
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS urgente     boolean DEFAULT false;
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS miniatura   text;

CREATE INDEX IF NOT EXISTS idx_pap_fotos_tomada ON pap_ot_fotos(tomada_at DESC);
