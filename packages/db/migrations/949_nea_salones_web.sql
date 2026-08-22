-- Metadatos para presentación en la web pública del estudio.
-- Permite que cada salón tenga su color, piso, subtítulo y orden editables
-- desde nerea en lugar de hardcoded en el front.

ALTER TABLE nea_salones
  ADD COLUMN IF NOT EXISTS planta           varchar(40),
  ADD COLUMN IF NOT EXISTS subtitulo        varchar(200),
  ADD COLUMN IF NOT EXISTS descripcion_web  text,
  ADD COLUMN IF NOT EXISTS color            varchar(7),
  ADD COLUMN IF NOT EXISTS orden            integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_nea_salones_org_orden
  ON nea_salones (org_id, orden);
