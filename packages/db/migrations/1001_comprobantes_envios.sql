-- 1001_comprobantes_envios.sql
-- Log genérico de envíos por email de comprobantes (cobros IVR, facturas,
-- presupuestos, remitos, etc). Reusa: una sola tabla por org_id + entidad.
--
-- entidad_tipo es texto libre para evitar acoplar a un enum; convenciones:
--   'cobro_ivr'   -> tabla pagos
--   'factura'     -> tabla facturas
--   'presupuesto' -> tabla presupuestos
--   'remito'      -> tabla remitos
--   'cobro_ivr_cuenta_corriente' -> snapshot CC IVR

CREATE TABLE IF NOT EXISTS comprobantes_envios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entidad_tipo    text NOT NULL,
  entidad_id      uuid NOT NULL,
  destinatarios   text[] NOT NULL,
  subject         text,
  body            text,
  estado          text NOT NULL DEFAULT 'enviado'
                    CHECK (estado IN ('enviado', 'fallido', 'pendiente')),
  error_mensaje   text,
  enviado_por     uuid REFERENCES personas(id) ON DELETE SET NULL,
  enviado_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_envios_entidad
  ON comprobantes_envios (org_id, entidad_tipo, entidad_id, enviado_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprobantes_envios_org_fecha
  ON comprobantes_envios (org_id, enviado_at DESC);
