-- 920: La dirección de una instalación siempre vive en un laboratorio (sede).
-- Agregamos FK opcional a laboratorios en instalaciones y oportunidades_venta.
-- Mantenemos direccion_instalacion como override libre (para instalaciones
-- históricas o casos donde el cliente no tiene laboratorio cargado aún).

BEGIN;

-- instalaciones
ALTER TABLE instalaciones
  ADD COLUMN IF NOT EXISTS laboratorio_id UUID REFERENCES laboratorios(id);

CREATE INDEX IF NOT EXISTS idx_instalaciones_laboratorio
  ON instalaciones(laboratorio_id);

-- direccion_instalacion ya no es requerida: puede venir del laboratorio.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instalaciones'
      AND column_name = 'direccion_instalacion'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE instalaciones ALTER COLUMN direccion_instalacion DROP NOT NULL;
  END IF;
END $$;

-- oportunidades_venta
ALTER TABLE oportunidades_venta
  ADD COLUMN IF NOT EXISTS laboratorio_id UUID REFERENCES laboratorios(id);

CREATE INDEX IF NOT EXISTS idx_oportunidades_laboratorio
  ON oportunidades_venta(laboratorio_id);

COMMIT;
