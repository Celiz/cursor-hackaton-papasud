import { todayAR } from "@/lib/utils";
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/proveedor-listas-precios
 * Obtiene listas de precios de proveedores
 * Query params:
 *   - proveedor_id: filtrar por proveedor
 *   - estado: filtrar por estado (borrador, activa, vencida, cancelada)
 *   - vigentes: true para solo listas vigentes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Load org-level defaults for price list attention thresholds
    const cfgRow = await query(
      `SELECT config FROM organizations WHERE id = $1`,
      [session.org_id]
    );
    const lp = (cfgRow.rows[0]?.config?.listas_precios ?? {}) as {
      dias_aviso_vencimiento?: number;
      dias_antiguedad_aviso?: number;
    };
    const diasAviso = lp.dias_aviso_vencimiento ?? 7;
    const diasAntiguedad = lp.dias_antiguedad_aviso ?? 60;

    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get('proveedor_id');
    const estado = searchParams.get('estado');
    const vigentes = searchParams.get('vigentes') === 'true';

    let sql = `
      SELECT
        plp.*,
        prov.nombre as proveedor_nombre,
        prov.cuit as proveedor_cuit,
        prov.dias_aviso_vencimiento as prov_dias_aviso_vencimiento,
        prov.dias_antiguedad_aviso as prov_dias_antiguedad_aviso,
        COUNT(pli.id) as items_count,
        COUNT(pli.id) FILTER (WHERE pli.equipo_id IS NOT NULL OR pli.producto_id IS NOT NULL) as vinculados_count,
        MIN(pli.precio_costo) as precio_minimo,
        MAX(pli.precio_costo) as precio_maximo
      FROM proveedor_listas_precios plp
      JOIN proveedores prov ON prov.id = plp.proveedor_id
      LEFT JOIN proveedor_lista_items pli ON pli.lista_id = plp.id AND pli.activo = true
      WHERE plp.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (proveedorId) {
      sql += ` AND plp.proveedor_id = $${paramIndex++}`;
      params.push(proveedorId);
    }

    if (estado) {
      sql += ` AND plp.estado = $${paramIndex++}`;
      params.push(estado);
    }

    if (vigentes) {
      sql += ` AND plp.estado = 'activa'
               AND plp.fecha_inicio <= CURRENT_DATE
               AND (plp.fecha_fin IS NULL OR plp.fecha_fin >= CURRENT_DATE)`;
    }

    // Append threshold params after all dynamic filters
    params.push(diasAviso);
    const idxAviso = params.length; // e.g. $2 if no filters, $3/$4 with filters
    params.push(diasAntiguedad);
    const idxAntig = params.length;

    sql += `
      GROUP BY plp.id, prov.nombre, prov.cuit,
               prov.dias_aviso_vencimiento, prov.dias_antiguedad_aviso
      ORDER BY plp.created_at DESC
    `;

    // Wrap as subquery to add computed attention columns after GROUP BY aggregation
    sql = `
      SELECT
        base.*,
        (base.fecha_fin - CURRENT_DATE) AS dias_para_vencer,
        (CURRENT_DATE - base.fecha_inicio) AS dias_antiguedad,
        CASE
          WHEN base.estado <> 'activa' THEN 'ok'
          WHEN base.fecha_fin IS NOT NULL AND base.fecha_fin < CURRENT_DATE THEN 'vencida'
          WHEN base.fecha_fin IS NOT NULL
               AND (base.fecha_fin - CURRENT_DATE) <= COALESCE(base.prov_dias_aviso_vencimiento, $${idxAviso}) THEN 'por_vencer'
          WHEN base.fecha_fin IS NULL
               AND (CURRENT_DATE - base.fecha_inicio) >= COALESCE(base.prov_dias_antiguedad_aviso, $${idxAntig}) THEN 'revisar'
          ELSE 'ok'
        END AS estado_atencion
      FROM (${sql}) base
    `;

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching proveedor listas precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/proveedor-listas-precios
 * Crea una nueva lista de precios
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      proveedor_id,
      nombre,
      codigo,
      fecha_inicio,
      fecha_fin,
      moneda = 'ARS',
      tipo_cotizacion = 'oficial',
      aplica_descuento_global = false,
      descuento_global_porcentaje = 0,
      plazo_entrega_dias,
      cantidad_minima_pedido,
      condiciones_pago,
      notas,
      archivo_origen,
      items = []
    } = body;

    if (!proveedor_id || !nombre) {
      return NextResponse.json(
        { error: 'proveedor_id y nombre son requeridos' },
        { status: 400 }
      );
    }

    // Crear la lista
    const listaResult = await query(`
      INSERT INTO proveedor_listas_precios (
        org_id, proveedor_id, nombre, codigo, fecha_inicio, fecha_fin,
        moneda, tipo_cotizacion, aplica_descuento_global, descuento_global_porcentaje,
        plazo_entrega_dias, cantidad_minima_pedido, condiciones_pago, notas, archivo_origen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      session.org_id, proveedor_id, nombre, codigo, fecha_inicio || todayAR(),
      fecha_fin, moneda, tipo_cotizacion, aplica_descuento_global, descuento_global_porcentaje,
      plazo_entrega_dias, cantidad_minima_pedido, condiciones_pago, notas, archivo_origen
    ]);

    const lista = listaResult.rows[0];

    // Insertar items si se proporcionaron
    if (items.length > 0) {
      for (const item of items) {
        await query(`
          INSERT INTO proveedor_lista_items (
            lista_id, producto_id, codigo_proveedor, nombre_proveedor,
            precio_costo, cantidad_minima, descuento_porcentaje,
            plazo_entrega_dias, unidad_medida, factor_conversion, fila_origen
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          lista.id, item.producto_id, item.codigo_proveedor, item.nombre_proveedor,
          item.precio_costo, item.cantidad_minima || 1, item.descuento_porcentaje || 0,
          item.plazo_entrega_dias, item.unidad_medida, item.factor_conversion || 1, item.fila_origen
        ]);
      }
    }

    return NextResponse.json(lista, { status: 201 });
  } catch (error: any) {
    console.error('Error creating proveedor lista precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/proveedor-listas-precios
 * Actualiza una lista de precios existente
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    const allowedFields = [
      'nombre', 'codigo', 'fecha_inicio', 'fecha_fin', 'moneda', 'tipo_cotizacion',
      'estado', 'aplica_descuento_global', 'descuento_global_porcentaje',
      'plazo_entrega_dias', 'cantidad_minima_pedido', 'condiciones_pago', 'notas'
    ];

    const setClauses: string[] = [];
    const params: any[] = [id, session.org_id];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const result = await query(`
      UPDATE proveedor_listas_precios
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND org_id = $2
      RETURNING *
    `, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating proveedor lista precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/proveedor-listas-precios?id=xxx
 * Elimina (o cancela) una lista de precios
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
    }

    if (force) {
      // Eliminar completamente (verify org ownership first, then delete items and list)
      await query('DELETE FROM proveedor_lista_items WHERE lista_id = $1 AND lista_id IN (SELECT id FROM proveedor_listas_precios WHERE id = $1 AND org_id = $2)', [id, session.org_id]);
      await query('DELETE FROM proveedor_listas_precios WHERE id = $1 AND org_id = $2', [id, session.org_id]);
    } else {
      // Solo cancelar (soft delete)
      await query(`
        UPDATE proveedor_listas_precios
        SET estado = 'cancelada', updated_at = NOW()
        WHERE id = $1 AND org_id = $2
      `, [id, session.org_id]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting proveedor lista precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
