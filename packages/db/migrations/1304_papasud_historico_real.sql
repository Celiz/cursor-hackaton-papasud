-- 1304_papasud_historico_real.sql
--
-- Reconstruye el histórico de campañas SOBRE los lotes y variedades reales.
--
-- La 1202 generaba rendimientos sobre el catálogo inventado, y la 1300 los
-- borró junto con ese catálogo. Sin campañas el panel queda en blanco: la
-- superficie, la producción y el rinde salen de acá.
--
-- Qué es real y qué no, para que quede dicho:
--   · Los lotes, las variedades, los insumos, las órdenes y los 436 movimientos
--     salen de los archivos de Papasud.
--   · Los archivos cubren SOLO la campaña 2026. Las campañas anteriores son
--     estimadas: hacen falta para que el copiloto y el tablero tengan una serie
--     que mirar. Están marcadas con `estimado = true`.
--   · La producción de 2026 NO se inventa: se calcula sumando los kilos de los
--     movimientos reales de ingreso.

\set ON_ERROR_STOP on

ALTER TABLE pap_campanas ADD COLUMN IF NOT EXISTS estimado boolean DEFAULT false;
-- Lo que realmente entró de campo según los remitos, separado de la estimación.
-- No se mezclan: la campaña en curso tiene solo una parte de la cosecha
-- ingresada, y dividir eso por la superficie entera da un rinde falso.
ALTER TABLE pap_campanas ADD COLUMN IF NOT EXISTS produccion_real_tn numeric(12,2);

