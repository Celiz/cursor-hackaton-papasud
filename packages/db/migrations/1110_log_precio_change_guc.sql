-- Reemplaza log_precio_change para estampar corrida_id/motivo/usuario desde GUCs.
-- current_setting(x, true) devuelve NULL si la variable no está seteada.
CREATE OR REPLACE FUNCTION public.log_precio_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_corrida uuid := NULLIF(current_setting('app.corrida_id', true), '')::uuid;
  v_motivo  text := NULLIF(current_setting('app.corrida_motivo', true), '');
  v_usuario uuid := NULLIF(current_setting('app.corrida_usuario', true), '')::uuid;
  v_tipo    text := CASE WHEN NULLIF(current_setting('app.corrida_id', true), '') IS NOT NULL
                         THEN 'bulk' ELSE 'manual' END;
BEGIN
  IF OLD.precio_costo IS DISTINCT FROM NEW.precio_costo THEN
    INSERT INTO historial_precios
      (org_id, producto_id, tipo_precio, precio_anterior, precio_nuevo, tipo, corrida_id, motivo_cambio, usuario_id)
    VALUES
      (NEW.org_id, NEW.id, 'costo', OLD.precio_costo, NEW.precio_costo, v_tipo, v_corrida, v_motivo, v_usuario);
  END IF;
  IF OLD.precio_venta IS DISTINCT FROM NEW.precio_venta THEN
    INSERT INTO historial_precios
      (org_id, producto_id, tipo_precio, precio_anterior, precio_nuevo, tipo, corrida_id, motivo_cambio, usuario_id)
    VALUES
      (NEW.org_id, NEW.id, 'venta', OLD.precio_venta, NEW.precio_venta, v_tipo, v_corrida, v_motivo, v_usuario);
  END IF;
  RETURN NEW;
END; $$;
