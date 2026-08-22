-- Conectar email_contactos al CRM.
-- Antes los email_contactos eran texto plano (email, nombre, empresa). Ahora cada
-- contacto puede anclarse a una persona del CRM y opcionalmente a un cliente.
-- Si no hay vínculo, queda como "potencial" para trabajar como lead.

ALTER TABLE email_contactos
  ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS es_potencial BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_email_contactos_persona ON email_contactos (persona_id);
CREATE INDEX IF NOT EXISTS idx_email_contactos_cliente ON email_contactos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_email_contactos_potencial ON email_contactos (org_id) WHERE es_potencial = true;

-- Backfill: matchear por email contra clientes.email[]
UPDATE email_contactos ec
SET cliente_id = c.id
FROM clientes c
WHERE ec.cliente_id IS NULL
  AND c.org_id = ec.org_id
  AND lower(ec.email) = ANY (
    SELECT lower(trim(e)) FROM unnest(c.email) e WHERE e <> ''
  );

-- Lo que quedó sin cliente se marca como potencial
UPDATE email_contactos
SET es_potencial = true
WHERE cliente_id IS NULL AND persona_id IS NULL;
