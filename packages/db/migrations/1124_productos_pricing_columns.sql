-- Pricing con paridad equipos para productos/insumos.
-- productos ya tiene precio_costo, precio_venta, moneda (venta), y GENERATED
-- margen_pesos / margen_porcentaje (se mantienen para tabla/reporting).
-- Faltan los campos editables del modelo equipos:
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ganancia numeric(8,2);                              -- markup % sobre costo
ALTER TABLE productos ADD COLUMN IF NOT EXISTS iva_alicuota numeric(5,2) DEFAULT 21;               -- alícuota IVA %
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_venta_modo varchar(20) DEFAULT 'calculado';  -- 'calculado' | 'fijo'
ALTER TABLE productos ADD COLUMN IF NOT EXISTS moneda_compra varchar(3) DEFAULT 'ARS';             -- moneda del costo
