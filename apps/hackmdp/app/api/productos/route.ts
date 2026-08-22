import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Paginación server-side
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // Soportar múltiples categorías (para filtro "otros")
    const categorias = searchParams.getAll('categoria');
    const depositosFiltro = searchParams.getAll('deposito_id').filter(Boolean);
    // Estado de stock (multi-select, OR entre opciones): con_stock | sin_stock | bajo_minimo
    const estadoStock = searchParams.getAll('estado_stock').filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [session.org_id];
    let paramIndex = 2;
    let whereConditions = 'WHERE p.org_id = $1 AND p.deleted_at IS NULL';

    if (depositosFiltro.length > 0) {
      // Cast a text para no asumir uuid/int en deposito_id.
      whereConditions += ` AND p.deposito_id::text = ANY($${paramIndex}::text[])`;
      params.push(depositosFiltro);
      paramIndex++;
    }

    if (estadoStock.length > 0) {
      const ors: string[] = [];
      if (estadoStock.includes('con_stock')) ors.push('p.stock_actual > 0');
      if (estadoStock.includes('sin_stock')) ors.push('COALESCE(p.stock_actual, 0) = 0');
      if (estadoStock.includes('bajo_minimo')) ors.push('(p.stock_minimo IS NOT NULL AND p.stock_actual < p.stock_minimo)');
      if (ors.length > 0) whereConditions += ` AND (${ors.join(' OR ')})`;
    }

    // Área / línea de análisis (multi-select)
    const lineasFiltro = searchParams.getAll('linea_analisis').filter(Boolean);
    if (lineasFiltro.length > 0) {
      whereConditions += ` AND p.linea_analisis = ANY($${paramIndex}::text[])`;
      params.push(lineasFiltro);
      paramIndex++;
    }

    if (categorias.length === 1) {
      whereConditions += ` AND (p.categoria = $${paramIndex} OR c.nombre = $${paramIndex})`;
      params.push(categorias[0]);
      paramIndex++;
    } else if (categorias.length > 1) {
      const placeholders = categorias.map((_, i) => `$${paramIndex + i}`).join(', ');
      whereConditions += ` AND (p.categoria IN (${placeholders}) OR c.nombre IN (${placeholders}))`;
      params.push(...categorias);
      paramIndex += categorias.length;
    }

    // Filtro opcional por marca (nombre de marca o fabricante).
    const marcaFiltro = searchParams.get('marca');
    if (marcaFiltro) {
      whereConditions += ` AND (m.nombre = $${paramIndex} OR p.fabricante = $${paramIndex})`;
      params.push(marcaFiltro);
      paramIndex++;
    }

    // Filtro insumo/equipo derivado de la categoría (no hay columna `tipo`).
    // equipo = categorías de equipos/módulos/alquiler; insumo = el complemento.
    const tipo = searchParams.get('tipo'); // "equipo" | "insumo" | null
    const EQUIPO_REGEX = 'equipo|módulo|modulo';
    if (tipo === 'equipo') {
      whereConditions += ` AND p.categoria ~* $${paramIndex}`;
      params.push(EQUIPO_REGEX);
      paramIndex++;
    } else if (tipo === 'insumo') {
      whereConditions += ` AND (p.categoria IS NULL OR p.categoria !~* $${paramIndex})`;
      params.push(EQUIPO_REGEX);
      paramIndex++;
    }

    if (search) {
      // Split search into words and match ALL words (AND logic)
      const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0);
      const searchField = searchParams.get('search_field'); // "codigo", "nombre", or null for all

      if (searchTerms.length === 1) {
        // Single word - search based on field filter
        if (searchField === 'codigo') {
          whereConditions += ` AND p.codigo ILIKE $${paramIndex}`;
        } else if (searchField === 'nombre') {
          whereConditions += ` AND p.nombre ILIKE $${paramIndex}`;
        } else {
          whereConditions += ` AND (p.nombre ILIKE $${paramIndex} OR p.codigo ILIKE $${paramIndex})`;
        }
        params.push(`%${searchTerms[0]}%`);
        paramIndex++;
      } else {
        // Multiple words - AND matching (all words must be present)
        const conditions: string[] = [];
        searchTerms.forEach((term) => {
          if (searchField === 'codigo') {
            conditions.push(`p.codigo ILIKE $${paramIndex}`);
          } else if (searchField === 'nombre') {
            conditions.push(`p.nombre ILIKE $${paramIndex}`);
          } else {
            conditions.push(`(p.nombre ILIKE $${paramIndex} OR p.codigo ILIKE $${paramIndex})`);
          }
          params.push(`%${term}%`);
          paramIndex++;
        });
        whereConditions += ` AND (${conditions.join(' AND ')})`;
      }
    }

    // Filtro por proveedor (multi-select, server-side). Matchea el nombre del
    // proveedor efectivo del producto (proveedor_habitual_id ?? proveedor_id),
    // que es el mismo que se devuelve como proveedor_nombre.
    const proveedoresFiltro = searchParams.getAll('proveedor').filter(Boolean);
    if (proveedoresFiltro.length > 0) {
      whereConditions += ` AND prov.nombre = ANY($${paramIndex}::text[])`;
      params.push(proveedoresFiltro);
      paramIndex++;
    }

    const fromClause = `
      FROM productos p
      LEFT JOIN productos_web pw ON pw.producto_id = p.id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN marcas m ON m.id = p.marca_id
      LEFT JOIN proveedores prov ON prov.id = COALESCE(p.proveedor_habitual_id, p.proveedor_id)
      LEFT JOIN depositos dep ON dep.id = p.deposito_id
    `;

    // Count total para paginación
    const countQuery = `SELECT COUNT(*) as total ${fromClause} ${whereConditions}`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    // Query paginada con JOINs unificados
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    const paginationParams = [...params, pageSize, offset];

    const queryStr = `
      SELECT p.*,
        prov.nombre as proveedor_nombre,
        pw.precio_oferta,
        pw.caracteristicas,
        pw.peso_gramos,
        pw.dimensiones,
        pw.destacado,
        COALESCE(c.nombre, p.categoria) as categoria_nombre,
        c.slug as categoria_slug,
        COALESCE(m.nombre, p.fabricante) as marca_nombre,
        m.slug as marca_slug,
        m.logo_url as marca_logo,
        dep.nombre as deposito_nombre
      ${fromClause}
      ${whereConditions}
      ORDER BY p.nombre ASC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const result = await query(queryStr, paginationParams);

    return NextResponse.json({
      data: result.rows || [],
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/productos:', error);
    return NextResponse.json(
      { error: 'Error al cargar productos', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      nombre,
      codigo,
      categoria,
      descripcion,
      descripcion_corta,
      unidad_medida,
      precio_costo,
      precio_venta,
      stock_actual,
      stock_minimo,
      stock_maximo,
      ubicacion,
      lote,
      fecha_vencimiento,
      fabricante,
      temperatura_almacenamiento,
      imagen_url,
      imagenes,
      categoria_id,
      marca_id,
      proveedor_habitual_id,
      deposito_id,
      es_recurrente,
      linea_analisis,
      ganancia,
      iva_alicuota,
      precio_venta_modo,
      moneda_compra,
    } = body;

    // Validate required fields
    if (!nombre || !codigo) {
      return NextResponse.json(
        { error: 'Los campos nombre y codigo son obligatorios' },
        { status: 400 }
      );
    }

    // Check if codigo already exists in this org
    const existingProduct = await query(
      `SELECT id FROM productos
       WHERE org_id = $1 AND codigo = $2 AND deleted_at IS NULL`,
      [session.org_id, codigo]
    );

    if (existingProduct.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un producto con este código en la organización' },
        { status: 409 }
      );
    }

    // Insert new product
    const insertQuery = `
      INSERT INTO productos (
        org_id, nombre, codigo, categoria, descripcion, descripcion_corta,
        unidad_medida, precio_costo, precio_venta, stock_actual,
        stock_minimo, stock_maximo, ubicacion, lote, fecha_vencimiento,
        fabricante, temperatura_almacenamiento, imagen_url, imagenes,
        categoria_id, marca_id, proveedor_habitual_id, deposito_id,
        es_recurrente, linea_analisis,
        ganancia, iva_alicuota, precio_venta_modo, moneda_compra
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29
      )
      RETURNING *
    `;

    const result = await query(insertQuery, [
      session.org_id,
      nombre,
      codigo,
      categoria || null,
      descripcion || null,
      descripcion_corta || null,
      unidad_medida || null,
      precio_costo || null,
      precio_venta || null,
      stock_actual || null,
      stock_minimo || null,
      stock_maximo || null,
      ubicacion || null,
      lote || null,
      fecha_vencimiento || null,
      fabricante || null,
      temperatura_almacenamiento || null,
      imagen_url || null,
      imagenes || null,
      categoria_id || null,
      marca_id || null,
      proveedor_habitual_id || null,
      deposito_id || null,
      es_recurrente === true,
      linea_analisis || null,
      ganancia ?? null,
      iva_alicuota ?? null,
      precio_venta_modo || 'calculado',
      moneda_compra || 'ARS',
    ]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/productos:', error);
    return NextResponse.json(
      { error: 'Error al crear producto', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El campo id es obligatorio' },
        { status: 400 }
      );
    }

    // Remove generated/non-updatable fields
    delete fields.margen_porcentaje;
    delete fields.margen_pesos;
    delete fields.slug;
    delete fields.org_id;
    delete fields.created_at;
    delete fields.updated_at;
    delete fields.deleted_at;

    const fieldKeys = Object.keys(fields);
    if (fieldKeys.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    // If updating codigo, check uniqueness
    if (fields.codigo) {
      const existingProduct = await query(
        `SELECT id FROM productos
         WHERE org_id = $1 AND codigo = $2 AND id != $3 AND deleted_at IS NULL`,
        [session.org_id, fields.codigo, id]
      );

      if (existingProduct.rows.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro producto con este código en la organización' },
          { status: 409 }
        );
      }
    }

    // Build dynamic UPDATE query
    const setClause = fieldKeys
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    const updateQuery = `
      UPDATE productos
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const values = [id, session.org_id, ...fieldKeys.map(key => fields[key])];
    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Producto no encontrado o no pertenece a tu organización' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error in PATCH /api/productos:', error);
    return NextResponse.json(
      { error: 'Error al actualizar producto', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'El parámetro id es obligatorio' },
        { status: 400 }
      );
    }

    // Soft delete
    const deleteQuery = `
      UPDATE productos
      SET deleted_at = NOW()
      WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await query(deleteQuery, [id, session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Producto no encontrado o no pertenece a tu organización' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado correctamente',
      id: result.rows[0].id
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/productos:', error);
    return NextResponse.json(
      { error: 'Error al eliminar producto', details: error.message },
      { status: 500 }
    );
  }
}
