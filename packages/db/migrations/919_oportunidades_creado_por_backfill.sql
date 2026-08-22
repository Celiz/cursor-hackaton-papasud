-- Backfill histórico: oportunidades preexistentes sin creador registrado.
-- Heurística: asumimos que quien la creó es el vendedor asignado (o el primer
-- asignado en la junction table si no hay vendedor_id). Las que no tienen
-- ninguno quedan en NULL.

UPDATE oportunidades_venta ov
SET creado_por = ov.vendedor_id
FROM personas p
WHERE ov.creado_por IS NULL
  AND ov.vendedor_id IS NOT NULL
  AND p.id = ov.vendedor_id;

UPDATE oportunidades_venta ov
SET creado_por = oa.persona_id
FROM (
  SELECT DISTINCT ON (oportunidad_id) oportunidad_id, persona_id
  FROM oportunidades_asignados
  ORDER BY oportunidad_id, persona_id
) oa
WHERE ov.creado_por IS NULL
  AND ov.id = oa.oportunidad_id;
