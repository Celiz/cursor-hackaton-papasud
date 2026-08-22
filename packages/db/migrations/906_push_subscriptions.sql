-- Web Push subscriptions per user/persona
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  failed_attempts INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_push_subs_persona ON push_subscriptions(persona_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_org ON push_subscriptions(org_id);
