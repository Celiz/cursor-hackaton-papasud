-- Permitir tipos de actividad CRM personalizados (por org, guardados en
-- organizations.config.crm_actividad_tipos_custom). El CHECK limitaba `tipo` a los 9
-- fijos; se reemplaza por uno permisivo (texto no vacío) para aceptar los slugs custom
-- (ej. 'custom_demo_equipo') manteniendo una validación mínima.
ALTER TABLE crm_actividades DROP CONSTRAINT IF EXISTS chk_crm_actividades_tipo;
ALTER TABLE crm_actividades ADD CONSTRAINT chk_crm_actividades_tipo
  CHECK (tipo IS NOT NULL AND length(btrim(tipo::text)) > 0);
