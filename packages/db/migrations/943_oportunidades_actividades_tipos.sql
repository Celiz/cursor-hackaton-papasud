-- Expand oportunidades_actividades.tipo CHECK constraint to include 'archivo' and 'tarea'
-- Used by CRM chatter panel for file attachments and scheduled tasks

ALTER TABLE oportunidades_actividades
  DROP CONSTRAINT IF EXISTS oportunidades_actividades_tipo_check;

ALTER TABLE oportunidades_actividades
  ADD CONSTRAINT oportunidades_actividades_tipo_check
  CHECK (tipo IN (
    'nota',
    'llamada',
    'email',
    'reunion',
    'tarea',
    'archivo',
    'etapa_cambio',
    'presupuesto_creado',
    'presupuesto_enviado',
    'ganada',
    'perdida'
  ));
