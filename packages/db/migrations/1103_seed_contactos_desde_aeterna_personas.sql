-- Backfill de la tabla `contactos` (modelo nuevo) desde las personas del
-- aeterna viejo (persona-centric).
--
-- Contexto: al rearmar el modelo de Uno alrededor de `clientes` (sacando
-- persona-centric), el feature de Contactos quedó leyendo tablas vacías
-- (personas/persona_contactos/personas_clientes) y la tabla nueva `contactos`
-- (FK empresa_id -> clientes) quedó sin poblar. La data rica de contactos vive
-- en el dump consolidado de aeterna: persona -> personas_razones_sociales ->
-- razon_social_id, y ese razon_social_id == clientes.id en el modelo nuevo
-- (96% match: 719/748).
--
-- Fuente: dump `aeterna_work.dump` restaurado como DB `aeterna_src` en el mismo
-- server (pg-aeterna). Requiere:
--   createdb aeterna_src && pg_restore -d aeterna_src --no-owner aeterna_work.dump
--   CREATE EXTENSION IF NOT EXISTS dblink;
--
-- Idempotente: guard NOT EXISTS por (empresa_id, nombre, apellido). Re-correr
-- inserta 0. One-shot para aeterna2 (prod Uno).

INSERT INTO contactos (org_id, empresa_id, nombre, apellido, cargo, email, telefono, es_principal, notas)
SELECT
  '48b2a35a-0cb8-4643-a1d6-045918f9704c'::uuid,
  t.empresa_id,
  t.nombre,
  NULLIF(t.apellido,''),
  NULLIF(t.cargo,''),
  CASE WHEN t.email    IS NULL OR t.email=''    THEN NULL
       WHEN t.email    LIKE '{%' THEN t.email::text[]
       ELSE ARRAY[t.email] END,
  CASE WHEN t.telefono IS NULL OR t.telefono='' THEN NULL
       WHEN t.telefono LIKE '{%' THEN t.telefono::text[]
       ELSE ARRAY[t.telefono] END,
  COALESCE(t.es_principal,false),
  'Importado de aeterna (persona-centric) 2026-05-30'
FROM dblink('dbname=aeterna_src user=aeterna',
  'SELECT prs.razon_social_id, p.nombre, p.apellido, p.cargo, p.email, p.telefono, prs.es_contacto_principal
     FROM personas_razones_sociales prs
     JOIN personas p ON p.id = prs.persona_id
    WHERE p.org_id = ''48b2a35a-0cb8-4643-a1d6-045918f9704c''')
  AS t(empresa_id uuid, nombre text, apellido text, cargo text, email text, telefono text, es_principal boolean)
WHERE t.empresa_id IN (SELECT id FROM clientes)
  AND t.nombre IS NOT NULL AND t.nombre <> ''
  AND NOT EXISTS (
    SELECT 1 FROM contactos c
    WHERE c.empresa_id = t.empresa_id
      AND c.nombre = t.nombre
      AND COALESCE(c.apellido,'') = COALESCE(NULLIF(t.apellido,''),'')
  );
