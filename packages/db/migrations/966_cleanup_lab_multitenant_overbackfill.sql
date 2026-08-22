-- Migración 966: limpiar links fantasma en laboratorio_razones_sociales
--
-- La migración 963 backfilleó (cliente, lab) desde servicios pasados
-- (cualquier par cliente_id ↔ equipos_unidades.laboratorio_id que apareciera
-- en servicios). En labs multi-tenant (ANLIS, Katzman, CEDEAC España, INTA,
-- Wiener BA Delegación, "sin lab") esto creó decenas de hermanos falsos:
-- el lab tiene equipos físicamente, pero los servicios se facturan a
-- terceros que NO son razón social del lab.
--
-- Síntomas:
--   • Búsqueda de cliente "samaru" devuelve UTN/Ferrari/Racero/etc. porque
--     /api/clientes computa `aliases` con los nombres de hermanos via M:N.
--   • Detalle del cliente muestra labs que no le corresponden (Samaruga
--     aparecía con 3 labs en lugar de 2).
--
-- Fix: borrar los `es_principal=false AND activo=true` para todo lab que
-- tenga ≥3 hermanos secundarios activos. Conserva siempre el principal.
-- En el snapshot al aplicar son 7 labs (~76 filas).
--
-- Idempotente: re-ejecutar es no-op (no quedan filas que cumplan el filtro).

WITH labs_multitenant AS (
  SELECT laboratorio_id
  FROM laboratorio_razones_sociales
  WHERE activo = true AND es_principal = false
  GROUP BY laboratorio_id
  HAVING COUNT(*) >= 3
)
DELETE FROM laboratorio_razones_sociales lrs
USING labs_multitenant lm
WHERE lrs.laboratorio_id = lm.laboratorio_id
  AND lrs.es_principal = false
  AND lrs.activo = true;
