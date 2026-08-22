import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const result = await query(
      `SELECT c.id, c.nombre, c.cuit, c.localidad, c.estado
       FROM clientes c
       WHERE c.lista_precios_id = $1 AND c.org_id = $2
       ORDER BY c.nombre`,
      [id, session.org_id]
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error('Error fetching clientes de lista:', error);
    return NextResponse.json(
      { error: 'Error al cargar clientes de la lista' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { cliente_id } = await request.json();

    if (!cliente_id) {
      return NextResponse.json(
        { error: 'cliente_id es requerido' },
        { status: 400 }
      );
    }

    // Verify the list belongs to this org
    const lista = await query(
      'SELECT id FROM listas_precios WHERE id = $1 AND org_id = $2',
      [id, session.org_id]
    );
    if (lista.rows.length === 0) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    // Verify the client belongs to this org
    const cliente = await query(
      'SELECT id FROM clientes WHERE id = $1 AND org_id = $2',
      [cliente_id, session.org_id]
    );
    if (cliente.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    await query(
      'UPDATE clientes SET lista_precios_id = $1 WHERE id = $2 AND org_id = $3',
      [id, cliente_id, session.org_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error assigning cliente to lista:', error);
    return NextResponse.json(
      { error: 'Error al asignar cliente a la lista' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('cliente_id');

    if (!clienteId) {
      return NextResponse.json(
        { error: 'cliente_id es requerido' },
        { status: 400 }
      );
    }

    const { id } = await params;

    await query(
      'UPDATE clientes SET lista_precios_id = NULL WHERE id = $1 AND org_id = $2 AND lista_precios_id = $3',
      [clienteId, session.org_id, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error removing cliente from lista:', error);
    return NextResponse.json(
      { error: 'Error al quitar cliente de la lista' },
      { status: 500 }
    );
  }
}
