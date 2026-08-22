import { query } from '@/lib/db';

interface WorkflowTriggerParams {
  trigger_tipo: 'crear' | 'actualizar' | 'cambio_estado' | 'eliminar';
  entidad: string;
  datos: Record<string, any>;
  estado_anterior?: string;
  estado_nuevo?: string;
}

/**
 * Ejecuta workflows que coincidan con el trigger
 * Llamar desde las APIs cuando se crean/actualizan registros
 */
export async function ejecutarWorkflows(params: WorkflowTriggerParams): Promise<void> {
  const { trigger_tipo, entidad, datos, estado_anterior, estado_nuevo } = params;

  try {
    // Buscar workflows activos que coincidan
    let queryStr = `
      SELECT * FROM workflows
      WHERE activo = true
        AND trigger_tipo = $1
        AND trigger_tabla = $2
    `;
    const queryParams: any[] = [trigger_tipo, entidad];

    const result = await query(queryStr, queryParams);

    if (result.rows.length === 0) {
      return; // No hay workflows para este trigger
    }

    // Ejecutar cada workflow
    for (const workflow of result.rows) {
      // Para cambio_estado, verificar si coincide la condición
      if (trigger_tipo === 'cambio_estado' && workflow.trigger_condicion) {
        const condicion = workflow.trigger_condicion;
        if (condicion.valor_nuevo && condicion.valor_nuevo !== estado_nuevo) {
          continue; // No coincide el estado
        }
        if (condicion.valor_anterior && condicion.valor_anterior !== estado_anterior) {
          continue;
        }
      }

      // Ejecutar el workflow en background (no bloqueante)
      ejecutarWorkflowAsync(workflow, datos).catch(err => {
        console.error(`Error ejecutando workflow ${workflow.id}:`, err);
      });
    }
  } catch (error) {
    console.error('Error buscando workflows:', error);
  }
}

async function ejecutarWorkflowAsync(
  workflow: any,
  datos: Record<string, any>
): Promise<void> {
  // Crear registro de ejecución
  const ejecucionResult = await query(
    `INSERT INTO workflow_ejecuciones (workflow_id, trigger_datos, estado)
     VALUES ($1, $2, 'en_proceso')
     RETURNING id`,
    [workflow.id, JSON.stringify(datos)]
  );

  const ejecucionId = ejecucionResult.rows[0].id;
  const acciones = workflow.acciones || [];
  const resultados: any[] = [];
  let exitoso = true;

  for (const accion of acciones) {
    try {
      const resultado = await ejecutarAccion(accion, datos);
      resultados.push({
        tipo: accion.tipo,
        estado: 'completado',
        resultado,
      });
    } catch (error: any) {
      resultados.push({
        tipo: accion.tipo,
        estado: 'fallido',
        error: error.message,
      });
      exitoso = false;
    }
  }

  // Actualizar estado de ejecución
  await query(
    `UPDATE workflow_ejecuciones
     SET estado = $1, resultado = $2, updated_at = NOW()
     WHERE id = $3`,
    [exitoso ? 'completado' : 'fallido', JSON.stringify(resultados), ejecucionId]
  );
}

async function ejecutarAccion(
  accion: { tipo: string; config: Record<string, any> },
  datos: Record<string, any>
): Promise<any> {
  switch (accion.tipo) {
    case 'notificacion':
      // Crear notificación en el sistema
      const titulo = reemplazarVariables(accion.config.titulo || 'Notificación automática', datos);
      const mensaje = reemplazarVariables(accion.config.mensaje || '', datos);

      await query(
        `INSERT INTO notificaciones (tipo, titulo, mensaje, prioridad, entidad_tipo, entidad_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          accion.config.tipo || 'sistema',
          titulo,
          mensaje,
          accion.config.prioridad || 'normal',
          accion.config.entidad_tipo || 'otro',
          datos.id || null,
        ]
      );
      return { notificado: true, titulo };

    case 'crear_tarea':
      const tareaResult = await query(
        `INSERT INTO tareas (titulo, descripcion, fecha_vencimiento, prioridad)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          reemplazarVariables(accion.config.titulo || 'Tarea automática', datos),
          reemplazarVariables(accion.config.descripcion || '', datos),
          accion.config.dias_vencimiento
            ? new Date(Date.now() + accion.config.dias_vencimiento * 24 * 60 * 60 * 1000)
            : null,
          accion.config.prioridad || 'normal',
        ]
      );
      return { tarea_id: tareaResult.rows[0]?.id };

    case 'cambiar_estado':
      if (!accion.config.tabla || !accion.config.nuevo_estado) {
        throw new Error('Configuración incompleta para cambiar_estado');
      }
      await query(
        `UPDATE ${accion.config.tabla} SET estado = $1 WHERE id = $2`,
        [accion.config.nuevo_estado, datos.id]
      );
      return { estado_cambiado: true };

    case 'webhook':
      if (!accion.config.url) {
        throw new Error('URL de webhook no configurada');
      }
      const response = await fetch(accion.config.url, {
        method: accion.config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accion.config.headers || {}),
        },
        body: JSON.stringify(datos),
      });
      return { status: response.status, ok: response.ok };

    default:
      console.log(`Acción ${accion.tipo} no implementada, ignorando`);
      return { skipped: true };
  }
}

function reemplazarVariables(texto: string, datos: Record<string, any>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return datos[key] !== undefined ? String(datos[key]) : match;
  });
}
