/**
 * Activity Logger
 * Sistema centralizado para registrar todas las acciones del sistema
 */

import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Tipos de acciones soportadas
export type ActivityAction =
  | "crear"
  | "actualizar"
  | "eliminar"
  | "cambiar_estado"
  | "comentar"
  | "asignar"
  | "completar"
  | "cancelar"
  | "enviar"
  | "recibir"
  | "otro";

// Tipos de entidades soportadas
export type ActivityEntityType =
  | "envio"
  | "pedido"
  | "orden_compra"
  | "producto"
  | "cliente"
  | "servicio"
  | "factura"
  | "presupuesto"
  | "equipo"
  | "equipo_unidad"
  | "laboratorio"
  | "persona"
  | "servicio_tecnico"
  | "comodato"
  | "movimiento"
  | "alerta"
  | "tarea"
  | "usuario"
  | "configuracion"
  | "otro";

export interface LogActivityParams {
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string;
  description: string;
  previousData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  metadata?: Record<string, any>;
  visibleToClient?: boolean;
  important?: boolean;
  // Opcional: pasar usuario manualmente si ya se tiene la sesión
  userId?: string;
  userName?: string;
  org_id?: string;
}

/**
 * Registra una actividad en el sistema
 * Automáticamente obtiene el usuario de la sesión si no se proporciona
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let userId = params.userId;
    let userName = params.userName;
    let orgId = params.org_id;

    // Si no se proporcionó usuario u org, obtener de la sesión
    if (!userId || !userName || !orgId) {
      const session = await getSession();
      userId = userId || (session?.id ?? undefined);
      userName = userName || session?.email || session?.nombre || "Sistema";
      orgId = orgId || (session?.org_id ?? undefined);
    }

    await query(
      `INSERT INTO actividad (
        usuario_id,
        usuario_nombre,
        accion,
        entidad_tipo,
        entidad_id,
        entidad_nombre,
        descripcion,
        datos_anteriores,
        datos_nuevos,
        metadata,
        visible_cliente,
        importante,
        org_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        userId,
        userName,
        params.action,
        params.entityType,
        params.entityId,
        params.entityName || null,
        params.description,
        params.previousData ? JSON.stringify(params.previousData) : null,
        params.newData ? JSON.stringify(params.newData) : null,
        JSON.stringify(params.metadata || {}),
        params.visibleToClient || false,
        params.important || false,
        orgId,
      ]
    );
  } catch (error) {
    // Log error but don't throw - activity logging should not break main operations
    console.error("[Activity Logger] Error registrando actividad:", error);
  }
}

/**
 * Helper para detectar cambios entre dos objetos
 * Retorna solo los campos que cambiaron
 */
export function detectChanges(
  previous: Record<string, any>,
  current: Record<string, any>
): { previous: Record<string, any>; current: Record<string, any> } | null {
  const changedPrevious: Record<string, any> = {};
  const changedCurrent: Record<string, any> = {};

  // Campos a ignorar en la comparación
  const ignoreFields = ["updated_at", "created_at", "id"];

  const allKeys = new Set([
    ...Object.keys(previous || {}),
    ...Object.keys(current || {}),
  ]);

  for (const key of allKeys) {
    if (ignoreFields.includes(key)) continue;

    const prevValue = previous?.[key];
    const currValue = current?.[key];

    // Comparar valores (manejar JSON)
    const prevStr = JSON.stringify(prevValue);
    const currStr = JSON.stringify(currValue);

    if (prevStr !== currStr) {
      changedPrevious[key] = prevValue;
      changedCurrent[key] = currValue;
    }
  }

  if (Object.keys(changedCurrent).length === 0) {
    return null;
  }

  return { previous: changedPrevious, current: changedCurrent };
}

/**
 * Genera descripción automática basada en la acción y entidad
 */
export function generateDescription(
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityName?: string
): string {
  const entityLabels: Record<ActivityEntityType, string> = {
    envio: "envío",
    pedido: "pedido",
    orden_compra: "orden de compra",
    producto: "producto",
    cliente: "cliente",
    servicio: "servicio",
    factura: "factura",
    presupuesto: "presupuesto",
    equipo: "equipo",
    equipo_unidad: "unidad de equipo",
    laboratorio: "laboratorio",
    persona: "persona",
    servicio_tecnico: "servicio técnico",
    comodato: "comodato",
    movimiento: "movimiento",
    alerta: "alerta",
    tarea: "tarea",
    usuario: "usuario",
    configuracion: "configuración",
    otro: "registro",
  };

  const actionLabels: Record<ActivityAction, string> = {
    crear: "creado",
    actualizar: "actualizado",
    eliminar: "eliminado",
    cambiar_estado: "cambió de estado",
    comentar: "comentado",
    asignar: "asignado",
    completar: "completado",
    cancelar: "cancelado",
    enviar: "enviado",
    recibir: "recibido",
    otro: "modificado",
  };

  const entity = entityLabels[entityType] || entityType;
  const actionText = actionLabels[action] || action;
  const name = entityName ? ` "${entityName}"` : "";

  if (action === "cambiar_estado") {
    return `El ${entity}${name} ${actionText}`;
  }

  return `${entity.charAt(0).toUpperCase() + entity.slice(1)}${name} ${actionText}`;
}
