-- featured_equipos no tenía org_id, pero la API /api/catalogo-web/destacados
-- filtra/inserta por org_id (GET/POST/PATCH/DELETE) → tiraba 500.
-- Se agrega la columna y se backfillea desde el equipo asociado (FK ya ata el tenant).

ALTER TABLE featured_equipos
  ADD COLUMN IF NOT EXISTS org_id uuid;

UPDATE featured_equipos fe
   SET org_id = e.org_id
  FROM equipos e
 WHERE e.id = fe.equipo_id
   AND fe.org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_featured_equipos_org_id
  ON featured_equipos (org_id);
