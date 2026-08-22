BEGIN;

-- Reparación masiva de unidades marcadas [DUP→...] por la normalización de
-- equipos. La mayoría son unidades legítimas de clientes mal mergeadas (un solo
-- "canónico" agrupaba decenas de unidades de clientes/equipos distintos).
-- Regla: reactivar las que NO tienen un gemelo activo equivalente
-- (mismo cliente+equipo+serie), y limpiar el marcador en todas (dejando la serie
-- real). Las que sí tienen gemelo activo son duplicados reales → quedan inactivas.

-- Set "seguro": DUP units sin gemelo ACTIVO equivalente.
CREATE TEMP TABLE _dup_safe ON COMMIT DROP AS
WITH dup AS (
  SELECT id, cliente_id, equipo_id,
         NULLIF(trim(regexp_replace(numero_serie, '^\[DUP[^]]*\]\s*', '')), '') AS serie_limpia
  FROM equipos_unidades WHERE numero_serie ~ '\[DUP'
)
SELECT d.id
FROM dup d
WHERE NOT EXISTS (
  SELECT 1 FROM equipos_unidades a
  WHERE a.activo = true
    AND a.cliente_id = d.cliente_id
    AND a.equipo_id = d.equipo_id
    AND COALESCE(NULLIF(trim(a.numero_serie),''), '∅') = COALESCE(d.serie_limpia, '∅')
);

\echo === a reactivar (sin gemelo activo) ===
SELECT count(*) FROM _dup_safe;
\echo === quedan inactivas (gemelo activo = duplicado real) ===
SELECT count(*) FROM equipos_unidades WHERE numero_serie ~ '\[DUP' AND id NOT IN (SELECT id FROM _dup_safe);

-- 1) Reactivar las seguras
UPDATE equipos_unidades SET activo = true, updated_at = NOW()
 WHERE id IN (SELECT id FROM _dup_safe);

-- 2) Limpiar el marcador en TODAS las DUP (serie real; vacío/'-' → NULL)
UPDATE equipos_unidades
   SET numero_serie = NULLIF(trim(regexp_replace(numero_serie, '^\[DUP[^]]*\]\s*', '')), ''),
       updated_at = NOW()
 WHERE numero_serie ~ '\[DUP';

\echo === VERIF: no quedan marcadores [DUP ===
SELECT count(*) AS quedan_dup FROM equipos_unidades WHERE numero_serie ~ '\[DUP';
\echo === VERIF: unidades reactivadas ahora activas ===
SELECT count(*) AS reactivadas_activas FROM equipos_unidades eu JOIN _dup_safe s ON s.id=eu.id WHERE eu.activo=true;

COMMIT;
