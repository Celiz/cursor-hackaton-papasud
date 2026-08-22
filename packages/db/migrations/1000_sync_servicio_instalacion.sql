-- Sincronización por hito entre servicios (órdenes) e instalaciones vinculadas.
-- Mapeo (dos baldes):
--   instalación en cualquier paso previo  <->  servicio 'Próxima instalación'
--   instalación 'completada'              <->  servicio 'Instalado'
-- Anti-loop: cada UPDATE lleva `estado IS DISTINCT FROM <objetivo>`, así que
-- cuando el valor ya coincide no re-dispara.

-- Balde "cerrado" de servicios (una orden en estos estados no se degrada).
-- Terminal real (facturado/finalizado/garantía) tampoco se reabre.

-- 1) Instalación -> Servicio
CREATE OR REPLACE FUNCTION trg_instalacion_sync_servicio()
RETURNS trigger AS $$
BEGIN
  IF NEW.servicio_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.estado = 'completada' THEN
    -- Instalación completada -> orden 'Instalado' (salvo que ya esté cerrada).
    UPDATE servicios s
       SET estado = 'Instalado'
     WHERE s.id = NEW.servicio_id
       AND s.estado IS DISTINCT FROM 'Instalado'
       AND s.estado NOT IN (
         'Instalado','Listo/Reparado','Finalizado','Facturado',
         'Reacondicionado/Listo','Reparado/garantía de reparación'
       );
  ELSE
    -- Instalación en curso -> orden 'Próxima instalación' (no reabre terminales).
    UPDATE servicios s
       SET estado = 'Próxima instalación'
     WHERE s.id = NEW.servicio_id
       AND s.estado IS DISTINCT FROM 'Próxima instalación'
       AND s.estado NOT IN (
         'Finalizado','Facturado',
         'Reacondicionado/Listo','Reparado/garantía de reparación'
       );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS instalacion_sync_servicio ON instalaciones;
CREATE TRIGGER instalacion_sync_servicio
  AFTER UPDATE OF estado ON instalaciones
  FOR EACH ROW
  EXECUTE FUNCTION trg_instalacion_sync_servicio();

-- 2) Servicio -> Instalación
CREATE OR REPLACE FUNCTION trg_servicio_sync_instalacion()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM instalaciones WHERE servicio_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF NEW.estado IN (
       'Instalado','Listo/Reparado','Finalizado','Facturado',
       'Reacondicionado/Listo','Reparado/garantía de reparación'
     ) THEN
    -- Orden cerrada/instalada -> instalación 'completada'.
    UPDATE instalaciones i
       SET estado = 'completada'
     WHERE i.servicio_id = NEW.id
       AND i.estado IS DISTINCT FROM 'completada';
  ELSIF NEW.estado = 'Próxima instalación' THEN
    -- Orden vuelta a "en curso": solo reabrir si la instalación estaba
    -- completada (no pisar el avance de materiales/programación).
    UPDATE instalaciones i
       SET estado = 'en_progreso'
     WHERE i.servicio_id = NEW.id
       AND i.estado = 'completada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS servicio_sync_instalacion ON servicios;
CREATE TRIGGER servicio_sync_instalacion
  AFTER UPDATE OF estado ON servicios
  FOR EACH ROW
  EXECUTE FUNCTION trg_servicio_sync_instalacion();
