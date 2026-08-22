import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/bins - Listar bins/ubicaciones
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deposito_id = searchParams.get("deposito_id");
    const tipo = searchParams.get("tipo");
    const activo = searchParams.get("activo");
    const bloqueado = searchParams.get("bloqueado");

    let sql = `
      SELECT
        b.*,
        json_build_object('id', d.id, 'codigo', d.codigo, 'nombre', d.nombre) as deposito,
        json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre) as producto_dedicado
      FROM deposito_bins b
      LEFT JOIN depositos d ON b.deposito_id = d.id
      LEFT JOIN productos p ON b.solo_producto_id = p.id
      WHERE d.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (deposito_id) {
      sql += ` AND b.deposito_id = $${paramIndex++}`;
      params.push(deposito_id);
    }

    if (tipo) {
      sql += ` AND b.tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    if (activo !== null && activo !== undefined) {
      sql += ` AND b.activo = $${paramIndex++}`;
      params.push(activo === "true");
    }

    if (bloqueado !== null && bloqueado !== undefined) {
      sql += ` AND b.bloqueado = $${paramIndex++}`;
      params.push(bloqueado === "true");
    }

    sql += ` ORDER BY b.deposito_id, b.pasillo, b.estanteria, b.nivel, b.posicion`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error in GET /api/inventario/bins:", error);
    return NextResponse.json(
      { error: "Error al obtener bins", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventario/bins - Crear bin
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      deposito_id,
      codigo,
      nombre,
      descripcion,
      pasillo,
      estanteria,
      nivel,
      posicion,
      tipo,
      prioridad,
      capacidad_m3,
      capacidad_kg,
      capacidad_unidades,
      solo_producto_id,
      temperatura_min,
      temperatura_max,
    } = body;

    if (!deposito_id || !codigo) {
      return NextResponse.json(
        { error: "Depósito y código son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el depósito pertenece a la org
    const depCheck = await query(`SELECT id FROM depositos WHERE id = $1 AND org_id = $2`, [deposito_id, session.org_id]);
    if (depCheck.rows.length === 0) {
      return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
    }

    // Verificar que no exista el código en el depósito
    const existingResult = await query(`
      SELECT id FROM deposito_bins WHERE deposito_id = $1 AND codigo = $2
    `, [deposito_id, codigo]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "El código de bin ya existe en este depósito" },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO deposito_bins (
        deposito_id, codigo, nombre, descripcion,
        pasillo, estanteria, nivel, posicion,
        tipo, prioridad,
        capacidad_m3, capacidad_kg, capacidad_unidades,
        solo_producto_id, temperatura_min, temperatura_max
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      deposito_id, codigo, nombre, descripcion,
      pasillo, estanteria, nivel, posicion,
      tipo || 'picking', prioridad || 0,
      capacidad_m3, capacidad_kg, capacidad_unidades,
      solo_producto_id, temperatura_min, temperatura_max
    ]);

    // Fetch with joined data
    const fullResult = await query(`
      SELECT
        b.*,
        json_build_object('id', d.id, 'codigo', d.codigo, 'nombre', d.nombre) as deposito
      FROM deposito_bins b
      LEFT JOIN depositos d ON b.deposito_id = d.id
      WHERE b.id = $1
    `, [result.rows[0].id]);

    return NextResponse.json(fullResult.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/bins:", error);
    return NextResponse.json(
      { error: "Error al crear bin", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventario/bins - Actualizar bin
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
        { error: "ID del bin es requerido" },
        { status: 400 }
      );
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
      UPDATE deposito_bins
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length - 1}
        AND deposito_id IN (SELECT id FROM depositos WHERE org_id = $${values.length})
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Bin no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/inventario/bins:", error);
    return NextResponse.json(
      { error: "Error al actualizar bin", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/inventario/bins?id=xxx - Eliminar/Desactivar bin
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
        { error: "ID del bin es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el bin pertenece a un depósito de la org
    const binCheck = await query(`
      SELECT b.id FROM deposito_bins b
      JOIN depositos d ON b.deposito_id = d.id
      WHERE b.id = $1 AND d.org_id = $2
    `, [id, session.org_id]);
    if (binCheck.rows.length === 0) {
      return NextResponse.json({ error: "Bin no encontrado" }, { status: 404 });
    }

    // Verificar que no tenga stock
    const stockResult = await query(`
      SELECT COUNT(*) as count FROM stock_bins
      WHERE bin_id = $1 AND (cantidad_disponible > 0 OR cantidad_reservada > 0)
    `, [id]);

    const hasStock = parseInt(stockResult.rows[0]?.count || '0') > 0;

    if (hasStock) {
      // Solo desactivar
      const result = await query(`
        UPDATE deposito_bins
        SET activo = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      return NextResponse.json({ success: true, desactivado: true, data: result.rows[0] });
    }

    // Eliminar si no tiene stock
    const result = await query(`
      DELETE FROM deposito_bins WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Bin no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, eliminado: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/inventario/bins:", error);
    return NextResponse.json(
      { error: "Error al eliminar bin", details: error.message },
      { status: 500 }
    );
  }
}
