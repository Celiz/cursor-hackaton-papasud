-- 1201_papasud_seed.sql
-- Dataset sintético de Papasud, verosímil pero inventado.
--
-- No borra nada del inquilino anterior: crea una organización nueva y todo
-- cuelga de su org_id. El schema es multi-inquilino por org_id, así que los
-- datos de Uno quedan invisibles sin necesidad de truncar 621 tablas.
--
-- Es determinista (setseed). Correrlo dos veces da exactamente el mismo dataset.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_org      uuid;
  v_persona  uuid;
  v_est_bal  uuid; v_est_ota uuid; v_est_nec uuid; v_est_lob uuid; v_est_sdp uuid;
BEGIN
  PERFORM setseed(0.4242);

  -- ─────────────────────────────────────────────────────────────────────────
  -- Organización, usuario y permisos
  -- ─────────────────────────────────────────────────────────────────────────
  DELETE FROM organizations WHERE slug = 'papasud';

  INSERT INTO organizations (slug, nombre, cuit, tipo, theme, config)
  VALUES ('papasud', 'Papasud', '30-51234567-9', 'agro', 'green',
          -- el login lee el tema de config->>'theme', no de la columna theme
          '{"rubro":"produccion de semilla de papa","fundacion":1886,"theme":"emerald"}'::jsonb)
  RETURNING id INTO v_org;

  DELETE FROM auth_credentials WHERE email = 'demo@papasud.com.ar';
  DELETE FROM personas WHERE email = 'demo@papasud.com.ar';

  INSERT INTO personas (org_id, nombre, apellido, email, tipo, cargo, activo)
  VALUES (v_org, 'Equipo', 'Papasud', 'demo@papasud.com.ar', 'fisica', 'Demo', true)
  RETURNING id INTO v_persona;

  INSERT INTO auth_credentials (persona_id, email, username, password_hash, provider)
  VALUES (v_persona, 'demo@papasud.com.ar', 'demo',
          '$2a$10$02Idh.e/6svsfWnDwiKyQOWzvDJLVT5LsCGv/Z0typfOtmwfQdaFC', 'email');

  -- La curaduría real la hace `case 'agro'` en lib/sidebar-links.ts, que define
  -- qué secciones se arman. `modulos_ocultos` es de grano fino: esconde ITEMS
  -- sueltos dentro de secciones que sí se muestran.
  --
  -- OJO: los valores tienen que ser del enum `Modulo` (lib/types/roles.ts).
  -- Un slug de URL acá no hace nada — se compara contra `item.permission`.
  INSERT INTO org_members (org_id, persona_id, rol, permisos)
  VALUES (v_org, v_persona, 'owner', jsonb_build_object(
    'modulos_ocultos', to_jsonb(ARRAY[
      -- clínica veterinaria: no aplica a una productora de semilla
      'vet_pacientes','vet_ordenes','vet_estudios','vet_muestras','vet_resultados',
      'vet_bienestar','vet_seguimientos','vet_reactivos','vet_derivaciones',
      'vet_analizadores','vet_auditoria','vet_educacion','vet_citas','vet_consultas',
      'vet_vacunas','vet_internacion','vet_cirugias','vet_desparasitaciones',
      'vet_farmacia','vet_diagnosticos','vet_casos','vet_banco_sangre',
      -- laboratorio de electromedicina
      'laboratorios','reactivos_lab',
      -- comodato de equipos médicos
      'comodatos'
    ]::text[])
  ));

  -- ─────────────────────────────────────────────────────────────────────────
  -- Establecimientos (coordenadas reales del sudeste bonaerense)
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_establecimientos (org_id, nombre, localidad, latitud, longitud, superficie_ha) VALUES
    (v_org, 'La Josefina',   'Balcarce',            -37.84560000, -58.25440000, 68),
    (v_org, 'El Ceibo',      'Otamendi',            -37.84670000, -57.85000000, 54),
    (v_org, 'Don Aníbal',    'Necochea',            -38.55450000, -58.73960000, 41),
    (v_org, 'La Esperanza',  'Lobería',             -38.16140000, -58.78170000, 22),
    (v_org, 'Sierra Chica',  'Sierra de los Padres',-37.94110000, -57.77140000, 15);

  SELECT id INTO v_est_bal FROM pap_establecimientos WHERE org_id=v_org AND nombre='La Josefina';
  SELECT id INTO v_est_ota FROM pap_establecimientos WHERE org_id=v_org AND nombre='El Ceibo';
  SELECT id INTO v_est_nec FROM pap_establecimientos WHERE org_id=v_org AND nombre='Don Aníbal';
  SELECT id INTO v_est_lob FROM pap_establecimientos WHERE org_id=v_org AND nombre='La Esperanza';
  SELECT id INTO v_est_sdp FROM pap_establecimientos WHERE org_id=v_org AND nombre='Sierra Chica';

  -- ─────────────────────────────────────────────────────────────────────────
  -- Parcelas: 24 lotes, ~200 ha en total
  -- Las coordenadas se dispersan alrededor del establecimiento.
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_parcelas (org_id, establecimiento_id, codigo, nombre, superficie_ha,
                            latitud, longitud, tipo_suelo, tiene_riego, estado)
  SELECT
    v_org,
    est.id,
    'Lote ' || n,
    est.nombre || ' — cuadro ' || n,
    sup,
    est.latitud  + (random() - 0.5) * 0.030,
    est.longitud + (random() - 0.5) * 0.038,
    suelo,
    riego,
    estado
  FROM (VALUES
    (1,  'La Josefina',  11.5, 'Argiudol típico',  true,  'sembrado'),
    (2,  'La Josefina',   9.8, 'Argiudol típico',  true,  'sembrado'),
    (3,  'La Josefina',  12.2, 'Argiudol típico',  true,  'en_cosecha'),
    (4,  'La Josefina',   8.4, 'Argiudol thapto',  false, 'sembrado'),
    (5,  'La Josefina',  10.1, 'Argiudol thapto',  true,  'descanso'),
    (6,  'La Josefina',   9.0, 'Argiudol típico',  false, 'sembrado'),
    (7,  'La Josefina',   7.0, 'Argiudol típico',  true,  'disponible'),
    (8,  'El Ceibo',     13.6, 'Hapludol arenoso', true,  'sembrado'),
    (9,  'El Ceibo',     11.9, 'Hapludol arenoso', true,  'sembrado'),
    (10, 'El Ceibo',     10.4, 'Hapludol arenoso', true,  'en_cosecha'),
    (11, 'El Ceibo',      8.7, 'Hapludol éntico',  false, 'sembrado'),
    (12, 'El Ceibo',      9.4, 'Hapludol éntico',  true,  'descanso'),
    (13, 'Don Aníbal',    9.9, 'Argiudol ácuico',  false, 'sembrado'),
    (14, 'Don Aníbal',    8.2, 'Argiudol ácuico',  false, 'sembrado'),
    (15, 'Don Aníbal',    7.6, 'Argiudol típico',  true,  'disponible'),
    (16, 'Don Aníbal',    8.8, 'Argiudol típico',  false, 'sembrado'),
    (17, 'Don Aníbal',    6.5, 'Natracuol',        false, 'descanso'),
    (18, 'La Esperanza',  7.3, 'Argiudol típico',  false, 'sembrado'),
    (19, 'La Esperanza',  6.1, 'Argiudol típico',  false, 'disponible'),
    (20, 'La Esperanza',  8.6, 'Paleudol petro',   false, 'sembrado'),
    (21, 'Sierra Chica',  4.2, 'Argiudol lítico',  true,  'sembrado'),
    (22, 'Sierra Chica',  5.5, 'Argiudol lítico',  true,  'en_cosecha'),
    (23, 'Sierra Chica',  3.1, 'Argiudol lítico',  false, 'disponible'),
    (24, 'La Josefina',   6.2, 'Argiudol típico',  true,  'sembrado')
  ) AS p(n, est_nombre, sup, suelo, riego, estado)
  JOIN pap_establecimientos est ON est.org_id = v_org AND est.nombre = p.est_nombre;

  -- ─────────────────────────────────────────────────────────────────────────
  -- Variedades
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_variedades (org_id, nombre, ciclo, destino, color_piel, notas) VALUES
    (v_org, 'Spunta',       'semitardio', 'consumo',   'amarilla', 'La más difundida del mercado interno.'),
    (v_org, 'Innovator',    'tardio',     'baston',    'rusetada', 'Contrato con industria de prefritos.'),
    (v_org, 'Atlantic',     'temprano',   'chips',     'blanca',   'Alto contenido de materia seca.'),
    (v_org, 'Kennebec',     'semitardio', 'consumo',   'blanca',   NULL),
    (v_org, 'Daifla',       'semitardio', 'consumo',   'amarilla', NULL),
    (v_org, 'Markies',      'tardio',     'baston',    'amarilla', NULL),
    (v_org, 'Frital INTA',  'semitardio', 'industria', 'amarilla', 'Obtención nacional, INTA Balcarce.'),
    (v_org, 'Newen INTA',   'temprano',   'consumo',   'amarilla', 'Obtención nacional, INTA Balcarce.'),
    (v_org, 'Calén INTA',   'semitardio', 'consumo',   'amarilla', 'Obtención nacional, INTA Balcarce.'),
    (v_org, 'Bintje',       'temprano',   'consumo',   'amarilla', 'En retroceso, se mantiene por un cliente.');

  -- ─────────────────────────────────────────────────────────────────────────
  -- Insumos, con dosis y con los alias que usa el ingeniero al dictar
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_insumos (org_id, nombre, tipo, principio_activo, unidad, dosis_min, dosis_max, alias) VALUES
    (v_org, 'Urea granulada',        'fertilizante', 'Urea 46-0-0',              'kg/ha', 100, 250, ARRAY['urea']),
    (v_org, 'Fosfato diamónico',     'fertilizante', 'DAP 18-46-0',              'kg/ha', 80,  200, ARRAY['dap','fosfato']),
    (v_org, 'Superfosfato triple',   'fertilizante', 'SPT 0-46-0',               'kg/ha', 80,  180, ARRAY['spt','superfosfato']),
    (v_org, 'Sulfato de potasio',    'fertilizante', 'K2SO4',                    'kg/ha', 60,  150, ARRAY['sulfato de potasio','potasio']),
    (v_org, 'Nitrato de amonio',     'fertilizante', 'CAN 27',                   'kg/ha', 80,  200, ARRAY['can','nitrato']),
    (v_org, 'Mancozeb 80%',          'fungicida',    'Mancozeb',                 'kg/ha', 1.5, 2.5, ARRAY['mancozeb','manco']),
    (v_org, 'Clorotalonil 72%',      'fungicida',    'Clorotalonil',             'l/ha',  1.0, 2.0, ARRAY['clorotalonil','bravo']),
    (v_org, 'Metalaxil + Mancozeb',  'fungicida',    'Metalaxil-M + Mancozeb',   'kg/ha', 2.0, 2.5, ARRAY['ridomil','metalaxil']),
    (v_org, 'Cimoxanilo + Mancozeb', 'fungicida',    'Cimoxanilo + Mancozeb',    'kg/ha', 2.0, 3.0, ARRAY['cimoxanilo','curzate']),
    (v_org, 'Fluazinam 50%',         'fungicida',    'Fluazinam',                'l/ha',  0.4, 0.6, ARRAY['fluazinam','shirlan']),
    (v_org, 'Azoxistrobina 25%',     'fungicida',    'Azoxistrobina',            'l/ha',  0.5, 1.0, ARRAY['azoxistrobina','amistar']),
    (v_org, 'Imidacloprid 35%',      'insecticida',  'Imidacloprid',             'l/ha',  0.2, 0.5, ARRAY['imidacloprid','confidor']),
    (v_org, 'Lambdacialotrina 5%',   'insecticida',  'Lambdacialotrina',         'l/ha',  0.1, 0.3, ARRAY['lambda','karate']),
    (v_org, 'Clorpirifos 48%',       'insecticida',  'Clorpirifos',              'l/ha',  0.8, 1.5, ARRAY['clorpirifos','lorsban']),
    (v_org, 'Abamectina 1.8%',       'insecticida',  'Abamectina',               'l/ha',  0.3, 0.8, ARRAY['abamectina','vertimec']),
    (v_org, 'Metribuzin 48%',        'herbicida',    'Metribuzin',               'l/ha',  0.5, 1.0, ARRAY['metribuzin','sencor']),
    (v_org, 'Linuron 50%',           'herbicida',    'Linuron',                  'l/ha',  1.0, 2.0, ARRAY['linuron','afalon']),
    (v_org, 'Glifosato 62%',         'herbicida',    'Glifosato sal potásica',   'l/ha',  2.0, 4.0, ARRAY['glifosato','round up','roundup']),
    (v_org, 'Diquat 20%',            'herbicida',    'Diquat',                   'l/ha',  2.0, 3.0, ARRAY['diquat','reglone','desecante']),
    (v_org, 'Clorprofam',            'antibrotante', 'CIPC',                     'l/ha',  0.02, 0.04, ARRAY['cipc','clorprofam','antibrotante']);

  -- ─────────────────────────────────────────────────────────────────────────
  -- Tipos de tarea, con alias para que el LLM matchee lenguaje libre
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO pap_tareas_tipo (org_id, codigo, nombre, requiere_insumos, orden, alias) VALUES
    (v_org, 'prep_suelo',   'Preparación de suelo',        false,  1, ARRAY['arar','rastra','cincel','preparar']),
    (v_org, 'siembra',      'Siembra / plantación',        true,   2, ARRAY['plantar','sembrar','plantación']),
    (v_org, 'fert_base',    'Fertilización de base',       true,   3, ARRAY['fertilizar','fertilización','abonar']),
    (v_org, 'aporque',      'Aporque',                     false,  4, ARRAY['aporcar','aporque','embancar']),
    (v_org, 'herbicida',    'Control de malezas',          true,   5, ARRAY['herbicida','malezas','carpir']),
    (v_org, 'fungicida',    'Aplicación de fungicida',     true,   6, ARRAY['fungicida','tizón','curar','pulverizar']),
    (v_org, 'insecticida',  'Aplicación de insecticida',   true,   7, ARRAY['insecticida','pulgón','polilla','bicho']),
    (v_org, 'riego',        'Riego',                       false,  8, ARRAY['regar','riego','pivot']),
    (v_org, 'monitoreo',    'Monitoreo / muestreo',        false,  9, ARRAY['monitorear','recorrer','muestreo','revisar']),
    (v_org, 'desecacion',   'Desecación de follaje',       true,  10, ARRAY['desecar','matada','matar la planta']),
    (v_org, 'cosecha',      'Cosecha',                     false, 11, ARRAY['cosechar','levantar','arrancar']),
    (v_org, 'clasificacion','Clasificación y embolsado',   false, 12, ARRAY['clasificar','embolsar','seleccionar']),
    (v_org, 'postcosecha',  'Tratamiento post-cosecha',    true,  13, ARRAY['antibrotante','tratar','postcosecha']),
    (v_org, 'despacho',     'Carga y despacho',            false, 14, ARRAY['cargar','despachar','remito']);

  RAISE NOTICE 'Base de Papasud creada. org_id = %', v_org;
END $$;
