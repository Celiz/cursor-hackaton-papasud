import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/depositos - Listar depósitos (warehouses)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const activo = searchParams.get("activo");
    const con_stock = searchParams.get("con_stock");

    let sql = `
      SELECT
        d.*,
        (SELECT COUNT(*) FROM deposito_bins WHERE deposito_id = d.id) as total_bins,
        COALESCE((
          SELECT json_agg(json_build_object(
            'producto_id', sd.producto_id,
            'cantidad_disponible', sd.cantidad_disponible,
            'cantidad_reservada', sd.cantidad_reservada
          ))
          FROM stock_depositos sd WHERE sd.deposito_id = d.id
        ), '[]'::json) as stock
      FROM depositos d
      WHERE d.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (tipo) {
      sql += ` AND d.tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    if (activo !== null) {
      sql += ` AND d.activo = $${paramIndex++}`;
      params.push(activo === "true");
    }

    sql += ` ORDER BY d.nombre`;

    const result = await query(sql, params);
    let depositos = result.rows || [];

    // Calcular totales de stock por depósito
    depositos = depositos.map((deposito: any) => {
      const stockArray = Array.isArray(deposito.stock) ? deposito.stock : [];
      const stockTotal = stockArray.reduce(
        (sum: number, s: any) => sum + (s.cantidad_disponible || 0),
        0
      );

      const stockReservado = stockArray.reduce(
        (sum: number, s: any) => sum + (s.cantidad_reservada || 0),
        0
      );

      return {
        ...deposito,
        total_productos: stockArray.length,
        total_stock: stockTotal,
        total_reservado: stockReservado,
      };
    });

    // Filtrar por stock si se solicita
    if (con_stock === "true") {
      depositos = depositos.filter((d: any) => d.total_stock > 0);
    }

    return NextResponse.json(depositos);
  } catch (error: any) {
    console.error("Error in GET /api/inventario/depositos:", error);
    return NextResponse.json(
      { error: "Error al obtener depósitos", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventario/depositos - Crear depósito
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      codigo,
      nombre,
      tipo,
      direccion,
      ciudad,
      provincia,
      codigo_postal,
      telefono,
      responsable,
      capacidad_m3,
      temperatura_controlada,
      temperatura_min,
      temperatura_max,
      requiere_autorizacion,
      permite_picking,
      permite_recepcion,
      es_principal,
      notas,
    } = body;

    // Validaciones
    if (!codigo || !nombre || !tipo) {
      return NextResponse.json(
        { error: "Código, nombre y tipo son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el código no exista dentro de la org
    const existingResult = await query(`
      SELECT id FROM depositos WHERE codigo = $1 AND org_id = $2
    `, [codigo, session.org_id]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "El código de depósito ya existe" },
        { status: 400 }
      );
    }

    // Si es principal, desmarcar otros depósitos principales de la org
    if (es_principal) {
      await query(`UPDATE depositos SET es_principal = false WHERE es_principal = true AND org_id = $1`, [session.org_id]);
    }

    const result = await query(`
      INSERT INTO depositos (
        codigo, nombre, tipo, direccion, ciudad, provincia, codigo_postal,
        telefono, responsable, capacidad_m3, temperatura_controlada,
        temperatura_min, temperatura_max, requiere_autorizacion,
        permite_picking, permite_recepcion, es_principal, activo, notas, org_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, $18, $19)
      RETURNING *
    `, [
      codigo, nombre, tipo, direccion, ciudad, provincia, codigo_postal,
      telefono, responsable, capacidad_m3, temperatura_controlada ?? false,
      temperatura_min, temperatura_max, requiere_autorizacion ?? false,
      permite_picking ?? true, permite_recepcion ?? true, es_principal ?? false, notas,
      session.org_id
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/depositos:", error);
    return NextResponse.json(
      { error: "Error al crear depósito", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventario/depositos - Actualizar depósito
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, es_principal, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del depósito es requerido" },
        { status: 400 }
      );
    }

    // Si se marca como principal, desmarcar otros de la org
    if (es_principal === true) {
      await query(`
        UPDATE depositos SET es_principal = false
        WHERE es_principal = true AND id != $1 AND org_id = $2
      `, [id, session.org_id]);
    }

    const allUpdates = { ...updateData, es_principal };
    const fields = Object.keys(allUpdates);
    const values = Object.values(allUpdates);

    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    values.push(id);
    values.push(session.org_id);

    const result = await query(`
      UPDATE depositos
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length - 1} AND org_id = $${values.length}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/inventario/depositos:", error);
    return NextResponse.json(
      { error: "Error al actualizar depósito", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/inventario/depositos?id=xxx - Eliminar/Desactivar depósito
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
        { error: "ID del depósito es requerido" },
        { status: 400 }
      );
    }

    // Verificar que no tenga stock
    const stockCountResult = await query(`
      SELECT COUNT(*) as count FROM stock_depositos
      WHERE deposito_id = $1 AND cantidad_disponible > 0
    `, [id]);

    const stockCount = parseInt(stockCountResult.rows[0]?.count || '0');

    if (stockCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el depósito porque tiene ${stockCount} producto(s) con stock` },
        { status: 400 }
      );
    }

    // Verificar que no sea el depósito principal
    const depositoResult = await query(`
      SELECT es_principal FROM depositos WHERE id = $1 AND org_id = $2
    `, [id, session.org_id]);

    if (depositoResult.rows.length === 0) {
      return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
    }

    if (depositoResult.rows[0].es_principal) {
      return NextResponse.json(
        { error: "No se puede eliminar el depósito principal" },
        { status: 400 }
      );
    }

    // Si no tiene stock, solo desactivar
    const result = await query(`
      UPDATE depositos
      SET activo = false, fecha_inactivacion = NOW(), updated_at = NOW()
      WHERE id = $1 AND org_id = $2
      RETURNING *
    `, [id, session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, desactivado: true, data: result.rows[0] });
  } catch (error: any) {
    console.error("Error in DELETE /api/inventario/depositos:", error);
    return NextResponse.json(
      { error: "Error al eliminar depósito", details: error.message },
      { status: 500 }
    );
  }
}
