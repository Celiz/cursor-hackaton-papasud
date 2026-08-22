-- Financiación en presupuestos: cantidad de cuotas + interés (% total sobre el
-- monto). Reemplaza el dropdown de formas de pago fijas por campos libres con
-- cálculo automático del valor de cuota. forma_pago pasa a ser 'contado' |
-- 'financiado'.

ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS financiacion_cuotas integer;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS interes_porcentaje numeric;
