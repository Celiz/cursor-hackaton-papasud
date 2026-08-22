-- Add hora (time) column to crm_actividades for calendar integration
ALTER TABLE crm_actividades ADD COLUMN IF NOT EXISTS hora TIME DEFAULT NULL;
