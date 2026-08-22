import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth, getSession } from "@/lib/auth";

// GET - Obtener historial de actividades
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parámetros de filtrado
    const entidadTipo = searchParams.get("entidad_tipo");
    const entidadId = searchParams.get("entidad_id");
    const accion = searchParams.get("accion");
    const usuarioId = searchParams.get("usuario_id");
    const importante = searchParams.get("importante");
    const fechaDesde = searchParams.get("fecha_desde");
    const fechaHasta = searchParams.get("fecha_hasta");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let queryStr = `
      SELECT
        a.*,
        u.email as usuario_email
      FROM actividad a
      LEFT JOIN users u ON a.usuario_id = u.id
      WHERE a.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramCount = 2;

    // Filtro por tipo de entidad
    if (entidadTipo) {
      queryStr += ` AND a.entidad_tipo = $${paramCount}`;
      params.push(entidadTipo);
      paramCount++;
    }

    // Filtro por ID de entidad específica
    if (entidadId) {
      queryStr += ` AND a.entidad_id = $${paramCount}`;
      params.push(entidadId);
      paramCount++;
    }

    // Filtro por acción
    if (accion) {
      queryStr += ` AND a.accion = $${paramCount}`;
      params.push(accion);
      paramCount++;
    }

    // Filtro por usuario
    if (usuarioId) {
      queryStr += ` AND a.usuario_id = $${paramCount}`;
      params.push(usuarioId);
      paramCount++;
    }

    // Filtro por importante
    if (importante === "true") {
      queryStr += ` AND a.importante = true`;
    }

    // Filtro por fecha desde
    if (fechaDesde) {
      queryStr += ` AND a.created_at >= $${paramCount}`;
      params.push(fechaDesde);
      paramCount++;
    }

    // Filtro por fecha hasta
    if (fechaHasta) {
      queryStr += ` AND a.created_at <= $${paramCount}`;
      params.push(fechaHasta + "T23:59:59");
      paramCount++;
    }

    // Búsqueda por texto
    if (search) {
      queryStr += ` AND (
        a.descripcion ILIKE $${paramCount} OR
        a.entidad_nombre ILIKE $${paramCount} OR
        a.usuario_nombre ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Ordenar por fecha descendente y aplicar límites
    queryStr += ` ORDER BY a.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Obtener conteo total para paginación
    let countQuery = `SELECT COUNT(*) as total FROM actividad a WHERE a.org_id = $1`;
    const countParams: any[] = [session.org_id];
    let countParamNum = 2;

    if (entidadTipo) {
      countQuery += ` AND a.entidad_tipo = $${countParamNum}`;
      countParams.push(entidadTipo);
      countParamNum++;
    }
    if (entidadId) {
      countQuery += ` AND a.entidad_id = $${countParamNum}`;
      countParams.push(entidadId);
      countParamNum++;
    }
    if (accion) {
      countQuery += ` AND a.accion = $${countParamNum}`;
      countParams.push(accion);
      countParamNum++;
    }
    if (usuarioId) {
      countQuery += ` AND a.usuario_id = $${countParamNum}`;
      countParams.push(usuarioId);
      countParamNum++;
    }
    if (importante === "true") {
      countQuery += ` AND a.importante = true`;
    }
    if (fechaDesde) {
      countQuery += ` AND a.created_at >= $${countParamNum}`;
      countParams.push(fechaDesde);
      countParamNum++;
    }
    if (fechaHasta) {
      countQuery += ` AND a.created_at <= $${countParamNum}`;
      countParams.push(fechaHasta + "T23:59:59");
      countParamNum++;
    }
    if (search) {
      countQuery += ` AND (
        a.descripcion ILIKE $${countParamNum} OR
        a.entidad_nombre ILIKE $${countParamNum} OR
        a.usuario_nombre ILIKE $${countParamNum}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || "0");

    return NextResponse.json({
      data: result.rows || [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Error fetching actividad:", error);
    return NextResponse.json(
      { error: "Error al obtener actividad", details: error?.message },
      { status: 500 }
    );
  }
}

// GET estadísticas de actividad
export async function getStats() {
  const session = await getSession();
  if (!session?.org_id) {
    return [];
  }

  const result = await query(`
    SELECT
      entidad_tipo,
      accion,
      COUNT(*) as total
    FROM actividad
    WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY entidad_tipo, accion
    ORDER BY total DESC
  `, [session.org_id]);
  return result.rows;
}
