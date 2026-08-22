-- presupuestos_equipos: cliente_id opcional + persona_id como destinatario alternativo.
-- Uso: si la oportunidad aun no tiene cliente formal, el presupuesto apunta a la persona
-- (contacto) de la oportunidad. Cuando se formaliza como cliente, se puede migrar.

ALTER TABLE presupuestos_equipos
  ALTER COLUMN cliente_id DROP NOT NULL;

ALTER TABLE presupuestos_equipos
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id);

CREATE INDEX IF NOT EXISTS idx_presupuestos_equipos_persona
  ON presupuestos_equipos(persona_id);

-- Invariante: al menos uno de los dos (cliente o persona) debe estar seteado
ALTER TABLE presupuestos_equipos
  DROP CONSTRAINT IF EXISTS presupuestos_equipos_destinatario_check;

ALTER TABLE presupuestos_equipos
  ADD CONSTRAINT presupuestos_equipos_destinatario_check
  CHECK (cliente_id IS NOT NULL OR persona_id IS NOT NULL);
