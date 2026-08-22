// Helpers puros de autorización para la administración de usuarios del equipo.

export type Rol = 'owner' | 'admin' | 'employee';
export const ROLES_VALIDOS = ['owner', 'admin', 'employee'] as const;

/** ¿Puede `actorRol` editar a un usuario con `targetRol`? Admin no toca owners. */
export function puedeEditar(actorRol: string, targetRol: string): boolean {
  if (actorRol === 'owner') return true;
  if (actorRol === 'admin') return targetRol !== 'owner';
  return false;
}

/** ¿Puede `actorRol` asignar `nuevoRol`? Solo un owner concede owner. */
export function puedeAsignarRol(actorRol: string, nuevoRol: string): boolean {
  if (actorRol === 'owner') return true;
  if (actorRol === 'admin') return nuevoRol !== 'owner';
  return false;
}

/** true = bloquear: se le está quitando el rol owner al único owner de la org. */
export function bloqueaUltimoOwner(
  targetRolActual: string,
  nuevoRol: string | undefined,
  totalOwners: number
): boolean {
  return targetRolActual === 'owner' && nuevoRol !== undefined && nuevoRol !== 'owner' && totalOwners <= 1;
}

/** Valida los campos del PATCH que no requieren DB. Devuelve mensaje de error o null. */
export function validarPatch(body: { email?: string; new_password?: string; rol?: string }): string | null {
  if (body.email !== undefined) {
    if (typeof body.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email.trim())) {
      return 'email inválido';
    }
  }
  if (body.new_password !== undefined) {
    if (typeof body.new_password !== 'string' || body.new_password.length < 6) {
      return 'la contraseña debe tener al menos 6 caracteres';
    }
  }
  if (body.rol !== undefined && !(ROLES_VALIDOS as readonly string[]).includes(body.rol)) {
    return 'rol inválido';
  }
  return null;
}
