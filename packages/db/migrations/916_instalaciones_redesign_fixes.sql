-- 916_instalaciones_redesign_fixes.sql
-- Follow-up constraint to 915: placeholder items must have all real FKs NULL.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instalaciones_items_placeholder_no_fk'
  ) THEN
    ALTER TABLE instalaciones_items
      ADD CONSTRAINT instalaciones_items_placeholder_no_fk CHECK (
        es_placeholder = false OR (equipo_unidad_id IS NULL AND producto_id IS NULL)
      );
  END IF;
END $$;

COMMIT;
