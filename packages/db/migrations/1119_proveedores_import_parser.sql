-- 1119_proveedores_import_parser.sql
-- Override por proveedor del parser de importación de listas (PDF/Excel).
-- NULL = auto-detección por contenido del archivo. Ej: 'gematec' = PDF formato GEMATEC.
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS import_parser TEXT;

-- Dejar GEMATEC apuntando a su parser de PDF (igual la auto-detección lo reconoce).
UPDATE proveedores SET import_parser = 'gematec'
 WHERE import_parser IS NULL AND nombre ILIKE '%gematec%';
