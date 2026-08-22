-- Migración 972: barrido general de sedes fantasma inferidas desde servicios
--
-- Misma causa raíz que la 971 (caso Wiener), pero a escala: la migración 963
-- (963_backfill_lab_cliente_implicitos.sql) infirió vínculos cliente↔lab desde
-- `servicios` — por cada par (servicios.cliente_id, equipos_unidades.laboratorio_id)
-- de un servicio pasado insertó una fila en `laboratorio_razones_sociales` con
-- es_principal=false. Un servicio facturado a un cliente sobre un equipo que
-- físicamente vive en el lab de un tercero NO convierte a ese cliente en razón
-- social del lab. La 966 sólo limpió labs con ≥3 hermanos; la 967 sólo re-vincula
-- por propiedad de equipos. Quedaron 48 vínculos fantasma en 42 clientes que
-- ensucian el dropdown "Laboratorio" de Nueva Orden de Servicio.
--
-- Criterio de pertenencia (igual que en la 967): un cliente pertenece a una
-- sede si POSEE equipos ahí (equipos_unidades.cliente_id + laboratorio_id).
--
-- PARTE 1 — borra los vínculos secundarios sin respaldo de propiedad de equipos.
--   Excepción: ZIRLAB MDP S.A. — su único vínculo es a la sede homónima
--   "ZIRLAB MDP S.A" (su propia casa central, sin equipos cargados todavía);
--   no es fantasma, se conserva.
--
-- PARTE 2 — Casa Central para los 2 clientes que quedan sin ninguna sede tras
--   el barrido (ARRUEBARRENA DE PALMA ANDRES, CARTOLANO GASSIEBAYLE RAFAEL):
--   sus únicos vínculos eran fantasma y no tienen equipos. Sin sede no podrían
--   crear órdenes de servicio.
--
-- Idempotente: PARTE 1 re-ejecutada es no-op; PARTE 2 usa NOT EXISTS.

-- PARTE 1: borrar vínculos fantasma
DELETE FROM laboratorio_razones_sociales lrs
WHERE lrs.es_principal = false
  AND lrs.activo = true
  AND lrs.cliente_id <> '8eeffe91-6cfc-41f5-a4f1-d87b448e1114'  -- ZIRLAB MDP S.A.: vínculo legítimo
  AND NOT EXISTS (
    SELECT 1 FROM equipos_unidades eu
    WHERE eu.cliente_id = lrs.cliente_id
      AND eu.laboratorio_id = lrs.laboratorio_id
  );

-- PARTE 2: Casa Central para clientes que quedaron huérfanos
WITH huerfanos AS MATERIALIZED (
  SELECT c.id AS cliente_id, c.org_id, gen_random_uuid() AS nuevo_lab_id
  FROM clientes c
  WHERE c.id IN (
      'c0ea95e5-1357-4f8a-b9c8-90f58f8ea766',  -- ARRUEBARRENA DE PALMA ANDRES
      'bdd7d213-4c57-47ec-a661-f7d693298120'   -- CARTOLANO GASSIEBAYLE RAFAEL
    )
    AND c.org_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM laboratorio_razones_sociales lrs
      WHERE lrs.cliente_id = c.id AND lrs.activo = true
    )
),
lab_creado AS (
  INSERT INTO laboratorios (id, org_id, nombre, tipo, activo)
  SELECT nuevo_lab_id, org_id, 'Casa Central', 'otro', true
  FROM huerfanos
  RETURNING id
)
INSERT INTO laboratorio_razones_sociales (org_id, laboratorio_id, cliente_id, es_principal, activo)
SELECT org_id, nuevo_lab_id, cliente_id, true, true
FROM huerfanos;
