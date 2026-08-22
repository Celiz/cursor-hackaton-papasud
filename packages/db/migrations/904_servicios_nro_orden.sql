-- Add sequential order number to servicios
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS nro_orden SERIAL;

-- Backfill existing servicios in chronological order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY fecha ASC, created_at ASC) as rn
  FROM servicios
)
UPDATE servicios s SET nro_orden = n.rn
FROM numbered n WHERE s.id = n.id AND s.nro_orden = 0;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('servicios', 'nro_orden'), COALESCE((SELECT MAX(nro_orden) FROM servicios), 1));
