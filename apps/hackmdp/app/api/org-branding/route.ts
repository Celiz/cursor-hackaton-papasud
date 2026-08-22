import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrgBranding } from '@/lib/org-branding';

export const revalidate = 0;

/**
 * GET /api/org-branding
 * Devuelve el branding (nombre, dirección, logo, colores...) de la org
 * de la sesión. Lo usa la generación de PDF del lado del cliente, que no
 * puede consultar la DB directamente.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const branding = await getOrgBranding(session.org_id);
    return NextResponse.json(branding);
  } catch (error: unknown) {
    console.error('Error en GET /api/org-branding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al cargar branding' },
      { status: 500 }
    );
  }
}
