-- 1307_papasud_avisos_campo.sql
--
-- Cuando una foto detecta un problema, queda como AVISO pendiente de revisión
-- en el panel, con su lote, para que alguien vaya a mirarlo.
--
-- Se marca revisado en vez de borrar: el histórico de qué se detectó y quién
-- lo confirmó es la mitad del valor. Si mañana el lote sale con tizón, se
-- puede volver a la foto y ver cuándo apareció el primer signo.

\set ON_ERROR_STOP on

ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS revisado     boolean DEFAULT false;
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS revisado_por varchar(80);
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS revisado_at  timestamptz;
ALTER TABLE pap_ot_fotos ADD COLUMN IF NOT EXISTS resultado    text;

-- Los avisos abiertos se consultan seguido y en tiempo real.
CREATE INDEX IF NOT EXISTS idx_pap_fotos_pendientes
  ON pap_ot_fotos (org_id, revisado, tomada_at DESC)
  WHERE revisado = false;
