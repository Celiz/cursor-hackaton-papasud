-- Migración 964: Backfill legacy razon_social_id → laboratorio_razones_sociales
--
-- Problema: hay laboratorios que tienen `razon_social_id` legacy (1:1) pero
-- nunca quedaron registrados en la M:N `laboratorio_razones_sociales`. La
-- vista `v_laboratorios_con_razones` solo mira la M:N, así que devuelve
-- `razon_social_principal_id = NULL` y `razones_sociales = []` para esos labs.
-- Resultado: en el dropdown de "Nueva orden de servicio" el cliente aparece
-- como "Cliente sin laboratorios" aunque tenga un lab vinculado por legacy.
--
-- En Uno Electromedicina: 3 labs huérfanos (Veterinaria Lahuen Co, los dos
-- Hospital Oncológico de Lanús). La migración 963 backfilea inferido por
-- servicios, esta backfilea desde el legacy razon_social_id que sigue siendo
-- la fuente de verdad para muchos labs antiguos.
--
-- Idempotente: NOT EXISTS evita duplicados.

INSERT INTO laboratorio_razones_sociales (org_id, laboratorio_id, cliente_id, es_principal, activo)
SELECT l.org_id, l.id, l.razon_social_id, true, true
FROM laboratorios l
WHERE l.razon_social_id IS NOT NULL
  AND l.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM laboratorio_razones_sociales lrs
    WHERE lrs.laboratorio_id = l.id
      AND lrs.cliente_id = l.razon_social_id
  );
