-- 1203_papasud_stock_ot.sql
-- Stock de semilla en las cuatro ubicaciones físicas (3 frigoríficos + 1 galpón)
-- y órdenes de trabajo recientes.
--
-- El stock reusa el módulo de inventario heredado: `depositos` son las
-- ubicaciones, `productos` son variedad × categoría de semilla, `productos_lotes`
-- son los ~150 lotes, y `conteos_ciclicos` es la conciliación declarado vs contado.
-- Las cantidades se guardan en KILOS (las columnas de stock son integer).

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_org       uuid;
  v_dep_bal   uuid; v_dep_ota uuid; v_dep_nec uuid; v_dep_gal uuid;
  v_conteo    uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Falta la organización papasud. Corré 1201_papasud_seed.sql primero.';
  END IF;

  PERFORM setseed(0.3141);

  -- Limpieza idempotente de lo que crea este archivo
  DELETE FROM conteos_ciclicos_items WHERE conteo_id IN
    (SELECT c.id FROM conteos_ciclicos c JOIN depositos d ON d.id = c.deposito_id WHERE d.org_id = v_org);
  DELETE FROM conteos_ciclicos WHERE deposito_id IN (SELECT id FROM depositos WHERE org_id = v_org);
  DELETE FROM stock_depositos WHERE deposito_id IN (SELECT id FROM depositos WHERE org_id = v_org);
  DELETE FROM productos_lotes WHERE producto_id IN (SELECT id FROM productos WHERE org_id = v_org);
  DELETE FROM pap_ot_insumos WHERE orden_id IN (SELECT id FROM pap_ordenes_trabajo WHERE org_id = v_org);
  DELETE FROM pap_ordenes_trabajo WHERE org_id = v_org;
  DELETE FROM productos WHERE org_id = v_org;
  DELETE FROM depositos WHERE org_id = v_org;

  -- ─────────────────────────────────────────────────────────────────────────
  -- Las cuatro ubicaciones
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO depositos (org_id, codigo, nombre, tipo, ciudad, provincia,
                         latitud, longitud, es_principal, maneja_stock, activo, descripcion)
  VALUES
    (v_org, 'FRIG-BAL', 'Frigorífico Balcarce',  'frigorifico', 'Balcarce', 'Buenos Aires',
     -37.84890000, -58.25100000, true,  true, true, 'Cámaras 1 a 4. Conservación a 4 °C.'),
    (v_org, 'FRIG-OTA', 'Frigorífico Otamendi',  'frigorifico', 'Otamendi', 'Buenos Aires',
     -37.85200000, -57.84600000, false, true, true, 'Cámaras 5 y 6. Conservación a 4 °C.'),
    (v_org, 'FRIG-NEC', 'Frigorífico Necochea',  'frigorifico', 'Necochea', 'Buenos Aires',
     -38.55900000, -58.73200000, false, true, true, 'Cámara 7. Alquilada por campaña.'),
    (v_org, 'GALP-CEN', 'Galpón Central',        'galpon',      'Balcarce', 'Buenos Aires',
     -37.84300000, -58.26200000, false, true, true, 'Clasificación, embolsado y despacho.');

  SELECT id INTO v_dep_bal FROM depositos WHERE org_id=v_org AND codigo='FRIG-BAL';
  SELECT id INTO v_dep_ota FROM depositos WHERE org_id=v_org AND codigo='FRIG-OTA';
  SELECT id INTO v_dep_nec FROM depositos WHERE org_id=v_org AND codigo='FRIG-NEC';
  SELECT id INTO v_dep_gal FROM depositos WHERE org_id=v_org AND codigo='GALP-CEN';

  -- ─────────────────────────────────────────────────────────────────────────
  -- Productos: variedad × categoría de semilla
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO productos (org_id, codigo, nombre, categoria, unidad_medida,
                         "tieneLote", stock_minimo, precio_venta, moneda, temperatura_almacenamiento)
  SELECT
    v_org,
    'SEM-' || upper(substr(regexp_replace(v.nombre,'[^a-zA-Z]','','g'),1,4)) || '-' || upper(substr(cat,1,3)),
    'Semilla ' || v.nombre || ' — ' || cat,
    'Semilla de papa',
    'kg',
    true,
    20000,
    round((420 + random()*260)::numeric, 2),
    'ARS',
    '4 °C'
  FROM pap_variedades v
  CROSS JOIN (VALUES ('Prebásica'),('Básica'),('Registrada'),('Certificada'),('Fiscalizada')) AS c(cat)
  WHERE v.org_id = v_org
    AND NOT (v.nombre IN ('Bintje','Calén INTA') AND cat IN ('Prebásica','Básica'));

  -- ─────────────────────────────────────────────────────────────────────────
  -- ~150 lotes de semilla repartidos entre las cuatro ubicaciones
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO productos_lotes (producto_id, lote, vencimiento, stock)
  SELECT
    p.id,
    'L' || to_char(2026, 'FM0000') || '-' || lpad(n::text, 4, '0'),
    make_date(2026, 9, 1) + ((random() * 120)::int),
    round((28000 + random() * 46000)::numeric)
  FROM generate_series(1, 150) AS n
  CROSS JOIN LATERAL (
    SELECT id FROM productos WHERE org_id = v_org ORDER BY md5(id::text || n::text) LIMIT 1
  ) p;

  -- Stock agregado por producto × ubicación.
  -- El reparto no es parejo: Balcarce concentra, Necochea es la cámara chica.
  -- cantidad_total es columna generada: no se inserta
  INSERT INTO stock_depositos (producto_id, deposito_id, cantidad_disponible,
                               cantidad_reservada, punto_reorden, stock_minimo)
  SELECT
    t.producto_id, t.deposito_id, t.cant, t.reservada, 25000, 20000
  FROM (
    SELECT
      p.id AS producto_id,
      d.id AS deposito_id,
      GREATEST(0, round((peso.factor * (18000 + random() * 52000))::numeric))::int AS cant,
      round((random() * 9000)::numeric)::int AS reservada
    FROM productos p
    CROSS JOIN depositos d
    JOIN LATERAL (SELECT CASE d.codigo
                           WHEN 'FRIG-BAL' THEN 1.00
                           WHEN 'FRIG-OTA' THEN 0.72
                           WHEN 'FRIG-NEC' THEN 0.38
                           ELSE 0.55 END AS factor) peso ON true
    WHERE p.org_id = v_org AND d.org_id = v_org
      AND random() < 0.68   -- no todo producto está en toda ubicación
  ) t;

  -- ─────────────────────────────────────────────────────────────────────────
  -- Conteo cíclico abierto en Otamendi, con diferencias reales que conciliar.
  -- Es el insumo del nivel intermedio de la vertical 3.
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO conteos_ciclicos (numero, nombre, descripcion, deposito_id, tipo_conteo,
                                criterio_seleccion, fecha_programada, fecha_inicio, estado)
  VALUES ('CC-2026-014', 'Conteo cámara 5 y 6', 'Conteo cíclico previo al despacho de exportación.',
          v_dep_ota, 'ciclico', 'por_ubicacion', CURRENT_DATE - 1, now() - interval '1 day', 'en_proceso')
  RETURNING id INTO v_conteo;

  -- diferencia es columna generada (contada - sistema): no se inserta
  INSERT INTO conteos_ciclicos_items (conteo_id, producto_id, cantidad_sistema, cantidad_contada,
                                      contado)
  SELECT
    v_conteo,
    sd.producto_id,
    sd.cantidad_disponible,
    sd.cantidad_disponible + dif.d,
    true
  FROM stock_depositos sd
  JOIN productos p ON p.id = sd.producto_id
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN random() < 0.72 THEN 0                                  -- la mayoría cuadra
      ELSE (CASE WHEN random() < 0.5 THEN -1 ELSE 1 END) * (500 + (random()*4200)::int)
    END AS d
  ) dif
  WHERE sd.deposito_id = v_dep_ota AND p.org_id = v_org
  LIMIT 14;

  UPDATE conteos_ciclicos c SET
    total_items          = t.n,
    items_contados       = t.n,
    items_con_diferencia = t.con_dif
  FROM (SELECT count(*) n, count(*) FILTER (WHERE diferencia <> 0) con_dif
        FROM conteos_ciclicos_items WHERE conteo_id = v_conteo) t
  WHERE c.id = v_conteo;

  -- ─────────────────────────────────────────────────────────────────────────
  -- Órdenes de trabajo recientes.
  -- Tres son dictadas y conservan el texto original en `origen_texto`:
  -- eso es lo que hace demostrable que la IA hizo el trabajo de carga.
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_ordenes_trabajo (org_id, parcela_id, campana_id, tarea, descripcion, fecha,
                                   responsable_nombre, maquinaria, horas, superficie_ha,
                                   estado, origen, origen_texto)
  SELECT
    v_org,
    p.id,
    (SELECT id FROM pap_campanas WHERE org_id = v_org AND anio = 2026),
    t.nombre,
    NULL,
    CURRENT_DATE - ((random() * 45)::int),
    (ARRAY['Martín Sosa','Julieta Ferrari','Ramiro Ledesma','Carla Ibáñez'])[1 + (random()*4)::int % 4],
    (ARRAY['John Deere 6110','Case Puma 185','Pulverizadora Metalfor','Aporcadora Grimme',NULL])[1 + (random()*5)::int % 5],
    round((2 + random() * 7)::numeric, 1),
    p.superficie_ha,
    (ARRAY['completada','completada','completada','en_curso','registrada'])[1 + (random()*5)::int % 5],
    'manual',
    NULL
  FROM pap_parcelas p
  CROSS JOIN LATERAL (
    SELECT nombre FROM pap_tareas_tipo WHERE org_id = v_org ORDER BY md5(id::text || p.id::text) LIMIT 1
  ) t
  CROSS JOIN generate_series(1, 2)
  WHERE p.org_id = v_org AND p.estado IN ('sembrado','en_cosecha');

  -- Las dictadas: texto crudo tal como lo diría el ingeniero desde la camioneta.
  INSERT INTO pap_ordenes_trabajo (org_id, parcela_id, campana_id, tarea, descripcion, fecha,
                                   responsable_nombre, maquinaria, horas, superficie_ha,
                                   estado, origen, origen_texto, extraccion)
  VALUES
    (v_org,
     (SELECT id FROM pap_parcelas WHERE org_id=v_org AND codigo='Lote 8'),
     (SELECT id FROM pap_campanas WHERE org_id=v_org AND anio=2026),
     'Aplicación de fungicida',
     'Aplicación preventiva de tizón tardío.',
     CURRENT_DATE - 2, 'Martín Sosa', 'Pulverizadora Metalfor', 3.5, 13.6,
     'completada', 'voz',
     'Hoy estuvimos en el lote 8, pasamos con la pulverizadora, tiramos mancozeb dos kilos por hectárea preventivo por el tizón, tardamos tres horas y media, quedó todo el cuadro cubierto.',
     '{"confianza":{"parcela":0.97,"tarea":0.95,"insumos":0.91,"horas":0.99}}'::jsonb),
    (v_org,
     (SELECT id FROM pap_parcelas WHERE org_id=v_org AND codigo='Lote 3'),
     (SELECT id FROM pap_campanas WHERE org_id=v_org AND anio=2026),
     'Aporque',
     NULL,
     CURRENT_DATE - 5, 'Ramiro Ledesma', 'Aporcadora Grimme', 6.0, 12.2,
     'completada', 'voz',
     'En el tres terminamos de aporcar, salió bien, seis horas con la Grimme, el suelo estaba en buena condición.',
     '{"confianza":{"parcela":0.93,"tarea":0.96,"horas":0.98}}'::jsonb),
    (v_org,
     (SELECT id FROM pap_parcelas WHERE org_id=v_org AND codigo='Lote 13'),
     (SELECT id FROM pap_campanas WHERE org_id=v_org AND anio=2026),
     'Monitoreo / muestreo',
     'Se detectan focos de pulgón en la cabecera norte.',
     CURRENT_DATE - 1, 'Julieta Ferrari', NULL, 1.5, 9.9,
     'completada', 'texto',
     'recorri el 13 hay pulgon en la cabecera norte, todavia poco pero conviene mirarlo la semana que viene, el resto del lote bien',
     '{"confianza":{"parcela":0.89,"tarea":0.92}}'::jsonb);

  -- Insumos de la orden dictada
  INSERT INTO pap_ot_insumos (orden_id, insumo_id, insumo_nombre, cantidad, unidad, dosis_ha, fuera_de_rango)
  SELECT o.id, i.id, i.nombre, 27.2, 'kg', 2.0, false
  FROM pap_ordenes_trabajo o
  CROSS JOIN pap_insumos i
  WHERE o.org_id = v_org AND o.origen = 'voz' AND o.tarea = 'Aplicación de fungicida'
    AND i.org_id = v_org AND i.nombre = 'Mancozeb 80%';

  RAISE NOTICE 'Stock y órdenes de trabajo cargados.';
END $$;
