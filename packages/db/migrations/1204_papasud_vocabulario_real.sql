-- 1204_papasud_vocabulario_real.sql
--
-- Corrige el modelo con lo que dicen los documentos reales de Papasud:
-- el plano de pivotes de Santa Ana, una orden de trabajo y la planilla de
-- movimientos 2026.
--
-- Lo que cambia respecto del seed inicial:
--   · La ubicación de campo es PIVOTE + TERCIO, no coordenadas. Los pivotes son
--     círculos de riego partidos en cuadrantes y anillos concéntricos.
--   · Las variedades son las que siembran de verdad (agata, spunta, asterix,
--     atlantic, daifla, king russet, memphis, sunred, quintera, ludmilla,
--     7 four 7), no las que se habían inventado.
--   · La categoría fiscalizada es "inicial 1/2/3".
--   · Los insumos llevan su nombre comercial, que es como se dictan en el campo.
--   · La orden de trabajo tiene aplicador y herramienta (aplican con drone).

\set ON_ERROR_STOP on

-- ───────────────────────────────────────────────────────────────────────────
-- Esquema
-- ───────────────────────────────────────────────────────────────────────────

-- Ubicación real de campo
ALTER TABLE pap_parcelas ADD COLUMN IF NOT EXISTS pivote     varchar(10);
ALTER TABLE pap_parcelas ADD COLUMN IF NOT EXISTS tercio     integer;
ALTER TABLE pap_parcelas ADD COLUMN IF NOT EXISTS cuadrante  integer;
ALTER TABLE pap_parcelas ADD COLUMN IF NOT EXISTS anillo_desde numeric(5,2);
ALTER TABLE pap_parcelas ADD COLUMN IF NOT EXISTS anillo_hasta numeric(5,2);

-- La aplicación se hace con una herramienta y la firma un aplicador
ALTER TABLE pap_ordenes_trabajo ADD COLUMN IF NOT EXISTS herramienta varchar(50);
ALTER TABLE pap_ordenes_trabajo ADD COLUMN IF NOT EXISTS hora        time;
ALTER TABLE pap_ordenes_trabajo ADD COLUMN IF NOT EXISTS pivote      varchar(10);
ALTER TABLE pap_ordenes_trabajo ADD COLUMN IF NOT EXISTS tercio      integer;

-- El insumo se dicta por su marca comercial, no por el principio activo
ALTER TABLE pap_insumos ADD COLUMN IF NOT EXISTS marca varchar(100);

-- El lote de semilla se identifica en el galpón por el color de la bolsa y del hilo
ALTER TABLE productos_lotes ADD COLUMN IF NOT EXISTS color_bolsa varchar(30);
ALTER TABLE productos_lotes ADD COLUMN IF NOT EXISTS color_hilo  varchar(30);