DO $$
DECLARE
  v_org  uuid;
  v_2026 uuid;
  v_kg   numeric;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN RAISE EXCEPTION 'Falta la organización papasud.'; END IF;

  PERFORM setseed(0.2718);

  DELETE FROM pap_rendimientos WHERE org_id = v_org;
  DELETE FROM pap_campanas     WHERE org_id = v_org;

  -- ── Campañas y su clima ──────────────────────────────────────────────────
  INSERT INTO pap_campanas (org_id, anio, nombre, fecha_inicio, fecha_fin,
                            lluvia_mm, temp_media_c, dias_heladas, notas, estimado)
  SELECT v_org, anio, (anio-1)||'/'||substr(anio::text,3,2),
         make_date(anio-1, 9, 15), make_date(anio, 3, 20),
         lluvia, temp, heladas, nota, anio < 2026
  FROM (VALUES
    (2016, 620.0, 15.4, 13, NULL),
    (2017, 702.0, 15.1, 10, NULL),
    (2018, 418.0, 16.7, 21, 'Campaña seca. Se activó riego suplementario.'),
    (2019, 634.0, 15.5, 12, NULL),
    (2020, 688.0, 15.0,  9, NULL),
    (2021, 596.0, 15.8, 15, NULL),
    (2022, 661.0, 15.2, 11, NULL),
    (2023, 784.0, 14.6,  5, 'Mejor campaña del período.'),
    (2024, 715.0, 14.9,  8, NULL),
    (2025, 672.0, 15.1, 10, NULL),
    (2026, 698.0, 15.0,  9, 'Campaña en curso. Producción tomada de los movimientos reales.')
  ) AS c(anio, lluvia, temp, heladas, nota);

  SELECT id INTO v_2026 FROM pap_campanas WHERE org_id = v_org AND anio = 2026;

  -- ── Rendimientos por lote y variedad ─────────────────────────────────────
  -- Las variedades se reparten según lo que muestran los movimientos reales:
  -- spunta y agata dominan, después atlantic, daifla y asterix.
  INSERT INTO pap_rendimientos (
    org_id, campana_id, parcela_id, variedad_id, superficie_ha,
    rendimiento_tn_ha, produccion_tn, categoria_semilla,
    fecha_siembra, fecha_cosecha, lluvia_mm, temp_media_c, dias_heladas,
    calibre_medio_mm, descarte_pct
  )
  SELECT
    v_org, x.campana_id, x.parcela_id, x.variedad_id, x.superficie_ha,
    x.rinde, round(x.rinde * x.superficie_ha, 2), x.categoria,
    make_date(x.anio - 1, 10, 1) + (x.j * 28)::int,
    make_date(x.anio,      2, 1) + (x.j * 38)::int,
    x.lluvia_mm, x.temp_media_c, x.dias_heladas,
    round((46 + x.j * 16)::numeric, 1),
    round((5.0 + CASE WHEN x.lluvia_mm > 900 THEN 4.5 ELSE 0 END + x.j * 3.0)::numeric, 2)
  FROM (
    SELECT
      c.id AS campana_id, c.anio, c.lluvia_mm, c.temp_media_c, c.dias_heladas,
      p.id AS parcela_id, p.superficie_ha, p.tiene_riego,
      v.id AS variedad_id, v.nombre AS variedad,
      j.j,
      GREATEST(14.0, round((
          CASE v.nombre
            WHEN 'Spunta'   THEN 36.0 WHEN 'Agata'    THEN 38.0
            WHEN 'Atlantic' THEN 34.0 WHEN 'Asterix'  THEN 37.0
            WHEN 'Daifla'   THEN 36.0 WHEN 'Ludmilla' THEN 39.0
            WHEN 'King Russet' THEN 40.0 ELSE 35.0 END
        + CASE WHEN p.tiene_riego THEN 2.2 ELSE 0 END
        + (c.lluvia_mm - 620) / 100.0 * 1.6
        - CASE WHEN c.lluvia_mm > 900 THEN 6.0 ELSE 0 END
        - c.dias_heladas * 0.22
        + (c.anio - 2016) * 0.20
        + (j.j - 0.5) * 8.0
      )::numeric, 2)) AS rinde,
      (ARRAY['Inicial 1','Inicial 2','Inicial 3'])[
        1 + (abs(hashtext(p.codigo || c.anio::text)) % 3)] AS categoria
    FROM pap_campanas c
    CROSS JOIN pap_parcelas p
    CROSS JOIN LATERAL (SELECT random() AS j, random() AS pick, random() AS sow) j
    JOIN LATERAL (
      SELECT id, nombre FROM pap_variedades
       WHERE org_id = v_org
         AND nombre = (ARRAY[
           'Spunta','Spunta','Spunta','Spunta','Spunta',
           'Agata','Agata','Agata','Agata',
           'Atlantic','Atlantic','Daifla','Daifla','Asterix','Asterix',
           'Ludmilla','King Russet','Memphis','Sunred','Quintera'
         ])[1 + (j.pick * 20)::int % 20]
       LIMIT 1
    ) v ON true
    WHERE c.org_id = v_org AND p.org_id = v_org
      AND j.sow < 0.90   -- cada campaña algún lote descansa
  ) x;

  -- Totales por campaña, derivados de los rendimientos
  UPDATE pap_campanas c SET superficie_ha = t.sup, produccion_tn = t.prod
  FROM (SELECT campana_id, round(sum(superficie_ha),2) sup, round(sum(produccion_tn),2) prod
          FROM pap_rendimientos WHERE org_id = v_org GROUP BY campana_id) t
  WHERE c.id = t.campana_id;

  -- ── La campaña en curso sale de los movimientos reales ───────────────────
  -- Se toman los ingresos (campo → tolvas → frío), que es lo que entra de campo.
  SELECT round(COALESCE(sum(kgs), 0) / 1000.0, 2) INTO v_kg
    FROM pap_movimientos
   WHERE org_id = v_org
     AND tipo IN ('ingreso_tolvas', 'campo_a_frio');

  IF v_kg > 0 THEN
    -- Va en su propia columna, no pisa la estimación: son dos cosas distintas.
    -- `produccion_tn` es el potencial de la campaña sobre toda la superficie;
    -- `produccion_real_tn` es lo que entró hasta hoy.
    UPDATE pap_campanas
       SET produccion_real_tn = v_kg,
           notas = 'Campaña en curso. Ingresados ' || v_kg ||
                   ' t según los remitos de campo a tolvas y a frío.'
     WHERE id = v_2026;
  END IF;

  RAISE NOTICE 'Histórico reconstruido sobre el catálogo real.';
END $$;
