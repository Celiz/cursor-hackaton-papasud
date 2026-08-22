import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/proveedor-listas-precios/comparar
 * Compara precios de productos entre diferentes proveedores
 *
 * Query params:
 *   - producto_id: Comparar para un producto específico
 *   - producto_ids: Lista de IDs de productos (separados por coma)
 *   - categoria: Filtrar por categoría de producto
 *   - solo_vigentes: true para solo listas vigentes (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get('producto_id');
    const productoIds = searchParams.get('producto_ids');
    const categoria = searchParams.get('categoria');
    const soloVigentes = searchParams.get('solo_vigentes') !== 'false';

    let whereProducto = '';
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (productoId) {
      whereProducto = `AND p.id = $${paramIndex++}`;
      params.push(productoId);
    } else if (productoIds) {
      const ids = productoIds.split(',').map(id => id.trim());
      whereProducto = `AND p.id = ANY($${paramIndex++})`;
      params.push(ids);
    }

    if (categoria) {
      whereProducto += ` AND p.categoria = $${paramIndex++}`;
      params.push(categoria);
    }

    let whereVigente = '';
    if (soloVigentes) {
      whereVigente = `
        AND plp.estado = 'activa'
        AND plp.fecha_inicio <= CURRENT_DATE
        AND (plp.fecha_fin IS NULL OR plp.fecha_fin >= CURRENT_DATE)
      `;
    }

    const sql = `
      WITH precios_por_proveedor AS (
        SELECT
          p.id as producto_id,
          p.codigo as producto_codigo,
          p.nombre as producto_nombre,
          p.categoria,
          p.precio_costo as precio_actual,
          p.precio_venta as precio_venta_actual,
          prov.id as proveedor_id,
          prov.nombre as proveedor_nombre,
          plp.id as lista_id,
          plp.nombre as lista_nombre,
          plp.moneda,
          pli.codigo_proveedor,
          pli.precio_costo,
          pli.precio_neto,
          pli.cantidad_minima,
          COALESCE(pli.plazo_entrega_dias, plp.plazo_entrega_dias) as plazo_entrega,
          plp.condiciones_pago,
          ROW_NUMBER() OVER (
            PARTITION BY p.id
            ORDER BY pli.precio_neto ASC
          ) as ranking_precio
        FROM productos p
        JOIN proveedor_lista_items pli ON pli.producto_id = p.id AND pli.activo = true
        JOIN proveedor_listas_precios plp ON plp.id = pli.lista_id
        JOIN proveedores prov ON prov.id = plp.proveedor_id
        WHERE plp.org_id = $1
          ${whereProducto}
          ${whereVigente}
      )
      SELECT
        producto_id,
        producto_codigo,
        producto_nombre,
        categoria,
        precio_actual,
        precio_venta_actual,
        json_agg(
          json_build_object(
            'proveedor_id', proveedor_id,
            'proveedor_nombre', proveedor_nombre,
            'lista_id', lista_id,
            'lista_nombre', lista_nombre,
            'moneda', moneda,
            'codigo_proveedor', codigo_proveedor,
            'precio_costo', precio_costo,
            'precio_neto', precio_neto,
            'cantidad_minima', cantidad_minima,
            'plazo_entrega', plazo_entrega,
            'condiciones_pago', condiciones_pago,
            'es_mejor_precio', ranking_precio = 1,
            'diferencia_vs_actual', CASE
              WHEN precio_actual > 0 THEN ROUND(((precio_neto - precio_actual) / precio_actual) * 100, 2)
              ELSE NULL
            END
          ) ORDER BY precio_neto ASC
        ) as proveedores,
        MIN(precio_neto) as mejor_precio,
        MAX(precio_neto) as peor_precio,
        COUNT(DISTINCT proveedor_id) as cantidad_proveedores,
        CASE
          WHEN MIN(precio_neto) > 0 AND MAX(precio_neto) > 0
          THEN ROUND(((MAX(precio_neto) - MIN(precio_neto)) / MIN(precio_neto)) * 100, 2)
          ELSE 0
        END as variacion_porcentaje
      FROM precios_por_proveedor
      GROUP BY producto_id, producto_codigo, producto_nombre, categoria, precio_actual, precio_venta_actual
      ORDER BY producto_nombre
    `;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error comparing prices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/proveedor-listas-precios/comparar
 * Genera un reporte de comparación de precios
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { lista_ids, incluir_sin_cambio = false } = body;

    if (!lista_ids || !Array.isArray(lista_ids) || lista_ids.length < 2) {
      return NextResponse.json(
        { error: 'Se requieren al menos 2 lista_ids para comparar' },
        { status: 400 }
      );
    }

    // Obtener información de las listas
    const listasResult = await query(`
      SELECT
        plp.id,
        plp.nombre,
        plp.moneda,
        plp.fecha_inicio,
        prov.nombre as proveedor_nombre
      FROM proveedor_listas_precios plp
      JOIN proveedores prov ON prov.id = plp.proveedor_id
      WHERE plp.id = ANY($1) AND plp.org_id = $2
    `, [lista_ids, session.org_id]);

    const listas = listasResult.rows;

    // Comparar items entre las listas
    const comparacionResult = await query(`
      WITH items_unificados AS (
        SELECT
          COALESCE(pli.producto_id::text, pli.codigo_proveedor, pli.nombre_proveedor) as key,
          pli.producto_id,
          p.codigo as producto_codigo,
          COALESCE(p.nombre, pli.nombre_proveedor) as nombre,
          pli.lista_id,
          pli.precio_neto,
          pli.cantidad_minima
        FROM proveedor_lista_items pli
        JOIN proveedor_listas_precios plp ON plp.id = pli.lista_id AND plp.org_id = $2
        LEFT JOIN productos p ON p.id = pli.producto_id
        WHERE pli.lista_id = ANY($1) AND pli.activo = true
      )
      SELECT
        key,
        producto_id,
        producto_codigo,
        nombre,
        json_object_agg(lista_id, json_build_object(
          'precio', precio_neto,
          'cantidad_minima', cantidad_minima
        )) as precios_por_lista
      FROM items_unificados
      GROUP BY key, producto_id, producto_codigo, nombre
      HAVING COUNT(DISTINCT lista_id) >= 1
      ORDER BY nombre
    `, [lista_ids, session.org_id]);

    // Procesar resultados para calcular diferencias
    const comparaciones = comparacionResult.rows.map(row => {
      const precios = row.precios_por_lista;
      const preciosArray = Object.entries(precios)
        .map(([listaId, data]: [string, any]) => ({
          lista_id: listaId,
          precio: data.precio,
          cantidad_minima: data.cantidad_minima
        }))
        .filter(p => p.precio > 0);

      const preciosOrdenados = [...preciosArray].sort((a, b) => a.precio - b.precio);
      const mejorPrecio = preciosOrdenados[0]?.precio || 0;
      const peorPrecio = preciosOrdenados[preciosOrdenados.length - 1]?.precio || 0;

      return {
        ...row,
        mejor_precio: mejorPrecio,
        peor_precio: peorPrecio,
        diferencia: peorPrecio - mejorPrecio,
        diferencia_porcentaje: mejorPrecio > 0
          ? Math.round(((peorPrecio - mejorPrecio) / mejorPrecio) * 100 * 100) / 100
          : 0,
        mejor_lista_id: preciosOrdenados[0]?.lista_id
      };
    });

    // Filtrar si no se quieren items sin cambio
    const comparacionesFiltradas = incluir_sin_cambio
      ? comparaciones
      : comparaciones.filter(c => c.diferencia_porcentaje !== 0);

    // Estadísticas globales
    const stats = {
      total_items: comparaciones.length,
      items_con_diferencia: comparaciones.filter(c => c.diferencia_porcentaje !== 0).length,
      ahorro_potencial: comparaciones.reduce((sum, c) => sum + c.diferencia, 0),
      variacion_promedio: comparaciones.length > 0
        ? Math.round(comparaciones.reduce((sum, c) => sum + c.diferencia_porcentaje, 0) / comparaciones.length * 100) / 100
        : 0
    };

    return NextResponse.json({
      listas,
      comparaciones: comparacionesFiltradas,
      estadisticas: stats
    });
  } catch (error: any) {
    console.error('Error generating comparison report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