-- ───────────────────────────────────────────────────────────────────────────
-- Datos
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'papasud';
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Falta la organización papasud.';
  END IF;

  PERFORM setseed(0.8080);

  -- ── Variedades reales ────────────────────────────────────────────────────
  -- Se renombran las inventadas en vez de borrarlas, para no perder el
  -- histórico que ya cuelga de ellas por clave foránea.
  -- El guard hace la migración re-corrible: si ya se renombraron, no se toca.
  IF EXISTS (SELECT 1 FROM pap_variedades WHERE org_id = v_org AND nombre = 'Innovator') THEN
  UPDATE pap_variedades SET nombre = 'Agata',       destino='consumo',   ciclo='semitardio', color_piel='amarilla',
         notas='La más sembrada. Numeración de lotes 22x y 24x.'          WHERE org_id=v_org AND nombre='Spunta';
  UPDATE pap_variedades SET nombre = 'Spunta',      destino='consumo',   ciclo='semitardio', color_piel='amarilla',
         notas='Numeración de lotes 30x y 31x.'                            WHERE org_id=v_org AND nombre='Innovator';
  UPDATE pap_variedades SET nombre = 'Asterix',     destino='consumo',   ciclo='tardio',     color_piel='roja',
         notas='Numeración de lotes 81x y 82x.'                            WHERE org_id=v_org AND nombre='Daifla';
  UPDATE pap_variedades SET nombre = 'Daifla',      destino='consumo',   ciclo='semitardio', color_piel='amarilla',
         notas='Numeración de lotes 35x.'                                  WHERE org_id=v_org AND nombre='Markies';
  UPDATE pap_variedades SET nombre = 'King Russet', destino='industria', ciclo='tardio',     color_piel='rusetada',
         notas='Va a industria (McCain). Numeración 91x.'                  WHERE org_id=v_org AND nombre='Frital INTA';
  UPDATE pap_variedades SET nombre = 'Memphis',     destino='consumo',   ciclo='temprano',   color_piel='amarilla',
         notas='Numeración 51x.'                                           WHERE org_id=v_org AND nombre='Newen INTA';
  UPDATE pap_variedades SET nombre = 'Sunred',      destino='consumo',   ciclo='temprano',   color_piel='roja',
         notas='Numeración 52x.'                                           WHERE org_id=v_org AND nombre='Calén INTA';
  UPDATE pap_variedades SET nombre = 'Quintera',    destino='consumo',   ciclo='semitardio', color_piel='amarilla',
         notas='Numeración 56x.'                                           WHERE org_id=v_org AND nombre='Bintje';
  UPDATE pap_variedades SET nombre = 'Ludmilla',    destino='industria', ciclo='semitardio', color_piel='roja',
         notas='Contrato con Lamb Weston. Numeración 60x.'                 WHERE org_id=v_org AND nombre='Kennebec';
  -- Atlantic ya estaba bien
  UPDATE pap_variedades SET destino='chips', ciclo='temprano', color_piel='blanca',
         notas='Alto contenido de materia seca. Numeración 41x.'           WHERE org_id=v_org AND nombre='Atlantic';

  END IF;

  INSERT INTO pap_variedades (org_id, nombre, ciclo, destino, color_piel, notas)
  VALUES (v_org, '7 four 7', 'semitardio', 'exportacion', 'blanca', 'Numeración 70x.')
  ON CONFLICT (org_id, nombre) DO NOTHING;

  -- ── Categoría fiscalizada real ───────────────────────────────────────────
  UPDATE pap_rendimientos SET categoria_semilla = CASE categoria_semilla
      WHEN 'Prebásica'   THEN 'Inicial 1'
      WHEN 'Básica'      THEN 'Inicial 2'
      WHEN 'Registrada'  THEN 'Inicial 3'
      WHEN 'Certificada' THEN 'Inicial 2'
      WHEN 'Fiscalizada' THEN 'Inicial 3'
      ELSE categoria_semilla END
   WHERE org_id = v_org;

  -- ── Los lotes son sectores de pivote ─────────────────────────────────────
  -- Pivote A: cuadrantes 1 a 4. Pivote B: 5 a 8. Cada lote es una franja
  -- angular entre dos radios; el tercio agrupa los anillos de a tres.
  WITH numerados AS (
    SELECT id,
           row_number() OVER (ORDER BY (regexp_replace(codigo, '\D', '', 'g'))::int) AS n
      FROM pap_parcelas WHERE org_id = v_org
  )
  UPDATE pap_parcelas p SET
    pivote       = CASE WHEN n.n <= 12 THEN 'A' ELSE 'B' END,
    cuadrante    = CASE WHEN n.n <= 12 THEN 1 + ((n.n - 1) % 4) ELSE 5 + ((n.n - 13) % 4) END,
    tercio       = 1 + ((n.n - 1) % 3),
    anillo_desde = ((n.n - 1) % 3) * 130.0,
    anillo_hasta = (((n.n - 1) % 3) + 1) * 130.0
  FROM numerados n WHERE n.id = p.id;

  -- Los lotes se numeran como en la planilla: el prefijo indica la variedad.
  -- Guard: si ya están renumerados (empiezan con L y 3 dígitos), no se toca.
  IF NOT EXISTS (SELECT 1 FROM pap_parcelas WHERE org_id = v_org AND codigo ~ '^L\d{3}$') THEN
  UPDATE pap_parcelas p SET codigo = sub.nuevo, nombre = sub.nombre_nuevo
  FROM (
    SELECT p2.id,
           'L' || v.prefijo || lpad(((row_number() OVER (PARTITION BY v.prefijo ORDER BY p2.codigo)) )::text, 1, '0') AS nuevo,
           e.nombre || ' — pivote ' || COALESCE(p2.pivote,'A') || ', tercio ' || COALESCE(p2.tercio,1) AS nombre_nuevo
      FROM pap_parcelas p2
      JOIN pap_establecimientos e ON e.id = p2.establecimiento_id
      CROSS JOIN LATERAL (
        SELECT (ARRAY['22','30','31','35','41','51','52','56','60','70','81','91'])[
                 1 + (abs(hashtext(p2.codigo)) % 12)] AS prefijo
      ) v
     WHERE p2.org_id = v_org
  ) sub
  WHERE p.id = sub.id;
  END IF;

  -- ── Insumos con su marca comercial ───────────────────────────────────────
  DELETE FROM pap_ot_insumos WHERE insumo_id IN (SELECT id FROM pap_insumos WHERE org_id = v_org);
  DELETE FROM pap_insumos WHERE org_id = v_org;

  INSERT INTO pap_insumos (org_id, marca, nombre, tipo, principio_activo, unidad, dosis_min, dosis_max, alias) VALUES
    (v_org, 'Dithane N80','Dithane N80','fungicida',   'Mancozeb 80%',                        'kg/ha', 1.5, 2.5, ARRAY['dithane','mancozeb','manco']),
    (v_org, 'Daconil',    'Daconil',    'fungicida',   'Clorotalonil 72% SC',                 'l/ha',  1.0, 2.0, ARRAY['daconil','clorotalonil']),
    (v_org, 'Nativo',     'Nativo',     'fungicida',   'Trifloxistrobin + Tebuconazole',      'l/ha',  0.3, 0.6, ARRAY['nativo','trifloxistrobin']),
    (v_org, 'Ridomil',    'Ridomil',    'fungicida',   'Metalaxil-M + Mancozeb',              'kg/ha', 2.0, 2.5, ARRAY['ridomil','metalaxil']),
    (v_org, 'Shirlan',    'Shirlan',    'fungicida',   'Fluazinam 50%',                       'l/ha',  0.4, 0.6, ARRAY['shirlan','fluazinam']),
    (v_org, 'Engeo',      'Engeo',      'insecticida', 'Tiametoxam 14,1 + Lambdacialotrina',  'l/ha',  0.15, 0.35, ARRAY['engeo','tiametoxam']),
    (v_org, 'Magic',      'Magic',      'insecticida', 'Imidacloprid 10% + Bifentrin',        'l/ha',  0.4, 0.8, ARRAY['magic','imidacloprid']),
    (v_org, 'Decis',      'Decis',      'insecticida', 'Deltametrina',                        'l/ha',  0.03, 0.08, ARRAY['decis','deltametrina']),
    (v_org, 'Nanofos',    'Nanofos',    'insecticida', 'Clorpirifos',                         'l/ha',  0.5, 0.9, ARRAY['nanofos','clorpirifos']),
    (v_org, 'Vertimec',   'Vertimec',   'insecticida', 'Abamectina 3,6',                      'l/ha',  0.08, 0.15, ARRAY['vertimec','abamectina']),
    (v_org, 'Sencorex',   'Sencorex',   'herbicida',   'Metribuzin',                          'l/ha',  0.7, 1.5, ARRAY['sencorex','metribuzin','sencor']),
    (v_org, 'Dual Gold',  'Dual Gold',  'herbicida',   'Metolacloro 96%',                     'l/ha',  2.0, 2.5, ARRAY['dual','dual gold','metolacloro']),
    (v_org, 'Reglone',    'Reglone',    'herbicida',   'Bromuro de Diquat',                   'l/ha',  1.5, 2.5, ARRAY['reglone','diquat','desecante','matada']),
    (v_org, 'Gramoxone',  'Gramoxone',  'herbicida',   'Paraquat dicloruro',                  'l/ha',  1.5, 2.5, ARRAY['gramoxone','paraquat']),
    (v_org, 'Cletodin',   'Cletodin',   'herbicida',   'Quizalofop p-etil',                   'l/ha',  2.0, 3.0, ARRAY['cletodin','quizalofop']),
    (v_org, 'Basagran',   'Basagran',   'herbicida',   'Bentazón 60',                         'l/ha',  1.0, 1.5, ARRAY['basagran','bentazon']),
    (v_org, 'Emultec',    'Emultec',    'coadyuvante', 'Coadyuvante',                         'l/ha',  0.05, 0.2, ARRAY['emultec','coadyuvante','emulsionante']),
    (v_org, 'Rootex',     'Rootex',     'bioestimulante','Enraizante',                        'kg/ha', 4.0, 8.0, ARRAY['rootex','enraizante']),
    (v_org, 'Urea',       'Urea',       'fertilizante','Urea 46-0-0',                         'kg/ha', 100, 250, ARRAY['urea']),
    (v_org, 'DAP',        'DAP',        'fertilizante','Fosfato diamónico 18-46-0',           'kg/ha', 80,  200, ARRAY['dap','fosfato diamonico','fosfato']);

  -- ── Tareas: se agrega la aplicación tal como la nombran ──────────────────
  UPDATE pap_tareas_tipo SET nombre = 'Aplicación', alias = ARRAY['aplicar','aplicación','pulverizar','curar','tirar','fungicida','insecticida','herbicida']
   WHERE org_id = v_org AND codigo = 'fungicida';
  UPDATE pap_tareas_tipo SET alias = alias || ARRAY['matada','desecar','quemar']
   WHERE org_id = v_org AND codigo = 'desecacion';

  -- ── Las órdenes existentes toman pivote, tercio, aplicador y herramienta ─
  UPDATE pap_ordenes_trabajo o SET
    pivote      = p.pivote,
    tercio      = p.tercio,
    herramienta = (ARRAY['Drone','Pulverizadora','Drone','Pulverizadora','Tractor'])[1 + (abs(hashtext(o.id::text)) % 5)],
    hora        = (time '05:30' + (abs(hashtext(o.id::text)) % 34) * interval '30 minutes'),
    responsable_nombre = COALESCE(o.responsable_nombre,
                          (ARRAY['Daniel','Martín','Gastón','Mario'])[1 + (abs(hashtext(o.id::text)) % 4)])
  FROM pap_parcelas p
  WHERE p.id = o.parcela_id AND o.org_id = v_org;

  -- ── Color de bolsa e hilo: la trazabilidad física del galpón ─────────────
  UPDATE productos_lotes pl SET
    color_bolsa = (ARRAY['blanca','verde','roja','marrón','naranja','amarilla','negra'])[1 + (abs(hashtext(pl.lote)) % 7)],
    color_hilo  = (ARRAY['blanco','negro','verde','rojo','amarillo','celeste','marrón'])[1 + (abs(hashtext(pl.lote || 'h')) % 7)]
  FROM productos p
  WHERE p.id = pl.producto_id AND p.org_id = v_org;

  RAISE NOTICE 'Vocabulario real aplicado.';
