import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 0;

/**
 * GET /api/auth/team?org=uno-electromedicina
 *
 * Endpoint PÚBLICO (sin auth) que devuelve los miembros del equipo con
 * credenciales de login de una org. Solo expone: nombre, email, iniciales,
 * rol. NO expone passwords ni IDs internos.
 *
 * Usado por la página de login personalizada (papasud.local)
 * que muestra los "cuadraditos" de cada usuario para que solo tengan que
 * poner la contraseña.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get("org");

    if (!orgSlug) {
      return NextResponse.json({ error: "org parameter required" }, { status: 400 });
    }

    const result = await query(
      `SELECT DISTINCT ON (p.id)
         COALESCE(NULLIF(p.nombre_completo, ''), TRIM(CONCAT(p.nombre, ' ', COALESCE(p.apellido, '')))) AS nombre,
         ac.email,
         om.rol,
         p.cargo,
         p.foto_url
       FROM organizations o
       JOIN org_members om ON om.org_id = o.id
       JOIN personas p ON p.id = om.persona_id
       JOIN auth_credentials ac ON ac.persona_id = p.id
       WHERE o.slug = $1
         AND ac.email NOT LIKE '%@locus.local'
       ORDER BY p.id,
         CASE om.rol WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         p.nombre`,
      [orgSlug]
    );

    const members = (result.rows || []).map((r: any) => {
      const nombre = r.nombre || "Usuario";
      const parts = nombre.trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : nombre.slice(0, 2).toUpperCase();

      return {
        nombre,
        email: r.email,
        rol: r.rol,
        cargo: r.cargo || null,
        foto_url: r.foto_url || null,
        initials,
      };
    });

    // También devolver info básica de la org para el branding
    const orgResult = await query(
      `SELECT nombre, slug, config->>'theme' AS theme, config->>'logo_url' AS logo_url
       FROM organizations WHERE slug = $1`,
      [orgSlug]
    );
    const org = orgResult.rows[0] || null;

    return NextResponse.json({ org, members });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in GET /api/auth/team:", error);
    return NextResponse.json(
      { error: "Error al obtener equipo", details: errorMessage },
      { status: 500 }
    );
  }
}
