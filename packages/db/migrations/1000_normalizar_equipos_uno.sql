-- 1000_normalizar_equipos_uno.sql
-- Normaliza duplicados en `equipos` de Uno Electromedicina.
-- Spec: docs/superpowers/specs/2026-05-27-normalizar-equipos-uno-design.md
-- Plan: docs/superpowers/plans/2026-05-27-normalizar-equipos-uno.md
--
-- Mergea automáticamente los grupos "obvios" (mismo lowercase+trim de marca+modelo).
-- Re-apunta FKs (formales + 4 tablas sin FK conocidas), guarda snapshots en
-- `_equipos_merge_log` y deletea los perdedores. Sospechosos (marcas distintas,
-- modelos parecidos) se resuelven en una pasada manual posterior usando el
-- reporte que genera packages/db/scripts/equipos-normalizar-reporte.ts.

BEGIN;

-- ============================================================
-- 0. Precondición: org Uno Electromedicina debe existir
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = '48b2a35a-0cb8-4643-a1d6-045918f9704c') THEN
    RAISE EXCEPTION 'Org Uno Electromedicina no existe. Abortando.';
  END IF;
END $$;

-- ============================================================
-- 1. Tabla de auditoría (idempotente)
-- ============================================================
CREATE TABLE IF NOT EXISTS _equipos_merge_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merged_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  winner_id        UUID NOT NULL,
  loser_id         UUID NOT NULL,
  marca_winner     TEXT,
  modelo_winner    TEXT,
  marca_loser      TEXT,
  modelo_loser     TEXT,
  unidades_movidas INT,
  fk_movidos       JSONB,
  raw_winner       JSONB,
  raw_loser        JSONB,
  origen           TEXT NOT NULL DEFAULT 'bulk'  -- 'bulk' | 'manual'
);

CREATE INDEX IF NOT EXISTS idx_equipos_merge_log_winner ON _equipos_merge_log(winner_id);
CREATE INDEX IF NOT EXISTS idx_equipos_merge_log_merged_at ON _equipos_merge_log(merged_at DESC);

-- ============================================================
-- 2. Función helper: elegir ganador entre rows candidatas
-- ============================================================
-- Ranking:
--   1. Más campos no-nulos entre: imagen_url, descripcion_comercial,
--      precio_lista, ficha_tecnica_url, folleto_url, precio_dolar,
--      precio_pesos, iva, lis_parser_tipo, especificaciones (no '{}'::jsonb)
--   2. Empate -> más equipos_unidades asociadas
--   3. Empate -> created_at ASC

CREATE OR REPLACE FUNCTION _pick_equipo_winner(p_equipo_ids UUID[])
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT e.id
  FROM equipos e
  WHERE e.id = ANY(p_equipo_ids)
  ORDER BY
    (
      (CASE WHEN e.imagen_url            IS NOT NULL AND e.imagen_url            <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN e.descripcion_comercial IS NOT NULL AND e.descripcion_comercial <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN e.precio_lista          IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN e.ficha_tecnica_url     IS NOT NULL AND e.ficha_tecnica_url     <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN e.folleto_url           IS NOT NULL AND e.folleto_url           <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN e.precio_dolar          IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN e.precio_pesos          IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN e.iva                   IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN e.lis_parser_tipo       IS NOT NULL AND e.lis_parser_tipo       <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN e.especificaciones      IS NOT NULL AND e.especificaciones      <> '{}'::jsonb THEN 1 ELSE 0 END)
    ) DESC,
    (SELECT COUNT(*) FROM equipos_unidades eu WHERE eu.equipo_id = e.id) DESC,
    e.created_at ASC NULLS LAST,
    e.id ASC  -- desempate determinista
  LIMIT 1;
$$;

-- ============================================================
-- 3. Función núcleo: mergear losers dentro de un winner
-- ============================================================
-- Para cada loser:
--   a. COALESCE merge de campos comerciales en winner
--   b. division: union sin duplicados
--   c. especificaciones: loser || winner (winner gana en colisiones)
--   d. Re-apuntar TODAS las FKs formales a equipos(id) -> winner
--   e. Re-apuntar 4 tablas conocidas SIN FK formal -> winner
--   f. Insertar row en _equipos_merge_log con snapshots
--   g. DELETE el loser
-- Devuelve cantidad de losers efectivamente mergeados.

