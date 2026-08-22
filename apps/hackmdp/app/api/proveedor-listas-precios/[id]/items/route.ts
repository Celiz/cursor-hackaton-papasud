import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { mapeoMemoria } from '@/lib/precios/memoria-proveedor';

/**
 * GET /api/proveedor-listas-precios/[id]/items
 * Obtiene los items de una lista de precios
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const soloActivos = searchParams.get('activos') !== 'false';

    let sql = `
      SELECT
        pli.*,
        p.codigo as producto_codigo,
        p.nombre as producto_nombre,
        p.categoria as producto_categoria,
        p.precio_costo as producto_precio_actual,
        p.precio_venta as producto_precio_venta,
        p.stock_actual as producto_stock,
        CASE
          WHEN p.precio_costo > 0 THEN
            ROUND(((pli.precio_neto - p.precio_costo) / p.precio_costo) * 100, 2)
          ELSE NULL
        END as variacion_porcentaje
      FROM proveedor_lista_items pli
      JOIN proveedor_listas_precios plp ON plp.id = pli.lista_id AND plp.org_id = $2
      LEFT JOIN productos p ON p.id = pli.producto_id
      WHERE pli.lista_id = $1
    `;
    const params_arr: any[] = [id, session.org_id];
    let paramIndex = 3;

    if (soloActivos) {
      sql += ' AND pli.activo = true';
    }

    if (search) {
      sql += ` AND (
        pli.codigo_proveedor ILIKE $${paramIndex} OR
        pli.nombre_proveedor ILIKE $${paramIndex} OR
        p.codigo ILIKE $${paramIndex} OR
        p.nombre ILIKE $${paramIndex}
      )`;
      params_arr.push(`%${search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY pli.nombre_proveedor, pli.codigo_proveedor';

    const result = await query(sql, params_arr);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching lista items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/proveedor-listas-precios/[id]/items
 * Agrega items a una lista (individual o masivo)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar que la lista existe y está en estado editable
    const lista = await query(`
      SELECT id, estado FROM proveedor_listas_precios WHERE id = $1 AND org_id = $2
    `, [id, session.org_id]);

    if (lista.rowCount === 0) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    if (lista.rows[0].estado === 'vencida' || lista.rows[0].estado === 'cancelada') {
      return NextResponse.json(
        { error: 'No se pueden agregar items a una lista vencida o cancelada' },
        { status: 400 }
      );
    }

    // Puede ser un item individual o un array
    const items = Array.isArray(body) ? body : [body];
    const insertados: any[] = [];
    const errores: any[] = [];

    for (const item of items) {
      try {
        // Buscar producto por código si no tiene producto_id
        let productoId = item.producto_id;
        if (!productoId && item.codigo_proveedor) {
          // Intentar match por código
          const matchResult = await query(`
            SELECT id FROM productos
            WHERE codigo ILIKE $1 OR codigo ILIKE $2
            LIMIT 1
          `, [item.codigo_proveedor, `%${item.codigo_proveedor}%`]);

          if (matchResult.rowCount && matchResult.rowCount > 0) {
            productoId = matchResult.rows[0].id;
          }
        }

        const result = await query(`
          INSERT INTO proveedor_lista_items (
            lista_id, producto_id, codigo_proveedor, nombre_proveedor,
            precio_costo, precio_costo_anterior, cantidad_minima, descuento_porcentaje,
            plazo_entrega_dias, unidad_medida, factor_conversion, fila_origen
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (lista_id, producto_id) WHERE producto_id IS NOT NULL
          DO UPDATE SET
            codigo_proveedor = COALESCE(EXCLUDED.codigo_proveedor, proveedor_lista_items.codigo_proveedor),
            nombre_proveedor = COALESCE(EXCLUDED.nombre_proveedor, proveedor_lista_items.nombre_proveedor),
            precio_costo_anterior = proveedor_lista_items.precio_costo,
            precio_costo = EXCLUDED.precio_costo,
            cantidad_minima = COALESCE(EXCLUDED.cantidad_minima, proveedor_lista_items.cantidad_minima),
            descuento_porcentaje = COALESCE(EXCLUDED.descuento_porcentaje, proveedor_lista_items.descuento_porcentaje),
            updated_at = NOW()
          RETURNING *
        `, [
          id,
          productoId,
          item.codigo_proveedor,
          item.nombre_proveedor,
          item.precio_costo,
          null,
          item.cantidad_minima || 1,
          item.descuento_porcentaje || 0,
          item.plazo_entrega_dias,
          item.unidad_medida,
          item.factor_conversion || 1,
          item.fila_origen
        ]);

        insertados.push(result.rows[0]);
      } catch (itemError: any) {
        errores.push({
          item: item.codigo_proveedor || item.nombre_proveedor,
          error: itemError.message
        });
      }
    }

    return NextResponse.json({
      insertados: insertados.length,
      errores: errores.length,
      detalles_errores: errores.length > 0 ? errores : undefined
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding lista items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/proveedor-listas-precios/[id]/items
 * Actualiza items de la lista
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { item_id, ...updates } = body;

    if (!item_id) {
      return NextResponse.json({ error: 'item_id es requerido' }, { status: 400 });
    }

    // Verify the list belongs to this org (y traemos proveedor/moneda para la "memoria")
    const ownerCheck = await query(
      'SELECT id, proveedor_id, moneda FROM proveedor_listas_precios WHERE id = $1 AND org_id = $2',
      [id, session.org_id]
    );
    if (ownerCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }
    const lista = ownerCheck.rows[0];

    const allowedFields = [
      'producto_id', 'equipo_id', 'codigo_proveedor', 'nombre_proveedor',
      'precio_costo', 'cantidad_minima', 'descuento_porcentaje',
      'plazo_entrega_dias', 'unidad_medida', 'factor_conversion', 'activo'
    ];

    const setClauses: string[] = [];
    const params_arr: any[] = [item_id, id];
    let paramIndex = 3;

    // Si se actualiza precio_costo, guardar el anterior
    if ('precio_costo' in updates) {
      setClauses.push(`precio_costo_anterior = precio_costo`);
    }

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        params_arr.push(value);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const result = await query(`
      UPDATE proveedor_lista_items
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND lista_id = $2
      RETURNING *
    `, params_arr);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }
    const item = result.rows[0];

    // Memoria de vinculación: persistir el mapeo para auto-vincular futuras listas del
    // mismo proveedor. Best-effort: un fallo acá NO debe romper la vinculación del item.
    try {
      if ('producto_id' in updates && item.producto_id) {
        const mapeo = mapeoMemoria(item);
        if (mapeo && lista.proveedor_id) {
          await query(`
            INSERT INTO producto_proveedores (
              producto_id, proveedor_id, codigo_proveedor, nombre_proveedor,
              ultimo_precio, ultima_moneda, ultima_lista_id, ultima_actualizacion, activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true)
            ON CONFLICT (producto_id, proveedor_id) DO UPDATE SET
              codigo_proveedor = EXCLUDED.codigo_proveedor,
              nombre_proveedor = COALESCE(EXCLUDED.nombre_proveedor, producto_proveedores.nombre_proveedor),
              ultimo_precio = EXCLUDED.ultimo_precio,
              ultima_moneda = EXCLUDED.ultima_moneda,
              ultima_lista_id = EXCLUDED.ultima_lista_id,
              ultima_actualizacion = NOW(),
              updated_at = NOW()
          `, [mapeo.productoId, lista.proveedor_id, mapeo.codigoProveedor, mapeo.nombreProveedor,
              mapeo.ultimoPrecio, lista.moneda, id]);
        }
      }
      if ('equipo_id' in updates && item.equipo_id && lista.proveedor_id) {
        // Backfill: el match laxo del próximo import busca dentro del mismo proveedor.
        await query(
          `UPDATE equipos SET proveedor_id = $1 WHERE id = $2 AND org_id = $3 AND proveedor_id IS NULL`,
          [lista.proveedor_id, item.equipo_id, session.org_id]
        );
      }
    } catch (memErr: any) {
      console.error('memoria-proveedor (no crítico):', memErr.message);
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error updating lista item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/proveedor-listas-precios/[id]/items?item_id=xxx
 * Elimina un item de la lista
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json({ error: 'item_id es requerido' }, { status: 400 });
    }

    await query(`
      DELETE FROM proveedor_lista_items
      WHERE id = $1 AND lista_id = $2
        AND lista_id IN (SELECT id FROM proveedor_listas_precios WHERE org_id = $3)
    `, [itemId, id, session.org_id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lista item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
