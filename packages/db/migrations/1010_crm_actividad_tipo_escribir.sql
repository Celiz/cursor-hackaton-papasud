-- Agregar el tipo de actividad CRM 'escribir' al CHECK constraint.
--
-- crm_actividades.tipo tiene un CHECK que limita los valores permitidos. Para
-- soportar la nueva actividad "Escribir" hay que incluirla, si no el INSERT
-- falla con violación de constraint.

ALTER TABLE crm_actividades DROP CONSTRAINT IF EXISTS chk_crm_actividades_tipo;

ALTER TABLE crm_actividades ADD CONSTRAINT chk_crm_actividades_tipo
  CHECK (tipo::text = ANY (ARRAY[
    'llamada','email','reunion_online','visita','enviar_presupuesto',
    'instalacion','capacitacion','seguimiento','escribir'
  ]::text[]));