-- Helper interno: antes de UPDATE table SET fk_col=winner WHERE fk_col=loser,
-- borra las rows del loser que violarían UNIQUE/PK constraints con rows del winner.
-- Reporta cuántas rows borró (duplicados perdidos).
CREATE OR REPLACE FUNCTION _equipos_remove_unique_conflicts(
  p_table_name TEXT,
  p_fk_col     TEXT,
  p_winner_id  UUID,
  p_loser_id   UUID
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_uniq_rec     RECORD;
  v_other_cols   TEXT[];
  v_match_clause TEXT;
  v_n_dupes      INT;
  v_total_dupes  INT := 0;
  v_table_oid    OID;
  v_fk_attnum    SMALLINT;
BEGIN
  v_table_oid := p_table_name::regclass::oid;
  SELECT attnum INTO v_fk_attnum FROM pg_attribute
    WHERE attrelid = v_table_oid AND attname = p_fk_col;
  IF v_fk_attnum IS NULL THEN
    RAISE EXCEPTION 'Columna % no existe en tabla %', p_fk_col, p_table_name;
  END IF;

  FOR v_uniq_rec IN
    SELECT con.conname, con.conkey
    FROM pg_constraint con
    WHERE con.contype IN ('u','p')
      AND con.conrelid = v_table_oid
      AND v_fk_attnum = ANY(con.conkey)
  LOOP
    -- Otras columnas del unique (sin la FK)
    v_other_cols := ARRAY(
      SELECT att.attname FROM unnest(v_uniq_rec.conkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute att ON att.attrelid = v_table_oid AND att.attnum = k.attnum
      WHERE att.attname <> p_fk_col
      ORDER BY k.ord
    );

    IF array_length(v_other_cols, 1) IS NULL THEN
      -- Unique solo sobre la FK column: cualquier row del winner conflictúa con loser
      EXECUTE format(
        'DELETE FROM %I WHERE %I = $1 AND EXISTS (SELECT 1 FROM %I WHERE %I = $2)',
        p_table_name, p_fk_col, p_table_name, p_fk_col
      ) USING p_loser_id, p_winner_id;
    ELSE
      v_match_clause := (
        SELECT string_agg(format('w.%I IS NOT DISTINCT FROM t.%I', col, col), ' AND ')
        FROM unnest(v_other_cols) AS col
      );
      EXECUTE format(
        'DELETE FROM %I t WHERE t.%I = $1 AND EXISTS (SELECT 1 FROM %I w WHERE w.%I = $2 AND %s)',
        p_table_name, p_fk_col, p_table_name, p_fk_col, v_match_clause
      ) USING p_loser_id, p_winner_id;
    END IF;
    GET DIAGNOSTICS v_n_dupes = ROW_COUNT;
    v_total_dupes := v_total_dupes + v_n_dupes;
  END LOOP;

  RETURN v_total_dupes;
END $$;

CREATE OR REPLACE FUNCTION _merge_equipos(
  p_winner_id UUID,
  p_loser_ids UUID[],
  p_origen    TEXT DEFAULT 'bulk'
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_loser_id   UUID;
  v_winner     equipos%ROWTYPE;
  v_loser      equipos%ROWTYPE;
  v_count      INT := 0;
  v_fk_rec     RECORD;
  v_fk_moved   JSONB;
  v_n_moved    INT;
  v_n_dupes    INT;
  v_unidades   INT;
  -- Tablas con `equipo_id` SIN FK formal (verificadas via pg_constraint)
  v_extra_tables TEXT[] := ARRAY[
    'equipos_planes_mantenimiento',
    'mantenimiento_alertas',
    'mantenimientos',
    'servicios'
  ];
  v_extra_table TEXT;
BEGIN
  -- Validar winner existe
  SELECT * INTO v_winner FROM equipos WHERE id = p_winner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winner % no existe', p_winner_id;
  END IF;

  -- Iterar losers
  FOREACH v_loser_id IN ARRAY p_loser_ids LOOP
    -- Skip si loser == winner
    IF v_loser_id = p_winner_id THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_loser FROM equipos WHERE id = v_loser_id;
    IF NOT FOUND THEN
      RAISE NOTICE 'Loser % no existe, skip', v_loser_id;
      CONTINUE;
    END IF;

    -- Snapshot para log
    v_fk_moved := '{}'::jsonb;

    -- a. COALESCE merge de campos comerciales
    UPDATE equipos w SET
      imagen_url            = COALESCE(w.imagen_url, v_loser.imagen_url),
      descripcion_comercial = COALESCE(w.descripcion_comercial, v_loser.descripcion_comercial),
      precio_lista          = COALESCE(w.precio_lista, v_loser.precio_lista),
      precio_lista_moneda   = COALESCE(w.precio_lista_moneda, v_loser.precio_lista_moneda),
      ficha_tecnica_url     = COALESCE(w.ficha_tecnica_url, v_loser.ficha_tecnica_url),
      folleto_url           = COALESCE(w.folleto_url, v_loser.folleto_url),
      precio_dolar          = COALESCE(w.precio_dolar, v_loser.precio_dolar),
      precio_pesos          = COALESCE(w.precio_pesos, v_loser.precio_pesos),
      iva                   = COALESCE(w.iva, v_loser.iva),
      lis_parser_tipo       = COALESCE(w.lis_parser_tipo, v_loser.lis_parser_tipo),
      utilidad              = COALESCE(w.utilidad, v_loser.utilidad),
      tipo                  = COALESCE(w.tipo, v_loser.tipo),
      categoria             = COALESCE(w.categoria, v_loser.categoria),
      fecha_compra          = COALESCE(w.fecha_compra, v_loser.fecha_compra),
      -- b. division union sin duplicados
      division = ARRAY(
        SELECT DISTINCT unnest(COALESCE(w.division, '{}'::text[]) || COALESCE(v_loser.division, '{}'::text[]))
      ),
      -- imagenes_adicionales union
      imagenes_adicionales = ARRAY(
        SELECT DISTINCT unnest(COALESCE(w.imagenes_adicionales, '{}'::text[]) || COALESCE(v_loser.imagenes_adicionales, '{}'::text[]))
      ),
      -- c. especificaciones: loser primero (winner sobrescribe colisiones).
      -- Nota: en SET de un UPDATE, `w.especificaciones` referencia el valor PREVIO
      -- de la fila (no el SET en curso), así que winner gana en keys colisionadas.
      especificaciones = COALESCE(v_loser.especificaciones, '{}'::jsonb) || COALESCE(w.especificaciones, '{}'::jsonb)
    WHERE w.id = p_winner_id;

    -- d. Re-apuntar FKs formales dinámicamente
    -- Primero borra duplicados que violarían UNIQUE/PK (loser row "perdida" porque winner ya la tiene).
    FOR v_fk_rec IN
      SELECT conrelid::regclass::text AS tabla, a.attname AS columna
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f' AND c.confrelid = 'equipos'::regclass
    LOOP
      v_n_dupes := _equipos_remove_unique_conflicts(
        v_fk_rec.tabla, v_fk_rec.columna, p_winner_id, v_loser_id
      );
      IF v_n_dupes > 0 THEN
        v_fk_moved := v_fk_moved || jsonb_build_object(v_fk_rec.tabla || '_dupes_drop', v_n_dupes);
      END IF;
      EXECUTE format(
        'UPDATE %I SET %I = $1 WHERE %I = $2',
        v_fk_rec.tabla, v_fk_rec.columna, v_fk_rec.columna
      ) USING p_winner_id, v_loser_id;
      GET DIAGNOSTICS v_n_moved = ROW_COUNT;
      IF v_n_moved > 0 THEN
        v_fk_moved := v_fk_moved || jsonb_build_object(v_fk_rec.tabla, v_n_moved);
      END IF;
    END LOOP;

    -- e. Re-apuntar tablas conocidas SIN FK formal (mismo tratamiento de UNIQUEs)
    FOREACH v_extra_table IN ARRAY v_extra_tables LOOP
      v_n_dupes := _equipos_remove_unique_conflicts(
        v_extra_table, 'equipo_id', p_winner_id, v_loser_id
      );
      IF v_n_dupes > 0 THEN
        v_fk_moved := v_fk_moved || jsonb_build_object(v_extra_table || '*_dupes_drop', v_n_dupes);
      END IF;
      EXECUTE format('UPDATE %I SET equipo_id = $1 WHERE equipo_id = $2', v_extra_table)
        USING p_winner_id, v_loser_id;
      GET DIAGNOSTICS v_n_moved = ROW_COUNT;
      IF v_n_moved > 0 THEN
        v_fk_moved := v_fk_moved || jsonb_build_object(v_extra_table || '*', v_n_moved);
      END IF;
    END LOOP;

    -- Contar unidades movidas (para el log directo)
    v_unidades := COALESCE((v_fk_moved->>'equipos_unidades')::int, 0);

    -- f. Log
    INSERT INTO _equipos_merge_log (
      winner_id, loser_id, marca_winner, modelo_winner,
      marca_loser, modelo_loser, unidades_movidas, fk_movidos,
      raw_winner, raw_loser, origen
    ) VALUES (
      p_winner_id, v_loser_id, v_winner.marca, v_winner.modelo,
      v_loser.marca, v_loser.modelo, v_unidades, v_fk_moved,
      to_jsonb(v_winner), to_jsonb(v_loser), p_origen
    );

    -- g. DELETE loser
    DELETE FROM equipos WHERE id = v_loser_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

-- ============================================================
-- 4. Bulk merge: grupos "obvios"
-- ============================================================
-- Obvio = mismo NORMALIZE(marca) + mismo NORMALIZE(modelo).
-- NORMALIZE = LOWER(REGEXP_REPLACE(TRIM(COALESCE(x,'')), '\s+', ' ', 'g'))

-- Snapshot de huérfanos preexistentes en tablas SIN FK formal.
-- `servicios` tiene 2866 rows con equipo_id que ya no existen — data quality previa,
-- no causada por el merge. La verificación final exige que NO crezca; cero absoluto
-- no es alcanzable sin un cleanup previo separado.
CREATE TEMP TABLE _huerfanos_pre AS
SELECT 'equipos_planes_mantenimiento'::text AS tabla,
       (SELECT COUNT(*) FROM equipos_planes_mantenimiento t WHERE t.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id=t.equipo_id))::int AS n
UNION ALL SELECT 'mantenimiento_alertas',
       (SELECT COUNT(*) FROM mantenimiento_alertas t WHERE t.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id=t.equipo_id))::int
UNION ALL SELECT 'mantenimientos',
       (SELECT COUNT(*) FROM mantenimientos t WHERE t.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id=t.equipo_id))::int
