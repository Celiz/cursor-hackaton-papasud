-- Migration 953: Presupuestos — IVA incluido, margen extra, cuenta bancaria
--
-- Permite que el operador (en oportunidad / presupuesto) decida si los precios
-- ya incluyen IVA, aplique un margen adicional sobre la lista, y referencie una
-- cuenta bancaria para la financiacion / forma de pago. Estos datos se usan
-- al renderizar el PDF y al armar la nota de venta.

ALTER TABLE public.presupuestos
  ADD COLUMN IF NOT EXISTS incluye_iva boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS margen_extra_porcentaje numeric(8,2),
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'presupuestos_cuenta_bancaria_id_fkey'
  ) THEN
    ALTER TABLE public.presupuestos
      ADD CONSTRAINT presupuestos_cuenta_bancaria_id_fkey
      FOREIGN KEY (cuenta_bancaria_id) REFERENCES public.cuentas_bancarias(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.presupuestos.incluye_iva IS
  'Si TRUE, los precios_unitarios ya incluyen el IVA. Si FALSE (default), el IVA se discrimina aparte.';
COMMENT ON COLUMN public.presupuestos.margen_extra_porcentaje IS
  'Margen adicional aplicado sobre el precio resultante de la lista. Suma sobre el margen de lista, no lo reemplaza.';
COMMENT ON COLUMN public.presupuestos.cuenta_bancaria_id IS
  'Cuenta bancaria sugerida al cliente para la transferencia / depósito.';

CREATE INDEX IF NOT EXISTS idx_presupuestos_cuenta_bancaria_id
  ON public.presupuestos(cuenta_bancaria_id) WHERE cuenta_bancaria_id IS NOT NULL;
