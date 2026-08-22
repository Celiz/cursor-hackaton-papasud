import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

const SENSITIVE_KEYS = ['mp_access_token', 'mp_client_secret', 'mp_webhook_secret', 'email_password'];

function maskValue(clave: string, valor: string): string {
  if (SENSITIVE_KEYS.includes(clave) && valor.length > 4) {
    return '•'.repeat(Math.min(valor.length - 4, 20)) + valor.slice(-4);
  }
  return valor;
}

// GET — Read org settings, optionally filtered by categoria
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id || !session.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const categoria = request.nextUrl.searchParams.get('categoria');

    let sql = `SELECT clave, valor, categoria, descripcion FROM org_settings WHERE org_id = $1`;
    const params: unknown[] = [session.org_id];

    if (categoria) {
      sql += ` AND categoria = $2`;
      params.push(categoria);
    }

    sql += ` ORDER BY categoria, clave`;

    const result = await query(sql, params);

    const items = result.rows.map((row: any) => ({
      clave: row.clave,
      valor: maskValue(row.clave, row.valor),
      categoria: row.categoria,
      descripcion: row.descripcion,
    }));

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Error fetching org settings:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

// PUT — Upsert org settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id || !session.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body as {
      items: { clave: string; valor: string; categoria?: string; descripcion?: string }[]
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.clave || typeof item.valor !== 'string') {
        return NextResponse.json({ error: `Clave y valor requeridos para cada item` }, { status: 400 });
      }

      await query(`
        INSERT INTO org_settings (org_id, clave, valor, categoria, descripcion, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (org_id, clave) DO UPDATE SET
          valor = EXCLUDED.valor,
          categoria = COALESCE(EXCLUDED.categoria, org_settings.categoria),
          descripcion = COALESCE(EXCLUDED.descripcion, org_settings.descripcion),
          updated_at = NOW()
      `, [session.org_id, item.clave, item.valor, item.categoria || null, item.descripcion || null]);
    }

    return NextResponse.json({ success: true, count: items.length });
  } catch (error: any) {
    console.error("Error upserting org settings:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}

// DELETE — Remove a setting by key
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id || !session.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const clave = request.nextUrl.searchParams.get('clave');
    const categoria = request.nextUrl.searchParams.get('categoria');

    if (!clave && !categoria) {
      return NextResponse.json({ error: 'Especificar clave o categoria' }, { status: 400 });
    }

    if (clave) {
      await query(
        `DELETE FROM org_settings WHERE org_id = $1 AND clave = $2`,
        [session.org_id, clave]
      );
    } else if (categoria) {
      await query(
        `DELETE FROM org_settings WHERE org_id = $1 AND categoria = $2`,
        [session.org_id, categoria]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting org setting:", error);
    return NextResponse.json({ error: "Error al eliminar configuración" }, { status: 500 });
  }
}
