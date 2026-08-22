import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/codigos-postales?localidad=NECOCHEA
 * Devuelve el código postal por defecto de una localidad: { codigo_postal: "7630" | null }.
 *
 * Existe para los casos en que la localidad NO viene de elegir una opción del combobox
 * (que ya trae el CP desde /api/localidades) sino de otra fuente — típicamente el padrón
 * de ARCA, que a veces devuelve el domicilio fiscal sin código postal.
 *
 * El match es el mismo que usa /api/localidades: nombre normalizado (MAYÚSCULA, sin
 * acentos, separadores colapsados a espacio) contra codigos_postales_localidad.
 */
export async function GET(request: NextRequest) {
  const localidad = request.nextUrl.searchParams.get('localidad');

  if (!localidad || localidad.trim().length < 2) {
    return NextResponse.json({ codigo_postal: null });
  }

  try {
    const res = await query(
      `SELECT codigo_postal
         FROM codigos_postales_localidad
        WHERE localidad = btrim(regexp_replace(upper(unaccent($1::text)), '[^A-Z0-9]+', ' ', 'g'))
        LIMIT 1`,
      [localidad]
    );
    return NextResponse.json({ codigo_postal: res.rows[0]?.codigo_postal ?? null });
  } catch (error) {
    console.error('Error buscando código postal:', error);
    return NextResponse.json({ codigo_postal: null });
  }
}
