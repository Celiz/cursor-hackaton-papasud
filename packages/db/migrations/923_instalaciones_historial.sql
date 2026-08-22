-- 923_instalaciones_historial.sql
-- Historial de cambios de estado de la instalación

CREATE TABLE instalaciones_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instalacion_id  UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  estado_anterior TEXT NOT NULL,
  estado_nuevo    TEXT NOT NULL,
  nota            TEXT,
  autor_id        UUID REFERENCES personas(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inst_hist_instalacion ON instalaciones_historial(instalacion_id);
