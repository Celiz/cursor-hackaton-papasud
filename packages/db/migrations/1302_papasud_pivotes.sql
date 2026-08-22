-- 1302_papasud_pivotes.sql
--
-- Los círculos de riego, con su centro y su radio. Es lo que hace falta para
-- ubicar por GPS en qué lote está parado el ingeniero: con el centro se calcula
-- la distancia (qué anillo) y el rumbo (qué cuadrante).
--
-- OJO: las coordenadas de acá son ESTIMADAS a partir del plano y de la
-- ubicación de Marisol. Papasud tiene las reales — el centro del pivote es
-- donde está la torre y el pozo, un dato que manejan. Cuando las pasen, se
-- actualiza esta tabla y la ubicación pasa de aproximada a exacta.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS pap_pivotes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL,
  establecimiento_id uuid REFERENCES pap_establecimientos(id) ON DELETE SET NULL,
  nombre         varchar(10) NOT NULL,      -- A, B, C
  latitud        numeric(10,8) NOT NULL,
  longitud       numeric(11,8) NOT NULL,
  radio_m        numeric(8,2) NOT NULL,
  cuadrante_base integer NOT NULL DEFAULT 1, -- 1 para el A, 5 para el B
  /** Las coordenadas todavía no están confirmadas por Papasud. */
  estimado       boolean DEFAULT true,
  notas          text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (org_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_pap_pivotes_org ON pap_pivotes(org_id);

DO $$
DECLARE
  v_org uuid;
  v_est uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN RAISE EXCEPTION 'Falta la organización papasud.'; END IF;
  SELECT id INTO v_est FROM pap_establecimientos WHERE org_id = v_org AND localidad = 'Marisol';

  DELETE FROM pap_pivotes WHERE org_id = v_org;

  -- Un pivote de 800 m de radio cubre unas 200 ha, que es el orden de magnitud
  -- del campo. Los centros están separados ~1,8 km, como se ve en el plano.
  INSERT INTO pap_pivotes (org_id, establecimiento_id, nombre, latitud, longitud,
                           radio_m, cuadrante_base, estimado, notas) VALUES
    (v_org, v_est, 'A', -38.35800000, -58.20500000, 800, 1, true,
     'Coordenadas estimadas del plano. Reemplazar por las de la torre.'),
    (v_org, v_est, 'B', -38.36900000, -58.19200000, 800, 5, true,
     'Coordenadas estimadas del plano. Reemplazar por las de la torre.');

  RAISE NOTICE 'Pivotes cargados (coordenadas estimadas).';
END $$;
