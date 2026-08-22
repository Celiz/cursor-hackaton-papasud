-- El rebuild de aeterna2 dejó la tabla `equipos` sin varias columnas que el código
-- (form de equipo, POST/PATCH /api/equipos) espera. Faltaban, entre otras:
--   updated_at  -> el PATCH siempre hace `SET ... updated_at = NOW()` => TODA edición de
--                  equipo daba 500 y no guardaba.
--   activo / requiere_mantenimiento / frecuencia_mantenimiento_dias -> el form los manda
--                  siempre (no se borran por vacíos) => 500.
--   descripcion / numero_serie / notas / tags / manual_url / codigo / precio_compra /
--   fecha_vencimiento_garantia / proveedor_id / ubicacion_* -> 500 al guardarlos.
-- Restauramos las columnas (idempotente).
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS updated_at                    timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS codigo                        text,
  ADD COLUMN IF NOT EXISTS descripcion                   text,
  ADD COLUMN IF NOT EXISTS numero_serie                  text,
  ADD COLUMN IF NOT EXISTS manual_url                    text,
  ADD COLUMN IF NOT EXISTS notas                         text,
  ADD COLUMN IF NOT EXISTS tags                          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activo                        boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS requiere_mantenimiento        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frecuencia_mantenimiento_dias integer,
  ADD COLUMN IF NOT EXISTS precio_compra                 numeric,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_garantia    date,
  ADD COLUMN IF NOT EXISTS proveedor_id                  uuid,
  ADD COLUMN IF NOT EXISTS ubicacion_tipo                text,
  ADD COLUMN IF NOT EXISTS ubicacion_id                  uuid,
  ADD COLUMN IF NOT EXISTS ubicacion_detalle             text;
