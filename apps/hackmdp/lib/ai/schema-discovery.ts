/**
 * Schema Discovery for AI Chat
 * Dynamically discovers relevant database tables based on user queries
 */

import { query } from '@/lib/db';

interface TableSchema {
  name: string;
  columns: string[];
  foreignKeys: { column: string; references: string }[];
  rowCount: number;
}

// Cache for table list (refreshed every hour)
let tableCache: string[] | null = null;
let tableCacheTime = 0;
const CACHE_TTL = 3600000; // 1 hour

/**
 * Get list of all tables in the database
 */
export async function getAllTables(): Promise<string[]> {
  const now = Date.now();
  if (tableCache && now - tableCacheTime < CACHE_TTL) {
    return tableCache;
  }

  const result = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  tableCache = result.rows.map(r => r.table_name);
  tableCacheTime = now;
  return tableCache || [];
}

/**
 * Extract keywords from user message for table discovery
 */
export function extractKeywords(message: string): string[] {
  const text = message.toLowerCase();

  // Common word mappings
  const mappings: Record<string, string[]> = {
    'cliente': ['clientes', 'clientes_alias', 'clientes_laboratorios'],
    'alias': ['clientes_alias', 'clientes'],
    'razon social': ['clientes'],
    'razón social': ['clientes'],
    'laboratorio': ['laboratorios', 'clientes_laboratorios', 'personas_laboratorios'],
    'lab': ['laboratorios', 'clientes_laboratorios', 'personas_laboratorios'],
    'sede': ['laboratorios', 'clientes_laboratorios'],
    'sucursal': ['laboratorios', 'clientes_laboratorios'],
    'persona': ['personas', 'personas_laboratorios', 'personas_razones_sociales'],
    'equipo': ['equipos', 'equipos_unidades', 'equipos_contratos', 'equipos_movimientos', 'servicios'],
    'diestro': ['equipos', 'equipos_unidades', 'servicios'],
    'v200': ['equipos', 'equipos_unidades', 'servicios'],
    'v-200': ['equipos', 'equipos_unidades', 'servicios'],
    'centrifuga': ['equipos', 'equipos_unidades', 'servicios'],
    'centrífuga': ['equipos', 'equipos_unidades', 'servicios'],
    'microscopio': ['equipos', 'equipos_unidades', 'servicios'],
    'analizador': ['equipos', 'equipos_unidades', 'servicios'],
    'servicio': ['servicios', 'servicios_completos'],
    'reparacion': ['servicios'],
    'reparación': ['servicios'],
    'reparar': ['servicios'],
    'reparó': ['servicios'],
    'reparo': ['servicios'],
    'arreglar': ['servicios'],
    'arregló': ['servicios'],
    'factura': ['facturas', 'facturas_items'],
    'pago': ['pagos'],
    'producto': ['productos', 'productos_lotes'],
    'stock': ['productos', 'stock_depositos', 'stock_bins'],
    'presupuesto': ['presupuestos', 'presupuestos_items'],
    'pedido': ['pedidos', 'pedidos_items'],
    'proveedor': ['proveedores'],
    'remito': ['remitos', 'remitos_items'],
    'contrato': ['equipos_contratos'],
    'instalacion': ['instalaciones'],
    'instalación': ['instalaciones'],
    'alerta': ['alertas', 'equipos_alertas'],
    'movimiento': ['equipos_movimientos'],
    'email': ['email_campanas', 'email_templates', 'email_contactos'],
    'tarea': ['tareas'],
    'deposito': ['depositos', 'stock_depositos'],
    'depósito': ['depositos', 'stock_depositos'],
  };

  const keywords: string[] = [];

  for (const [word, tables] of Object.entries(mappings)) {
    if (text.includes(word)) {
      keywords.push(...tables);
    }
  }

  return [...new Set(keywords)];
}

/**
 * Find tables that might be relevant to a user query
 */
export async function findRelevantTables(message: string): Promise<string[]> {
  const keywords = extractKeywords(message);

  if (keywords.length > 0) {
    return keywords.slice(0, 8); // Max 8 tables
  }

  // If no keywords found, search in table names
  const allTables = await getAllTables();
  const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const matches = allTables.filter(table =>
    words.some(word => table.includes(word) || word.includes(table.replace(/_/g, '')))
  );

  return matches.slice(0, 8);
}

/**
 * Get schema for specific tables
 */
export async function getTablesSchema(tableNames: string[]): Promise<TableSchema[]> {
  const schemas: TableSchema[] = [];

  for (const tableName of tableNames) {
    // Get columns
    const columnsResult = await query(`
      SELECT
        c.column_name,
        c.data_type,
        fk.foreign_table_name
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT
          kcu.column_name,
          kcu.table_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      ) fk ON fk.column_name = c.column_name AND fk.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND c.table_name = $1
      ORDER BY c.ordinal_position
    `, [tableName]);

    if (columnsResult.rows.length === 0) continue;

    const columns: string[] = [];
    const foreignKeys: { column: string; references: string }[] = [];

    for (const row of columnsResult.rows) {
      columns.push(`${row.column_name}: ${simplifyType(row.data_type)}`);
      if (row.foreign_table_name) {
        foreignKeys.push({
          column: row.column_name,
          references: row.foreign_table_name,
        });
      }
    }

    // Get row count estimate
    const countResult = await query(`
      SELECT reltuples::bigint AS estimate
      FROM pg_class WHERE relname = $1
    `, [tableName]);

    schemas.push({
      name: tableName,
      columns,
      foreignKeys,
      rowCount: Number(countResult.rows[0]?.estimate) || 0,
    });
  }

  return schemas;
}

