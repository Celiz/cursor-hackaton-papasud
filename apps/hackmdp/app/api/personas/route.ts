import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseContactList } from "@/lib/contact-fields";

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const razonSocialId = searchParams.get("razon_social_id");

    let sql = `
      SELECT
        p.*,
        json_build_object('id', cp.id, 'nombre', cp.nombre, 'color', cp.color) as categoria,
        json_build_object('id', up.id, 'nombre', up.nombre) as ubicacion,
        COALESCE(
          (SELECT json_agg(json_build_object('id', t.id, 'nombre', t.nombre, 'color', t.color) ORDER BY t.nombre)
           FROM persona_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.persona_id = p.id),
          '[]'::json
        ) as tags,
        (SELECT pl.laboratorio_id
           FROM personas_laboratorios pl
          WHERE pl.persona_id = p.id AND pl.activo = true
          ORDER BY pl.created_at ASC LIMIT 1) as laboratorio_id,
        (SELECT l.nombre
           FROM personas_laboratorios pl JOIN laboratorios l ON l.id = pl.laboratorio_id
          WHERE pl.persona_id = p.id AND pl.activo = true
          ORDER BY pl.created_at ASC LIMIT 1) as laboratorio_nombre,
        (SELECT pcl.cliente_id
           FROM personas_clientes pcl
          WHERE pcl.persona_id = p.id AND pcl.activo = true
          ORDER BY pcl.created_at ASC LIMIT 1) as cliente_id,
        (SELECT c.nombre
           FROM personas_clientes pcl JOIN clientes c ON c.id = pcl.cliente_id
          WHERE pcl.persona_id = p.id AND pcl.activo = true
          ORDER BY pcl.created_at ASC LIMIT 1) as cliente_nombre
      FROM personas p
      LEFT JOIN categoria_personas cp ON p.categoria_id = cp.id
      LEFT JOIN ubicacion_personas up ON p.ubicacion_id = up.id
      WHERE p.org_id = $1
        -- Contactos lista externos (clientes, laboratorios). Los operadores de
        -- la propia org (org_members) no son contactos: se excluyen.
        AND p.id NOT IN (
          SELECT om.persona_id FROM org_members om WHERE om.org_id = $1
        )
    `;
    const params: any[] = [session.org_id];

    let paramCount = 2;

    if (razonSocialId) {
      params.push(razonSocialId);
      sql += ` AND p.id IN (
        SELECT pc.persona_id FROM personas_clientes pc
        WHERE pc.cliente_id = $${paramCount} AND pc.activo = true
      )`;
      paramCount++;
    }

    const laboratorioId = searchParams.get("laboratorio_id");
    if (laboratorioId) {
      params.push(laboratorioId);
      sql += ` AND p.id IN (
        SELECT pl.persona_id FROM personas_laboratorios pl
        WHERE pl.laboratorio_id = $${paramCount} AND pl.activo = true
      )`;
      paramCount++;
    }

    const search = searchParams.get("search");
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.nombre_completo ILIKE $${paramCount} OR p.email::text ILIKE $${paramCount} OR p.telefono::text ILIKE $${paramCount})`;
      paramCount++;
    }

    const tagIds = searchParams.get("tag_ids");
    if (tagIds) {
      const tagArray = tagIds.split(",").filter(Boolean);
      if (tagArray.length > 0) {
        sql += ` AND p.id IN (SELECT pt.persona_id FROM persona_tags pt WHERE pt.tag_id = ANY($${paramCount}::uuid[]))`;
        params.push(tagArray as any);
        paramCount++;
      }
    }

    const limitParam = searchParams.get("limit");
    sql += ` ORDER BY p.nombre_completo ASC`;
    if (limitParam) {
      const lim = Math.min(parseInt(limitParam, 10) || 20, 100);
      sql += ` LIMIT ${lim}`;
    }

    const result = await query(sql, params);

    // email/telefono son columnas `text` con contenido heterogéneo (string plano
    // o literal de array de PG). El frontend los espera como string[].
    const rows = (result.rows || []).map((row: any) => ({
      ...row,
      email: parseContactList(row.email),
      telefono: parseContactList(row.telefono),
    }));

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error fetching personas:", error);
    return NextResponse.json(
      { error: "Error al cargar personas", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Extraer campos virtuales (no persisten en personas) antes del insert
    const { tags: tagIds, laboratorio_id: laboratorioId, cliente_id: clienteId, ...insertData } = body;

    // Inject org_id into the insert data
    const dataWithOrg = { ...insertData, org_id: session.org_id };

    const fields = Object.keys(dataWithOrg);
    const values = Object.values(dataWithOrg);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const columns = fields.join(', ');

    const result = await query(`
      INSERT INTO personas (${columns})
      VALUES (${placeholders})
      RETURNING *
    `, values);

    const persona = result.rows[0];

    // Guardar tags si se proporcionaron
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const tagValues = tagIds.map((_: string, i: number) => `($1, $${i + 2})`).join(", ");
      await query(
        `INSERT INTO persona_tags (persona_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
        [persona.id, ...tagIds]
      );
    }

    // Vincular a laboratorio si se proporcionó
    if (laboratorioId && typeof laboratorioId === 'string') {
      await query(
        `INSERT INTO personas_laboratorios (persona_id, laboratorio_id, activo)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [persona.id, laboratorioId]
      );
    }

    // Vincular a cliente si se proporcionó
    if (clienteId && typeof clienteId === 'string') {
      await query(
        `INSERT INTO personas_clientes (persona_id, cliente_id, activo)
         VALUES ($1, $2, true)
         ON CONFLICT (persona_id, cliente_id) DO NOTHING`,
        [persona.id, clienteId]
      );
    }

    return NextResponse.json(persona);
  } catch (error: any) {
    console.error("Error creating persona:", error);
    return NextResponse.json(
      { error: "Error al crear persona", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, tags: tagIds, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Edición manual por el usuario ⇒ promover automáticamente a persona firme.
    // Si el caller pasa es_tentativa explícito, se respeta.
    if (Object.keys(updateData).length > 0 && !('es_tentativa' in updateData)) {
      (updateData as any).es_tentativa = false;
    }

    const fields = Object.keys(updateData);
    const values = Object.values(updateData);

    let persona;

    if (fields.length > 0) {
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
      values.push(id);
      values.push(session.org_id);

      const result = await query(`
        UPDATE personas
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length - 1} AND org_id = $${values.length}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
      }
      persona = result.rows[0];
    } else {
      const result = await query(`SELECT * FROM personas WHERE id = $1 AND org_id = $2`, [id, session.org_id]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
      }
      persona = result.rows[0];
    }

    // Actualizar tags si se proporcionaron
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      // Only delete tags for personas belonging to this org (verified above)
      await query(`DELETE FROM persona_tags WHERE persona_id = $1`, [id]);
      if (tagIds.length > 0) {
        const tagValues = tagIds.map((_: string, i: number) => `($1, $${i + 2})`).join(", ");
        await query(
          `INSERT INTO persona_tags (persona_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
          [id, ...tagIds]
        );
      }
    }

    // Sync incremental a listas dinámicas/híbridas.

    return NextResponse.json(persona);
  } catch (error: any) {
    console.error("Error updating persona:", error);
    return NextResponse.json(
      { error: "Error al actualizar persona", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const result = await query(`
      DELETE FROM personas WHERE id = $1 AND org_id = $2 RETURNING id
    `, [id, session.org_id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting persona:", error);
    return NextResponse.json(
      { error: "Error al eliminar persona", details: error.message },
      { status: 500 }
    );
  }
}
