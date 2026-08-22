import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

// GET /api/inventario/seriales - Listar números de serie
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const producto_id = searchParams.get("producto_id");
    const estado = searchParams.get("estado");
    const numero_serie = searchParams.get("numero_serie");

    let sql = `
      SELECT
        ps.*,
        json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre) as producto,
        json_build_object('numero_lote', pl.numero_lote, 'fecha_vencimiento', pl.fecha_vencimiento) as lote,
        json_build_object('nombre', d.nombre) as deposito,
        json_build_object('codigo', db.codigo, 'nombre', db.nombre) as bin,
        json_build_object('nombre', c.nombre, 'razon_social', c.nombre_fantasia) as cliente
      FROM productos_seriales ps
      LEFT JOIN productos p ON ps.producto_id = p.id
      LEFT JOIN productos_lotes pl ON ps.lote_id = pl.id
      LEFT JOIN depositos d ON ps.deposito_id = d.id
      LEFT JOIN deposito_bins db ON ps.bin_id = db.id
      LEFT JOIN clientes c ON ps.cliente_id = c.id
      WHERE p.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (producto_id) {
      sql += ` AND ps.producto_id = $${paramIndex++}`;
      params.push(producto_id);
    }

    if (estado) {
      sql += ` AND ps.estado = $${paramIndex++}`;
      params.push(estado);
    }

    if (numero_serie) {
      sql += ` AND ps.numero_serie ILIKE $${paramIndex++}`;
      params.push(`%${numero_serie}%`);
    }

    sql += ` ORDER BY ps.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error in GET /api/inventario/seriales:", error);
    return NextResponse.json(
      { error: "Error al obtener seriales", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/inventario/seriales - Crear número de serie
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    const {
      producto_id,
      numero_serie,
      lote_id,
      deposito_id,
      bin_id,
      garantia_meses,
      costo_adquisicion,
    } = body;

    if (!producto_id || !numero_serie) {
      return NextResponse.json(
        { error: "Producto y número de serie son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece a la org
    const prodCheck = await query(`SELECT id FROM productos WHERE id = $1 AND org_id = $2`, [producto_id, session.org_id]);
    if (prodCheck.rows.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Verificar que no exista
    const existingResult = await query(`
      SELECT id FROM productos_seriales WHERE numero_serie = $1
    `, [numero_serie]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: "El número de serie ya está registrado" },
        { status: 400 }
      );
    }

    // Calcular fecha de garantía
    let garantia_hasta: any = null;
    if (garantia_meses) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() + garantia_meses);
      garantia_hasta = fecha.toISOString().split('T')[0];
    }

    const result = await query(`
      INSERT INTO productos_seriales (
        producto_id, numero_serie, lote_id, deposito_id, bin_id,
        estado, garantia_meses, garantia_hasta, costo_adquisicion
      )
      VALUES ($1, $2, $3, $4, $5, 'stock', $6, $7, $8)
      RETURNING *
    `, [
      producto_id, numero_serie, lote_id, deposito_id, bin_id,
      garantia_meses, garantia_hasta, costo_adquisicion
    ]);

    // Fetch with joined data
    const fullResult = await query(`
      SELECT
        ps.*,
        json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre) as producto,
        json_build_object('numero_lote', pl.numero_lote) as lote
      FROM productos_seriales ps
      LEFT JOIN productos p ON ps.producto_id = p.id
      LEFT JOIN productos_lotes pl ON ps.lote_id = pl.id
      WHERE ps.id = $1
    `, [result.rows[0].id]);

    return NextResponse.json(fullResult.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/seriales:", error);
    return NextResponse.json(
      { error: "Error al crear serial", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/inventario/seriales - Actualizar serial
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
        { error: "ID del serial es requerido" },
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
      UPDATE productos_seriales
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length - 1}
        AND producto_id IN (SELECT id FROM productos WHERE org_id = $${values.length})
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Serial no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error in PUT /api/inventario/seriales:", error);
    return NextResponse.json(
      { error: "Error al actualizar serial", details: error.message },
      { status: 500 }
    );
  }
}
