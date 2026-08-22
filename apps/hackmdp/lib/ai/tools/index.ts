/**
 * AI Tools Registry
 * Extensible system for adding capabilities to the AI assistant
 * Supports agentic workflows with introspection tools
 */

import {
  executeQuery,
  extractSqlFromResponse,
  formatResultsForDisplay,
  QueryResult,
} from './query-database';
import {
  getAllTables,
  getTablesSchema,
  getTableRelations,
} from '../schema-discovery';
import type { ToolDefinition } from '../groq-client';

export interface ToolResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  requiresConfirmation: boolean;
  execute: (params: any) => Promise<ToolResult>;
}

/**
 * Execute Query Tool
 * Executes SELECT queries against the database
 */
const executeQueryTool: Tool = {
  name: 'execute_query',
  description: 'Ejecuta una consulta SQL SELECT en la base de datos',
  requiresConfirmation: false,
  execute: async (params: { sql: string }): Promise<ToolResult> => {
    const result = await executeQuery(params.sql);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: `Error al ejecutar la consulta: ${result.error}`,
      };
    }

    return {
      success: true,
      data: result.data,
      message: formatResultsForDisplay(result),
    };
  },
};

/**
 * Get Table Schema Tool
 * Returns the structure of a specific table
 */
const getTableSchemaTool: Tool = {
  name: 'get_table_schema',
  description: 'Obtiene la estructura de una tabla específica (columnas, tipos, foreign keys)',
  requiresConfirmation: false,
  execute: async (params: { table_name: string }): Promise<ToolResult> => {
    try {
      const schemas = await getTablesSchema([params.table_name]);

      if (schemas.length === 0) {
        return {
          success: false,
          error: `Tabla "${params.table_name}" no encontrada`,
          message: `No existe la tabla "${params.table_name}"`,
        };
      }

      const schema = schemas[0];
      const schemaInfo = {
        name: schema.name,
        columns: schema.columns,
        foreignKeys: schema.foreignKeys,
        rowCount: schema.rowCount,
      };

      // Format for LLM
      let message = `Tabla: ${schema.name}\n`;
      message += `Columnas: ${schema.columns.join(', ')}\n`;
      if (schema.foreignKeys.length > 0) {
        message += `Relaciones: ${schema.foreignKeys.map(fk => `${fk.column} → ${fk.references}`).join(', ')}`;
      }

      return {
        success: true,
        data: schemaInfo,
        message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: `Error al obtener schema: ${error.message}`,
      };
    }
  },
};

/**
 * List Tables Tool
 * Returns all available tables in the database
 */
const listTablesTool: Tool = {
  name: 'list_tables',
  description: 'Lista todas las tablas disponibles en la base de datos',
  requiresConfirmation: false,
  execute: async (): Promise<ToolResult> => {
    try {
      const tables = await getAllTables();

      return {
        success: true,
        data: tables,
        message: `Tablas disponibles (${tables.length}): ${tables.join(', ')}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: `Error al listar tablas: ${error.message}`,
      };
    }
  },
};

/**
 * Get Table Relations Tool
 * Returns detailed relations with JOIN examples
 */
const getTableRelationsTool: Tool = {
  name: 'get_table_relations',
  description: 'Obtiene las relaciones de una tabla con ejemplos de JOIN. Usá esto cuando necesites saber cómo conectar tablas.',
  requiresConfirmation: false,
  execute: async (params: { table_name: string }): Promise<ToolResult> => {
    try {
      const relations = await getTableRelations(params.table_name);

      if (!relations) {
        return {
          success: true,
          data: { table: params.table_name, relations: [] },
          message: `La tabla "${params.table_name}" no tiene relaciones definidas (foreign keys).`,
        };
      }

      // Format for LLM with JOIN examples
      let message = `Relaciones de "${params.table_name}":\n`;

      if (relations.outgoingRelations.length > 0) {
        message += `\n📤 ESTA TABLA REFERENCIA A:\n`;
        for (const rel of relations.outgoingRelations) {
          message += `  - ${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}\n`;
          message += `    ${rel.joinExample}\n`;
        }
      }

      if (relations.incomingRelations.length > 0) {
        message += `\n📥 TABLAS QUE REFERENCIAN A ESTA:\n`;
        for (const rel of relations.incomingRelations) {
          message += `  - ${rel.fromTable}.${rel.fromColumn} → ${rel.toColumn}\n`;
          message += `    ${rel.joinExample}\n`;
        }
      }

      return {
        success: true,
        data: relations,
        message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: `Error al obtener relaciones: ${error.message}`,
      };
    }
  },
};

// Registry of available tools
const tools: Map<string, Tool> = new Map([
  ['execute_query', executeQueryTool],
  ['get_table_schema', getTableSchemaTool],
  ['list_tables', listTablesTool],
  ['get_table_relations', getTableRelationsTool],
]);

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return tools.get(name);
}

/**
 * Get all available tools
 */
export function getAllTools(): Tool[] {
  return Array.from(tools.values());
}

/**
 * Get tool descriptions for the LLM (text format)
 */
export function getToolDescriptions(): string {
  return Array.from(tools.values())
    .map(tool => `- ${tool.name}: ${tool.description}`)
    .join('\n');
}

/**
 * Get tool definitions for OpenAI/Groq format
 * Used for agentic workflows with tool_calls
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'execute_query',
        description: 'Ejecuta una consulta SQL SELECT en la base de datos. Solo se permiten consultas SELECT.',
        parameters: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'La consulta SQL SELECT a ejecutar',
            },
          },
          required: ['sql'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_table_schema',
        description: 'Obtiene la estructura de una tabla específica: columnas, tipos de datos y foreign keys. Usá esto cuando no estés seguro de las columnas disponibles.',
        parameters: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Nombre de la tabla (ej: "clientes", "servicios", "facturas")',
            },
          },
          required: ['table_name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_tables',
        description: 'Lista todas las tablas disponibles en la base de datos. Usá esto para descubrir qué tablas existen.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_table_relations',
        description: 'Obtiene las relaciones (foreign keys) de una tabla con ejemplos de cómo hacer JOIN. Usá esto cuando necesites conectar múltiples tablas o no sepas cómo relacionarlas.',
        parameters: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Nombre de la tabla (ej: "servicios", "equipos", "equipos_unidades")',
            },
          },
          required: ['table_name'],
        },
      },
    },
  ];
}

/**
 * Process LLM response and execute any SQL found
 */
export async function processLLMResponse(
  response: string
): Promise<{
  originalResponse: string;
  sql: string | null;
  queryResult: QueryResult | null;
  formattedResult: string | null;
}> {
  const sql = extractSqlFromResponse(response);

  if (!sql) {
    return {
      originalResponse: response,
      sql: null,
      queryResult: null,
      formattedResult: null,
    };
  }

  const queryResult = await executeQuery(sql);
  const formattedResult = formatResultsForDisplay(queryResult);

  return {
    originalResponse: response,
    sql,
    queryResult,
    formattedResult,
  };
}

// Re-export utilities
export { executeQuery, extractSqlFromResponse, formatResultsForDisplay };
export type { QueryResult };

/**
 * Future tools to implement (Phase 2+):
 *
 * - generate_pdf: Generate PDF reports from data
 * - display_chart: Show data as charts in the UI
 * - send_email: Send emails with confirmations
 *
 * Phase 3 (with confirmation system):
 * - create_record: Insert new records
 * - update_record: Update existing records
 * - delete_record: Delete records (soft delete preferred)
 */
