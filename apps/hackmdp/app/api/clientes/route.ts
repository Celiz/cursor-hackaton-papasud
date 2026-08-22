import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { logActivity, generateDescription } from "@/lib/activity-logger";
import { getSession } from "@/lib/auth";

// Orgs that use the legacy clientes table (B2B, companies)
const LEGACY_CLIENT_ORGS = ['electromedicina'];

// GET - Obtener todos los clientes
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const search = searchParams.get("search");
    const includeStats = searchParams.get("include_stats") === "true";

    // Organizaciones cuyos clientes son personas, no razones sociales.
    if (!LEGACY_CLIENT_ORGS.includes(session.org_tipo || '')) {
      return getPersonaClientes(session, { estado, search, includeStats, searchParams });
    }

    // Legacy clientes (Electromedicina)
    const includeInactive = searchParams.get("include_inactive") === "true";
    const view = searchParams.get("view"); // 'principal' = solo principales con aliases agregados

    // Subconsulta para agregar aliases (nombres + cuits de razones sociales hermanas + labs vinculados)
    const aliasesSubquery = `(
      SELECT string_agg(DISTINCT alias_text, ' | ')
      FROM (
        -- Nombres + cuits de razones sociales hermanas (mismo lab, distinto cliente)
        SELECT COALESCE(c2.nombre, '') || ' ' || COALESCE(c2.cuit, '') AS alias_text
        FROM laboratorio_razones_sociales lrs_self
        JOIN laboratorio_razones_sociales lrs_sister ON lrs_sister.laboratorio_id = lrs_self.laboratorio_id
        JOIN clientes c2 ON c2.id = lrs_sister.cliente_id
        WHERE lrs_self.cliente_id = c.id AND lrs_sister.cliente_id != c.id AND lrs_sister.activo = true
        UNION
        -- Nombres + direcciones de labs vinculados
        SELECT COALESCE(l.nombre, '') || ' ' || COALESCE(l.direccion, '') || ' ' || COALESCE(l.localidad, '') AS alias_text
        FROM laboratorio_razones_sociales lrs
        JOIN laboratorios l ON l.id = lrs.laboratorio_id
        WHERE lrs.cliente_id = c.id AND lrs.activo = true
      ) aliases_union
    )`;

    let queryStr = includeStats
      ? `SELECT c.*,
          lp.nombre as lista_precios_nombre,
          lp.margen_porcentaje as lista_precios_margen,
          (SELECT COUNT(*) FROM equipos_unidades eu WHERE eu.cliente_id = c.id AND eu.activo = true)::int as equipos_count,
          (SELECT COUNT(*) FROM servicios s WHERE s.cliente_id = c.id)::int as servicios_count,
          (SELECT COUNT(*) FROM facturas f WHERE f.cliente_id = c.id)::int as facturas_count,
          ${aliasesSubquery} AS aliases,
          COALESCE(
            (SELECT json_agg(json_build_object('id', t.id, 'nombre', t.nombre, 'color', t.color) ORDER BY t.nombre)
             FROM cliente_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.cliente_id = c.id),
            '[]'::json
          ) as tags
         FROM clientes c
         LEFT JOIN listas_precios lp ON lp.id = c.lista_precios_id
         WHERE c.org_id = $1`
      : `SELECT c.*,
          lp.nombre as lista_precios_nombre,
          lp.margen_porcentaje as lista_precios_margen,
          ${aliasesSubquery} AS aliases,
          COALESCE(
            (SELECT json_agg(json_build_object('id', t.id, 'nombre', t.nombre, 'color', t.color) ORDER BY t.nombre)
             FROM cliente_tags ct JOIN tags t ON ct.tag_id = t.id WHERE ct.cliente_id = c.id),
            '[]'::json
          ) as tags
         FROM clientes c
         LEFT JOIN listas_precios lp ON lp.id = c.lista_precios_id
         WHERE c.org_id = $1`;
    const params: any[] = [session.org_id];
    let paramCount = 2;

    const prefix = 'c.';

    if (!includeInactive) {
      queryStr += ` AND c.activo = true`;
    }

    // Clientes legacy (duplicados de importación) se ocultan por defecto.
    const includeLegacy = searchParams.get("include_legacy") === "true";
    if (!includeLegacy) {
      queryStr += ` AND c.es_legacy = false`;
    }

    // view=principal: solo clientes que son principales en al menos 1 lab
    // O que no tienen ningún link a lab (clientes standalone)
    // Wrapped in try: if laboratorio_razones_sociales doesn't exist yet, skip filter
    if (view === 'principal') {
      try {
        const tableCheck = await query(
          "SELECT 1 FROM information_schema.tables WHERE table_name = 'laboratorio_razones_sociales' LIMIT 1"
        );
        if (tableCheck.rows.length > 0) {
          queryStr += ` AND (
            EXISTS (SELECT 1 FROM laboratorio_razones_sociales lrs WHERE lrs.cliente_id = c.id AND lrs.es_principal = true AND lrs.activo = true)
            OR NOT EXISTS (SELECT 1 FROM laboratorio_razones_sociales lrs WHERE lrs.cliente_id = c.id AND lrs.activo = true)
          )`;
        }
      } catch {
        // Table doesn't exist yet, skip principal filter
      }
    }

    // Aplicar filtros si existen
    if (estado) {
      queryStr += ` AND ${prefix}estado = $${paramCount}`;
      params.push(estado);
      paramCount++;
    }

    if (search) {
      const searchTerm = search.trim();
      const isNumeric = /^\d+$/.test(searchTerm);
      const isCLI = /^CLI-?\d+$/i.test(searchTerm);

      // Buscar en múltiples campos
      if (isNumeric) {
        // Buscar por identificador_unico O identificador_legacy (ambos son números)
        queryStr += ` AND (
          ${prefix}nombre ILIKE $${paramCount} OR
          ${prefix}nombre_fantasia ILIKE $${paramCount} OR
          ${prefix}cuit ILIKE $${paramCount} OR
          ${prefix}identificador_unico = $${paramCount + 1} OR
          ${prefix}identificador_legacy = $${paramCount + 2}
        )`;
        params.push(`%${searchTerm}%`, parseInt(searchTerm), searchTerm);
        paramCount += 3;
      } else if (isCLI) {
        // Buscar por identificador legacy (CLI-1006 → extraer número)
        const numMatch = searchTerm.match(/\d+/);
        if (numMatch) {
          queryStr += ` AND ${prefix}identificador_legacy = $${paramCount}`;
          params.push(numMatch[0]);
          paramCount++;
        }
      } else {
        queryStr += ` AND (
          ${prefix}nombre ILIKE $${paramCount} OR
          ${prefix}nombre_fantasia ILIKE $${paramCount} OR
          ${prefix}cuit ILIKE $${paramCount} OR
          ${prefix}identificador_legacy = $${paramCount}
        )`;
        params.push(`%${searchTerm}%`);
        paramCount++;
      }
    }

    // Filtro por tags
    const tagIds = searchParams.get("tag_ids");
    if (tagIds) {
      const tagArray = tagIds.split(",").filter(Boolean);
      if (tagArray.length > 0) {
        queryStr += ` AND c.id IN (SELECT ct.cliente_id FROM cliente_tags ct WHERE ct.tag_id = ANY($${paramCount}::uuid[]))`;
        params.push(tagArray);
        paramCount++;
      }
    }

    queryStr += ` ORDER BY ${prefix}created_at DESC`;

    // Limit para búsquedas rápidas
    const limit = searchParams.get("limit");
    if (limit && !isNaN(parseInt(limit))) {
      queryStr += ` LIMIT ${parseInt(limit)}`;
    }

    const result = await query(queryStr, params);

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching clientes:", error);
    console.error("Error details:", {
      message: error?.message,
      details: error?.toString(),
      hint: error?.hint || '',
      code: error?.code || '',
    });
    return NextResponse.json(
      {
        error: "Error al obtener clientes",
        message: error?.message,
        details: error?.toString(),
        hint: error?.hint || '',
        code: error?.code || '',
      },
      { status: 500 }
    );
  }
}

