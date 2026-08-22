-- Extiende la tabla `presupuestos` (originalmente CRM-driven, vinculada a
-- oportunidades de venta) para soportar también presupuestos de reparación
-- originados desde un servicio técnico.
--
-- La tabla ya tiene casi todo lo necesario: items, totales, validez,
-- firma del cliente, conversion a pedido y a factura. Solo falta:
--   - servicio_id (origen alternativo a oportunidad_id)
--   - convertido_a_ivr / ivr_id (el otro target de conversion)
--   - servicios.presupuesto_link para acceso rápido inverso
--
-- IDEMPOTENTE.

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS servicio_id UUID REFERENCES servicios(id) ON DELETE SET NULL;

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS convertido_a_ivr BOOLEAN DEFAULT false;

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS ivr_id UUID;

CREATE INDEX IF NOT EXISTS idx_presupuestos_org_servicio
  ON presupuestos (org_id, servicio_id)
  WHERE servicio_id IS NOT NULL;

-- Linkage rápido desde servicios al último presupuesto activo
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS presupuesto_link UUID;
CREATE INDEX IF NOT EXISTS idx_servicios_presupuesto_link
  ON servicios (presupuesto_link)
  WHERE presupuesto_link IS NOT NULL;
