import { query, getClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ejecutarConCorrida, type CorridaTipo } from "@/lib/precios/corridas";

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!session.is_admin) {
      return NextResponse.json(
        { error: "Solo administradores pueden hacer cambios masivos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { producto_ids, tipo, valor, motivo, preview } = body;

    if (!producto_ids || !Array.isArray(producto_ids) || producto_ids.length === 0) {
      return NextResponse.json(
        { error: "producto_ids es requerido y debe ser un array no vacío" },
        { status: 400 }
      );
    }

    if (!tipo || !["margen", "precio_fijo", "ajuste_porcentaje"].includes(tipo)) {
      return NextResponse.json(
        { error: "tipo debe ser 'margen', 'precio_fijo' o 'ajuste_porcentaje'" },
        { status: 400 }
      );
    }

    if (valor === undefined || valor === null || typeof valor !== "number") {
      return NextResponse.json(
        { error: "valor es requerido y debe ser un número" },
        { status: 400 }
      );
    }

    // Fetch current products
    const productsResult = await query(
      `SELECT id, nombre, codigo, precio_costo, precio_venta
       FROM productos
       WHERE id = ANY($1::uuid[]) AND org_id = $2 AND deleted_at IS NULL`,
      [producto_ids, session.org_id]
    );

    if (productsResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos" },
        { status: 404 }
      );
    }

    // Calculate new prices
    const previewData = productsResult.rows.map((p) => {
      let precio_venta_nuevo: number;
      const precioCosto = parseFloat(p.precio_costo) || 0;
      const precioVentaActual = parseFloat(p.precio_venta) || 0;

      switch (tipo) {
        case "margen":
          precio_venta_nuevo = precioCosto * (1 + valor / 100);
          break;
        case "precio_fijo":
          precio_venta_nuevo = valor;
          break;
        case "ajuste_porcentaje":
          precio_venta_nuevo = precioVentaActual * (1 + valor / 100);
          break;
        default:
          precio_venta_nuevo = precioVentaActual;
      }

      return {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        precio_costo: precioCosto,
        precio_venta_actual: precioVentaActual,
        precio_venta_nuevo: Math.round(precio_venta_nuevo * 100) / 100,
      };
    });

    // Preview mode - return calculated prices without updating
    if (preview) {
      return NextResponse.json({ preview: previewData });
    }

    const descripcion =
      motivo ||
      `${tipo === "ajuste_porcentaje" ? `Ajuste ${valor > 0 ? "+" : ""}${valor}%` :
        tipo === "margen" ? `Margen ${valor}%` : `Precio fijo $${valor}`} · ${previewData.length} productos`;

    const client = await getClient();
    try {
      const { corridaId, productosAfectados } = await ejecutarConCorrida(
        client,
        {
          org_id: session.org_id,
          tipo: tipo as CorridaTipo,
          descripcion,
          usuario_id: session.persona_id,
          parametros: { tipo, valor },
        },
        async (_corridaId) => {
          for (const item of previewData) {
            await client.query(
              `UPDATE productos
                 SET precio_venta = $1
               WHERE id = $2 AND org_id = $3 AND deleted_at IS NULL`,
              [item.precio_venta_nuevo, item.id, session.org_id]
            );
          }
        }
      );
      return NextResponse.json({ updated: productosAfectados, corrida_id: corridaId });
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("Error in POST /api/precios/bulk:", error);
    return NextResponse.json(
      { error: "Error al actualizar precios masivamente" },
      { status: 500 }
    );
  }
}
