import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/localidades?q=mar+del+plata&max=10
 * Busca localidades argentinas usando la API Georef de datos.gob.ar
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const max = searchParams.get('max') || '10';

  if (!q || q.length < 2) {
    return NextResponse.json({ localidades: [] });
  }

  try {
    const url = `https://apis.datos.gob.ar/georef/api/localidades?nombre=${encodeURIComponent(q)}&max=${max}&campos=nombre,provincia,departamento,municipio`;
    const response = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
    const data = await response.json();

    const localidades = (data.localidades || []).map((loc: Record<string, unknown>) => {
      const provincia = loc.provincia as Record<string, string>;
      const municipio = loc.municipio as Record<string, string>;
      return {
        nombre: loc.nombre,
        provincia: provincia?.nombre,
        municipio: municipio?.nombre,
        label: `${loc.nombre}, ${provincia?.nombre}`,
      };
    });

    return NextResponse.json({ localidades });
  } catch (error) {
    console.error('Error buscando localidades:', error);
    return NextResponse.json({ localidades: [] });
  }
}
