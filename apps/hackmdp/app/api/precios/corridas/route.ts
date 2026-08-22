import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.org_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const proveedorId = searchParams.get("proveedor_id");
  const tipo = searchParams.get("tipo");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  const where: string[] = ["c.org_id = $1"];
  const params: unknown[] = [session.org_id];
  if (proveedorId) { params.push(proveedorId); where.push(`c.proveedor_id = $${params.length}`); }
  if (tipo) { params.push(tipo); where.push(`c.tipo = $${params.length}`); }
  params.push(limit);

  const result = await query(
    `SELECT c.id, c.tipo, c.descripcion, c.productos_afectados, c.created_at,
            c.revertida_at, c.reversion_de_corrida_id, c.lista_id, c.proveedor_id,
            prov.nombre AS proveedor_nombre,
            per.nombre_completo AS usuario_nombre
       FROM corridas_precios c
       LEFT JOIN proveedores prov ON prov.id = c.proveedor_id
       LEFT JOIN personas per ON per.id = c.usuario_id
      WHERE ${where.join(" AND ")}
      ORDER BY c.created_at DESC
      LIMIT $${params.length}`,
    params
  );
  return NextResponse.json({ corridas: result.rows });
}