UNION ALL SELECT 'servicios',
       (SELECT COUNT(*) FROM servicios t WHERE t.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id=t.equipo_id))::int;

DO $$
DECLARE
  v_grupo        RECORD;
  v_ids          UUID[];
  v_winner       UUID;
  v_losers       UUID[];
  v_n_merged     INT;
  v_total_groups INT := 0;
  v_total_merged INT := 0;
  v_equipos_pre  INT;
  v_equipos_post INT;
  v_unidades_pre INT;
  v_unidades_post INT;
BEGIN
  SELECT COUNT(*) INTO v_equipos_pre  FROM equipos WHERE org_id='48b2a35a-0cb8-4643-a1d6-045918f9704c';
  SELECT COUNT(*) INTO v_unidades_pre FROM equipos_unidades WHERE org_id='48b2a35a-0cb8-4643-a1d6-045918f9704c';

  FOR v_grupo IN
    SELECT
      LOWER(REGEXP_REPLACE(TRIM(COALESCE(marca,'')),  '\s+', ' ', 'g')) AS marca_n,
      LOWER(REGEXP_REPLACE(TRIM(COALESCE(modelo,'')), '\s+', ' ', 'g')) AS modelo_n,
      ARRAY_AGG(id ORDER BY created_at) AS ids,
      COUNT(*) AS n
    FROM equipos
    WHERE org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
  LOOP
    v_ids := v_grupo.ids;
    v_winner := _pick_equipo_winner(v_ids);
    v_losers := ARRAY(SELECT u FROM unnest(v_ids) u WHERE u <> v_winner);

    -- Normalizar marca del winner a Title Case (con excepción para siglas ≤3 letras)
    -- Modelo: solo trim + colapso espacios (no toca el case).
    -- IMPORTANTE: esta normalización ocurre ANTES de llamar a _merge_equipos, así
    -- que `raw_winner` en _equipos_merge_log captura la marca/modelo YA normalizados,
    -- no los originales. Para reconstruir el typo crudo del usuario, leer raw_loser
    -- de las filas con el mismo winner_id en pasadas posteriores.
    UPDATE equipos SET
      marca = CASE
        WHEN marca IS NULL OR TRIM(marca) = '' THEN NULL
        WHEN LENGTH(TRIM(marca)) <= 3 AND TRIM(marca) = UPPER(TRIM(marca)) THEN TRIM(marca)
        ELSE INITCAP(LOWER(REGEXP_REPLACE(TRIM(marca), '\s+', ' ', 'g')))
      END,
      modelo = NULLIF(REGEXP_REPLACE(TRIM(COALESCE(modelo,'')), '\s+', ' ', 'g'), '')
    WHERE id = v_winner;

    v_n_merged := _merge_equipos(v_winner, v_losers, 'bulk');
    v_total_merged := v_total_merged + v_n_merged;
    v_total_groups := v_total_groups + 1;

    RAISE NOTICE 'Grupo % | %  -> winner % (mergeó % losers)',
      v_grupo.marca_n, v_grupo.modelo_n, v_winner, v_n_merged;
  END LOOP;

  SELECT COUNT(*) INTO v_equipos_post  FROM equipos WHERE org_id='48b2a35a-0cb8-4643-a1d6-045918f9704c';
  SELECT COUNT(*) INTO v_unidades_post FROM equipos_unidades WHERE org_id='48b2a35a-0cb8-4643-a1d6-045918f9704c';

  RAISE NOTICE '== Bulk merge resumen ==';
  RAISE NOTICE 'Equipos: % -> % (diff %)', v_equipos_pre, v_equipos_post, v_equipos_pre - v_equipos_post;
  RAISE NOTICE 'Unidades: % -> % (debe ser igual)', v_unidades_pre, v_unidades_post;
  RAISE NOTICE 'Grupos mergeados: %, losers totales: %', v_total_groups, v_total_merged;

  -- Asserts
  IF v_unidades_pre <> v_unidades_post THEN
    RAISE EXCEPTION 'Unidades cambiaron de % a %, perdimos datos. Abortando.', v_unidades_pre, v_unidades_post;
  END IF;
  IF v_equipos_pre - v_equipos_post <> v_total_merged THEN
    RAISE EXCEPTION 'Equipos eliminados (%) no coinciden con losers mergeados (%).',
      v_equipos_pre - v_equipos_post, v_total_merged;
  END IF;
