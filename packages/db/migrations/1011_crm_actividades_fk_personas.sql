-- Repuntar las FKs de crm_actividades de users(id) → personas(id).
--
-- La tabla `users` está vacía y sin uso; los "miembros del equipo" (selector de
-- Asignado) son personas. Las FKs apuntaban a users(id), por lo que asignado_id/
-- created_by/completada_por nunca se podían setear (quedaban en NULL) y había
-- algún id huérfano. Las repuntamos a personas(id) para poder registrar el dueño
-- real de cada actividad y poder filtrar "solo las mías".

ALTER TABLE crm_actividades DROP CONSTRAINT IF EXISTS crm_actividades_asignado_id_fkey;
ALTER TABLE crm_actividades DROP CONSTRAINT IF EXISTS crm_actividades_created_by_fkey;
ALTER TABLE crm_actividades DROP CONSTRAINT IF EXISTS crm_actividades_completada_por_fkey;

-- Limpiar valores que no corresponden a ninguna persona (huérfanos de users).
UPDATE crm_actividades SET asignado_id = NULL
 WHERE asignado_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM personas p WHERE p.id = crm_actividades.asignado_id);
UPDATE crm_actividades SET created_by = NULL
 WHERE created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM personas p WHERE p.id = crm_actividades.created_by);
UPDATE crm_actividades SET completada_por = NULL
 WHERE completada_por IS NOT NULL AND NOT EXISTS (SELECT 1 FROM personas p WHERE p.id = crm_actividades.completada_por);

ALTER TABLE crm_actividades ADD CONSTRAINT crm_actividades_asignado_id_fkey
  FOREIGN KEY (asignado_id) REFERENCES personas(id) ON DELETE SET NULL;
ALTER TABLE crm_actividades ADD CONSTRAINT crm_actividades_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES personas(id) ON DELETE SET NULL;
ALTER TABLE crm_actividades ADD CONSTRAINT crm_actividades_completada_por_fkey
  FOREIGN KEY (completada_por) REFERENCES personas(id) ON DELETE SET NULL;
