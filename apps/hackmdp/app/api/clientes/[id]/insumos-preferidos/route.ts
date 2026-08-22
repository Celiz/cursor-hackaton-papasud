import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

// GET - Obtener insumos preferidos de un cliente
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: clienteId } = await params;
    const { searchParams } = new URL(request.url);
    const equipoUnidadId = searchParams.get('equipo_unidad_id');
    const soloFavoritos = searchParams.get('favoritos') === 'true';

    let queryStr = `
      SELECT
        cip.id,
        cip.cliente_id,
        cip.equipo_unidad_id,
        eu.codigo as equipo_codigo,
        eu.numero_serie as equipo_serie,
        eq.marca as equipo_marca,
        eq.modelo as equipo_modelo,
        COALESCE(eq.marca || ' ' || eq.modelo, 'Todos los equipos') as equipo_descripcion,
        cip.producto_id,
        p.codigo as producto_codigo,
        p.nombre as producto_nombre,
        p.categoria as producto_categoria,
        p.precio_venta,
        p.stock_actual,
        CASE
          WHEN p.stock_actual <= 0 THEN 'agotado'
          WHEN p.stock_actual < COALESCE(p.stock_minimo, 5) THEN 'bajo'
          ELSE 'disponible'
        END as disponibilidad,
        cip.es_favorito,
        cip.es_recomendado_tecnico,
        cip.orden_prioridad,
        cip.marca_preferida,
        cip.marcas_alternativas,
        cip.marca_no_usar,
        cip.cantidad_habitual,
        cip.frecuencia_dias,
        cip.ultima_compra,
        cip.total_compras,
        cip.notas,
        cip.activo,
        cip.created_at
      FROM cliente_insumos_preferidos cip
      JOIN productos p ON cip.producto_id = p.id
      LEFT JOIN equipos_unidades eu ON cip.equipo_unidad_id = eu.id
      LEFT JOIN equipos eq ON eu.equipo_id = eq.id
      WHERE cip.cliente_id = $1 AND cip.activo = true
        AND EXISTS (SELECT 1 FROM clientes WHERE id = $1 AND org_id = $2)
    `;

    const queryParams: any[] = [clienteId, session.org_id];
    let paramIndex = 3;

    // Filtrar por equipo específico o general
    if (equipoUnidadId) {
      // Traer los del equipo específico + los generales (equipo_unidad_id IS NULL)
      queryStr += ` AND (cip.equipo_unidad_id = $${paramIndex} OR cip.equipo_unidad_id IS NULL)`;
      queryParams.push(equipoUnidadId);
      paramIndex++;
    }

    if (soloFavoritos) {
      queryStr += ` AND cip.es_favorito = true`;
    }

    queryStr += ` ORDER BY cip.es_favorito DESC, cip.orden_prioridad ASC, cip.total_compras DESC, p.nombre ASC`;

    const result = await query(queryStr, queryParams);

    // También obtener los equipos del cliente para el selector
    const equiposResult = await query(`
      SELECT
        eu.id,
        eu.codigo,
        eu.numero_serie,
        eq.marca,
        eq.modelo,
        eq.marca || ' ' || eq.modelo || COALESCE(' - ' || eu.numero_serie, '') as descripcion
      FROM equipos_unidades eu
      JOIN equipos eq ON eu.equipo_id = eq.id
      WHERE eu.cliente_id = $1 AND eu.activo = true
        AND EXISTS (SELECT 1 FROM clientes WHERE id = $1 AND org_id = $2)
      ORDER BY eq.marca, eq.modelo
    `, [clienteId, session.org_id]);

    return NextResponse.json({
      insumos: result.rows || [],
      equipos: equiposResult.rows || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/clientes/[id]/insumos-preferidos:', error);
    return NextResponse.json(
      { error: 'Error al cargar insumos preferidos', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Agregar un nuevo insumo preferido
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: clienteId } = await params;

    // Verificar que el cliente pertenece a la org
    const clienteCheck = await query(
      `SELECT id FROM clientes WHERE id = $1 AND org_id = $2`,
      [clienteId, session.org_id]
    );
    if (clienteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();

    const {
      producto_id,
      equipo_unidad_id,
      es_favorito,
      es_recomendado_tecnico,
      orden_prioridad,
      marca_preferida,
      marcas_alternativas,
      marca_no_usar,
      cantidad_habitual,
      frecuencia_dias,
      notas,
      notas_internas,
    } = body;

    if (!producto_id) {
      return NextResponse.json(
        { error: 'producto_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existingResult = await query(`
      SELECT id FROM cliente_insumos_preferidos
      WHERE cliente_id = $1
        AND producto_id = $2
        AND (equipo_unidad_id = $3 OR ($3 IS NULL AND equipo_unidad_id IS NULL))
    `, [clienteId, producto_id, equipo_unidad_id || null]);

    if (existingResult.rows.length > 0) {
      // Actualizar existente en lugar de crear nuevo
      const updateResult = await query(`
        UPDATE cliente_insumos_preferidos
        SET
          es_favorito = COALESCE($4, es_favorito),
          es_recomendado_tecnico = COALESCE($5, es_recomendado_tecnico),
          orden_prioridad = COALESCE($6, orden_prioridad),
          marca_preferida = COALESCE($7, marca_preferida),
          marcas_alternativas = COALESCE($8, marcas_alternativas),
          marca_no_usar = COALESCE($9, marca_no_usar),
          cantidad_habitual = COALESCE($10, cantidad_habitual),
          frecuencia_dias = COALESCE($11, frecuencia_dias),
          notas = COALESCE($12, notas),
          notas_internas = COALESCE($13, notas_internas),
          activo = true,
          updated_at = NOW()
        WHERE id = $14
        RETURNING *
      `, [
        es_favorito,
        es_recomendado_tecnico,
        orden_prioridad,
        marca_preferida,
        marcas_alternativas ? JSON.stringify(marcas_alternativas) : null,
        marca_no_usar,
        cantidad_habitual,
        frecuencia_dias,
        notas,
        notas_internas,
        existingResult.rows[0].id
      ]);

      return NextResponse.json(updateResult.rows[0]);
    }

    // Crear nuevo
    const result = await query(`
      INSERT INTO cliente_insumos_preferidos (
        cliente_id,
        producto_id,
        equipo_unidad_id,
        es_favorito,
        es_recomendado_tecnico,
        orden_prioridad,
        marca_preferida,
        marcas_alternativas,
        marca_no_usar,
        cantidad_habitual,
        frecuencia_dias,
        notas,
        notas_internas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      clienteId,
      producto_id,
      equipo_unidad_id || null,
      es_favorito || false,
      es_recomendado_tecnico || false,
      orden_prioridad || 0,
      marca_preferida || null,
      marcas_alternativas ? JSON.stringify(marcas_alternativas) : '[]',
      marca_no_usar || null,
      cantidad_habitual || null,
      frecuencia_dias || null,
      notas || null,
      notas_internas || null,
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/clientes/[id]/insumos-preferidos:', error);
    return NextResponse.json(
      { error: 'Error al agregar insumo preferido', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un insumo preferido
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: clienteId } = await params;

    // Verificar que el cliente pertenece a la org
    const clienteCheck = await query(
      `SELECT id FROM clientes WHERE id = $1 AND org_id = $2`,
      [clienteId, session.org_id]
    );
    if (clienteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { id: insumoId, ...updateData } = body;

    if (!insumoId) {
      return NextResponse.json(
        { error: 'id del insumo es requerido' },
        { status: 400 }
      );
    }

    const allowedFields = [
      'es_favorito',
      'es_recomendado_tecnico',
      'orden_prioridad',
      'marca_preferida',
      'marcas_alternativas',
      'marca_no_usar',
      'cantidad_habitual',
      'frecuencia_dias',
      'notas',
      'notas_internas',
      'activo',
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        if (key === 'marcas_alternativas' && value) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos válidos para actualizar' },
        { status: 400 }
      );
    }

    fields.push(`updated_at = NOW()`);
    values.push(insumoId);
    values.push(clienteId);

    const result = await query(
      `UPDATE cliente_insumos_preferidos SET ${fields.join(', ')} WHERE id = $${paramIndex} AND cliente_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Insumo preferido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PATCH /api/clientes/[id]/insumos-preferidos:', error);
    return NextResponse.json(
      { error: 'Error al actualizar insumo preferido', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar (desactivar) un insumo preferido
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: clienteId } = await params;

    // Verificar que el cliente pertenece a la org
    const clienteCheck = await query(
      `SELECT id FROM clientes WHERE id = $1 AND org_id = $2`,
      [clienteId, session.org_id]
    );
    if (clienteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const insumoId = searchParams.get('insumo_id');

    if (!insumoId) {
      return NextResponse.json(
        { error: 'insumo_id es requerido' },
        { status: 400 }
      );
    }

    // Soft delete - only if it belongs to this client
    await query(`
      UPDATE cliente_insumos_preferidos
      SET activo = false, updated_at = NOW()
      WHERE id = $1 AND cliente_id = $2
    `, [insumoId, clienteId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/clientes/[id]/insumos-preferidos:', error);
    return NextResponse.json(
      { error: 'Error al eliminar insumo preferido', details: error.message },
      { status: 500 }
    );
  }
}
