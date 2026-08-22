// Tipos y helpers puros para préstamos y garantías (Servicio Técnico).

export type TipoRegistro = 'prestamo' | 'garantia';
export type EstadoCabecera = 'abierto' | 'devuelto';
export type EstadoItem = 'afuera' | 'devuelto';
export type TipoItem = 'equipo' | 'producto';

export interface RenglonInput {
  tipo_item: TipoItem;
  equipo_id?: string | null;
  equipo_unidad_id?: string | null;
  producto_id?: string | null;
  numero_serie?: string | null;
  descripcion: string;
  cantidad: number;
}

export interface PrestamoGarantiaItemRow {
  id: string;
  tipo_item: TipoItem;
  equipo_id: string | null;
  equipo_unidad_id: string | null;
  producto_id: string | null;
  numero_serie: string | null;
  descripcion: string;
  cantidad: number;
  estado: EstadoItem;
  fecha_retorno: string | null;
}

export interface PrestamoGarantia {
  id: string;
  org_id: string;
  tipo: TipoRegistro;
  cliente_id: string | null;
  cliente: { id: string; nombre: string | null; nombre_fantasia: string | null } | null;
  codigo: string | null;
  estado: EstadoCabecera;
  fecha_salida: string | null;
  fecha_retorno: string | null;
  transporte_envio: string | null;
  transporte_retorno: string | null;
  remito_salida: string | null;
  remito_entrada: string | null;
  numero_orden: string | null;
  observaciones: string | null;
  created_at: string;
  items: PrestamoGarantiaItemRow[];
}

/** Estado que toma una unidad serializada al salir, según el tipo de registro. */
export function estadoInventarioParaTipo(tipo: TipoRegistro): 'prestamo' | 'garantia' {
  return tipo === 'prestamo' ? 'prestamo' : 'garantia';
}

/** La cabecera está 'devuelto' sólo si TODOS los renglones volvieron. */
export function estadoCabeceraDesdeItems(items: Array<{ estado: EstadoItem }>): EstadoCabecera {
  if (items.length === 0) return 'abierto';
  return items.every((i) => i.estado === 'devuelto') ? 'devuelto' : 'abierto';
}

/** Valida el payload de creación. Devuelve un mensaje de error o null si es válido. */
export function validarPayloadCreacion(tipo: unknown, renglones: unknown): string | null {
  if (tipo !== 'prestamo' && tipo !== 'garantia') return 'tipo inválido';
  if (!Array.isArray(renglones) || renglones.length === 0) return 'se requiere al menos un renglón';
  for (const r of renglones as Array<Partial<RenglonInput>>) {
    if (!r || typeof r.descripcion !== 'string' || !r.descripcion.trim()) return 'cada renglón requiere descripción';
    if (r.tipo_item !== 'equipo' && r.tipo_item !== 'producto') return 'tipo_item inválido';
  }
  return null;
}
