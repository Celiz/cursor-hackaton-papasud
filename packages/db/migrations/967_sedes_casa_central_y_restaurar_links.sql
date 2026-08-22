-- Migración 967: restaurar links de sede por propiedad de equipos + Casa Central
--
-- Contexto: el wizard de "Nueva Orden de Servicio" exige elegir una sede
-- (laboratorio) y filtra equipos por ella. Un cliente sin sede vinculada en
-- `laboratorio_razones_sociales` queda trancado ("Cliente sin laboratorios").
--
-- Dos problemas:
--
-- PARTE 1 — Links borrados de más. La migración 966 borró links de labs
-- multi-tenant usando un umbral de "≥3 hermanos", pero ese umbral atrapó
-- co-tenants legítimos (los 4 CEDEAC en "CEDEAC - España", SAMARUGA 1099 en
-- "Laboratorio AC - Belgrano", varios hospitales). El criterio correcto no es
-- contar hermanos: un cliente pertenece a un lab si POSEE equipos físicamente
-- ahí (equipos_unidades.cliente_id + laboratorio_id) — eso es un hecho. El
-- ruido de ANLIS venía de servicios facturados a terceros, no de equipos
-- propios, así que esto no lo reintroduce.
--
-- PARTE 2 — Clientes que no son laboratorios (cervecerías, empresas, etc.)
-- con equipos sin sede. Se les crea una sede "Casa Central" y se enganchan
-- sus equipos huérfanos.
--
-- Idempotente: NOT EXISTS evita duplicados en ambas partes.

-- PARTE 1: vincular cliente ↔ lab donde el cliente posee equipos
INSERT INTO laboratorio_razones_sociales (org_id, laboratorio_id, cliente_id, es_principal, activo)
SELECT DISTINCT eu.org_id, eu.laboratorio_id, eu.cliente_id, false, true
FROM equipos_unidades eu
WHERE eu.activo = true
  AND eu.laboratorio_id IS NOT NULL
  AND eu.cliente_id IS NOT NULL
  AND eu.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM laboratorio_razones_sociales lrs
    WHERE lrs.laboratorio_id = eu.laboratorio_id
      AND lrs.cliente_id = eu.cliente_id
  )
ON CONFLICT (laboratorio_id, cliente_id) DO UPDATE SET activo = true;

-- PARTE 2: "Casa Central" para clientes con equipos huérfanos y sin sede.
-- Primero se dedupean los clientes y RECIÉN ahí se asigna un uuid por cliente
-- (asignarlo antes del DISTINCT generaría una sede por equipo, no por cliente).
WITH clientes_sin_sede AS (
  SELECT DISTINCT c.id AS cliente_id, c.org_id AS org_id
  FROM clientes c
  JOIN equipos_unidades eu ON eu.cliente_id = c.id AND eu.activo = true
  WHERE c.org_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM laboratorio_razones_sociales lrs
      WHERE lrs.cliente_id = c.id AND lrs.activo = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM equipos_unidades eu2
      WHERE eu2.cliente_id = c.id AND eu2.activo = true
        AND eu2.laboratorio_id IS NOT NULL
    )
),
casos_casa_central AS MATERIALIZED (
  SELECT cliente_id, org_id, gen_random_uuid() AS nuevo_lab_id
  FROM clientes_sin_sede
),
lab_creado AS (
  INSERT INTO laboratorios (id, org_id, nombre, tipo, activo)
  SELECT nuevo_lab_id, org_id, 'Casa Central', 'otro', true
  FROM casos_casa_central
  RETURNING id
),
link_creado AS (
  INSERT INTO laboratorio_razones_sociales (org_id, laboratorio_id, cliente_id, es_principal, activo)
  SELECT org_id, nuevo_lab_id, cliente_id, true, true
  FROM casos_casa_central
  RETURNING laboratorio_id
)
UPDATE equipos_unidades eu
SET laboratorio_id = cc.nuevo_lab_id
FROM casos_casa_central cc
WHERE eu.cliente_id = cc.cliente_id
  AND eu.activo = true
  AND eu.laboratorio_id IS NULL;
