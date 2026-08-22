-- 922_instalaciones_items_historial.sql
-- Historial de cambios de estado_compra en items de instalaciones

CREATE TABLE instalaciones_items_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES instalaciones_items(id) ON DELETE CASCADE,
  instalacion_id  UUID NOT NULL REFERENCES instalaciones(id) ON DELETE CASCADE,
  estado_anterior TEXT NOT NULL,
  estado_nuevo    TEXT NOT NULL,
  nota            TEXT,
  email_thread_id TEXT,
  email_subject   TEXT,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
  autor_id        UUID REFERENCES personas(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inst_items_hist_item ON instalaciones_items_historial(item_id);
CREATE INDEX idx_inst_items_hist_instalacion ON instalaciones_items_historial(instalacion_id);
