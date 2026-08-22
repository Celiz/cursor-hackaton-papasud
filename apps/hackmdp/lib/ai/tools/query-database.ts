/**
 * Query Database Tool
 * Executes SELECT queries against the database with security validations
 */

import { query } from '@/lib/db';

// SQL keywords that are NOT allowed (anything that modifies data)
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXECUTE',
  'EXEC',
  'CALL',
  'INTO',
  'MERGE',
  'UPSERT',
  'REPLACE',
  'SET ',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'SAVEPOINT',
  'COPY',
  'VACUUM',
  'REINDEX',
  'CLUSTER',
  'LOCK',
];

// Maximum number of rows to return
const MAX_LIMIT = 100;

// Query timeout in milliseconds
const QUERY_TIMEOUT = 30000;

export interface QueryResult {
  success: boolean;
  data?: Record<string, any>[];
  rowCount?: number;
  error?: string;
  query?: string;
}

/**
 * Extract SQL query from LLM response
 * Looks for SQL code blocks or plain SQL statements
 */
export function extractSqlFromResponse(response: string): string | null {
  // Try to find SQL in code blocks first
  const codeBlockMatch = response.match(/```sql\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try generic code blocks
  const genericBlockMatch = response.match(/```\s*(SELECT[\s\S]*?)```/i);
  if (genericBlockMatch) {
    return genericBlockMatch[1].trim();
  }

  // Look for SELECT statement directly
  const selectMatch = response.match(/\b(SELECT\s+[\s\S]+?)(?:;|\n\n|$)/i);
  if (selectMatch) {
    return selectMatch[1].trim();
  }

  return null;
}

/**
 * Validate SQL query for security
 */
export function validateQuery(sql: string): { valid: boolean; error?: string } {
  const upperSql = sql.toUpperCase().trim();

  // Must start with SELECT
  if (!upperSql.startsWith('SELECT')) {
    return {
      valid: false,
      error: 'Solo se permiten consultas SELECT',
    };
  }

  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Use word boundary check to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperSql)) {
      return {
        valid: false,
        error: `Operación no permitida: ${keyword}`,
      };
    }
  }

  // Check for multiple statements (semicolon followed by another statement)
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  if (statements.length > 1) {
    return {
      valid: false,
      error: 'Solo se permite una consulta a la vez',
    };
  }

  // Check for subqueries that might modify data (extra paranoid)
  if (/\(\s*(INSERT|UPDATE|DELETE|DROP)/i.test(sql)) {
    return {
      valid: false,
      error: 'Subconsultas de modificación no permitidas',
    };
  }

  return { valid: true };
}

/**
 * Add LIMIT clause if not present
 */
export function ensureLimit(sql: string, maxLimit: number = MAX_LIMIT): string {
  const upperSql = sql.toUpperCase();

  // Check if LIMIT already exists
  if (/\bLIMIT\s+\d+/i.test(sql)) {
    // Extract current limit and enforce max
    const match = sql.match(/\bLIMIT\s+(\d+)/i);
    if (match) {
      const currentLimit = parseInt(match[1], 10);
      if (currentLimit > maxLimit) {
        return sql.replace(/\bLIMIT\s+\d+/i, `LIMIT ${maxLimit}`);
      }
    }
    return sql;
  }

  // Add LIMIT at the end (before any trailing semicolon)
  const trimmedSql = sql.trim().replace(/;+$/, '');
  return `${trimmedSql} LIMIT ${maxLimit}`;
}

/**
 * Execute a validated SELECT query
 */
export async function executeQuery(sql: string): Promise<QueryResult> {
  try {
    // Validate the query
    const validation = validateQuery(sql);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        query: sql,
      };
    }

    // Ensure LIMIT is present
    const safeSql = ensureLimit(sql);

    // Execute with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

    try {
      const result = await query(safeSql);

      clearTimeout(timeoutId);

      return {
        success: true,
        data: result.rows || [],
        rowCount: result.rowCount || result.rows?.length || 0,
        query: safeSql,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    // Clean up error message for user
    let errorMessage = error.message || 'Error desconocido al ejecutar la consulta';

    // PostgreSQL error codes
    if (error.code === '42P01') {
      errorMessage = 'Tabla no encontrada. Verifica el nombre de la tabla.';
    } else if (error.code === '42703') {
      errorMessage = 'Columna no encontrada. Verifica el nombre de la columna.';
    } else if (error.code === '42601') {
      errorMessage = 'Error de sintaxis SQL. Verifica la consulta.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'No se puede conectar a la base de datos.';
    }

    return {
      success: false,
      error: errorMessage,
      query: sql,
    };
  }
}

/**
 * Format a column name to be more readable
 */
function formatColumnName(key: string): string {
  // Map common column names to Spanish labels
  const labelMap: Record<string, string> = {
    id: 'ID',
    cliente: 'Cliente',
    cliente_id: 'Cliente ID',
    nombre: 'Nombre',
    nombre_fantasia: 'Nombre Fantasía',
    fecha: 'Fecha',
    fecha_fin: 'Fecha Fin',
    fecha_emision: 'Fecha Emisión',
    fecha_vencimiento: 'Vencimiento',
    tipo: 'Tipo',
    tipo_servicio: 'Tipo de Servicio',
    estado: 'Estado',
    tecnico: 'Técnico',
    diagnostico: 'Diagnóstico',
    descripcion: 'Descripción',
    monto_servicio: 'Monto Servicio',
    monto_insumos: 'Monto Insumos',
    total: 'Total',
    subtotal: 'Subtotal',
    saldo_pendiente: 'Saldo Pendiente',
    nro_factura: 'Nº Factura',
    cuit: 'CUIT',
    email: 'Email',
    telefono: 'Teléfono',
    direccion: 'Dirección',
    marca: 'Marca',
    modelo: 'Modelo',
    numero_serie: 'Nº Serie',
    stock: 'Stock',
    precio_venta: 'Precio Venta',
    precio_costo: 'Precio Costo',
    total_clientes: 'Total Clientes',
    total_facturas: 'Total Facturas',
    total_servicios: 'Total Servicios',
    count: 'Cantidad',
  };

  return labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  // Format dates
  if (value instanceof Date) {
    return value.toLocaleDateString('es-AR');
  }

  // Check if string is a date format
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-AR');
    }
  }

  // Format currency/numbers
  if (typeof value === 'number') {
    // If it looks like money (has decimals or is large)
    if (value % 1 !== 0 || value > 100) {
      return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('es-AR');
  }

  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  // Truncate long strings
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 97) + '...';
  }

  return String(value);
}

/**
 * Format query results for display - conversational style
 */
export function formatResultsForDisplay(result: QueryResult): string {
  if (!result.success) {
    return `No pude obtener esa información. ${result.error}`;
  }

  if (!result.data || result.data.length === 0) {
    return 'No encontré resultados para tu consulta.';
  }

  const count = result.rowCount || result.data.length;

  // For single value results (COUNT, SUM, etc.)
  if (result.data.length === 1 && Object.keys(result.data[0]).length === 1) {
    const key = Object.keys(result.data[0])[0];
    const value = result.data[0][key];
    const formattedValue = typeof value === 'number' ? value.toLocaleString('es-AR') : value;

    // Make it conversational
    const label = formatColumnName(key).toLowerCase();
    if (label.includes('total') || label.includes('cantidad') || label.includes('count')) {
      return `Tenés **${formattedValue}** en total.`;
    }
    return `El resultado es: **${formattedValue}**`;
  }

  // For single result, format as natural text
  if (result.data.length === 1) {
    const row = result.data[0];
    return formatSingleResultConversational(row);
  }

  // For small result sets (2-10), show as a list with context
  if (result.data.length <= 10) {
    const intro = count === 2 ? 'Encontré estos 2 resultados:' : `Encontré ${count} resultados:`;

    const items = result.data.map((row, i) => {
      return formatListItem(row, i + 1);
    });

    return `${intro}\n\n${items.join('\n\n')}`;
  }

  // For larger result sets
  const items = result.data.slice(0, 10).map((row, i) => {
    return formatListItem(row, i + 1);
  });

  return `Encontré ${count} resultados. Te muestro los primeros 10:\n\n${items.join('\n\n')}`;
}

/**
 * Format a single result in conversational style
 */
function formatSingleResultConversational(row: Record<string, any>): string {
  const entries = Object.entries(row).filter(([k, v]) => v !== null && v !== undefined && v !== '' && k !== 'id');

  // Check if this is a cliente record (has nombre but no fecha/tipo_servicio)
  const isClienteRecord = 'nombre' in row && !('fecha' in row) && !('tipo_servicio' in row) && ('localidad' in row || 'email' in row || 'telefono' in row);

  // Format cliente record specially
  if (isClienteRecord) {
    return formatClienteResult(row);
  }

  // Build a natural sentence for other records
  let parts: string[] = [];

  // Main identifier
  if (row.cliente) {
    parts.push(`El cliente es **${row.cliente}**`);
  } else if (row.nombre) {
    parts.push(`**${row.nombre}**`);
  } else if (row.nro_factura) {
    parts.push(`Factura **${row.nro_factura}**`);
  }

  // Date
  if (row.fecha) {
    parts.push(`fecha: **${formatValue(row.fecha)}**`);
  } else if (row.fecha_emision) {
    parts.push(`emitida el **${formatValue(row.fecha_emision)}**`);
  }

  // Type/Service
  if (row.tipo_servicio) {
    parts.push(`tipo: **${row.tipo_servicio}**`);
  } else if (row.tipo) {
    parts.push(`tipo: **${row.tipo}**`);
  }

  // Status
  if (row.estado) {
    parts.push(`estado: **${row.estado}**`);
  }

  // Technician
  if (row.tecnico) {
    parts.push(`técnico: **${row.tecnico}**`);
  }

  // Diagnosis/Description
  if (row.diagnostico) {
    parts.push(`diagnóstico: "${row.diagnostico}"`);
  } else if (row.descripcion) {
    parts.push(`descripción: "${row.descripcion}"`);
  }

  // Amount
  if (row.monto_servicio !== undefined && row.monto_servicio !== null) {
    parts.push(`monto: **${formatValue(row.monto_servicio)}**`);
  } else if (row.total !== undefined && row.total !== null) {
    parts.push(`total: **${formatValue(row.total)}**`);
  }

  // If we couldn't build a natural sentence, fall back to listing
  if (parts.length === 0) {
    const lines = entries.slice(0, 8).map(([k, v]) => `• ${formatColumnName(k)}: ${formatValue(v)}`);
    return lines.join('\n');
  }

  return parts.join(', ') + '.';
}

/**
 * Format a cliente record with all relevant info
 */
function formatClienteResult(row: Record<string, any>): string {
  let lines: string[] = [];

  // Name with client number
  if (row.nombre) {
    const clientNum = row.identificador_unico ? ` (Cliente #${row.identificador_unico})` : '';
    lines.push(`**${row.nombre}**${clientNum}`);
  }
  if (row.nombre_fantasia && row.nombre_fantasia !== row.nombre) {
    lines.push(`Nombre comercial: ${row.nombre_fantasia}`);
  }

  // Contact info
  if (row.telefono) {
    const tel = Array.isArray(row.telefono) ? row.telefono.join(', ') : row.telefono;
    if (tel) lines.push(`📞 ${tel}`);
  }
  if (row.email) {
    const email = Array.isArray(row.email) ? row.email.join(', ') : row.email;
    if (email) lines.push(`📧 ${email}`);
  }

  // Location
  const ubicacion: string[] = [];
  if (row.direccion) ubicacion.push(row.direccion);
  if (row.localidad) ubicacion.push(row.localidad);
  if (row.provincia) ubicacion.push(row.provincia);
  if (ubicacion.length > 0) {
    lines.push(`📍 ${ubicacion.join(', ')}`);
  }

  // Status and category
  if (row.estado) {
    lines.push(`Estado: **${row.estado}**`);
  }
  if (row.categoria) {
    lines.push(`Categoría: ${row.categoria}`);
  }
  if (row.cuit) {
    lines.push(`CUIT: ${row.cuit}`);
  }

  return lines.join('\n');
}

/**
 * Format a list item
 */
function formatListItem(row: Record<string, any>, index: number): string {
  // Check for equipment ranking (marca/modelo with count)
  if (row.marca && row.modelo && row.cantidad_servicios !== undefined) {
    return `**${index}.** ${row.marca} ${row.modelo} - **${row.cantidad_servicios}** servicios`;
  }

  const mainField = row.nombre || row.cliente || row.nro_factura;
  const fecha = row.fecha || row.fecha_emision;
  const estado = row.estado;
  const monto = row.total || row.monto_servicio || row.monto;

  let line = `**${index}.** `;

  if (mainField) {
    line += `${mainField}`;
  }

  if (fecha) {
    line += ` - ${formatValue(fecha)}`;
  }

  if (estado) {
    line += ` (${estado})`;
  }

  if (monto !== undefined && monto !== null) {
    line += ` - ${formatValue(monto)}`;
  }

  // Fallback: if line is still just the index, show all fields
  if (line === `**${index}.** `) {
    const entries = Object.entries(row).filter(([k, v]) => v !== null && v !== undefined && v !== '');
    const parts = entries.slice(0, 4).map(([k, v]) => `${formatColumnName(k)}: ${formatValue(v)}`);
    line += parts.join(' | ');
  }

  return line;
}
