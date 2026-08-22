-- Migración 971: limpiar sedes fantasma de WIENER LABORATORIOS S.A.I.C.
--
-- Causa raíz: la migración 963 (963_backfill_lab_cliente_implicitos.sql,
-- aplicada 2026-05-19 17:40) infirió relaciones cliente↔lab desde `servicios`:
-- por cada par (servicios.cliente_id, equipos_unidades.laboratorio_id) que
-- apareciera en un servicio pasado insertó una fila en
-- `laboratorio_razones_sociales` con es_principal=false. Pero un servicio
-- facturado a Wiener para un equipo que físicamente vive en el lab de un
-- tercero (Laboratorio Curbelo, Ministerio de Salud de Chubut, Hospital
-- Zonal de Lobos) NO convierte a Wiener en razón social de ese lab.
--
-- La migración 966 sólo limpió labs con ≥3 hermanos secundarios; estos 3 labs
-- no llegaban al umbral y sobrevivieron. La 967 re-vincula por propiedad de
-- equipos (equipos_unidades.cliente_id + laboratorio_id) y Wiener no posee
-- equipos en esos labs, así que tampoco los re-agrega ni los limpia.
--
-- Síntoma: el dropdown "Laboratorio" en Nueva Orden de Servicio mostraba 5
-- sedes para WIENER LABORATORIOS S.A.I.C. cuando sólo corresponde la
-- "Delegacion Buenos Aires" (única donde Wiener efectivamente tiene equipos).
--
-- Fix: desvincular del cliente Wiener S.A.I.C. toda sede donde no posea
-- equipos. El criterio de pertenencia es la propiedad de equipos, igual que
-- en la migración 967, no la facturación de servicios a terceros.
--
-- Idempotente: re-ejecutar es no-op (las filas fantasma ya no existen).

DELETE FROM laboratorio_razones_sociales lrs
USING clientes c
WHERE lrs.cliente_id = c.id
  AND c.nombre = 'WIENER LABORATORIOS S.A.I.C.'
  AND c.cuit = '30-52222821-0'
  AND NOT EXISTS (
    SELECT 1 FROM equipos_unidades eu
    WHERE eu.cliente_id = lrs.cliente_id
      AND eu.laboratorio_id = lrs.laboratorio_id
  );
