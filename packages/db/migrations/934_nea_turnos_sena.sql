-- 934_nea_turnos_sena.sql
-- Soporte para seña online al reservar turno (cobro_reserva flag).
--
-- Agrega:
--   - monto_sena: monto a cobrar como seña al reservar (NULL = sin seña requerida)
--   - estado 'pendiente_sena': turno reservado pero esperando confirmación de pago
--
-- El webhook de MP, al recibir un pago con external_reference="nerea-{org}-sena-{turno_id}",
-- pasa el turno a 'confirmado' y crea el cobro vinculado.

ALTER TABLE nea_turnos ADD COLUMN IF NOT EXISTS monto_sena NUMERIC(12,2);

ALTER TABLE nea_turnos DROP CONSTRAINT IF EXISTS nea_turnos_estado_check;
ALTER TABLE nea_turnos
  ADD CONSTRAINT nea_turnos_estado_check
    CHECK (estado IN (
      'reservado','confirmado','en_curso','completado','cancelado','no_show','pendiente_sena'
    ));
