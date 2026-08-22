-- 980_nea_finanzas.sql
-- Sección Finanzas de Nérea: capa de cálculo automático de liquidaciones.
-- El modelo base (liquidaciones, pagos, facturas, comisiones) ya existe en 947/950/952.
-- Esto agrega lo necesario para calcular solo cuánto le toca a cada profesional.

-- ─────────────────────────────────────────────────────────────
-- Comisiones por disciplina: modo de pago.
--   'porcentaje' → comision_pct % de lo recaudado de esa disciplina
--   'fijo'       → tarifa_fija $ por cada clase dictada
-- ─────────────────────────────────────────────────────────────
ALTER TABLE nea_profesional_comisiones
  ADD COLUMN IF NOT EXISTS modo varchar(12) NOT NULL DEFAULT 'porcentaje'
    CHECK (modo IN ('porcentaje', 'fijo')),
  ADD COLUMN IF NOT EXISTS tarifa_fija numeric(12,2) NOT NULL DEFAULT 0
    CHECK (tarifa_fija >= 0);

-- ─────────────────────────────────────────────────────────────
-- Comisión del profesional sobre turnos (lado medspa).
-- % sobre el precio del servicio de cada turno completado.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE nea_profesionales
  ADD COLUMN IF NOT EXISTS comision_turnos_pct numeric(5,2) NOT NULL DEFAULT 0
    CHECK (comision_turnos_pct >= 0 AND comision_turnos_pct <= 100);

-- ─────────────────────────────────────────────────────────────
-- Desglose del cálculo automático guardado en la liquidación,
-- para que se pueda auditar de dónde salió el monto bruto.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE nea_profesional_liquidaciones
  ADD COLUMN IF NOT EXISTS detalle jsonb;
