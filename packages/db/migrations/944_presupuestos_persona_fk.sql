-- presupuestos: cliente_id opcional + persona_id como destinatario alternativo.
-- Mirror de la migración 936 para presupuestos_equipos. Mismo patrón:
-- si la oportunidad aún no tiene cliente formal, el presupuesto general apunta a la persona
-- (contacto) de la oportunidad. Cuando se formaliza como cliente, se puede migrar.

-- cliente_id ya es nullable en presupuestos; confirmamos por si acaso
ALTER TABLE presupuestos
  ALTER COLUMN cliente_id DROP NOT NULL;

ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id);

CREATE INDEX IF NOT EXISTS idx_presupuestos_persona
  ON presupuestos(persona_id);

-- Invariante: al menos uno de los dos (cliente o persona) debe estar seteado
-- NOT VALID para no romper datos históricos sin cliente_id.
ALTER TABLE presupuestos
  DROP CONSTRAINT IF EXISTS presupuestos_destinatario_check;

ALTER TABLE presupuestos
  ADD CONSTRAINT presupuestos_destinatario_check
  CHECK (cliente_id IS NOT NULL OR persona_id IS NOT NULL)
  NOT VALID;
