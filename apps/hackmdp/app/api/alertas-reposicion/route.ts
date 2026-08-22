import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

// GET - Obtener alertas de reposición computadas
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limite = parseInt(searchParams.get("limite") || "500");
    const urgencia = searchParams.get("urgencia"); // critica, alta, media

    let urgenciaFilter = "";
    if (urgencia === "critica") {
      urgenciaFilter = "AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.5";
    } else if (urgencia === "alta") {
      urgenciaFilter = "AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.2 AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias <= 1.5";
    } else if (urgencia === "media") {
      urgenciaFilter = "AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.0 AND (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias <= 1.2";
    }

    const result = await query(
      `SELECT
        cip.id,
        cip.cliente_id,
        cip.producto_id,
        cip.cantidad_habitual,
        cip.frecuencia_dias,
        cip.ultima_compra,
        cip.total_compras,
        cip.es_favorito,
        cip.reposicion_snooze_hasta,
        cip.reposicion_contactado_at,
        cip.reposicion_notas,
        c.nombre as cliente_nombre,
        c.nombre_fantasia as cliente_fantasia,
        c.telefono as cliente_telefono,
        c.email as cliente_email,
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        p.stock_actual as producto_stock,
        p.categoria as producto_categoria,
        (CURRENT_DATE - cip.ultima_compra) as dias_desde_compra,
        ROUND((CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias, 2) as ratio,
        CASE
          WHEN (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.5 THEN 'critica'
          WHEN (CURRENT_DATE - cip.ultima_compra)::numeric / cip.frecuencia_dias > 1.2 THEN 'alta'
          ELSE 'media'
        END as urgencia,
        u.nombre_completo as contactado_por_nombre
      FROM cliente_insumos_preferidos cip
      JOIN clientes c ON cip.cliente_id = c.id
      JOIN productos p ON cip.producto_id = p.id
      LEFT JOIN users u ON cip.reposicion_contactado_por = u.id
      WHERE c.org_id = $1
        AND cip.activo = true
        AND cip.frecuencia_dias IS NOT NULL
        AND cip.frecuencia_dias > 0
        AND cip.ultima_compra IS NOT NULL
        AND (CURRENT_DATE - cip.ultima_compra) > cip.frecuencia_dias
        AND (cip.reposicion_snooze_hasta IS NULL OR cip.reposicion_snooze_hasta < CURRENT_DATE)
        ${urgenciaFilter}
      ORDER BY ratio DESC
      LIMIT $2`,
      [session.org_id, limite]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching alertas reposicion:", error);
    return NextResponse.json(
      { error: "Error al obtener alertas de reposición", details: error?.message },
      { status: 500 }
    );
  }
}

// PUT - Acciones sobre alertas (snooze, contactar, nota)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, accion, dias_snooze, nota, user_id } = body;

    if (!id || !accion) {
      return NextResponse.json(
        { error: "Se requiere id y accion" },
        { status: 400 }
      );
    }

    if (accion === "snooze") {
      const dias = dias_snooze || 7;
      await query(
        `UPDATE cliente_insumos_preferidos
         SET reposicion_snooze_hasta = CURRENT_DATE + $1,
             updated_at = NOW()
         WHERE id = $2 AND cliente_id IN (SELECT id FROM clientes WHERE org_id = $3)`,
        [dias, id, session.org_id]
      );
    } else if (accion === "contactado") {
      await query(
        `UPDATE cliente_insumos_preferidos
         SET reposicion_contactado_at = NOW(),
             reposicion_contactado_por = $1,
             reposicion_notas = COALESCE($2, reposicion_notas),
             updated_at = NOW()
         WHERE id = $3 AND cliente_id IN (SELECT id FROM clientes WHERE org_id = $4)`,
        [user_id || null, nota || null, id, session.org_id]
      );
    } else if (accion === "nota") {
      await query(
        `UPDATE cliente_insumos_preferidos
         SET reposicion_notas = $1,
             updated_at = NOW()
         WHERE id = $2 AND cliente_id IN (SELECT id FROM clientes WHERE org_id = $3)`,
        [nota, id, session.org_id]
      );
    } else {
      return NextResponse.json(
        { error: "Acción no válida. Use: snooze, contactado, nota" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error updating alerta reposicion:", error);
    return NextResponse.json(
      { error: "Error al actualizar alerta", details: error?.message },
      { status: 500 }
    );
  }
}
