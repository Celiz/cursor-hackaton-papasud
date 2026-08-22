-- Migración 968: clientes.es_legacy
--
-- Hay clientes que son duplicados de importación (mismo CUIT, nombre
-- distinto) que no se pueden borrar porque servicios viejos los
-- referencian. Marcarlos `es_legacy = true` los oculta de los selectores
-- (wizard de nueva orden, búsqueda ⌘K) sin tocar el histórico: los
-- registros viejos siguen resolviendo el cliente por id.
--
-- Distinto de `activo`: activo=false = ex-cliente; es_legacy = duplicado
-- de importación que se conserva solo por estabilidad del histórico.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS es_legacy boolean NOT NULL DEFAULT false;
