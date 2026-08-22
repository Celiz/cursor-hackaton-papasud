-- Crear grupos de productos por proveedor (>= 10 productos) para Uno Electromedicina
-- Permite aplicar aumentos masivos de precios cuando llegan listas nuevas

DO $$
DECLARE
  v_org_id uuid := '48b2a35a-0cb8-4643-a1d6-045918f9704c';
  v_colors text[] := ARRAY['blue','purple','amber','emerald','rose','cyan'];
  v_prov RECORD;
  v_idx int := 0;
  v_grupo_id uuid;
BEGIN
  -- Limpiar grupos previos de esta migración (idempotente)
  DELETE FROM producto_grupos
  WHERE org_id = v_org_id
    AND descripcion LIKE 'Productos de proveedor %';

  FOR v_prov IN
    SELECT prov.id as prov_id, prov.nombre, COUNT(*) as cant
    FROM productos p
    JOIN proveedores prov ON prov.id = COALESCE(p.proveedor_habitual_id, p.proveedor_id)
    WHERE p.org_id = v_org_id AND p.deleted_at IS NULL
      -- Excluir proveedores marcados como no usar
      AND prov.nombre NOT ILIKE '%no usar%'
      AND prov.nombre NOT ILIKE '%repetidonousar%'
    GROUP BY prov.id, prov.nombre
    HAVING COUNT(*) >= 10
    ORDER BY COUNT(*) DESC
  LOOP
    INSERT INTO producto_grupos (org_id, nombre, descripcion, color)
    VALUES (v_org_id, v_prov.nombre, 'Productos de proveedor ' || v_prov.nombre, v_colors[(v_idx % 6) + 1])
    RETURNING id INTO v_grupo_id;

    INSERT INTO producto_grupo_items (grupo_id, producto_id)
    SELECT v_grupo_id, p.id
    FROM productos p
    WHERE COALESCE(p.proveedor_habitual_id, p.proveedor_id) = v_prov.prov_id
      AND p.org_id = v_org_id
      AND p.deleted_at IS NULL;

    v_idx := v_idx + 1;
  END LOOP;
END $$;
