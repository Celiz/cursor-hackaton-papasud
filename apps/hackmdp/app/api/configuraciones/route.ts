import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

const DEFAULT_CONFIG = {
  empresa_nombre: "Mi Empresa",
  facturacion_iva_responsable: true,
  notificaciones_email_enabled: true,
  servicios_tiempo_garantia_dias: 90,
  inventario_alerta_stock_bajo: true,
  ui_tema: "light",
  ui_idioma: "es",
  ui_moneda: "ARS",
};

// GET - Obtener configuraciones
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(`
      SELECT * FROM configuraciones WHERE org_id = $1 LIMIT 1
    `, [session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error al obtener configuraciones:", error);
    return NextResponse.json(
      { error: "Error al obtener configuraciones", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar configuraciones
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Verificar si existe alguna configuración para esta org
    const existing = await query(`SELECT id FROM configuraciones WHERE org_id = $1 LIMIT 1`, [session.org_id]);

    let result;

    if (existing.rows.length === 0) {
      // No existe configuración, crear una nueva con org_id
      const fields = [...Object.keys(body), 'org_id'];
      const values = [...Object.values(body), session.org_id];
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const columns = fields.join(', ');

      result = await query(`
        INSERT INTO configuraciones (${columns})
        VALUES (${placeholders})
        RETURNING *
      `, values);
    } else {
      // Actualizar configuración existente
      const fields = Object.keys(body);
      const values = Object.values(body);

      if (fields.length === 0) {
        return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
      }

      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
      values.push(existing.rows[0].id);
      values.push(session.org_id);

      result = await query(`
        UPDATE configuraciones
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length - 1} AND org_id = $${values.length}
        RETURNING *
      `, values);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error al actualizar configuraciones:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuraciones", details: error.message },
      { status: 500 }
    );
  }
}
