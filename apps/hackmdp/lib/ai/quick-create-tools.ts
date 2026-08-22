import { query } from "@/lib/db";

/**
 * Tools available to the Quick Create AI agent.
 * Each tool has a JSON schema description (for the LLM) and an execute function.
 */

export interface ToolResult {
  ok: boolean;
  data?: any;
  error?: string;
  /** Human-readable summary shown to the user in the UI */
  summary?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  orgId: string;
  personaId: string;
  userId?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Búsqueda de entidades
// ───────────────────────────────────────────────────────────────────────────

const buscarCliente: ToolDefinition = {
  name: "buscar_cliente",
  description:
    "Busca un cliente (hospital, laboratorio, empresa) por nombre, razón social o CUIT. Devuelve hasta 5 coincidencias. Usá esto para resolver menciones como 'Hospital Central' a un ID real.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Nombre, razón social o CUIT a buscar" },
    },
    required: ["query"],
  },
  execute: async ({ query: q }, ctx) => {
    try {
      const result = await query(
        `SELECT id, nombre, nombre_fantasia, cuit, localidad, telefono
         FROM clientes
         WHERE org_id = $1
           AND (nombre ILIKE $2 OR nombre_fantasia ILIKE $2 OR cuit ILIKE $2)
         ORDER BY
           CASE WHEN nombre ILIKE $3 THEN 0 WHEN nombre_fantasia ILIKE $3 THEN 1 ELSE 2 END,
           nombre ASC
         LIMIT 5`,
        [ctx.orgId, `%${q}%`, `${q}%`]
      );

      if (result.rows.length === 0) {
        return {
          ok: true,
          data: { matches: [] },
          summary: `Sin coincidencias para "${q}"`,
        };
      }

      return {
        ok: true,
        data: { matches: result.rows },
        summary: `Encontré ${result.rows.length} cliente(s) que coinciden con "${q}"`,
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

const buscarEquipo: ToolDefinition = {
  name: "buscar_equipo",
  description:
    "Busca un equipo (instrumento/aparato) por marca, modelo o número de serie. Opcionalmente filtrá por cliente_id para buscar solo los equipos de un cliente específico. Usalo para resolver frases como 'Olympus CX41'.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Marca, modelo o N° de serie" },
      cliente_id: {
        type: "string",
        description: "Filtrar solo equipos de este cliente (UUID, opcional)",
      },
    },
    required: ["query"],
  },
  execute: async ({ query: q, cliente_id }, ctx) => {
    try {
      let sql = `
        SELECT eu.id as equipo_unidad_id,
               eu.numero_serie,
               e.id as equipo_id,
               e.marca,
               e.modelo,
               e.tipo,
               c.id as cliente_id,
               c.nombre as cliente_nombre
        FROM equipos_unidades eu
        JOIN equipos e ON e.id = eu.equipo_id
        LEFT JOIN clientes c ON c.id = eu.cliente_id
        WHERE eu.org_id = $1
          AND (e.marca ILIKE $2 OR e.modelo ILIKE $2 OR eu.numero_serie ILIKE $2 OR e.tipo ILIKE $2)
      `;
      const params: any[] = [ctx.orgId, `%${q}%`];
      if (cliente_id) {
        sql += ` AND eu.cliente_id = $${params.length + 1}`;
        params.push(cliente_id);
      }
      sql += ` ORDER BY e.marca, e.modelo LIMIT 10`;

      const result = await query(sql, params);
      return {
        ok: true,
        data: { matches: result.rows },
        summary:
          result.rows.length > 0
            ? `Encontré ${result.rows.length} equipo(s) que coinciden con "${q}"`
            : `Sin coincidencias para "${q}"`,
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

const buscarTecnico: ToolDefinition = {
  name: "buscar_tecnico",
  description: "Busca un técnico o miembro del equipo por nombre. Devuelve users disponibles para asignar.",
  parameters: {
    type: "object",
    properties: {
      nombre: { type: "string", description: "Nombre del técnico" },
    },
    required: ["nombre"],
  },
  execute: async ({ nombre }, ctx) => {
    try {
      const result = await query(
        `SELECT u.id, u.nombre_completo, u.email
         FROM users u
         INNER JOIN auth_credentials ac ON ac.email = u.email
         INNER JOIN org_members om ON om.persona_id = ac.persona_id
         WHERE om.org_id = $1
           AND u.nombre_completo ILIKE $2
         ORDER BY u.nombre_completo
         LIMIT 5`,
        [ctx.orgId, `%${nombre}%`]
      );
      return {
        ok: true,
        data: { matches: result.rows },
        summary:
          result.rows.length > 0
            ? `Encontré ${result.rows.length} técnico(s)`
            : `No encontré técnicos con "${nombre}"`,
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

const buscarLaboratorio: ToolDefinition = {
  name: "buscar_laboratorio",
  description:
    "Busca un laboratorio por nombre o código. Opcionalmente filtrá por cliente_id.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Nombre o código del laboratorio" },
      cliente_id: { type: "string", description: "Filtrar por cliente (opcional)" },
    },
    required: ["query"],
  },
  execute: async ({ query: q, cliente_id }, ctx) => {
    try {
      let sql = `
        SELECT l.id, l.nombre, l.codigo, l.localidad, l.provincia
        FROM laboratorios l
        WHERE l.org_id = $1
          AND l.activo = true
          AND (l.nombre ILIKE $2 OR l.codigo ILIKE $2)
      `;
      const params: any[] = [ctx.orgId, `%${q}%`];
      if (cliente_id) {
        sql += ` AND EXISTS (
          SELECT 1 FROM laboratorio_razones_sociales lrs
          WHERE lrs.laboratorio_id = l.id AND lrs.cliente_id = $${params.length + 1}
        )`;
        params.push(cliente_id);
      }
      sql += ` ORDER BY l.nombre LIMIT 10`;

      const result = await query(sql, params);
      return {
        ok: true,
        data: { matches: result.rows },
        summary: result.rows.length > 0 ? `${result.rows.length} laboratorio(s) encontrados` : "Sin resultados",
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

const listarEstadosServicio: ToolDefinition = {
  name: "listar_estados_servicio",
  description: "Lista los estados disponibles para órdenes de servicio técnico. Útil cuando el usuario menciona un estado específico.",
  parameters: { type: "object", properties: {} },
  execute: async (_args, ctx) => {
    try {
      const result = await query(
        `SELECT value, label FROM configuracion_estados WHERE org_id = $1 AND tipo = 'servicio' ORDER BY label`,
        [ctx.orgId]
      );
      return {
        ok: true,
        data: { estados: result.rows },
        summary: `${result.rows.length} estados disponibles`,
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

const listarTiposServicio: ToolDefinition = {
  name: "listar_tipos_servicio",
  description: "Lista los tipos de servicio técnico (reparación, mantenimiento, instalación, etc.)",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    return {
      ok: true,
      data: {
        tipos: [
          "Reparación",
          "Mantenimiento preventivo",
          "Mantenimiento correctivo",
          "Instalación",
          "Diagnóstico",
          "Calibración",
          "Capacitación",
          "Retiro / Devolución",
        ],
      },
      summary: "Tipos de servicio disponibles",
    };
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Proponer entidad final (finalizer)
// ───────────────────────────────────────────────────────────────────────────

const proponerEntidad: ToolDefinition = {
  name: "proponer_entidad",
  description:
    "Una vez que tengas toda la información necesaria y resolvidos los IDs mediante los tools de búsqueda, llamá a este tool para proponer la entidad final al usuario. El usuario la verá y confirmará antes de crearla. NO crea nada todavía.",
  parameters: {
    type: "object",
    properties: {
      entityType: {
        type: "string",
        enum: ["servicio", "oportunidad", "actividad", "cliente"],
        description: "Tipo de entidad a crear",
      },
      fields: {
        type: "object",
        description:
          "Objeto con los campos resueltos. Para servicios incluí cliente_id, equipo_unidad_id, tecnico_id si los resolviste. Los nombres textuales como respaldo (cliente_nombre, equipo_descripcion).",
      },
      resumen: {
        type: "string",
        description: "Resumen en español natural de lo que se va a crear, en 1-2 oraciones.",
      },
    },
    required: ["entityType", "fields", "resumen"],
  },
  execute: async (args) => {
    return {
      ok: true,
      data: { proposal: args },
      summary: `Propuesta lista: ${args.entityType}`,
    };
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Registry
// ───────────────────────────────────────────────────────────────────────────

export const QUICK_CREATE_TOOLS: Record<string, ToolDefinition> = {
  buscar_cliente: buscarCliente,
  buscar_equipo: buscarEquipo,
  buscar_tecnico: buscarTecnico,
  buscar_laboratorio: buscarLaboratorio,
  listar_estados_servicio: listarEstadosServicio,
  listar_tipos_servicio: listarTiposServicio,
  proponer_entidad: proponerEntidad,
};

/** Get tool definitions formatted for Ollama's tools API */
export function getOllamaToolsSchema() {
  return Object.values(QUICK_CREATE_TOOLS).map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function executeTool(
  name: string,
  args: any,
  ctx: ToolContext
): Promise<ToolResult> {
  const tool = QUICK_CREATE_TOOLS[name];
  if (!tool) {
    return { ok: false, error: `Tool desconocida: ${name}` };
  }
  return tool.execute(args, ctx);
}
