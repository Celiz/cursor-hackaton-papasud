import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
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

    const result = await query(`
      SELECT
        p.id,
        p.modulo,
        p.accion,
        p.descripcion,
        p.created_at
      FROM roles_permisos rp
      JOIN permisos p ON rp.permiso_id = p.id
      JOIN roles r ON rp.rol_id = r.id
      WHERE rp.rol_id = $1 AND r.org_id = $2
    `, [id, session.org_id]);

    return NextResponse.json(result.rows || []);
  } catch (error: any) {
    console.error('Error in GET /api/roles/[id]/permisos:', error);
    return NextResponse.json(
      { error: 'Error al obtener permisos', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roles/[id]/permisos
 * Actualiza los permisos de un rol (reemplaza todos)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!session.is_admin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden modificar permisos' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify the role belongs to this org
    const roleCheck = await query(`SELECT id FROM roles WHERE id = $1 AND org_id = $2`, [id, session.org_id]);
    if (roleCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { permiso_ids } = body;

    if (!Array.isArray(permiso_ids)) {
      return NextResponse.json(
        { error: 'permiso_ids debe ser un array' },
        { status: 400 }
      );
    }

    // Eliminar permisos existentes
    await query(`DELETE FROM roles_permisos WHERE rol_id = $1`, [id]);

    // Insertar nuevos permisos
    if (permiso_ids.length > 0) {
      const values = permiso_ids.map((permisoId: string, index: number) =>
        `($1, $${index + 2})`
      ).join(', ');

      await query(
        `INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ${values}
         ON CONFLICT (rol_id, permiso_id) DO NOTHING`,
        [id, ...permiso_ids]
      );
    }

    return NextResponse.json({ success: true, count: permiso_ids.length });
  } catch (error: any) {
    console.error('Error in PUT /api/roles/[id]/permisos:', error);
    return NextResponse.json(
      { error: 'Error al actualizar permisos', details: error.message },
      { status: 500 }
    );
  }
}
