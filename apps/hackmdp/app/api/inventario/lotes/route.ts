import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/lotes - Listar lotes
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const producto_id = searchParams.get("producto_id");
    const estado = searchParams.get("estado");
    const por_vencer = searchParams.get("por_vencer");
    const vencidos = searchParams.get("vencidos");

    // NOTA: la tabla real `productos_lotes` tiene el schema MÍNIMO:
    //   (id, producto_id, lote, vencimiento, stock, marca_id, created_at)
    // El frontend antiguo asume un schema más rico (estado, proveedor,
    // certificados, etc.) — mapeamos con defaults para mantener compat.
    // Los filtros de fecha se hacen en SQL (más eficiente que JS).
    let sql = `
      SELECT
        pl.id,
        pl.producto_id,
        pl.lote                                 AS numero_lote,
        pl.vencimiento                          AS fecha_vencimiento,
        pl.vencimiento::date - CURRENT_DATE     AS dias_hasta_vencimiento,
        pl.stock                                AS cantidad_disponible,
        pl.marca_id,
        pl.created_at,
        pl.created_at                           AS updated_at,
        json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre) AS producto,
        json_build_object('id', m.id, 'nombre', m.nombre) FILTER (WHERE m.id IS NOT NULL) AS marca
      FROM productos_lotes pl
      JOIN productos p ON pl.producto_id = p.id
      LEFT JOIN marcas m ON pl.marca_id = m.id
      WHERE p.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (producto_id) {
      sql += ` AND pl.producto_id = $${paramIndex++}`;
      params.push(producto_id);
    }

    // Filtro "por vencer" en N días (ej. por_vencer=30 → próximos 30)
    if (por_vencer) {
      const dias = parseInt(por_vencer);
      sql += ` AND pl.vencimiento IS NOT NULL
               AND pl.vencimiento >= CURRENT_DATE
               AND pl.vencimiento <= CURRENT_DATE + ($${paramIndex++}::int * INTERVAL '1 day')`;
      params.push(dias);
    }

    // Filtro "ya vencidos"
    if (vencidos === "true") {
      sql += ` AND pl.vencimiento IS NOT NULL AND pl.vencimiento < CURRENT_DATE`;
    }

    sql += ` ORDER BY pl.vencimiento ASC NULLS LAST`;

    const result = await query(sql, params);
    const lotes = (result.rows || []).map((row: any) => {
      // `estado` sintético para la UI vieja: derivado del vencimiento y stock
      const dias = row.dias_hasta_vencimiento;
      let estado: "activo" | "vencido" | "agotado" = "activo";
      if (Number(row.cantidad_disponible) <= 0) estado = "agotado";
      else if (dias !== null && dias < 0) estado = "vencido";

      return {
        ...row,
        // Defaults para campos que el frontend viejo espera
        fecha_fabricacion: null,
        proveedor_id: null,
        proveedor: null,
        orden_compra: null,
        cantidad_original: Number(row.cantidad_disponible) || 0,
        cantidad_reservada: 0,
        cantidad_defectuosa: 0,
        costo_unitario: null,
        costo_total: null,
        estado,
        certificado_calidad: false,
        certificado_anmat: false,
        certificado_url: null,
        notas: null,
        vencido: dias !== null && dias < 0,
        proximo_a_vencer: dias !== null && dias >= 0 && dias <= 90,
      };
    });

    return NextResponse.json(lotes);
  } catch (error: any) {
    console.error("Error in GET /api/inventario/lotes:", error);
    return NextResponse.json(
      { error: "Error al obtener lotes", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventario/lotes - Crear lote
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      producto_id,
      numero_lote,
      fecha_fabricacion,
      fecha_vencimiento,
      proveedor_id,
      orden_compra,
      cantidad_original,
      costo_unitario,
      certificado_calidad,
      certificado_anmat,
      certificado_url,
      notas,
    } = body;

    // Validaciones
    if (!producto_id || !numero_lote || !cantidad_original) {
      return NextResponse.json(
        { error: "Producto, numero de lote y cantidad son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece a la org
    const prodCheck = await query(`SELECT id FROM productos WHERE id = $1 AND org_id = $2`, [producto_id, session.org_id]);
    if (prodCheck.rows.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Verificar que el lote no exista para este producto
    const existingResult = await query(`
      SELECT id FROM productos_lotes
      WHERE producto_id = $1 AND numero_lote = $2
    `, [producto_id, numero_lote]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un lote con este numero para este producto" },
        { status: 400 }
      );
    }

    // Calcular costo total
    const costo_total = costo_unitario ? costo_unitario * cantidad_original : null;

    const result = await query(`
      INSERT INTO productos_lotes (
        producto_id, numero_lote, fecha_fabricacion, fecha_vencimiento,
        proveedor_id, orden_compra, cantidad_original, cantidad_disponible,
        costo_unitario, costo_total, certificado_calidad, certificado_anmat,
        certificado_url, notas, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, 'activo')
      RETURNING *
    `, [
      producto_id, numero_lote, fecha_fabricacion, fecha_vencimiento,
      proveedor_id, orden_compra, cantidad_original,
      costo_unitario, costo_total, certificado_calidad, certificado_anmat,
      certificado_url, notas
    ]);

    // Fetch with joined data
    const fullResult = await query(`
      SELECT
        pl.*,
        json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre) as producto,
        json_build_object('id', pr.id, 'nombre', pr.nombre) as proveedor
      FROM productos_lotes pl
      LEFT JOIN productos p ON pl.producto_id = p.id
      LEFT JOIN proveedores pr ON pl.proveedor_id = pr.id
      WHERE pl.id = $1
    `, [result.rows[0].id]);

    return NextResponse.json(fullResult.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/lotes:", error);
    return NextResponse.json(
      { error: "Error al crear lote", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventario/lotes - Actualizar lote
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del lote es requerido" },
        { status: 400 }
      );
    }

    // Recalcular costo total si se modifica costo unitario
    if (updateData.costo_unitario !== undefined) {
      const loteResult = await query(`
        SELECT pl.cantidad_original FROM productos_lotes pl
        JOIN productos p ON pl.producto_id = p.id
        WHERE pl.id = $1 AND p.org_id = $2
      `, [id, session.org_id]);

      if (loteResult.rows.length > 0) {
        updateData.costo_total = updateData.costo_unitario * loteResult.rows[0].cantidad_original;
      } else {
        return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
      }
    }

    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    values.push(id);
    values.push(session.org_id);

    const result = await query(`
      UPDATE productos_lotes
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length - 1}
        AND producto_id IN (SELECT id FROM productos WHERE org_id = $${values.length})
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    // Fetch with joined data
    const fullResult = await query(`
      SELECT
        pl.*,
        json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre) as producto,
        json_build_object('id', pr.id, 'nombre', pr.nombre) as proveedor
      FROM productos_lotes pl
      LEFT JOIN productos p ON pl.producto_id = p.id
      LEFT JOIN proveedores pr ON pl.proveedor_id = pr.id
      WHERE pl.id = $1
    `, [id]);

    return NextResponse.json(fullResult.rows[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/inventario/lotes:", error);
    return NextResponse.json(
      { error: "Error al actualizar lote", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/inventario/lotes?id=xxx - Eliminar lote
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID del lote es requerido" },
        { status: 400 }
      );
    }

    // Verificar que no tenga stock disponible y que pertenezca a la org
    const loteResult = await query(`
      SELECT pl.cantidad_disponible FROM productos_lotes pl
      JOIN productos p ON pl.producto_id = p.id
      WHERE pl.id = $1 AND p.org_id = $2
    `, [id, session.org_id]);

    if (loteResult.rows.length === 0) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    if (loteResult.rows[0].cantidad_disponible > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un lote con stock disponible" },
        { status: 400 }
      );
    }

    const result = await query(`
      DELETE FROM productos_lotes
      WHERE id = $1 AND producto_id IN (SELECT id FROM productos WHERE org_id = $2)
      RETURNING id
    `, [id, session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/inventario/lotes:", error);
    return NextResponse.json(
      { error: "Error al eliminar lote", details: error.message },
      { status: 500 }
    );
  }
}
