-- Las vistas v_equipos_disponibles_reserva y v_equipos_pendientes_compra no exponían
-- org_id, pero /api/oportunidades-equipos filtra por `WHERE org_id = $1` → error
-- "column org_id does not exist" → el endpoint cae al catch y devuelve vacío, dejando
-- el tab Equipos del dashboard sin datos. Se agrega e.org_id (las dos joinean equipos).
-- CREATE OR REPLACE permite agregar columnas al final manteniendo las existentes.

CREATE OR REPLACE VIEW v_equipos_disponibles_reserva AS
 SELECT eu.id AS unidad_id,
    eu.numero_serie,
    eu.codigo,
    eu.estado_general,
    eu.fecha_compra,
    e.id AS equipo_id,
    e.marca,
    e.modelo,
    e.tipo,
    e.categoria,
    e.condicion,
    e.precio_lista,
    e.precio_lista_moneda,
    e.imagen_url,
    e.org_id
   FROM equipos_unidades eu
     JOIN equipos e ON eu.equipo_id = e.id
  WHERE eu.estado_general = 'stock'::text AND eu.activo = true AND eu.oportunidad_reserva_id IS NULL;

CREATE OR REPLACE VIEW v_equipos_pendientes_compra AS
 SELECT oep.id,
    oep.oportunidad_id,
    oep.oportunidad_item_id,
    oep.equipo_id,
    oep.cantidad,
    oep.especificaciones,
    oep.estado,
    oep.orden_compra_id,
    oep.proveedor_id,
    oep.fecha_solicitud,
    oep.fecha_estimada_llegada,
    oep.fecha_recepcion,
    oep.equipo_unidad_id,
    oep.notas,
    oep.created_at,
    oep.updated_at,
    oep.created_by,
    e.marca,
    e.modelo,
    e.tipo,
    e.categoria,
    o.nombre AS oportunidad_nombre,
    o.etapa AS oportunidad_etapa,
    o.estado AS oportunidad_estado,
    c.nombre AS cliente_nombre,
    p.nombre AS proveedor_nombre,
    e.org_id
   FROM oportunidades_equipos_pedidos oep
     JOIN equipos e ON oep.equipo_id = e.id
     JOIN oportunidades_venta o ON oep.oportunidad_id = o.id
     LEFT JOIN clientes c ON o.cliente_id = c.id
     LEFT JOIN proveedores p ON oep.proveedor_id = p.id
  WHERE oep.estado::text <> ALL (ARRAY['recibido'::character varying::text, 'asignado'::character varying::text, 'cancelado'::character varying::text]);
