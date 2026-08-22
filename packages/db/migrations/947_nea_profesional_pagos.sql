-- Liquidaciones y pagos a profesionales, más facturas que el profesional emite al estudio.
-- Permite trackear cuánto le toca cobrar, cuánto se le pagó, y guardar comprobantes PDF.

-- ─────────────────────────────────────────────────────────────
-- LIQUIDACIONES: período de cobro (ej: "abril 2026")
-- Representa lo que le toca cobrar al profesional por su trabajo en un período.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nea_profesional_liquidaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profesional_id    uuid NOT NULL REFERENCES nea_profesionales(id) ON DELETE CASCADE,
  periodo_desde     date NOT NULL,
  periodo_hasta     date NOT NULL,
  concepto          varchar(200),                    -- "Clases abril", "Sesiones marzo"
  monto_bruto       numeric(12,2) NOT NULL DEFAULT 0,
  monto_retenciones numeric(12,2) NOT NULL DEFAULT 0,
  monto_neto        numeric(12,2) GENERATED ALWAYS AS (monto_bruto - monto_retenciones) STORED,
  monto_pagado      numeric(12,2) NOT NULL DEFAULT 0,
  estado            varchar(20) NOT NULL DEFAULT 'pendiente', -- pendiente | parcial | pagado
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liq_estado_chk CHECK (estado IN ('pendiente', 'parcial', 'pagado')),
  CONSTRAINT liq_periodo_chk CHECK (periodo_hasta >= periodo_desde)
);

CREATE INDEX IF NOT EXISTS idx_nea_liq_org_prof
  ON nea_profesional_liquidaciones (org_id, profesional_id, periodo_desde DESC);
CREATE INDEX IF NOT EXISTS idx_nea_liq_estado
  ON nea_profesional_liquidaciones (org_id, estado) WHERE estado != 'pagado';

-- ─────────────────────────────────────────────────────────────
-- PAGOS: cada pago parcial/total de una liquidación.
-- Soporta PDF del comprobante de transferencia.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nea_profesional_pagos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  liquidacion_id   uuid NOT NULL REFERENCES nea_profesional_liquidaciones(id) ON DELETE CASCADE,
  profesional_id   uuid NOT NULL REFERENCES nea_profesionales(id) ON DELETE CASCADE,
  fecha            date NOT NULL,
  monto            numeric(12,2) NOT NULL,
  metodo           varchar(40),                     -- transferencia, efectivo, mercadopago...
  referencia       varchar(120),                    -- # de operación bancaria
  comprobante_url  text,                             -- PDF/imagen de transferencia
  notas            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_pp_liquidacion
  ON nea_profesional_pagos (liquidacion_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_nea_pp_prof
  ON nea_profesional_pagos (org_id, profesional_id, fecha DESC);

-- Trigger: al crear/modificar/eliminar un pago, recalcular monto_pagado + estado de la liquidación
CREATE OR REPLACE FUNCTION nea_liq_recalc() RETURNS trigger AS $$
DECLARE
  liq_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    liq_id := OLD.liquidacion_id;
  ELSE
    liq_id := NEW.liquidacion_id;
  END IF;

  UPDATE nea_profesional_liquidaciones
  SET monto_pagado = COALESCE((
      SELECT SUM(monto) FROM nea_profesional_pagos WHERE liquidacion_id = liq_id
    ), 0),
    estado = CASE
      WHEN COALESCE((SELECT SUM(monto) FROM nea_profesional_pagos WHERE liquidacion_id = liq_id), 0) <= 0 THEN 'pendiente'
      WHEN COALESCE((SELECT SUM(monto) FROM nea_profesional_pagos WHERE liquidacion_id = liq_id), 0) >= monto_neto THEN 'pagado'
      ELSE 'parcial'
    END,
    updated_at = now()
  WHERE id = liq_id;

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nea_pp_recalc_trg ON nea_profesional_pagos;
CREATE TRIGGER nea_pp_recalc_trg
AFTER INSERT OR UPDATE OR DELETE ON nea_profesional_pagos
FOR EACH ROW EXECUTE FUNCTION nea_liq_recalc();

-- ─────────────────────────────────────────────────────────────
-- FACTURAS: comprobantes que el profesional emite al estudio.
-- (El profesional es monotributista, emite factura al estudio por honorarios.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nea_profesional_facturas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES nea_profesionales(id) ON DELETE CASCADE,
  liquidacion_id uuid REFERENCES nea_profesional_liquidaciones(id) ON DELETE SET NULL,
  fecha_emision  date NOT NULL,
  numero         varchar(40),                     -- "A-0001-00001234"
  tipo           varchar(20),                     -- A, B, C, Monotributo
  monto_neto     numeric(12,2),
  monto_iva      numeric(12,2) NOT NULL DEFAULT 0,
  monto_total    numeric(12,2) NOT NULL,
  pdf_url        text,
  notas          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nea_pf_prof
  ON nea_profesional_facturas (org_id, profesional_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_nea_pf_liquidacion
  ON nea_profesional_facturas (liquidacion_id);
