-- Libreta de contactos personal por persona.
-- Cada persona sube sus contactos del celu (vCard o Contact Picker API)
-- y cuando ve un chat de WhatsApp, el número se resuelve contra su propia libreta.
-- Un mismo número puede tener nombres distintos para personas distintas — igual que en el celu.

CREATE TABLE IF NOT EXISTS persona_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  telefono TEXT NOT NULL,              -- formato crudo tal como venía
  telefono_digits TEXT NOT NULL,       -- solo dígitos, para matching
  nombre TEXT NOT NULL,                -- "Mamá", "Juan Plomero"
  email TEXT,
  empresa TEXT,                        -- campo ORG del vCard
  raw JSONB,                           -- vCard/entry completo por si hace falta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (persona_id, telefono_digits)
);

CREATE INDEX IF NOT EXISTS idx_persona_contactos_persona
  ON persona_contactos (persona_id);

-- Index crítico para el lookup en whatsapp_conversations:
-- matchear por los últimos 10 dígitos (evita lio de prefijos AR: 54 vs 549 vs 0)
CREATE INDEX IF NOT EXISTS idx_persona_contactos_digits_suffix
  ON persona_contactos (persona_id, RIGHT(telefono_digits, 10));
