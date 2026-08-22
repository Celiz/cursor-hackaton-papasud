import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { logActivity, generateDescription } from "@/lib/activity-logger";
import { getSession } from "@/lib/auth";

/**
 * POST /api/clientes/from-pedido
 * Creates a Locus client from an e-commerce pedido's buyer data.
 * Extracts info from persona + MercadoPago payer data and links the pedido.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { pedido_id } = body;

    if (!pedido_id) {
      return NextResponse.json(
        { error: "pedido_id es requerido" },
        { status: 400 }
      );
    }

    // 1. Get pedido with persona and pagos_online data
    const pedidoResult = await query(
      `SELECT p.*,
        per.nombre as persona_nombre, per.email as persona_email, per.telefono as persona_telefono,
        po.mp_pagador_nombre, po.mp_pagador_email, po.mp_pagador_identificacion
      FROM pedidos p
      LEFT JOIN personas per ON p.persona_id = per.id
      LEFT JOIN pagos_online po ON po.pedido_id = p.id AND po.estado = 'approved'
      WHERE p.id = $1 AND p.org_id = $2
      LIMIT 1`,
      [pedido_id, session.org_id]
    );

    if (pedidoResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const pedido = pedidoResult.rows[0];

    // 2. If pedido already has cliente_id, return existing client
    if (pedido.cliente_id) {
      const existingResult = await query(
        "SELECT * FROM clientes WHERE id = $1",
        [pedido.cliente_id]
      );
      if (existingResult.rows.length > 0) {
        return NextResponse.json({
          cliente: existingResult.rows[0],
          created: false,
        });
      }
    }

    // 3. Extract buyer data (prefer persona, fallback to MP payer)
    const nombre =
      pedido.persona_nombre || pedido.mp_pagador_nombre || "Cliente sin nombre";
    const email = pedido.persona_email || pedido.mp_pagador_email || null;
    const telefono = pedido.persona_telefono || null;
    const identificacion = pedido.mp_pagador_identificacion || null;

    // Extract direccion from pedido.direccion_envio (JSONB)
    const dir =
      typeof pedido.direccion_envio === "string"
        ? JSON.parse(pedido.direccion_envio)
        : pedido.direccion_envio;
    const direccion = dir
      ? [dir.calle, dir.numero, dir.piso, dir.depto].filter(Boolean).join(" ")
      : null;
    const localidad = dir?.ciudad || null;
    const provincia = dir?.provincia || null;
    const codigo_postal = dir?.codigo_postal || null;

    // 4. Check if a client with same email already exists for this org
    if (email) {
      const existingResult = await query(
        "SELECT * FROM clientes WHERE org_id = $1 AND email = $2 LIMIT 1",
        [session.org_id, email]
      );
      if (existingResult.rows.length > 0) {
        // Link pedido to existing client
        await query("UPDATE pedidos SET cliente_id = $1 WHERE id = $2", [
          existingResult.rows[0].id,
          pedido_id,
        ]);
        return NextResponse.json({
          cliente: existingResult.rows[0],
          created: false,
          linked: true,
        });
      }
    }

    // 5. Create new client
    const result = await query(
      `INSERT INTO clientes (
        org_id, nombre, email, telefono, direccion, localidad, provincia, codigo_postal, condicion_iva, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'consumidor_final', 'activo')
      RETURNING *`,
      [
        session.org_id,
        nombre,
        email,
        telefono,
        direccion,
        localidad,
        provincia,
        codigo_postal,
      ]
    );

    const newCliente = result.rows[0];

    // 6. Link pedido to new client
    await query("UPDATE pedidos SET cliente_id = $1 WHERE id = $2", [
      newCliente.id,
      pedido_id,
    ]);

    // 7. Log activity
    await logActivity({
      action: "crear",
      entityType: "cliente",
      entityId: newCliente.id,
      entityName: newCliente.nombre,
      description: generateDescription("crear", "cliente", newCliente.nombre) +
        ` (desde pedido ${pedido.numero || pedido_id.slice(0, 8)})`,
      newData: newCliente,
    });

    return NextResponse.json(
      { cliente: newCliente, created: true },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating cliente from pedido:", error);
    return NextResponse.json(
      { error: "Error al crear cliente desde pedido", details: error?.message },
      { status: 500 }
    );
  }
}
