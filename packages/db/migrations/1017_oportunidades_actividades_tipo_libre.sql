-- El timeline de una oportunidad (oportunidades_actividades) registra eventos, entre
-- ellos "actividad completada", copiando el tipo de la actividad CRM (crm_actividades.tipo).
-- Ese CHECK solo permitía 11 tipos legacy (nota/llamada/email/reunion/...), pero los tipos
-- de actividad CRM son otros (seguimiento, visita, instalacion, reunion_online, ...) más los
-- custom (custom_*, mig. 1016). Al completar, el INSERT violaba el CHECK → 500, aunque el
-- UPDATE de crm_actividades ya había marcado la actividad como completada ("se completa igual").
-- Se reemplaza por un CHECK permisivo (texto no vacío), consistente con mig. 1016. El render
-- del timeline ya tolera tipos desconocidos (fallback de ícono).
ALTER TABLE oportunidades_actividades DROP CONSTRAINT IF EXISTS oportunidades_actividades_tipo_check;
ALTER TABLE oportunidades_actividades ADD CONSTRAINT oportunidades_actividades_tipo_check
  CHECK (tipo IS NOT NULL AND length(btrim(tipo::text)) > 0);
