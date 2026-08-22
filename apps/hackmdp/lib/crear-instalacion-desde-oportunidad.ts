import { query } from "@/lib/db";

/**
 * Crea una instalación en estado 'planificada' a partir de una oportunidad
 * del CRM. Se usa desde el hook de `PATCH /api/oportunidades` cuando una
 * oportunidad cambia de etapa a 'ganado'.
 *
 * Comportamiento:
 *  - Si la oportunidad no tiene `cliente_id`, no crea nada (no tenemos a
 *    quién instalarle).
 *  - Si ya existe una instalación para esta oportunidad, devuelve el id
 *    existente en vez de duplicar.
 *  - Arma una `descripcion_equipo` concatenando los equipos pedidos
 *    (oportunidades_equipos_pedidos) si hay, o usa el nombre de la
 *    oportunidad como fallback.
 *  - `direccion_instalacion` sale del cliente (ciudad/provincia o campo
 *    direccion si existe). Si no hay, usa texto genérico "A coordinar".
 *
 * Devuelve `{ instalacion_id, already_existed }` o `null` si no se pudo
 * crear. Best-effort: fallos loguean y devuelven null sin romper el
 * endpoint llamante.
 */
export async function crearInstalacionDesdeOportunidad(
  oportunidadId: string,
  orgId: string
): Promise<{ instalacion_id: string; already_existed: boolean } | null> {
  try {
    // ¿Ya existe una instalación para esta oportunidad? (idempotente)
    const existing = await query(
      `SELECT id FROM instalaciones WHERE oportunidad_id = $1 LIMIT 1`,
      [oportunidadId]
    );
    if (existing.rows.length > 0) {
      return { instalacion_id: existing.rows[0].id, already_existed: true };
    }

    // Leer la oportunidad con sus joins útiles
    const opRes = await query(
      `SELECT
         ov.id,
         ov.nombre,
         ov.descripcion,
         ov.cliente_id,
         ov.presupuesto_id,
         ov.pedido_id,
         ov.fecha_estimada_cierre,
         ov.usuario_asignado_id,
         ov.vendedor_id,
         COALESCE(c.nombre_fantasia, c.nombre) AS cliente_nombre,
         c.direccion AS cliente_direccion,
         c.ciudad AS cliente_ciudad,
         c.provincia AS cliente_provincia
       FROM oportunidades_venta ov
       LEFT JOIN clientes c ON c.id = ov.cliente_id
       WHERE ov.id = $1 AND ov.org_id = $2`,
      [oportunidadId, orgId]
    );

    const op = opRes.rows[0];
    if (!op) {
      console.warn(`crearInstalacionDesdeOportunidad: oportunidad ${oportunidadId} no encontrada`);
      return null;
    }

    if (!op.cliente_id) {
      console.warn(
        `crearInstalacionDesdeOportunidad: oportunidad ${oportunidadId} sin cliente_id — skipping`
      );
      return null;
    }

    // Equipos de la oportunidad (para armar la descripción)
    const equiposRes = await query(
      `SELECT
         oep.cantidad,
         oep.especificaciones,
         e.marca,
         e.modelo,
         e.tipo
       FROM oportunidades_equipos_pedidos oep
       LEFT JOIN equipos e ON e.id = oep.equipo_id
       WHERE oep.oportunidad_id = $1`,
      [oportunidadId]
    );

    const descripcionEquipo =
      equiposRes.rows.length > 0
        ? equiposRes.rows
            .map((r: any) => {
              const nombre = [r.marca, r.modelo].filter(Boolean).join(" ") || r.tipo || "Equipo";
              return r.cantidad > 1 ? `${r.cantidad}x ${nombre}` : nombre;
            })
            .join(" + ")
        : op.nombre || "Equipo a instalar";

    const direccion =
      [op.cliente_direccion, op.cliente_ciudad, op.cliente_provincia]
        .filter(Boolean)
        .join(", ") || "A coordinar con el cliente";

    // Fecha planificada: si la oportunidad tiene fecha_estimada_cierre, la usamos
    const fechaPlanificada = op.fecha_estimada_cierre || null;

    // Generar número automático INST-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const countRes = await query(
      `SELECT COUNT(*) AS count FROM instalaciones i
       JOIN clientes c ON c.id = i.cliente_id
       WHERE c.org_id = $1 AND EXTRACT(YEAR FROM i.created_at) = $2`,
      [orgId, year]
    );
    const count = parseInt(countRes.rows[0]?.count || "0");
    const numero = `INST-${year}-${String(count + 1).padStart(6, "0")}`;

    // Insert
    const insertRes = await query(
      `INSERT INTO instalaciones (
         numero, cliente_id, presupuesto_id, pedido_id, oportunidad_id,
         estado, fecha_planificada, direccion_instalacion, descripcion_equipo,
         notas_planificacion,
         costo_mano_obra, costo_materiales, costo_total,
         tecnicos_adicionales, checklist_pre_instalacion,
         checklist_post_instalacion, certificados_requeridos
       )
       VALUES (
         $1, $2, $3, $4, $5,
         'planificada', $6, $7, $8,
         $9,
         0, 0, 0,
         '[]'::jsonb, '[]'::jsonb,
         '[]'::jsonb, '[]'::jsonb
       )
       RETURNING id`,
      [
        numero,
        op.cliente_id,
        op.presupuesto_id,
        op.pedido_id,
        op.id,
        fechaPlanificada,
        direccion,
        descripcionEquipo,
        `Creada automáticamente desde oportunidad "${op.nombre}" al marcarse como ganada.${
          op.descripcion ? "\n\nDescripción de la oportunidad:\n" + op.descripcion : ""
        }`,
      ]
    );

    return { instalacion_id: insertRes.rows[0].id, already_existed: false };
  } catch (err) {
    console.error("crearInstalacionDesdeOportunidad failed (non-fatal):", err);
    return null;
  }
}
