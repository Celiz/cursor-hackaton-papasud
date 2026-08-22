-- Financiación en presupuestos_equipos (mismo modelo que presupuestos, mig 1012):
-- cuotas + interés (% total sobre el monto). forma_pago pasa a 'contado'|'financiado'.

ALTER TABLE presupuestos_equipos ADD COLUMN IF NOT EXISTS financiacion_cuotas integer;
ALTER TABLE presupuestos_equipos ADD COLUMN IF NOT EXISTS interes_porcentaje numeric;
