import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

// GET /api/productos/[id]/proveedores — proveedores y su último precio para el producto
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.org_id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const own = await query(`SELECT 1 FROM productos WHERE id = $1 AND org_id = $2`, [id, session.org_id]);
    if (!own.rows.length) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    const res = await query(
      `SELECT pp.id, pp.proveedor_id, pp.es_principal, pp.codigo_proveedor,
              pp.ultimo_precio, pp.ultima_moneda, pp.ultima_actualizacion,
              pp.plazo_entrega_dias, pp.cantidad_minima, pp.activo,
              prov.nombre AS proveedor_nombre
         FROM producto_proveedores pp
         LEFT JOIN proveedores prov ON prov.id = pp.proveedor_id
        WHERE pp.producto_id = $1
        ORDER BY pp.es_principal DESC, pp.ultima_actualizacion DESC NULLS LAST`,
      [id]
    );
    return NextResponse.json({ proveedores: res.rows, total: res.rows.length });
  } catch (error: unknown) {
    console.error('Error GET /api/productos/[id]/proveedores:', error);
    return NextResponse.json({ error: 'Error al cargar proveedores del producto' }, { status: 500 });
  }
}
