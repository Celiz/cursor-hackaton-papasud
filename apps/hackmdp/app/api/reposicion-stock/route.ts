import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

// GET - Resumen de productos que necesitan reposición
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const proveedorId = searchParams.get('proveedor_id');
    const soloStockBajo = searchParams.get('solo_stock_bajo');
    const soloConConsumos = searchParams.get('solo_con_consumos');

    const sql = `
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.stock_actual,
        p.stock_minimo,
        p.proveedor_habitual_id,
        prov.nombre as proveedor_nombre,
        COALESCE(SUM(ci.cantidad) FILTER (WHERE ci.estado_reposicion = 'pendiente'), 0)
          as cantidad_consumida_pendiente,
        COUNT(ci.id) FILTER (WHERE ci.estado_reposicion = 'pendiente')
          as movimientos_pendientes,
        MAX(ci.created_at) FILTER (WHERE ci.estado_reposicion = 'pendiente')
          as ultimo_consumo,
        json_agg(
          json_build_object(
            'id', ci.id,
            'cantidad', ci.cantidad,
            'origen_tipo', ci.origen_tipo,
            'referencia', ci.referencia,
            'created_at', ci.created_at
          )
        ) FILTER (WHERE ci.id IS NOT NULL AND ci.estado_reposicion = 'pendiente') as detalle_consumos
      FROM productos p
      LEFT JOIN consumos_insumos ci ON ci.producto_id = p.id
        AND ci.estado_reposicion = 'pendiente'
      LEFT JOIN proveedores prov ON p.proveedor_habitual_id = prov.id
      WHERE p.org_id = $1
        AND (
          ci.id IS NOT NULL
          OR (p.stock_actual IS NOT NULL AND p.stock_minimo IS NOT NULL
              AND p.stock_minimo > 0 AND p.stock_actual < p.stock_minimo)
        )
      GROUP BY p.id, prov.id, prov.nombre
      ORDER BY
        COALESCE(SUM(ci.cantidad) FILTER (WHERE ci.estado_reposicion = 'pendiente'), 0) DESC,
        p.stock_actual ASC
    `;

    let result = await query(sql, [session.org_id]);
    let rows = result.rows || [];

    // Filtros en memoria (más simple que SQL dinámico para estos casos)
    if (proveedorId) {
      rows = rows.filter((r: any) => r.proveedor_habitual_id === proveedorId);
    }
    if (soloStockBajo === 'true') {
      rows = rows.filter((r: any) =>
        r.stock_actual != null && r.stock_minimo != null && r.stock_actual <= r.stock_minimo
      );
    }
    if (soloConConsumos === 'true') {
      rows = rows.filter((r: any) => Number(r.movimientos_pendientes) > 0);
    }

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error in GET /api/reposicion-stock:', error);

    if (error.message?.includes('does not exist')) {
      return NextResponse.json([]);
    }

    return NextResponse.json(
      { error: 'Error al cargar reposición de stock', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Marcar consumos como procesados
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { producto_id, accion, notas } = body;

    if (!producto_id || !accion) {
      return NextResponse.json(
        { error: 'producto_id y accion son requeridos' },
        { status: 400 }
      );
    }

    const accionesValidas = ['pedido_manual', 'ignorado', 'repuesto'];
    if (!accionesValidas.includes(accion)) {
      return NextResponse.json(
        { error: `Acción inválida. Valores permitidos: ${accionesValidas.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE consumos_insumos
       SET estado_reposicion = $1,
           notas = COALESCE($2, notas),
           procesado_at = NOW()
       WHERE producto_id = $3
         AND estado_reposicion = 'pendiente'
         AND org_id = $4
       RETURNING id`,
      [accion, notas || null, producto_id, session.org_id]
    );

    return NextResponse.json({
      success: true,
      registros_actualizados: result.rows.length
    });
  } catch (error: any) {
    console.error('Error in PUT /api/reposicion-stock:', error);
    return NextResponse.json(
      { error: 'Error al procesar reposición', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Generar Orden de Compra desde reposición
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { proveedor_id, items, comentarios } = body;

    if (!proveedor_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'proveedor_id e items son requeridos' },
        { status: 400 }
      );
    }

    await query('BEGIN');

    try {
      // Crear orden de compra
      const ocResult = await query(
        `INSERT INTO ordenes_compra (proveedor_id, estado, comentarios, org_id)
         VALUES ($1, 'pendiente', $2, $3)
         RETURNING *`,
        [proveedor_id, comentarios || null, session.org_id]
      );

      const ordenCompra = ocResult.rows[0];

      // Insertar items
      for (const item of items) {
        if (!item.producto_id || !item.cantidad) continue;

        await query(
          `INSERT INTO ordenes_compra_items (orden_id, producto_id, cantidad, precio_unitario)
           VALUES ($1, $2, $3, $4)`,
          [ordenCompra.id, item.producto_id, item.cantidad, item.precio_unitario || 0]
        );

        // Marcar consumos pendientes como incluidos en OC
        await query(
          `UPDATE consumos_insumos
           SET estado_reposicion = 'incluido_en_oc',
               orden_compra_id = $1,
               procesado_at = NOW()
           WHERE producto_id = $2
             AND estado_reposicion = 'pendiente'
             AND org_id = $3`,
          [ordenCompra.id, item.producto_id, session.org_id]
        );
      }

      // Fetch proveedor details for the response
      const provResult = await query(
        `SELECT nombre, email, telefono FROM proveedores WHERE id = $1 AND org_id = $2`,
        [proveedor_id, session.org_id]
      );

      await query('COMMIT');

      return NextResponse.json({
        ...ordenCompra,
        proveedor_nombre: provResult.rows[0]?.nombre || null,
        proveedor_email: provResult.rows[0]?.email || null,
        proveedor_telefono: provResult.rows[0]?.telefono || null,
        items_count: items.length,
      }, { status: 201 });
    } catch (innerError) {
      await query('ROLLBACK');
      throw innerError;
    }
  } catch (error: any) {
    console.error('Error in POST /api/reposicion-stock:', error);
    return NextResponse.json(
      { error: 'Error al generar orden de compra', details: error.message },
      { status: 500 }
    );
  }
}
