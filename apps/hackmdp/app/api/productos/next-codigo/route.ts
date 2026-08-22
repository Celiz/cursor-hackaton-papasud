import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

/**
 * GET /api/productos/next-codigo?prefix=UNO-
 *
 * Devuelve el próximo código disponible con el prefijo dado, basado en el
 * mayor número existente + 1. Permite seguir una numeración sin pisar códigos
 * previos. Si no existe ninguno con ese prefijo, arranca en 1.
 *
 * Format: {prefix}{NNNNNN} — padded a 6 dígitos.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const prefix = new URL(request.url).searchParams.get('prefix') || 'UNO-';

    // Buscar el mayor número numérico dentro de códigos que coincidan
    // exactamente con el formato {prefix}{digits}.
    const result = await query(
      `SELECT codigo FROM productos
       WHERE org_id = $1
         AND codigo ~ ('^' || $2 || '[0-9]+$')
         AND deleted_at IS NULL`,
      [session.org_id, prefix.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&')]
    );

    let maxNum = 0;
    let dominantPad = 4; // default si no hay muestras
    const padCounts = new Map<number, number>();

    for (const row of result.rows) {
      const numPart = String(row.codigo).slice(prefix.length);
      const n = parseInt(numPart, 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
      const len = numPart.length;
      padCounts.set(len, (padCounts.get(len) || 0) + 1);
    }

    // Usar el padding mas frecuente entre los codigos existentes (sin eso el
    // formato nuevo seria inconsistente con la convencion del usuario).
    if (padCounts.size > 0) {
      let topCount = 0;
      for (const [len, count] of padCounts) {
        if (count > topCount) {
          topCount = count;
          dominantPad = len;
        }
      }
    }

    const nextNum = maxNum + 1;
    // Si el proximo numero ya tiene mas digitos que el padding dominante,
    // usamos los digitos necesarios.
    const pad = Math.max(dominantPad, String(nextNum).length);
    const padded = String(nextNum).padStart(pad, '0');
    const nextCodigo = `${prefix}${padded}`;

    return NextResponse.json({
      next_codigo: nextCodigo,
      current_max: maxNum,
      total_existing: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error GET /api/productos/next-codigo:', error);
    return NextResponse.json(
      { error: 'Error al calcular próximo código', details: error.message },
      { status: 500 }
    );
  }
}
