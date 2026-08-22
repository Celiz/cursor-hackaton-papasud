-- 932_nerea_pagos_entrantes.sql
-- Cobros automáticos por MercadoPago: tabla de pagos entrantes + extensión de cobros.
--
-- NOTA: el CHECK cobros_target_check se aplica como NOT VALID porque hay 53 filas
-- históricas con todos los target columns en NULL (cobros sueltos / adelantos sin
-- factura asociada). NOT VALID asegura que todas las filas nuevas/modificadas cumplan
-- el constraint sin romper datos históricos. Si en el futuro se hace cleanup de las
-- filas históricas, se puede VALIDATE el constraint:
--   ALTER TABLE cobros VALIDATE CONSTRAINT cobros_target_check;

CREATE TABLE IF NOT EXISTS pagos_entrantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  provider VARCHAR(30) NOT NULL,
  provider_payment_id VARCHAR(100) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  moneda VARCHAR(5) NOT NULL DEFAULT 'ARS',
  fecha_pago TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','imputado','ignorado','rechazado')),
  payer_email VARCHAR(200),
  payer_nombre VARCHAR(200),
  payer_doc_tipo VARCHAR(10),
  payer_doc_numero VARCHAR(30),
  payer_descripcion TEXT,
  external_reference VARCHAR(200),
  payment_method VARCHAR(30),
  payment_type VARCHAR(30),
  match_candidates JSONB NOT NULL DEFAULT '[]',
  cobro_id UUID,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_pagos_entrantes_org_estado
  ON pagos_entrantes(org_id, estado, fecha_pago DESC);

ALTER TABLE cobros
  ALTER COLUMN factura_id DROP NOT NULL;

ALTER TABLE cobros ADD COLUMN IF NOT EXISTS alumno_plan_id UUID REFERENCES nea_alumno_planes(id);
ALTER TABLE cobros ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES nea_turnos(id);
ALTER TABLE cobros ADD COLUMN IF NOT EXISTS pago_entrante_id UUID REFERENCES pagos_entrantes(id);
ALTER TABLE cobros ADD COLUMN IF NOT EXISTS match_method VARCHAR(20);
ALTER TABLE cobros ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2);

ALTER TABLE cobros DROP CONSTRAINT IF EXISTS cobros_target_check;
ALTER TABLE cobros
  ADD CONSTRAINT cobros_target_check
    CHECK (factura_id IS NOT NULL OR alumno_plan_id IS NOT NULL OR turno_id IS NOT NULL) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_cobros_alumno_plan
  ON cobros(alumno_plan_id) WHERE alumno_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cobros_turno
  ON cobros(turno_id) WHERE turno_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cobros_pago_entrante
  ON cobros(pago_entrante_id) WHERE pago_entrante_id IS NOT NULL;

ALTER TABLE pagos_entrantes
  DROP CONSTRAINT IF EXISTS pagos_entrantes_cobro_fk;
ALTER TABLE pagos_entrantes
  ADD CONSTRAINT pagos_entrantes_cobro_fk
    FOREIGN KEY (cobro_id) REFERENCES cobros(id);

CREATE INDEX IF NOT EXISTS idx_pagos_entrantes_cobro
  ON pagos_entrantes(cobro_id) WHERE cobro_id IS NOT NULL;
