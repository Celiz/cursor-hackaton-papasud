import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// DEPRECADO (2026-06-23): unificación Contactos↔Personas. La UI (sección Contactos y
// tab Contactos del CRM) usa /api/personas; los datos se migraron a `personas`. Ningún
// consumidor vivo de la app usa ya este route — su POST es código muerto. La tabla
// `contactos` se conserva como backup (no se borra). El componente viejo ContactosTable
// queda huérfano (cleanup pendiente).

export const revalidate = 0;

// Contactos del modelo nuevo: personas de contacto por cliente (empresa).
// Tabla `contactos` (FK empresa_id -> clientes). Reemplaza el viejo
// /api/personas (persona-centric) para la vista de Contactos.
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");
    const search = searchParams.get("search");

    let sql = `
      SELECT
        ct.id,
        ct.empresa_id,
        ct.nombre,
        ct.apellido,
        ct.cargo,
        ct.email,
        ct.telefono,
        ct.es_principal,
        ct.notas,
        c.nombre AS empresa_nombre,
        c.nombre_fantasia AS empresa_fantasia,
        c.identificador_unico AS empresa_identificador
      FROM contactos ct
      JOIN clientes c ON c.id = ct.empresa_id
      WHERE ct.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let n = 2;

    if (empresaId) {
      sql += ` AND ct.empresa_id = $${n}`;
      params.push(empresaId);
      n++;
    }

    if (search) {
      sql += ` AND (ct.nombre ILIKE $${n} OR ct.apellido ILIKE $${n}
                 OR ct.email::text ILIKE $${n} OR ct.telefono::text ILIKE $${n}
                 OR c.nombre ILIKE $${n})`;
      params.push(`%${search}%`);
      n++;
    }

    sql += ` ORDER BY ct.es_principal DESC, c.nombre ASC, ct.nombre ASC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching contactos:", error);
    return NextResponse.json(
      { error: "Error al cargar contactos", details: error.message },
      { status: 500 }
    );
  }
}

// Normaliza un campo que puede venir como string suelto o array a string[] limpio.
function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// Crea un contacto atado a un cliente (empresa) del org.
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const empresaId = body?.empresa_id;
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";

    if (!empresaId) {
      return NextResponse.json({ error: "Falta el cliente (empresa)" }, { status: 400 });
    }
    if (!nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    // El cliente debe pertenecer al mismo org (evita colgar contactos de otra org).
    const empresa = await query(
      `SELECT id FROM clientes WHERE id = $1 AND org_id = $2`,
      [empresaId, session.org_id]
    );
    if (empresa.rowCount === 0) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO contactos (org_id, empresa_id, nombre, apellido, cargo, email, telefono, es_principal, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        session.org_id,
        empresaId,
        nombre,
        typeof body?.apellido === "string" && body.apellido.trim() ? body.apellido.trim() : null,
        typeof body?.cargo === "string" && body.cargo.trim() ? body.cargo.trim() : null,
        toList(body?.email),
        toList(body?.telefono),
        body?.es_principal === true,
        typeof body?.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
      ]
    );

    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contacto:", error);
    return NextResponse.json(
      { error: "Error al crear contacto", details: error.message },
      { status: 500 }
    );
  }
}