// GET clientes from personas + org_contacts (for persona-based orgs)
async function getPersonaClientes(
  session: { org_id?: string },
  opts: { estado: string | null; search: string | null; includeStats: boolean; searchParams: URLSearchParams }
) {
  const params: any[] = [session.org_id];
  let paramCount = 2;

  let queryStr = `
    SELECT
      oc.id,
      oc.org_id,
      COALESCE(p.nombre || ' ' || COALESCE(p.apellido, ''), p.nombre) AS nombre,
      NULL AS nombre_fantasia,
      CASE WHEN p.documento_tipo IN ('CUIT', 'CUIL') THEN p.documento_nro ELSE NULL END AS cuit,
      p.email,
      p.telefono,
      p.direccion,
      p.ciudad AS localidad,
      p.provincia,
      CASE WHEN oc.activo THEN 'Activo' ELSE 'Inactivo' END AS estado,
      oc.condicion_iva,
      COALESCE(oc.saldo_a_favor, 0) AS saldo_a_favor,
      COALESCE(oc.saldo_a_favor_ivr, 0) AS saldo_a_favor_ivr,
      p.documento_tipo,
      p.documento_nro,
      oc.notas,
      p.created_at,
      p.updated_at,
      '[]'::json AS tags
    FROM org_contacts oc
    JOIN personas p ON p.id = oc.persona_id
    WHERE oc.org_id = $1 AND oc.tipo IN ('cliente', 'ambos')
  `;

  if (opts.estado) {
    if (opts.estado === 'Activo') {
      queryStr += ` AND oc.activo = true`;
    } else if (opts.estado === 'Inactivo') {
      queryStr += ` AND oc.activo = false`;
    }
  }

  if (opts.search) {
    const searchTerm = opts.search.trim();
    queryStr += ` AND (
      p.nombre ILIKE $${paramCount} OR
      p.apellido ILIKE $${paramCount} OR
      p.email ILIKE $${paramCount} OR
      p.documento_nro ILIKE $${paramCount} OR
      p.telefono ILIKE $${paramCount}
    )`;
    params.push(`%${searchTerm}%`);
    paramCount++;
  }

  queryStr += ` ORDER BY p.created_at DESC`;

  const limit = opts.searchParams.get("limit");
  if (limit && !isNaN(parseInt(limit))) {
    queryStr += ` LIMIT ${parseInt(limit)}`;
  }

  const result = await query(queryStr, params);
  return NextResponse.json(result.rows || []);
}

