-- Add alias column to org_contacts for display name override
ALTER TABLE org_contacts ADD COLUMN IF NOT EXISTS alias TEXT;
