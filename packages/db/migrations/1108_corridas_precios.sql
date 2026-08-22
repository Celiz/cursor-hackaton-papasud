-- Corridas de precios: agrupan todos los cambios de una operación masiva
-- (aplicar lista de proveedor, ajuste por %, etc.) para auditarlas y revertirlas.
CREATE TABLE IF NOT EXISTS public.corridas_precios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  tipo varchar(30) NOT NULL, -- aplicar_lista | ajuste_porcentaje | margen | precio_fijo | reversion
  lista_id uuid REFERENCES public.proveedor_listas_precios(id) ON DELETE SET NULL,
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  descripcion text NOT NULL,
  productos_afectados integer NOT NULL DEFAULT 0,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revertida_at timestamptz,
  revertida_por uuid,
  reversion_de_corrida_id uuid REFERENCES public.corridas_precios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_corridas_precios_org_created
  ON public.corridas_precios (org_id, created_at DESC);

-- Vincula cada cambio individual del historial a su corrida.
ALTER TABLE public.historial_precios
  ADD COLUMN IF NOT EXISTS corrida_id uuid REFERENCES public.corridas_precios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_historial_precios_corrida
  ON public.historial_precios (corrida_id);
