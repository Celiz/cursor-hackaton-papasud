import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const offset = (page - 1) * pageSize;
    const search = searchParams.get("search");
    const categoriaId = searchParams.get("categoria_id");
    const categoriaNombre = searchParams.get("categoria_nombre");
    const marcaId = searchParams.get("marca_id");
    const grupoId = searchParams.get("grupo_id");
    const sort = searchParams.get("sort");
    const listaId = searchParams.get("lista_id");

    const params: any[] = [session.org_id];
    let paramIndex = 2;

    let whereConditions = "WHERE p.org_id = $1 AND p.deleted_at IS NULL";

    // Join clause - conditionally includes grupo filter
    let joinClause = `
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN marcas m ON m.id = p.marca_id
    `;

    if (grupoId) {
      joinClause += ` INNER JOIN producto_grupo_items pgi ON pgi.producto_id = p.id AND pgi.grupo_id = $${paramIndex}`;
      params.push(grupoId);
      paramIndex++;
    }

    // Precios calculados para una lista específica (margen global + excepciones).
    let listaSelect = "";
    if (listaId) {
      const listaCheck = await query(
        `SELECT margen_porcentaje FROM listas_precios WHERE id = $1 AND org_id = $2`,
        [listaId, session.org_id],
      );
      if (listaCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Lista de precios no encontrada" },
          { status: 404 },
        );
      }
      const margenLista = Math.max(0, parseFloat(listaCheck.rows[0].margen_porcentaje) || 0);
      joinClause += ` LEFT JOIN lista_precios_items lpi ON lpi.producto_id = p.id AND lpi.lista_id = $${paramIndex}`;
      params.push(listaId);
      paramIndex++;
      listaSelect = `,
        lpi.precio_fijo AS lista_precio_fijo,
        lpi.margen_override AS lista_margen_override,
        CASE
          WHEN lpi.precio_fijo IS NOT NULL THEN lpi.precio_fijo
          WHEN lpi.margen_override IS NOT NULL THEN p.precio_costo * (1 + lpi.margen_override / 100.0)
          ELSE p.precio_costo * (1 + ${margenLista} / 100.0)
        END AS precio_calculado`;
    }

    if (categoriaId) {
      whereConditions += ` AND p.categoria_id = $${paramIndex}`;
      params.push(categoriaId);
      paramIndex++;
    } else if (categoriaNombre) {
      // Match against either the FK-joined categoria or the legacy text column.
      whereConditions += ` AND (c.nombre = $${paramIndex} OR p.categoria = $${paramIndex})`;
      params.push(categoriaNombre);
      paramIndex++;
    }

    if (marcaId) {
      whereConditions += ` AND p.marca_id = $${paramIndex}`;
      params.push(marcaId);
      paramIndex++;
    }

    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter((t) => t.length > 0);
      const conditions: string[] = [];
      for (const term of searchTerms) {
        conditions.push(
          `(p.nombre ILIKE $${paramIndex} OR p.codigo ILIKE $${paramIndex})`
        );
        params.push(`%${term}%`);
        paramIndex++;
      }
      whereConditions += ` AND (${conditions.join(" AND ")})`;
    }

    // Sorting
    let orderClause = "ORDER BY p.nombre ASC";
    if (sort) {
      const [column, direction] = sort.split(":");
      const allowedColumns: Record<string, string> = {
        nombre: "p.nombre",
        codigo: "p.codigo",
        precio_venta: "p.precio_venta",
        precio_costo: "p.precio_costo",
        margen_porcentaje: "p.margen_porcentaje",
        stock_actual: "p.stock_actual",
        categoria: "c.nombre",
        marca: "m.nombre",
      };
      const mappedColumn = allowedColumns[column];
      if (mappedColumn) {
        const dir = direction === "desc" ? "DESC" : "ASC";
        orderClause = `ORDER BY ${mappedColumn} ${dir} NULLS LAST`;
      }
    }

    const fromClause = `FROM productos p ${joinClause}`;

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as total ${fromClause} ${whereConditions}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || "0");

    // Data query
    const limitIndex = paramIndex;
    const offsetIndex = paramIndex + 1;
    const dataParams = [...params, pageSize, offset];

    const result = await query(
      `SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.descripcion,
        p.precio_venta,
        p.precio_costo,
        p.margen_porcentaje,
        p.margen_pesos,
        p.stock_actual,
        p.categoria_id,
        p.marca_id,
        c.nombre as categoria_nombre,
        m.nombre as marca_nombre,
        (
          SELECT json_agg(json_build_object('id', pg.id, 'nombre', pg.nombre, 'color', pg.color))
          FROM producto_grupo_items pgi2
          JOIN producto_grupos pg ON pg.id = pgi2.grupo_id
          WHERE pgi2.producto_id = p.id
        ) as grupos${listaSelect}
      ${fromClause}
      ${whereConditions}
      ${orderClause}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      dataParams
    );

    return NextResponse.json({
      items: result.rows,
      total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/precios:", error);
    return NextResponse.json(
      { error: "Error al cargar precios" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { producto_id, precio_costo, precio_venta } = body;

    if (!producto_id) {
      return NextResponse.json(
        { error: "producto_id es requerido" },
        { status: 400 }
      );
    }

    if (precio_costo === undefined && precio_venta === undefined) {
      return NextResponse.json(
        { error: "Debe enviar precio_costo o precio_venta" },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (precio_costo !== undefined) {
      updates.push(`precio_costo = $${paramIndex++}`);
      values.push(precio_costo);
    }
    if (precio_venta !== undefined) {
      updates.push(`precio_venta = $${paramIndex++}`);
      values.push(precio_venta);
    }

    values.push(producto_id);
    const idIndex = paramIndex++;
    values.push(session.org_id);
    const orgIndex = paramIndex;

    const result = await query(
      `UPDATE productos
       SET ${updates.join(", ")}
       WHERE id = $${idIndex} AND org_id = $${orgIndex} AND deleted_at IS NULL
       RETURNING id, codigo, nombre, precio_costo, precio_venta, margen_porcentaje, margen_pesos`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // El trigger log_precio_change ya graba historial, pero sin usuario.
    // Actualizamos los registros recién creados con el usuario que hizo el cambio.
    await query(
      `UPDATE historial_precios
       SET usuario_id = $1
       WHERE producto_id = $2 AND org_id = $3
         AND usuario_id IS NULL
         AND created_at >= NOW() - INTERVAL '5 seconds'`,
      [session.persona_id, producto_id, session.org_id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    console.error("Error in PATCH /api/precios:", error);
    return NextResponse.json(
      { error: "Error al actualizar precio" },
      { status: 500 }
    );
  }
}
