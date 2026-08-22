-- Moneda por ítem de presupuesto de equipo. Hasta ahora la moneda se infería de la
-- del catálogo del equipo, lo que rompe los presupuestos MIXTOS (un equipo cotizado
-- en ARS y otro en USD) y los equipos cuya moneda de cotización difiere del catálogo:
-- el PDF agrupaba los totales por moneda de catálogo y sumaba mal.
-- Cada ítem ahora guarda su moneda real. Los ítems viejos quedan en NULL y el lector
-- cae a la moneda del catálogo (comportamiento previo).

ALTER TABLE presupuestos_equipos_items
  ADD COLUMN IF NOT EXISTS moneda text;
