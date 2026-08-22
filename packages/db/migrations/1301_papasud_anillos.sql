-- 1301_papasud_anillos.sql
--
-- Corrige la geometría de los lotes en el pivote.
--
-- En el plano de Santa Ana cada lote es un ANILLO dentro de su cuadrante: una
-- franja entre dos radios. El cuadrante 7 del pivote B tiene nueve anillos, no
-- tres. El "tercio" que usa la orden de trabajo es una agrupación más gruesa —
-- el tercio interno, el medio y el externo del radio — y se deriva de dónde cae
-- el anillo, no se asigna a mano.
--
-- Sin esto, nueve lotes distintos quedaban pisados en el mismo tercio y el
-- dibujo del pivote no se podía construir.

\set ON_ERROR_STOP on

ALTER TABLE pap_parcelas ADD COLUMN IF NOT EXISTS anillo integer;

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN RAISE EXCEPTION 'Falta la organización papasud.'; END IF;

  -- Cada lote toma su lugar en la secuencia radial de su cuadrante. El orden
  -- va de adentro hacia afuera: en el plano, los lotes de más superficie son
  -- los anillos externos, porque a igual ancho radial abarcan más área.
  WITH ordenados AS (
    SELECT id,
           pivote,
           cuadrante,
           row_number() OVER (PARTITION BY pivote, cuadrante
                              ORDER BY superficie_ha ASC, codigo) AS n,
           count(*)      OVER (PARTITION BY pivote, cuadrante)     AS total
      FROM pap_parcelas
     WHERE org_id = v_org
  )
  UPDATE pap_parcelas p SET
    anillo       = o.n,
    -- Radio normalizado 0..1: el anillo n de un cuadrante con `total` anillos
    -- ocupa la franja [(n-1)/total, n/total].
    anillo_desde = round(((o.n - 1)::numeric / o.total) * 100, 2),
    anillo_hasta = round((o.n::numeric / o.total) * 100, 2),
    -- El tercio sale del punto medio de la franja.
    tercio       = LEAST(3, GREATEST(1,
                     ceil((((o.n - 0.5) / o.total) * 3)::numeric)::int))
  FROM ordenados o
  WHERE o.id = p.id;

  RAISE NOTICE 'Anillos y tercios recalculados.';
END $$;
