-- Permisos servicio técnico (Uno Electromedicina): ocultar Precios + Productos solo-lectura
-- para Franco, Gabriel y Matías. Idempotente.
-- Requiere que los 3 cierren sesión y vuelvan a entrar (el JWT toma los permisos al login).

-- 1. Ocultar el módulo 'precios' (clave nueva, separada de 'productos').
UPDATE org_members
SET permisos = jsonb_set(
  permisos,
  '{modulos_ocultos}',
  COALESCE(permisos->'modulos_ocultos', '[]'::jsonb) || '"precios"'::jsonb,
  true
)
WHERE org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'
  AND persona_id IN (
    'a206eb20-b190-47e3-bc02-57711c2dea82', -- Franco
    '649c75d6-2c14-4812-9363-344b985683c1', -- Gabriel
    '448f1f08-2e92-4229-a66c-2a3357475ae8'  -- Matias
  )
  AND NOT (COALESCE(permisos->'modulos_ocultos', '[]'::jsonb) ? 'precios');

-- 2. Productos en solo-lectura (ven pero no crean/editan/eliminan/facturan).
UPDATE org_members
SET permisos = jsonb_set(
  permisos,
  '{modulos_solo_lectura}',
  COALESCE(permisos->'modulos_solo_lectura', '[]'::jsonb) || '"productos"'::jsonb,
  true
)
WHERE org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'
  AND persona_id IN (
    'a206eb20-b190-47e3-bc02-57711c2dea82', -- Franco
    '649c75d6-2c14-4812-9363-344b985683c1', -- Gabriel
    '448f1f08-2e92-4229-a66c-2a3357475ae8'  -- Matias
  )
  AND NOT (COALESCE(permisos->'modulos_solo_lectura', '[]'::jsonb) ? 'productos');
