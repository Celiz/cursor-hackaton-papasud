import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener workflows de aprobación o solicitudes pendientes
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'workflows' | 'pendientes' | 'historial'
    const entity_type = searchParams.get("entity_type");

    if (type === "workflows") {
      // Obtener configuración de workflows
      const result = await query(`
        SELECT * FROM approval_workflows
        WHERE org_id = $1
        ORDER BY nombre
      `, [session.org_id]);
      return NextResponse.json(result.rows);
    }

    if (type === "pendientes") {
      // Obtener solicitudes de aprobación pendientes para el usuario actual
      const userId = session.id;

      let queryStr = `
        SELECT
          ar.*,
          aw.nombre as workflow_nombre,
          aw.entity_type,
          u.nombre as solicitante_nombre,
          u.email as solicitante_email
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.id
        LEFT JOIN users u ON ar.solicitante_id = u.id
        WHERE ar.estado = 'pendiente'
          AND ar.org_id = $1
      `;
      const params: any[] = [session.org_id];

      if (userId) {
        // Ver si el usuario actual es aprobador en este paso
        queryStr += ` AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(aw.aprobadores) as ap
          WHERE ap->>'user_id' = $${params.length + 1}
            OR ap->>'rol' IN (SELECT rol FROM users WHERE id = $${params.length + 1})
        )`;
        params.push(userId);
      }

      if (entity_type) {
        queryStr += ` AND aw.entity_type = $${params.length + 1}`;
        params.push(entity_type);
      }

      queryStr += ` ORDER BY ar.created_at DESC`;

      const result = await query(queryStr, params);
      return NextResponse.json(result.rows);
    }

    if (type === "historial") {
      // Obtener historial de aprobaciones
      const entity_id = searchParams.get("entity_id");
      const limit = parseInt(searchParams.get("limit") || "50");

      let queryStr = `
        SELECT
          ad.*,
          ar.entity_id,
          ar.entity_name,
          aw.nombre as workflow_nombre,
          u.nombre as aprobador_nombre,
          u.email as aprobador_email
        FROM approval_decisions ad
        JOIN approval_requests ar ON ad.request_id = ar.id
        JOIN approval_workflows aw ON ar.workflow_id = aw.id
        LEFT JOIN users u ON ad.aprobador_id = u.id
        WHERE ar.org_id = $1
      `;
      const params: any[] = [session.org_id];

      if (entity_id) {
        queryStr += ` AND ar.entity_id = $${params.length + 1}`;
        params.push(entity_id);
      }

      queryStr += ` ORDER BY ad.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(queryStr, params);
      return NextResponse.json(result.rows);
    }

    // Default: obtener workflows
    const result = await query(`
      SELECT * FROM approval_workflows
      WHERE org_id = $1
      ORDER BY nombre
    `, [session.org_id]);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Error al obtener aprobaciones", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Crear workflow o solicitud de aprobación
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (type === "workflow") {
      // Crear nuevo workflow de aprobación
      if (!body.nombre || !body.entity_type || !body.aprobadores) {
        return NextResponse.json(
          { error: "Campos requeridos: nombre, entity_type, aprobadores" },
          { status: 400 }
        );
      }

      const result = await query(
        `INSERT INTO approval_workflows (
          nombre, descripcion, entity_type, condiciones, aprobadores,
          requiere_todos, notificar_email, activo, org_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          body.nombre,
          body.descripcion || null,
          body.entity_type,
          JSON.stringify(body.condiciones || {}),
          JSON.stringify(body.aprobadores),
          body.requiere_todos !== false,
          body.notificar_email !== false,
          body.activo !== false,
          session.org_id,
        ]
      );

      return NextResponse.json(result.rows[0], { status: 201 });
    }

    if (type === "solicitud") {
      // Crear nueva solicitud de aprobación
      const solicitanteId = session.id;

      if (!body.workflow_id || !body.entity_id) {
        return NextResponse.json(
          { error: "Campos requeridos: workflow_id, entity_id" },
          { status: 400 }
        );
      }

      // Verificar que el workflow exista y esté activo
      const workflowResult = await query(
        `SELECT * FROM approval_workflows WHERE id = $1 AND activo = true AND org_id = $2`,
        [body.workflow_id, session.org_id]
      );

      if (workflowResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Workflow no encontrado o inactivo" },
          { status: 404 }
        );
      }

      // Verificar que no haya una solicitud pendiente para la misma entidad
      const existingResult = await query(
        `SELECT id FROM approval_requests
         WHERE workflow_id = $1 AND entity_id = $2 AND estado = 'pendiente' AND org_id = $3`,
        [body.workflow_id, body.entity_id, session.org_id]
      );

      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Ya existe una solicitud de aprobación pendiente para esta entidad" },
          { status: 400 }
        );
      }

      const result = await query(
        `INSERT INTO approval_requests (
          workflow_id, entity_id, entity_name, solicitante_id, datos, paso_actual, estado, org_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          body.workflow_id,
          body.entity_id,
          body.entity_name || null,
          solicitanteId,
          JSON.stringify(body.datos || {}),
          1,
          "pendiente",
          session.org_id,
        ]
      );

      return NextResponse.json(result.rows[0], { status: 201 });
    }

    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error creating approval:", error);
    return NextResponse.json(
      { error: "Error al crear aprobación", details: error?.message },
      { status: 500 }
    );
  }
}
