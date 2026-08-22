-- Migracion 962: Backfill implícito de relación lab ↔ cliente
--
-- Problema: en `CreateServicioDialogWizard`, cuando seleccionás un cliente,
-- el dropdown de Laboratorio filtra usando `laboratorio_razones_sociales`
-- (M:N formal). Pero hay 59 clientes en Uno (≈13% de los que tienen equipos)
-- cuyos equipos sí están en algún laboratorio via `equipos_unidades.laboratorio_id`,
-- pero el lab nunca se relacionó al cliente en la M:N — quedó "huérfano".
-- Resultado: el dialog muestra "Cliente sin laboratorios" y no podés crear
-- una nueva orden.
--
-- Esta migración infiere las relaciones faltantes desde los servicios pasados:
-- para cada (cliente, lab) que aparezca en `servicios → equipos_unidades`
-- pero no esté en `laboratorio_razones_sociales`, lo inserta como
-- es_principal=false, activo=true.
--
-- Idempotente: NOT EXISTS evita duplicados; re-ejecutable sin efectos secundarios.

INSERT INTO laboratorio_razones_sociales (org_id, laboratorio_id, cliente_id, es_principal, activo)
SELECT DISTINCT s.org_id, eu.laboratorio_id, s.cliente_id, false, true
FROM servicios s
JOIN equipos_unidades eu ON eu.id = s.equipo_id
WHERE s.cliente_id IS NOT NULL
  AND eu.laboratorio_id IS NOT NULL
  AND s.org_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM laboratorio_razones_sociales lrs
    WHERE lrs.laboratorio_id = eu.laboratorio_id
      AND lrs.cliente_id = s.cliente_id
  );
