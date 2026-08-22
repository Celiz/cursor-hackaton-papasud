import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET — Consumption analytics for a specific product.
 * Returns which clients buy this product, how much, how often, and commercial notes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: producto_id } = await params;

    // Verify the product belongs to this org
    const productoResult = await query(
      `SELECT id, nombre, codigo, precio_venta, stock_actual
       FROM productos
       WHERE id = $1 AND org_id = $2`,
      [producto_id, session.org_id]
    );

    if (productoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const producto = productoResult.rows[0];

    // Client consumption breakdown
    const clientesResult = await query(
      `SELECT
        c.id as cliente_id,
        COALESCE(c.nombre_fantasia, c.nombre) as cliente_nombre,
        SUM(fi.cantidad)::numeric as total_unidades,
        COUNT(DISTINCT f.id)::int as total_compras,
        MAX(f.fecha_emision) as ultima_compra,
        (CURRENT_DATE - MAX(f.fecha_emision)::date)::int as dias_sin_comprar,
        ROUND(SUM(fi.cantidad) / GREATEST(
          EXTRACT(EPOCH FROM (now() - MIN(f.fecha_emision))) / (86400.0 * 30), 1
        ), 1) as promedio_mensual,
        pcn.notas
      FROM facturas f
      JOIN facturas_items fi ON fi.factura_id = f.id
      JOIN clientes c ON f.cliente_id = c.id
      LEFT JOIN producto_consumo_notas pcn
        ON pcn.producto_id = fi.producto_id AND pcn.cliente_id = c.id AND pcn.org_id = f.org_id
      WHERE f.org_id = $1 AND fi.producto_id = $2 AND f.estado NOT IN ('anulada', 'borrador')
      GROUP BY c.id, c.nombre, c.nombre_fantasia, pcn.notas
      ORDER BY total_unidades DESC
      LIMIT 30`,
      [session.org_id, producto_id]
    );

    // Global summary
    const resumenResult = await query(
      `SELECT
        COUNT(DISTINCT f.cliente_id)::int as total_clientes,
        ROUND(SUM(fi.cantidad) / GREATEST(
          EXTRACT(EPOCH FROM (now() - MIN(f.fecha_emision))) / (86400.0 * 30), 1
        ), 1) as consumo_mensual_global
      FROM facturas f
      JOIN facturas_items fi ON fi.factura_id = f.id
      WHERE f.org_id = $1 AND fi.producto_id = $2 AND f.estado NOT IN ('anulada', 'borrador')`,
      [session.org_id, producto_id]
    );

    const resumen = resumenResult.rows[0] || { total_clientes: 0, consumo_mensual_global: 0 };

    return NextResponse.json({
      producto,
      clientes: clientesResult.rows,
      resumen,
    });
  } catch (error: any) {
    console.error('Error in GET /api/productos/[id]/consumo:', error);
    return NextResponse.json(
      { error: 'Error al obtener consumo del producto', details: error.message },
      { status: 500 }
    );
  }
}