END $$;

-- ============================================================
-- 5. Verificación final: ninguna FK formal quedó huérfana
-- ============================================================
DO $$
DECLARE
  v_rec RECORD;
  v_n   INT;
BEGIN
  FOR v_rec IN
    SELECT conrelid::regclass::text AS tabla, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype='f' AND c.confrelid='equipos'::regclass
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I t WHERE t.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id = t.%I)',
      v_rec.tabla, v_rec.col, v_rec.col
    ) INTO v_n;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'FK huérfana en %.%: % filas apuntan a equipos inexistentes', v_rec.tabla, v_rec.col, v_n;
    END IF;
  END LOOP;

  -- Tablas sin FK formal: comparar contra snapshot pre-merge.
  -- El merge no debe AUMENTAR el conteo de huérfanos en estas tablas
  -- (los pre-existentes son data quality previa, ajeno a este script).
  DECLARE
    v_pre  INT;
    v_post INT;
    v_tab  TEXT;
  BEGIN
    FOR v_tab IN SELECT tabla FROM _huerfanos_pre LOOP
      SELECT n INTO v_pre FROM _huerfanos_pre WHERE tabla = v_tab;
      EXECUTE format(
        'SELECT COUNT(*) FROM %I t WHERE t.equipo_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.id = t.equipo_id)',
        v_tab
      ) INTO v_post;
      IF v_post > v_pre THEN
        RAISE EXCEPTION 'Huérfanos en %.equipo_id crecieron de % a % (delta % por la migración)',
          v_tab, v_pre, v_post, v_post - v_pre;
      ELSIF v_post < v_pre THEN
        RAISE NOTICE 'Tabla % perdió % huérfanos (%->%) — efecto colateral aceptable',
          v_tab, v_pre - v_post, v_pre, v_post;
      ELSE
        RAISE NOTICE 'Tabla %: % huérfanos preexistentes mantenidos', v_tab, v_pre;
      END IF;
    END LOOP;
  END;

  RAISE NOTICE 'Verificación FK: formales íntegras + extras sin crecer';
END $$;

DROP TABLE _huerfanos_pre;

COMMIT;
