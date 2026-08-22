-- 930_nea_clases_descripcion.sql
-- Copy largo de cada clase (se muestra en mood-web y en nerea).
-- Viene del import de Firebase mood (yoga-institute-wdd330) donde cada doc de
-- `classes` tenia description extenso.

ALTER TABLE nea_clases ADD COLUMN IF NOT EXISTS descripcion TEXT;