// POST - Crear nuevo cliente
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Persona-based orgs: create persona + org_contact
    if (!LEGACY_CLIENT_ORGS.includes(session.org_tipo || '')) {
      return createPersonaCliente(session, body);
    }

    // Legacy: create in clientes table
    if (!body.nombre || !body.cuit) {
      return NextResponse.json(
        { error: "Campos requeridos: nombre, cuit" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO clientes (
        org_id,
        nombre,
        nombre_fantasia,
        cuit,
        email,
        telefono,
        direccion,
        estado,
        condicion_iva,
        localidad,
        provincia,
        factor_precio,
        division,
        lista_precios_id,
        codigo_postal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        session.org_id,
        body.nombre,
        body.nombre_fantasia || null,
        body.cuit,
        // email/telefono son columnas text[] — pg convierte el array JS al
        // literal de Postgres. NO usar JSON.stringify (produce ["x"], que
        // PG rechaza como "malformed array literal").
        Array.isArray(body.email) ? body.email : body.email ? [body.email] : [],
        Array.isArray(body.telefono) ? body.telefono : body.telefono ? [body.telefono] : [],
        body.direccion || null,
        body.estado || 'Activo',
        body.condicion_iva || 'consumidor_final',
        body.localidad || null,
        body.provincia || null,
        body.factor_precio || 1.0,
        body.division || 'humanos',
        body.lista_precios_id || null,
        body.codigo_postal || null
      ]
    );

    const cliente = result.rows[0];

    // Guardar tags si se proporcionaron
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      const tagValues = body.tags.map((_: string, i: number) => `($1, $${i + 2})`).join(", ");
      await query(
        `INSERT INTO cliente_tags (cliente_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
        [cliente.id, ...body.tags]
      );
    }

    // Registrar actividad
    await logActivity({
      action: "crear",
      entityType: "cliente",
      entityId: cliente.id,
      entityName: cliente.nombre,
      description: generateDescription("crear", "cliente", cliente.nombre),
      newData: cliente,
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error: any) {
    console.error("Error creating cliente:", error);
    return NextResponse.json(
      { error: "Error al crear cliente", details: error?.message },
      { status: 500 }
    );
  }
}

// Create persona + org_contact for persona-based orgs
async function createPersonaCliente(session: { org_id?: string }, body: any) {
  if (!body.nombre) {
    return NextResponse.json(
      { error: "Campo requerido: nombre" },
      { status: 400 }
    );
  }

  // Check if persona already exists by email or documento
  let personaId: string | null = null;

  if (body.email) {
    const existing = await query(
      `SELECT id FROM personas WHERE email = $1`,
      [body.email]
    );
    if (existing.rows.length > 0) {
      personaId = existing.rows[0].id;
    }
  }

  if (!personaId && body.documento_nro) {
    const existing = await query(
      `SELECT id FROM personas WHERE documento_nro = $1`,
      [body.documento_nro]
    );
    if (existing.rows.length > 0) {
      personaId = existing.rows[0].id;
    }
  }

  // Create persona if new
  if (!personaId) {
    const personaResult = await query(
      `INSERT INTO personas (nombre, apellido, email, telefono, direccion, ciudad, provincia, documento_tipo, documento_nro, org_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        body.nombre,
        body.apellido || null,
        body.email || null,
        body.telefono || null,
        body.direccion || null,
        body.localidad || body.ciudad || null,
        body.provincia || null,
        body.documento_tipo || (body.cuit ? 'CUIT' : null),
        body.documento_nro || body.cuit || null,
        session.org_id,
      ]
    );
    personaId = personaResult.rows[0].id;
  }

  // Check if org_contact already exists
  const existingContact = await query(
    `SELECT id FROM org_contacts WHERE org_id = $1 AND persona_id = $2`,
    [session.org_id, personaId]
  );

  let contactId: string;
  if (existingContact.rows.length > 0) {
    contactId = existingContact.rows[0].id;
    // Reactivate if inactive
    await query(
      `UPDATE org_contacts SET activo = true, condicion_iva = $1 WHERE id = $2`,
      [body.condicion_iva || 'consumidor_final', contactId]
    );
  } else {
    const contactResult = await query(
      `INSERT INTO org_contacts (org_id, persona_id, tipo, condicion_iva, notas, activo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [
        session.org_id,
        personaId,
        'cliente',
        body.condicion_iva || 'consumidor_final',
        body.notas || null,
      ]
    );
    contactId = contactResult.rows[0].id;
  }

  // Return in the same shape as legacy clientes
  const result = await query(
    `SELECT
      oc.id,
      oc.org_id,
      COALESCE(p.nombre || ' ' || COALESCE(p.apellido, ''), p.nombre) AS nombre,
      NULL AS nombre_fantasia,
      CASE WHEN p.documento_tipo IN ('CUIT', 'CUIL') THEN p.documento_nro ELSE NULL END AS cuit,
      p.email,
      p.telefono,
      p.direccion,
      p.ciudad AS localidad,
      p.provincia,
      'Activo' AS estado,
      oc.condicion_iva,
      COALESCE(oc.saldo_a_favor, 0) AS saldo_a_favor,
      COALESCE(oc.saldo_a_favor_ivr, 0) AS saldo_a_favor_ivr,
      p.created_at,
      p.updated_at
    FROM org_contacts oc
    JOIN personas p ON p.id = oc.persona_id
    WHERE oc.id = $1`,
    [contactId]
  );

  await logActivity({
    action: "crear",
    entityType: "cliente",
    entityId: contactId,
    entityName: body.nombre,
    description: generateDescription("crear", "cliente", body.nombre),
    newData: result.rows[0],
  });

  return NextResponse.json(result.rows[0], { status: 201 });
}
