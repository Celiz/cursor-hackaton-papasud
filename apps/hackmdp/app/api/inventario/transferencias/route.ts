import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/transferencias - Listar transferencias entre depósitos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const deposito_origen = searchParams.get("deposito_origen");
    const deposito_destino = searchParams.get("deposito_destino");
    const fecha_desde = searchParams.get("fecha_desde");
    const fecha_hasta = searchParams.get("fecha_hasta");

    let sql = `
      SELECT
        t.*,
        json_build_object('id', do.id, 'codigo', do.codigo, 'nombre', do.nombre) as origen,
        json_build_object('id', dd.id, 'codigo', dd.codigo, 'nombre', dd.nombre) as destino,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ti.id,
            'producto_id', ti.producto_id,
            'cantidad', ti.cantidad,
            'lote_id', ti.lote_id,
            'serial_id', ti.serial_id,
            'observaciones', ti.observaciones,
            'producto', json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre)
          ))
          FROM transferencias_deposito_items ti
          LEFT JOIN productos p ON ti.producto_id = p.id
          WHERE ti.transferencia_id = t.id
        ), '[]'::json) as items
      FROM transferencias_deposito t
      LEFT JOIN depositos do ON t.deposito_origen_id = do.id
      LEFT JOIN depositos dd ON t.deposito_destino_id = dd.id
      WHERE t.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (estado) {
      sql += ` AND t.estado = $${paramIndex++}`;
      params.push(estado);
    }

    if (deposito_origen) {
      sql += ` AND t.deposito_origen_id = $${paramIndex++}`;
      params.push(deposito_origen);
    }

    if (deposito_destino) {
      sql += ` AND t.deposito_destino_id = $${paramIndex++}`;
      params.push(deposito_destino);
    }

    if (fecha_desde) {
      sql += ` AND t.fecha_transferencia >= $${paramIndex++}`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      sql += ` AND t.fecha_transferencia <= $${paramIndex++}`;
      params.push(fecha_hasta);
    }

    sql += ` ORDER BY t.created_at DESC`;

    const result = await query(sql, params);

    // Calcular totales por transferencia
    const transferencias = (result.rows || []).map((t: any) => {
      const itemsArray = Array.isArray(t.items) ? t.items : [];
      return {
        ...t,
        total_items: itemsArray.length,
        total_cantidad: itemsArray.reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0),
      };
    });

    return NextResponse.json(transferencias);
  } catch (error: any) {
    console.error("Error in GET /api/inventario/transferencias:", error);
    return NextResponse.json(
      { error: "Error al obtener transferencias", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventario/transferencias - Crear transferencia
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      numero,
      deposito_origen_id,
      deposito_destino_id,
      fecha_transferencia,
      motivo,
      observaciones,
      items,
    } = body;

    // Validaciones
    if (!deposito_origen_id || !deposito_destino_id || !fecha_transferencia) {
      return NextResponse.json(
        { error: "Depósito origen, destino y fecha son requeridos" },
        { status: 400 }
      );
    }

    if (deposito_origen_id === deposito_destino_id) {
      return NextResponse.json(
        { error: "El depósito origen y destino no pueden ser el mismo" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Debe incluir al menos un item" },
        { status: 400 }
      );
    }

    // Generar número automático si no se proporciona
    let numeroFinal = numero;
    if (!numeroFinal) {
      const countResult = await query(`SELECT COUNT(*) as count FROM transferencias_deposito`);
      const count = parseInt(countResult.rows[0]?.count || '0');
      numeroFinal = `TRF-${String(count + 1).padStart(6, "0")}`;
    }

    // Verificar stock disponible en origen
    for (const item of items) {
      const stockResult = await query(`
        SELECT cantidad_disponible FROM stock_depositos
        WHERE deposito_id = $1 AND producto_id = $2
      `, [deposito_origen_id, item.producto_id]);

      const stockData = stockResult.rows[0];
      if (!stockData || stockData.cantidad_disponible < item.cantidad) {
        return NextResponse.json(
          {
            error: `Stock insuficiente en origen para producto ${item.producto_id}`,
            disponible: stockData?.cantidad_disponible || 0,
            solicitado: item.cantidad,
          },
          { status: 400 }
        );
      }
    }

    // Crear transferencia
    const transfResult = await query(`
      INSERT INTO transferencias_deposito (
        numero, deposito_origen_id, deposito_destino_id,
        fecha_transferencia, motivo, observaciones, estado, org_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'borrador', $7)
      RETURNING *
    `, [numeroFinal, deposito_origen_id, deposito_destino_id, fecha_transferencia, motivo, observaciones, session.org_id]);

    const transferencia = transfResult.rows[0];

    // Crear items
    for (const item of items) {
      await query(`
        INSERT INTO transferencias_deposito_items (
          transferencia_id, producto_id, cantidad, lote_id, serial_id, observaciones
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [transferencia.id, item.producto_id, item.cantidad, item.lote_id, item.serial_id, item.observaciones]);
    }

    // Retornar con items
    const fullResult = await query(`
      SELECT
        t.*,
        json_build_object('id', do.id, 'codigo', do.codigo, 'nombre', do.nombre) as origen,
        json_build_object('id', dd.id, 'codigo', dd.codigo, 'nombre', dd.nombre) as destino,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ti.id,
            'producto_id', ti.producto_id,
            'cantidad', ti.cantidad,
            'producto', json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre)
          ))
          FROM transferencias_deposito_items ti
          LEFT JOIN productos p ON ti.producto_id = p.id
          WHERE ti.transferencia_id = t.id
        ), '[]'::json) as items
      FROM transferencias_deposito t
      LEFT JOIN depositos do ON t.deposito_origen_id = do.id
      LEFT JOIN depositos dd ON t.deposito_destino_id = dd.id
      WHERE t.id = $1
    `, [transferencia.id]);

    return NextResponse.json(fullResult.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/transferencias:", error);
    return NextResponse.json(
      { error: "Error al crear transferencia", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventario/transferencias - Actualizar transferencia
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
        { error: "ID de la transferencia es requerido" },
        { status: 400 }
      );
    }

    // Verificar que esté en estado borrador
    const existingResult = await query(`
      SELECT estado FROM transferencias_deposito WHERE id = $1 AND org_id = $2
    `, [id, session.org_id]);

    if (existingResult.rows.length > 0 && existingResult.rows[0].estado !== "borrador") {
      return NextResponse.json(
        { error: "Solo se pueden modificar transferencias en estado borrador" },
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
      UPDATE transferencias_deposito
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length - 1} AND org_id = $${values.length}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
    }

    // Fetch with full data
    const fullResult = await query(`
      SELECT
        t.*,
        json_build_object('id', do.id, 'codigo', do.codigo, 'nombre', do.nombre) as origen,
        json_build_object('id', dd.id, 'codigo', dd.codigo, 'nombre', dd.nombre) as destino,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ti.id,
            'producto_id', ti.producto_id,
            'cantidad', ti.cantidad,
            'producto', json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre)
          ))
          FROM transferencias_deposito_items ti
          LEFT JOIN productos p ON ti.producto_id = p.id
          WHERE ti.transferencia_id = t.id
        ), '[]'::json) as items
      FROM transferencias_deposito t
      LEFT JOIN depositos do ON t.deposito_origen_id = do.id
      LEFT JOIN depositos dd ON t.deposito_destino_id = dd.id
      WHERE t.id = $1
    `, [id]);

    return NextResponse.json(fullResult.rows[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/inventario/transferencias:", error);
    return NextResponse.json(
      { error: "Error al actualizar transferencia", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/inventario/transferencias?id=xxx - Eliminar transferencia
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
        { error: "ID de la transferencia es requerido" },
        { status: 400 }
      );
    }

    // Verificar que esté en estado borrador y pertenezca a la org
    const existingResult = await query(`
      SELECT estado FROM transferencias_deposito WHERE id = $1 AND org_id = $2
    `, [id, session.org_id]);

    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
    }

    if (existingResult.rows[0].estado !== "borrador") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar transferencias en estado borrador" },
        { status: 400 }
      );
    }

    // Eliminar items primero
    await query(`DELETE FROM transferencias_deposito_items WHERE transferencia_id = $1`, [id]);

    // Eliminar transferencia
    const result = await query(`
      DELETE FROM transferencias_deposito WHERE id = $1 AND org_id = $2 RETURNING id
    `, [id, session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/inventario/transferencias:", error);
    return NextResponse.json(
      { error: "Error al eliminar transferencia", details: error.message },
      { status: 500 }
    );
  }
}
