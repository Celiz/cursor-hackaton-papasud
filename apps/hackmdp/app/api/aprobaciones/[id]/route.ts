import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener una solicitud específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT
        ar.*,
        aw.nombre as workflow_nombre,
        aw.entity_type,
        aw.aprobadores,
        aw.requiere_todos,
        u.nombre as solicitante_nombre,
        u.email as solicitante_email
      FROM approval_requests ar
      JOIN approval_workflows aw ON ar.workflow_id = aw.id
      LEFT JOIN users u ON ar.solicitante_id = u.id
      WHERE ar.id = $1 AND ar.org_id = $2`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      );
    }

    // Obtener decisiones
    const decisionsResult = await query(
      `SELECT
        ad.*,
        u.nombre as aprobador_nombre,
        u.email as aprobador_email
      FROM approval_decisions ad
      LEFT JOIN users u ON ad.aprobador_id = u.id
      WHERE ad.request_id = $1
      ORDER BY ad.created_at DESC`,
      [id]
    );

    return NextResponse.json({
      ...result.rows[0],
      decisiones: decisionsResult.rows,
    });
  } catch (error: any) {
    console.error("Error fetching approval request:", error);
    return NextResponse.json(
      { error: "Error al obtener solicitud", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Aprobar o rechazar solicitud
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { decision, comentario } = body; // decision: 'aprobar' | 'rechazar'

    if (!decision || !["aprobar", "rechazar"].includes(decision)) {
      return NextResponse.json(
        { error: "Decision requerida: 'aprobar' o 'rechazar'" },
        { status: 400 }
      );
    }

    const aprobadorId = session.id;

    // Obtener la solicitud actual
    const requestResult = await query(
      `SELECT
        ar.*,
        aw.aprobadores,
        aw.requiere_todos,
        aw.entity_type
      FROM approval_requests ar
      JOIN approval_workflows aw ON ar.workflow_id = aw.id
      WHERE ar.id = $1 AND ar.org_id = $2`,
      [id, session.org_id]
    );

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      );
    }

    const solicitud = requestResult.rows[0];

    if (solicitud.estado !== "pendiente") {
      return NextResponse.json(
        { error: "Esta solicitud ya no está pendiente" },
        { status: 400 }
      );
    }

    // Registrar la decisión
    await query(
      `INSERT INTO approval_decisions (request_id, aprobador_id, decision, comentario, paso)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, aprobadorId, decision, comentario || null, solicitud.paso_actual]
    );

    // Determinar nuevo estado
    let nuevoEstado = "pendiente";
    let nuevoPaso = solicitud.paso_actual;

    if (decision === "rechazar") {
      nuevoEstado = "rechazado";
    } else {
      // Si aprobó, verificar si necesita más aprobaciones
      const aprobadores = solicitud.aprobadores || [];
      const totalPasos = aprobadores.length;

      if (solicitud.requiere_todos) {
        // Contar aprobaciones para este paso
        const aprobacionesResult = await query(
          `SELECT COUNT(*) as count FROM approval_decisions
           WHERE request_id = $1 AND decision = 'aprobar' AND paso = $2`,
          [id, solicitud.paso_actual]
        );

        const aprobacionesCount =
          parseInt(aprobacionesResult.rows[0].count) + 1; // +1 por la actual
        const aprobadoresEnPaso = aprobadores[solicitud.paso_actual - 1];
        const requeridosEnPaso = Array.isArray(aprobadoresEnPaso)
          ? aprobadoresEnPaso.length
          : 1;

        if (aprobacionesCount >= requeridosEnPaso) {
          if (solicitud.paso_actual >= totalPasos) {
            nuevoEstado = "aprobado";
          } else {
            nuevoPaso = solicitud.paso_actual + 1;
          }
        }
      } else {
        // Con una aprobación es suficiente para pasar al siguiente paso
        if (solicitud.paso_actual >= totalPasos) {
          nuevoEstado = "aprobado";
        } else {
          nuevoPaso = solicitud.paso_actual + 1;
        }
      }
    }

    // Actualizar solicitud
    await query(
      `UPDATE approval_requests
       SET estado = $1, paso_actual = $2, updated_at = NOW()
       WHERE id = $3 AND org_id = $4`,
      [nuevoEstado, nuevoPaso, id, session.org_id]
    );

    // Si fue aprobado o rechazado, actualizar la entidad original
    if (nuevoEstado === "aprobado" || nuevoEstado === "rechazado") {
      const entityType = solicitud.entity_type;
      const entityId = solicitud.entity_id;

      // Actualizar estado de la entidad según el tipo
      const tablasEstado: Record<string, string> = {
        presupuesto: "presupuestos",
        nota_credito: "notas_credito",
        orden_compra: "ordenes_compra",
        factura: "facturas",
      };

      const tabla = tablasEstado[entityType];
      if (tabla) {
        const estadoFinal =
          nuevoEstado === "aprobado" ? "aprobado" : "rechazado";
        try {
          await query(`UPDATE ${tabla} SET estado = $1 WHERE id = $2 AND org_id = $3`, [
            estadoFinal,
            entityId,
            session.org_id,
          ]);
        } catch (e) {
          console.warn(`Error updating ${tabla}:`, e);
        }
      }
    }

    return NextResponse.json({
      message: decision === "aprobar" ? "Solicitud aprobada" : "Solicitud rechazada",
      estado: nuevoEstado,
      paso_actual: nuevoPaso,
    });
  } catch (error: any) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: "Error al procesar aprobación", details: error?.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar workflow
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const result = await query(
      `UPDATE approval_workflows
       SET nombre = $1,
           descripcion = $2,
           condiciones = $3,
           aprobadores = $4,
           requiere_todos = $5,
           notificar_email = $6,
           activo = $7,
           updated_at = NOW()
       WHERE id = $8 AND org_id = $9
       RETURNING *`,
      [
        body.nombre,
        body.descripcion || null,
        JSON.stringify(body.condiciones || {}),
        JSON.stringify(body.aprobadores || []),
        body.requiere_todos !== false,
        body.notificar_email !== false,
        body.activo !== false,
        id,
        session.org_id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Workflow no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Error al actualizar workflow", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar workflow
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que no haya solicitudes pendientes
    const pendingResult = await query(
      `SELECT COUNT(*) as count FROM approval_requests
       WHERE workflow_id = $1 AND estado = 'pendiente' AND org_id = $2`,
      [id, session.org_id]
    );

    if (parseInt(pendingResult.rows[0].count) > 0) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar un workflow con solicitudes pendientes",
        },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM approval_workflows WHERE id = $1 AND org_id = $2 RETURNING id`,
      [id, session.org_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Workflow no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Workflow eliminado" });
  } catch (error: any) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Error al eliminar workflow", details: error?.message },
      { status: 500 }
    );
  }
}
