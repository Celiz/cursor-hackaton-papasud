-- Área / línea de análisis de laboratorio para productos (hematología, química
-- clínica, iones, coagulación, etc.). Clasificación semi-automática por reglas
-- sobre el nombre (ver scripts/clasificar-linea-analisis.sql) + repaso manual
-- editable desde el form de producto.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS linea_analisis text;

CREATE INDEX IF NOT EXISTS idx_productos_linea_analisis
  ON productos (org_id, linea_analisis)
  WHERE linea_analisis IS NOT NULL;
