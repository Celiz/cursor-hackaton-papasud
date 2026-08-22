-- Track which bridge user owns each WhatsApp conversation
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS bridge_owner_id UUID REFERENCES personas(id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_bridge_owner ON whatsapp_conversations(bridge_owner_id);
