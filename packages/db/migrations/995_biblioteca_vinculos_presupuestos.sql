-- Migración 995: permitir vincular recursos de biblioteca a presupuestos de equipo
--
-- El CHECK constraint actual solo permite 'equipo' o 'producto'. Lo extendemos
-- para que el form de presupuesto pueda adjuntar documentos extra (e.g. ficha
-- técnica especial pedida por el cliente) y queden persistidos.

ALTER TABLE biblioteca_vinculos
  DROP CONSTRAINT IF EXISTS biblioteca_vinculos_entidad_tipo_check;

ALTER TABLE biblioteca_vinculos
  ADD CONSTRAINT biblioteca_vinculos_entidad_tipo_check
  CHECK (entidad_tipo = ANY (ARRAY['equipo'::text, 'producto'::text, 'presupuesto_equipo'::text]));
