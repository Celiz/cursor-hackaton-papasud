-- 1306_papasud_variedades_historico.sql
--
-- En la 1304 el sorteo de variedad quedaba fijo para todas las filas: el
-- LATERAL con random() se evaluaba una sola vez, así que las 264 filas del
-- histórico terminaron con la misma variedad y la pantalla de Variedades no
-- mostraba nada comparable.
--
-- Acá se reparten de nuevo, con los pesos que muestran los movimientos reales:
-- spunta y agata dominan, después atlantic, daifla y asterix.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN RAISE EXCEPTION 'Falta la organización papasud.'; END IF;

  -- El hash del id da un reparto estable: la misma fila cae siempre en la
  -- misma variedad, y no cambia entre corridas.
  UPDATE pap_rendimientos r SET variedad_id = v.id
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY nombre) - 1 AS n, id, nombre
      FROM pap_variedades
     WHERE org_id = v_org
       AND nombre IN ('Spunta','Agata','Atlantic','Daifla','Asterix',
                      'Ludmilla','King Russet','Memphis','Sunred','Quintera')
  ) v
  WHERE r.org_id = v_org
    AND v.n = (ARRAY[0,0,0,0,0, 1,1,1,1, 2,2, 3,3, 4,4, 5, 6, 7, 8, 9])[
                 1 + (abs(hashtext(r.id::text)) % 20)];

  -- El rinde se recalcula acorde a la variedad que le tocó.
  UPDATE pap_rendimientos r SET
    rendimiento_tn_ha = GREATEST(14.0, round((
        CASE v.nombre
          WHEN 'Agata'       THEN 38.0 WHEN 'Spunta'   THEN 36.0
          WHEN 'Asterix'     THEN 37.0 WHEN 'Atlantic' THEN 34.0
          WHEN 'Daifla'      THEN 36.0 WHEN 'Ludmilla' THEN 39.0
          WHEN 'King Russet' THEN 40.0 ELSE 35.0 END
      + (r.lluvia_mm - 620) / 100.0 * 1.6
      - r.dias_heladas * 0.22
      + ((abs(hashtext(r.id::text || 'r')) % 100) / 100.0 - 0.5) * 8.0
    )::numeric, 2)),
    produccion_tn = NULL
  FROM pap_variedades v
  WHERE v.id = r.variedad_id AND r.org_id = v_org;

  UPDATE pap_rendimientos SET produccion_tn = round(rendimiento_tn_ha * superficie_ha, 2)
   WHERE org_id = v_org;

  UPDATE pap_campanas c SET superficie_ha = t.sup, produccion_tn = t.prod
  FROM (SELECT campana_id, round(sum(superficie_ha),2) sup, round(sum(produccion_tn),2) prod
          FROM pap_rendimientos WHERE org_id = v_org GROUP BY campana_id) t
  WHERE c.id = t.campana_id;

  RAISE NOTICE 'Variedades repartidas en el histórico.';
END $$;
