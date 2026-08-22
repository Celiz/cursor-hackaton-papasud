import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener registros de auditoría
// Usa la tabla "actividad" existente
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entity_type = searchParams.get("entity_type");
    const entity_id = searchParams.get("entity_id");
    const user_id = searchParams.get("user_id");
    const action = searchParams.get("action");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Mapear campos de la tabla actividad a los nombres esperados por el frontend
    let queryStr = `
      SELECT
        a.id,
        a.usuario_id as user_id,
        a.usuario_nombre as user_nombre,
        a.usuario_nombre as user_email,
        a.accion as action,
        a.entidad_tipo as entity_type,
        a.entidad_id as entity_id,
        a.entidad_nombre as entity_name,
        a.datos_anteriores as old_data,
        a.datos_nuevos as new_data,
        a.metadata,
        a.created_at
      FROM actividad a
      WHERE a.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramCount = 2;

    if (entity_type) {
      queryStr += ` AND a.entidad_tipo = $${paramCount}`;
      params.push(entity_type);
      paramCount++;
    }

    if (entity_id) {
      queryStr += ` AND a.entidad_id = $${paramCount}`;
      params.push(entity_id);
      paramCount++;
    }

    if (user_id) {
      queryStr += ` AND a.usuario_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    if (action) {
      queryStr += ` AND a.accion = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (from_date) {
      queryStr += ` AND a.created_at >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      queryStr += ` AND a.created_at <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    queryStr += ` ORDER BY a.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM actividad a
      WHERE a.org_id = $1
    `;
    const countParams: any[] = [session.org_id];
    let countParamCount = 2;

    if (entity_type) {
      countQuery += ` AND a.entidad_tipo = $${countParamCount}`;
      countParams.push(entity_type);
      countParamCount++;
    }
    if (entity_id) {
      countQuery += ` AND a.entidad_id = $${countParamCount}`;
      countParams.push(entity_id);
      countParamCount++;
    }
    if (user_id) {
      countQuery += ` AND a.usuario_id = $${countParamCount}`;
      countParams.push(user_id);
      countParamCount++;
    }
    if (action) {
      countQuery += ` AND a.accion = $${countParamCount}`;
      countParams.push(action);
      countParamCount++;
    }
    if (from_date) {
      countQuery += ` AND a.created_at >= $${countParamCount}`;
      countParams.push(from_date);
      countParamCount++;
    }
    if (to_date) {
      countQuery += ` AND a.created_at <= $${countParamCount}`;
      countParams.push(to_date);
      countParamCount++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || "0");

    return NextResponse.json({
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Error al obtener registros de auditoría", details: error?.message },
      { status: 500 }
    );
  }
}

// GET entity types for filter
export async function OPTIONS() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const entityTypesResult = await query(
      `SELECT DISTINCT entidad_tipo as entity_type FROM actividad WHERE org_id = $1 ORDER BY entidad_tipo`,
      [session.org_id]
    );
    const actionsResult = await query(
      `SELECT DISTINCT accion as action FROM actividad WHERE org_id = $1 ORDER BY accion`,
      [session.org_id]
    );

    return NextResponse.json({
      entity_types: entityTypesResult.rows.map((r: any) => r.entity_type),
      actions: actionsResult.rows.map((r: any) => r.action),
    });
  } catch (error: any) {
    console.error("Error fetching audit options:", error);
    return NextResponse.json(
      { error: "Error", details: error?.message },
      { status: 500 }
    );
  }
}