END $$;

-- La vista del copiloto suma la ubicación real.
-- Se recrea (no REPLACE): cambian columnas de lugar y Postgres no lo permite.
DROP VIEW IF EXISTS vista_pap_historico;
CREATE VIEW vista_pap_historico AS
SELECT
  r.id, r.org_id,
  c.anio AS campana_anio, c.nombre AS campana,
  p.codigo AS lote, p.nombre AS lote_nombre,
  p.pivote, p.tercio, p.cuadrante,
  e.nombre AS establecimiento, e.localidad,
  v.nombre AS variedad, v.ciclo AS variedad_ciclo, v.destino AS variedad_destino,
  r.categoria_semilla, r.superficie_ha, r.produccion_tn, r.rendimiento_tn_ha,
  r.fecha_siembra, r.fecha_cosecha,
  r.lluvia_mm, r.temp_media_c, r.dias_heladas,
  r.calibre_medio_mm, r.descarte_pct, r.observaciones
FROM pap_rendimientos r
LEFT JOIN pap_campanas        c ON c.id = r.campana_id
LEFT JOIN pap_parcelas        p ON p.id = r.parcela_id
LEFT JOIN pap_establecimientos e ON e.id = p.establecimiento_id
LEFT JOIN pap_variedades      v ON v.id = r.variedad_id;
