-- 909: Normalize clientes.estado values
--
-- Context: clientes.estado is free text. In Uno production, 1657 rows use "En Orden"
-- (the de-facto default) while only ~10 legacy rows use "Activo"/"activo".
-- The new EstadoCombobox UI uses "En Orden" as the green/default state and treats
-- any non-preset value as a yellow "warning". Normalize legacy values so the UI
-- renders them as default-green instead of falling through to warning.

BEGIN;

UPDATE clientes
SET estado = 'En Orden'
WHERE estado IN ('Activo', 'activo', 'ACTIVO');

COMMIT;
