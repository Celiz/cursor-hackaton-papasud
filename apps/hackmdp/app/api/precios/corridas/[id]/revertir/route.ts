import { query, getClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ejecutarConCorrida } from "@/lib/precios/corridas";

export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.org_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!session.is_admin) {
    return NextResponse.json({ error: "Solo administradores pueden revertir" }, { status: 403 });
  }
  const { id } = await params;

  const orig = await query(
    `SELECT id, tipo, descripcion, revertida_at, reversion_de_corrida_id
       FROM corridas_precios WHERE id = $1 AND org_id = $2`,
    [id, session.org_id]
  );
  if (orig.rowCount === 0) {
    return NextResponse.json({ error: "Corrida no encontrada" }, { status: 404 });
  }
  const c = orig.rows[0];
  if (c.revertida_at) {
    return NextResponse.json({ error: "Esta corrida ya fue revertida" }, { status: 409 });
  }
  if (c.reversion_de_corrida_id) {
    return NextResponse.json({ error: "No se puede revertir una reversión" }, { status: 409 });
  }

  const client = await getClient();
  try {
    const { corridaId, productosAfectados } = await ejecutarConCorrida(
      client,
      {
        org_id: session.org_id,
        tipo: "reversion",
        descripcion: `Reversión de: ${c.descripcion}`,
        usuario_id: session.persona_id,
        reversion_de_corrida_id: id,
      },
      async (_corridaId) => {
        // Restaurar costo
        await client.query(
          `UPDATE productos p
              SET precio_costo = h.precio_anterior
             FROM historial_precios h
            WHERE h.corrida_id = $1 AND h.tipo_precio = 'costo'
              AND h.producto_id = p.id AND p.org_id = $2 AND p.deleted_at IS NULL`,
          [id, session.org_id]
        );
        // Restaurar venta
        await client.query(
          `UPDATE productos p
              SET precio_venta = h.precio_anterior
             FROM historial_precios h
            WHERE h.corrida_id = $1 AND h.tipo_precio = 'venta'
              AND h.producto_id = p.id AND p.org_id = $2 AND p.deleted_at IS NULL`,
          [id, session.org_id]
        );
        // Marcar la original como revertida (dentro de la misma transacción)
        await client.query(
          `UPDATE corridas_precios SET revertida_at = now(), revertida_por = $2 WHERE id = $1`,
          [id, session.persona_id]
        );
      }
    );
    return NextResponse.json({
      success: true,
      reversion_corrida_id: corridaId,
      productos_revertidos: productosAfectados,
    });
  } finally {
    client.release();
  }
}
