-- 1122_equipos_catalogo_view_subtipo.sql
-- Exponer equipos.subtipo en la VIEW equipos_catalogo (usada por /api/catalogo-web/destacados).
-- CREATE OR REPLACE permite SOLO agregar columnas al final, así que subtipo va último.
-- Definición tomada de la view existente (post-migración 992) + subtipo.

CREATE OR REPLACE VIEW equipos_catalogo AS
 SELECT id,
    created_at,
    created_at AS updated_at,
    marca,
    modelo,
    tipo,
    categoria,
    utilidad,
    to_jsonb(COALESCE(division, '{}'::text[])) AS division,
    imagen_url,
    descripcion_comercial AS detalle,
    especificaciones,
    mostrar_en_web AS disponible,
    orden_web AS orden,
    precio_lista AS precio,
    precio_dolar,
    precio_pesos,
    precio_lista_moneda AS moneda,
    iva,
    NULL::uuid AS producto_id,
    lis_parser_tipo,
    subtipo
   FROM equipos e
  WHERE mostrar_en_web = true AND org_id = '48b2a35a-0cb8-4643-a1d6-045918f9704c'::uuid;
