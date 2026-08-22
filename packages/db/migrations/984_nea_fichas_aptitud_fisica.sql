-- Declaración de aptitud física del alumno.
--
-- Extiende `nea_fichas` con los campos que cualquier estudio deportivo
-- necesita para evaluar riesgo antes de que el alumno tome clase. La idea:
-- el alumno DEBE declarar al ingresar al portal (no puede reservar/asistir
-- sin esto). La profe ve la declaración en su lista del día.
--
-- `declarado_at` marca cuándo la persona firmó. `valido_hasta` es opcional —
-- si querés que la declaración expire cada N meses, se setea desde la app.
-- `nada_que_declarar` es la opción "estoy bien, sin nada", para que firmar
-- "no tengo nada" no quede igual que "no completé el formulario".

ALTER TABLE nea_fichas
  ADD COLUMN IF NOT EXISTS apto_fisicamente boolean,
  ADD COLUMN IF NOT EXISTS embarazada boolean,
  ADD COLUMN IF NOT EXISTS semanas_embarazo integer,
  ADD COLUMN IF NOT EXISTS lesiones text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dolores_cronicos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medicacion text,
  ADD COLUMN IF NOT EXISTS notas_alumno text,
  ADD COLUMN IF NOT EXISTS nada_que_declarar boolean,
  ADD COLUMN IF NOT EXISTS declarado_at timestamptz,
  ADD COLUMN IF NOT EXISTS valido_hasta date;

-- Índice parcial para "buscar quién no declaró" (uso típico).
CREATE INDEX IF NOT EXISTS nea_fichas_sin_declaracion_idx
  ON nea_fichas (org_id, cliente_id)
  WHERE declarado_at IS NULL;

-- Una ficha por (org, persona). El endpoint upsert de declaración requiere
-- este UNIQUE para que el ON CONFLICT (org_id, cliente_id) funcione.
ALTER TABLE nea_fichas
  ADD CONSTRAINT nea_fichas_org_cliente_uniq UNIQUE (org_id, cliente_id);
