import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.org_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const corrida = await query(
    `SELECT c.*, prov.nombre AS proveedor_nombre
       FROM corridas_precios c
       LEFT JOIN proveedores prov ON prov.id = c.proveedor_id
      WHERE c.id = $1 AND c.org_id = $2`,
    [id, session.org_id]
  );
  if (corrida.rowCount === 0) {
    return NextResponse.json({ error: "Corrida no encontrada" }, { status: 404 });
  }

  const items = await query(
    `SELECT h.producto_id, h.tipo_precio, h.precio_anterior, h.precio_nuevo,
            p.codigo, p.nombre
       FROM historial_precios h
       JOIN productos p ON p.id = h.producto_id
      WHERE h.corrida_id = $1
      ORDER BY p.nombre, h.tipo_precio`,
    [id]
  );

  return NextResponse.json({ corrida: corrida.rows[0], items: items.rows });
}
