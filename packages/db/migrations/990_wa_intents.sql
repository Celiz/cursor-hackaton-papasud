-- ============================================================================
-- 990: WhatsApp Intents — mensajes generados por LLM (gemma4) en lugar de
-- templates estáticos. Cada intent es un "brief" que describe cómo redactar
-- un mensaje para un caso específico (recordatorio, bienvenida, etc.).
--
-- El LLM compone: brand_voice (de la org) + brief + contexto (datos del
-- evento) → mensaje en texto plano listo para mandar por WhatsApp Bridge.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wa_intents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  slug            text NOT NULL,
  nombre          text NOT NULL,
  descripcion     text,

  -- Brief de redacción para el LLM (en lenguaje natural).
  -- Ej: "Recordá con cariño al alumno que mañana tiene clase. Tono cálido,
  --      argentino informal. Mencioná clase, hora y profe. Pedile que avise
  --      si no puede ir. Máximo 4 líneas. No saludes con 'Hola X', empezá directo."
  prompt_brief    text NOT NULL,

  -- Variables esperadas en el contexto al disparar el intent.
  -- Ej: ['nombre', 'clase', 'dia', 'hora', 'profe']
  variables       text[] DEFAULT '{}',

  -- Evento que dispara este intent (NULL = solo envío manual).
  -- Coincide con EVENTOS_DISPONIBLES de email-core/automations.
  evento          text,

  -- Si true: el mensaje se envía directo. Si false: entra a cola de aprobación.
  auto_send       boolean DEFAULT false,

  -- Si false: el intent queda guardado pero no se dispara.
  activo          boolean DEFAULT true,

  es_predefinido  boolean DEFAULT false,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE (org_id, slug)
);

CREATE INDEX idx_wa_intents_org ON wa_intents(org_id);
CREATE INDEX idx_wa_intents_evento ON wa_intents(org_id, evento, activo) WHERE evento IS NOT NULL;

COMMENT ON TABLE wa_intents IS
  'Intents de WhatsApp redactados por LLM (gemma4). Un intent es un brief de redacción + variables + evento disparador. El LLM lo combina con la brand_voice de la org para generar el mensaje final.';

COMMENT ON COLUMN wa_intents.prompt_brief IS
  'Instrucciones en lenguaje natural para el LLM. Junto con brand_voice y contexto, compone el prompt completo.';

COMMENT ON COLUMN wa_intents.auto_send IS
  'true = enviar sin intervención. false = encolar para aprobación humana.';