/**
 * Format schema for LLM consumption
 */
export function formatSchemaForLLM(schemas: TableSchema[]): string {
  if (schemas.length === 0) return '';

  let result = '\n## TABLAS RELEVANTES PARA ESTA CONSULTA\n\n';

  for (const schema of schemas) {
    result += `### ${schema.name}`;
    if (schema.rowCount > 0) {
      result += ` (~${schema.rowCount.toLocaleString()} registros)`;
    }
    result += '\n';
    result += `Columnas: ${schema.columns.join(', ')}\n`;

    if (schema.foreignKeys.length > 0) {
      result += `Relaciones: ${schema.foreignKeys.map(fk => `${fk.column} → ${fk.references}`).join(', ')}\n`;
    }
    result += '\n';
  }

  return result;
}

/**
 * Detect equipment patterns in user message and suggest search patterns
 */
export function detectEquipmentPatterns(message: string): string {
  const text = message.toLowerCase();
  const hints: string[] = [];

  // Pattern: letters followed by numbers (v200, bc5000, etc.)
  const alphanumericPattern = /\b([a-z]+)[\s\-]*(\d+)\b/gi;
  const matches = [...message.matchAll(alphanumericPattern)];

  for (const match of matches) {
    const letters = match[1].toLowerCase();
    const numbers = match[2];
    const combined = `${letters}${numbers}`;
    const withPercent = `%${letters}%${numbers}%`;

    hints.push(`Detecté posible equipo "${match[0]}": buscá con múltiples ILIKE: '${withPercent}' OR '%${combined}%' OR '%${letters}-${numbers}%'`);
  }

  // Common equipment names that might be abbreviated
  const commonEquipment: Record<string, string> = {
    'diestro': 'DIESTRO (puede ser DIESTRO COMPACT, DIESTRO CORE, etc.)',
    'pentra': 'PENTRA (PENTRA 60, PENTRA XL, etc.)',
    'mindray': 'MINDRAY (BC-5000, BC-6000, etc.)',
    'sysmex': 'SYSMEX (XN, XP, etc.)',
    'roche': 'ROCHE (cobas, etc.)',
  };

  for (const [key, value] of Object.entries(commonEquipment)) {
    if (text.includes(key)) {
      hints.push(`Detecté referencia a ${value} - buscá con ILIKE '%${key}%'`);
    }
  }

  if (hints.length > 0) {
    return '\n## SUGERENCIAS DE BÚSQUEDA DE EQUIPOS\n' + hints.join('\n') + '\n';
  }

  return '';
}

/**
 * Build dynamic schema context for a user message
 */
export async function buildDynamicSchemaContext(message: string): Promise<string> {
  const relevantTables = await findRelevantTables(message);
  const equipmentHints = detectEquipmentPatterns(message);

  if (relevantTables.length === 0) {
    // Return list of available tables
    const allTables = await getAllTables();
    return `\nTablas disponibles en la base de datos: ${allTables.join(', ')}\n` + equipmentHints;
  }

  const schemas = await getTablesSchema(relevantTables);
  return formatSchemaForLLM(schemas) + equipmentHints;
}

/**
 * Get detailed relations for a table including JOIN examples
 */
export async function getTableRelations(tableName: string): Promise<{
  table: string;
  incomingRelations: { fromTable: string; fromColumn: string; toColumn: string; joinExample: string }[];
  outgoingRelations: { toTable: string; fromColumn: string; toColumn: string; joinExample: string }[];
} | null> {
  // Get outgoing relations (this table references others)
  const outgoingResult = await query(`
    SELECT
      tc.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1
  `, [tableName]);

  // Get incoming relations (other tables reference this table)
  const incomingResult = await query(`
    SELECT
      tc.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_name = $1
  `, [tableName]);

  if (outgoingResult.rows.length === 0 && incomingResult.rows.length === 0) {
    return null;
  }

  const outgoingRelations = outgoingResult.rows.map(row => ({
    toTable: row.to_table,
    fromColumn: row.from_column,
    toColumn: row.to_column,
    joinExample: `JOIN ${row.to_table} ON ${tableName}.${row.from_column} = ${row.to_table}.${row.to_column}`,
  }));

  const incomingRelations = incomingResult.rows.map(row => ({
    fromTable: row.from_table,
    fromColumn: row.from_column,
    toColumn: row.to_column,
    joinExample: `JOIN ${row.from_table} ON ${tableName}.${row.to_column} = ${row.from_table}.${row.from_column}`,
  }));

  return {
    table: tableName,
    incomingRelations,
    outgoingRelations,
  };
}

/**
 * Simplify PostgreSQL types
 */
function simplifyType(pgType: string): string {
  const typeMap: Record<string, string> = {
    'character varying': 'text',
    'timestamp with time zone': 'timestamp',
    'timestamp without time zone': 'timestamp',
    'double precision': 'number',
    'numeric': 'number',
    'integer': 'int',
    'bigint': 'bigint',
    'boolean': 'bool',
    'uuid': 'uuid',
    'text': 'text',
    'date': 'date',
    'jsonb': 'json',
    'json': 'json',
    'ARRAY': 'array',
  };

  return typeMap[pgType] || pgType;
}
