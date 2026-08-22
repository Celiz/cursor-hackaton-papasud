-- Agrupamiento de clases multi-día y asistencia parcial de alumnos.
-- Una "clase" que se dicta Lun+Mié+Vie se representa como 3 filas en nea_clases
-- unidas por un mismo grupo_id, lo que permite editar/eliminar el bundle.
-- Además, los planes de alumnos pueden restringir a qué días del grupo asiste el alumno.

ALTER TABLE nea_clases
  ADD COLUMN IF NOT EXISTS grupo_id uuid;

CREATE INDEX IF NOT EXISTS idx_nea_clases_grupo
  ON nea_clases (grupo_id) WHERE grupo_id IS NOT NULL;

-- Backfill: cada clase existente obtiene su propio grupo_id (grupo de 1)
UPDATE nea_clases
SET grupo_id = gen_random_uuid()
WHERE grupo_id IS NULL;

-- dias_permitidos: array de días de la semana (0=dom..6=sab) a los que el alumno
-- del plan puede asistir del grupo. NULL = sin restricción (todos los días del grupo).
ALTER TABLE nea_alumno_planes
  ADD COLUMN IF NOT EXISTS dias_permitidos int[];
