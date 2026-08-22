-- Override por proveedor de los plazos de aviso de vencimiento.
-- NULL = usar el default global (org.config.listas_precios o el default de código).
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS dias_aviso_vencimiento integer,
  ADD COLUMN IF NOT EXISTS dias_antiguedad_aviso integer;
