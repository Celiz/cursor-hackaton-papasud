-- Migración 965: equipos_unidades.numero_serie nullable
--
-- El modal QuickAddEquipoDialog (apps/estudio) marca "Número de Serie
-- (opcional)" y el frontend envía null si está vacío, pero la columna
-- era NOT NULL desde el baseline. Resultado: error
-- "null value in column numero_serie ... violates not-null constraint"
-- al agregar un equipo nuevo a un cliente sin tener serie todavía.
--
-- No hay índice unique sobre numero_serie, así que permitir NULL es seguro.

ALTER TABLE equipos_unidades
  ALTER COLUMN numero_serie DROP NOT NULL;
