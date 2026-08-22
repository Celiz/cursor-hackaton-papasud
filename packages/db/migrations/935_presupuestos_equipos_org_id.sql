-- presupuestos_equipos: agregar org_id (tabla vacía, se puede poner NOT NULL directo)
ALTER TABLE presupuestos_equipos
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Tabla está vacía hoy, pero por seguridad si hubiera filas (ambientes paralelos)
-- hacemos UPDATE + NOT NULL en dos pasos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM presupuestos_equipos WHERE org_id IS NULL) THEN
    -- Heredar org_id del cliente asociado
    UPDATE presupuestos_equipos pe
    SET org_id = c.org_id
    FROM clientes c
    WHERE pe.cliente_id = c.id AND pe.org_id IS NULL;
  END IF;
END $$;

ALTER TABLE presupuestos_equipos
  ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presupuestos_equipos_org
  ON presupuestos_equipos(org_id);
