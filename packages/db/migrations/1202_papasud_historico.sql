-- 1202_papasud_historico.sql
-- El "Excel de 20 años": campañas 2006–2026 con su clima y sus rendimientos
-- por lote y variedad. Más el stock de semilla repartido en 4 ubicaciones.
--
-- Los datos tienen historia deliberada, para que el copiloto tenga algo que
-- encontrar y el tablero algo que explicar:
--   · 2009 y 2018 fueron años secos     → rendimientos bajos
--   · 2012 tuvo exceso hídrico          → más descarte
--   · 2023 fue la mejor campaña         → pico de producción
--   · Innovator rinde mejor en El Ceibo → suelo arenoso con riego

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Falta la organización papasud. Corré 1201_papasud_seed.sql primero.';
  END IF;

  PERFORM setseed(0.1977);

  DELETE FROM pap_rendimientos WHERE org_id = v_org;
  DELETE FROM pap_campanas     WHERE org_id = v_org;

  -- ─────────────────────────────────────────────────────────────────────────
  -- Campañas y su clima
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_campanas (org_id, anio, nombre, fecha_inicio, fecha_fin,
                            lluvia_mm, temp_media_c, dias_heladas, notas)
  SELECT v_org, anio, (anio-1)||'/'||substr(anio::text,3,2),
         make_date(anio-1, 9, 15), make_date(anio, 3, 20),
         lluvia, temp, heladas, nota
  FROM (VALUES
    (2006, 640.0, 15.2,  9, NULL),
    (2007, 705.0, 14.8, 12, NULL),
    (2008, 590.0, 15.6, 14, NULL),
    (2009, 382.0, 16.4, 19, 'Campaña seca. Déficit hídrico marcado en noviembre y diciembre.'),
    (2010, 668.0, 15.1, 10, NULL),
    (2011, 712.0, 14.9,  8, NULL),
    (2012, 981.0, 14.2,  7, 'Exceso hídrico en cosecha. Aumentó el descarte por pudrición.'),
    (2013, 655.0, 15.3, 11, NULL),
    (2014, 690.0, 15.0,  9, NULL),
    (2015, 748.0, 14.7,  6, NULL),
    (2016, 620.0, 15.4, 13, NULL),
    (2017, 702.0, 15.1, 10, NULL),
    (2018, 418.0, 16.7, 21, 'Segunda campaña seca del período. Se activó riego suplementario.'),
    (2019, 634.0, 15.5, 12, NULL),
    (2020, 688.0, 15.0,  9, NULL),
    (2021, 596.0, 15.8, 15, NULL),
    (2022, 661.0, 15.2, 11, NULL),
    (2023, 784.0, 14.6,  5, 'Mejor campaña del período. Primavera húmeda y otoño seco en cosecha.'),
    (2024, 715.0, 14.9,  8, NULL),
    (2025, 672.0, 15.1, 10, NULL),
    (2026, 698.0, 15.0,  9, 'Campaña en curso.')
  ) AS c(anio, lluvia, temp, heladas, nota);

  -- ─────────────────────────────────────────────────────────────────────────
  -- Rendimientos: campaña × lote × variedad
  -- ~90% de los lotes se siembran cada año; el resto queda en descanso.
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_rendimientos (
    org_id, campana_id, parcela_id, variedad_id, superficie_ha,
    rendimiento_tn_ha, produccion_tn, categoria_semilla,
    fecha_siembra, fecha_cosecha, lluvia_mm, temp_media_c, dias_heladas,
    calibre_medio_mm, descarte_pct, observaciones
  )
  SELECT
    v_org, x.campana_id, x.parcela_id, x.variedad_id, x.superficie_ha,
    x.rinde,
    round(x.rinde * x.superficie_ha, 2),
    x.categoria,
    make_date(x.anio - 1, 10, 1) + ((x.jitter * 28)::int),
    make_date(x.anio,      2, 1) + ((x.jitter * 38)::int),
    x.lluvia_mm, x.temp_media_c, x.dias_heladas,
    round((48 + x.jitter * 14)::numeric, 1),
    x.descarte,
    x.obs
  FROM (
    SELECT
      c.id AS campana_id, c.anio, c.lluvia_mm, c.temp_media_c, c.dias_heladas,
      p.id AS parcela_id, p.superficie_ha,
      v.id AS variedad_id, v.nombre AS variedad,
      e.nombre AS establecimiento,
      j.jitter,
      -- Rinde: base por variedad + suelo/riego + clima + tendencia técnica + ruido
      GREATEST(14.0, round((
          CASE v.nombre
            WHEN 'Spunta'      THEN 36.0 WHEN 'Innovator' THEN 40.0
            WHEN 'Atlantic'    THEN 34.0 WHEN 'Kennebec'  THEN 35.0
            WHEN 'Daifla'      THEN 37.0 WHEN 'Markies'   THEN 39.0
            WHEN 'Frital INTA' THEN 36.0 WHEN 'Newen INTA' THEN 35.0
            WHEN 'Calén INTA'  THEN 36.0 ELSE 33.0 END
        + CASE WHEN e.nombre = 'El Ceibo' AND v.nombre = 'Innovator' THEN 4.5 ELSE 0 END
        + CASE WHEN p.tiene_riego THEN 2.2 ELSE 0 END
        + (c.lluvia_mm - 620) / 100.0 * 1.6
        -- el anegamiento tambien castiga el rinde, no solo la calidad
        - CASE WHEN c.lluvia_mm > 900 THEN 6.0 ELSE 0 END
        - c.dias_heladas * 0.22
        + (c.anio - 2006) * 0.18
        + (j.jitter - 0.5) * 9.0
      )::numeric, 2)) AS rinde,
      -- Descarte: sube con el exceso hídrico y con Atlantic
      round((5.0
        + CASE WHEN c.lluvia_mm > 900 THEN 4.5 ELSE 0 END
        + CASE WHEN v.nombre = 'Atlantic' THEN 2.0 ELSE 0 END
        + j.jitter * 3.0)::numeric, 2) AS descarte,
      (ARRAY['Prebásica','Básica','Registrada','Certificada','Fiscalizada'])[
        1 + (abs(hashtext(p.codigo || c.anio::text)) % 5)] AS categoria,
      CASE
        WHEN c.lluvia_mm < 450 THEN 'Ciclo con estrés hídrico; se adelantó la desecación.'
        WHEN c.lluvia_mm > 900 THEN 'Cosecha con suelo saturado; demora en el arrancado.'
        ELSE NULL
      END AS obs
    FROM pap_campanas c
    CROSS JOIN pap_parcelas p
    JOIN pap_establecimientos e ON e.id = p.establecimiento_id
    CROSS JOIN LATERAL (SELECT random() AS jitter, random() AS pick, random() AS sow) j
    -- La variedad se elige con pesos: Spunta y Innovator dominan el plan.
    JOIN LATERAL (
      SELECT id, nombre FROM pap_variedades
      WHERE org_id = v_org
        AND nombre = (ARRAY[
          'Spunta','Spunta','Spunta','Spunta','Spunta','Spunta',
          'Innovator','Innovator','Innovator','Innovator',
          'Atlantic','Atlantic','Kennebec','Daifla','Daifla',
          'Markies','Frital INTA','Newen INTA','Calén INTA','Bintje'
        ])[1 + (j.pick * 20)::int % 20]
      LIMIT 1
    ) v ON true
    WHERE c.org_id = v_org AND p.org_id = v_org
      AND j.sow < 0.90            -- el 10% de los lotes descansa cada campaña
  ) x;

  -- Totales de campaña, derivados de los rendimientos
  UPDATE pap_campanas c SET
    superficie_ha = t.sup,
    produccion_tn = t.prod
  FROM (
    SELECT campana_id, round(sum(superficie_ha),2) AS sup, round(sum(produccion_tn),2) AS prod
    FROM pap_rendimientos WHERE org_id = v_org GROUP BY campana_id
  ) t
  WHERE c.id = t.campana_id;

  RAISE NOTICE 'Histórico cargado.';
END $$;
