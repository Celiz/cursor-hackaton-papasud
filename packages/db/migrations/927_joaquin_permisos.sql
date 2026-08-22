-- Migration 927: Ajustar permisos de Joaquín Sigismondi en Uno Electromedicina
-- - Ocultar Regulatorio
-- - Ya no usa CRM_DIRECTO (ve Ventas completo ahora, controlado desde el código)

UPDATE org_members
SET permisos = COALESCE(permisos, '{}'::jsonb) || jsonb_build_object(
  'modulos_ocultos', '["regulatorio"]'::jsonb
)
WHERE persona_id = '5021fa8b-0347-4a84-a106-fc22dca2e566'
  AND org_id = (SELECT id FROM organizations WHERE nombre ILIKE '%uno electro%' LIMIT 1);
