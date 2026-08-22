-- Datos de pago del profesional (para liquidaciones / transferencias).
-- CUIT: monotributo o responsable inscripto que emite factura al estudio.
-- CVU: cuenta virtual uniforme (MP, Ualá, etc) — equivalente funcional al CBU.
-- Alias bancario: alias.punto.separado que identifica la cuenta de destino.

ALTER TABLE nea_profesionales
  ADD COLUMN IF NOT EXISTS cuit            varchar(20),
  ADD COLUMN IF NOT EXISTS cvu             varchar(30),
  ADD COLUMN IF NOT EXISTS alias_bancario  varchar(40);
