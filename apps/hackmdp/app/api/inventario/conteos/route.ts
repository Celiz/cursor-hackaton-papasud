import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/conteos - Listar conteos cíclicos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const deposito_id = searchParams.get("deposito_id");
    const tipo_conteo = searchParams.get("tipo_conteo");

    let sql = `
      SELECT
        c.*,
        json_build_object('id', d.id, 'codigo', d.codigo, 'nombre', d.nombre) as deposito,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ci.id,
            'producto_id', ci.producto_id,
            'cantidad_sistema', ci.cantidad_sistema,
            'cantidad_contada', ci.cantidad_contada,
            'diferencia', ci.diferencia,
            'contado', ci.contado,
            'producto', json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre)
          ))
          FROM conteos_ciclicos_items ci
          LEFT JOIN productos p ON ci.producto_id = p.id
          WHERE ci.conteo_id = c.id
        ), '[]'::json) as items
      FROM conteos_ciclicos c
      LEFT JOIN depositos d ON c.deposito_id = d.id
      WHERE d.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (estado) {
      sql += ` AND c.estado = $${paramIndex++}`;
      params.push(estado);
    }

    if (deposito_id) {
      sql += ` AND c.deposito_id = $${paramIndex++}`;
      params.push(deposito_id);
    }

    if (tipo_conteo) {
      sql += ` AND c.tipo_conteo = $${paramIndex++}`;
      params.push(tipo_conteo);
    }

    sql += ` ORDER BY c.fecha_programada DESC, c.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error in GET /api/inventario/conteos:", error);
    return NextResponse.json(
      { error: "Error al obtener conteos", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventario/conteos - Crear conteo cíclico
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      nombre,
      descripcion,
      deposito_id,
      tipo_conteo,
      criterio_seleccion,
      fecha_programada,
      items,
    } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el depósito pertenece a la org
    if (deposito_id) {
      const depCheck = await query(`SELECT id FROM depositos WHERE id = $1 AND org_id = $2`, [deposito_id, session.org_id]);
      if (depCheck.rows.length === 0) {
        return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
      }
    }

    // Generar número automático
    const countResult = await query(`SELECT COUNT(*) as count FROM conteos_ciclicos`);
    const count = parseInt(countResult.rows[0]?.count || '0');
    const numero = `CC-${String(count + 1).padStart(6, "0")}`;

    // Crear conteo
    const conteoResult = await query(`
      INSERT INTO conteos_ciclicos (
        numero, nombre, descripcion, deposito_id, tipo_conteo,
        criterio_seleccion, fecha_programada, estado, total_items
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'planificado', $8)
      RETURNING *
    `, [
      numero, nombre, descripcion, deposito_id,
      tipo_conteo || 'ciclico', criterio_seleccion || 'manual',
      fecha_programada, items?.length || 0
    ]);

    const conteo = conteoResult.rows[0];

    // Crear items si se proporcionan
    if (items && items.length > 0) {
      for (const item of items) {
        await query(`
          INSERT INTO conteos_ciclicos_items (
            conteo_id, producto_id, bin_id, lote_id, cantidad_sistema
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [conteo.id, item.producto_id, item.bin_id, item.lote_id, item.cantidad_sistema || 0]);
      }
    }

    // Retornar con datos completos
    const fullResult = await query(`
      SELECT
        c.*,
        json_build_object('id', d.id, 'codigo', d.codigo, 'nombre', d.nombre) as deposito
      FROM conteos_ciclicos c
      LEFT JOIN depositos d ON c.deposito_id = d.id
      WHERE c.id = $1
    `, [conteo.id]);

    return NextResponse.json(fullResult.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/conteos:", error);
    return NextResponse.json(
      { error: "Error al crear conteo", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventario/conteos - Actualizar conteo
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
        { error: "ID del conteo es requerido" },
        { status: 400 }
      );
    }

    // Verificar estado actual
    const existingResult = await query(
      `SELECT c.estado FROM conteos_ciclicos c JOIN depositos d ON c.deposito_id = d.id WHERE c.id = $1 AND d.org_id = $2`,
      [id, session.org_id]
    );
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "Conteo no encontrado" }, { status: 404 });
    }

    const estadoActual = existingResult.rows[0].estado;
    if (estadoActual === 'completado' || estadoActual === 'cancelado') {
      return NextResponse.json(
        { error: "No se puede modificar un conteo completado o cancelado" },
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

    const result = await query(`
      UPDATE conteos_ciclicos
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `, values);

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/inventario/conteos:", error);
    return NextResponse.json(
      { error: "Error al actualizar conteo", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/inventario/conteos?id=xxx - Cancelar/Eliminar conteo
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
        { error: "ID del conteo es requerido" },
        { status: 400 }
      );
    }

    // Verificar estado
    const existingResult = await query(
      `SELECT c.estado FROM conteos_ciclicos c JOIN depositos d ON c.deposito_id = d.id WHERE c.id = $1 AND d.org_id = $2`,
      [id, session.org_id]
    );
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "Conteo no encontrado" }, { status: 404 });
    }

    const estado = existingResult.rows[0].estado;

    if (estado === 'planificado') {
      // Eliminar items y conteo
      await query(`DELETE FROM conteos_ciclicos_items WHERE conteo_id = $1`, [id]);
      await query(`DELETE FROM conteos_ciclicos WHERE id = $1`, [id]);
      return NextResponse.json({ success: true, eliminado: true });
    }

    if (estado === 'en_curso') {
      // Solo cancelar
      const result = await query(`
        UPDATE conteos_ciclicos
        SET estado = 'cancelado', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);
      return NextResponse.json({ success: true, cancelado: true, data: result.rows[0] });
    }

    return NextResponse.json(
      { error: "No se puede eliminar un conteo completado o ya cancelado" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in DELETE /api/inventario/conteos:", error);
    return NextResponse.json(
      { error: "Error al eliminar conteo", details: error.message },
      { status: 500 }
    );
  }
}
