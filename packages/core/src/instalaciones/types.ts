// Tipos compartidos para el módulo de instalaciones.

export type InstalacionEstado =
  | 'planificada'
  | 'materiales_pedidos'
  | 'materiales_recibidos'
  | 'programada'
  | 'en_progreso'
  | 'pausada'
  | 'completada'
  | 'cancelada';

export type FechaEstado = 'a_confirmar' | 'aproximada' | 'confirmada';

export type TipoItem =
  | 'equipo_principal'
  | 'equipo_adicional'
  | 'insumo'
  | 'material'
  | 'herramienta';

export type EstadoCompra =
  | 'en_stock'
  | 'por_pedir'
  | 'pedido'
  | 'en_camino'
  | 'recibido';

export type EstadoReserva =
  | 'pendiente'
  | 'reservado'
  | 'entregado'
  | 'utilizado'
  | 'devuelto';

export interface InstalacionItem {
  id: string;
  instalacion_id: string;
  tipo_item: TipoItem;

  // Para items reales:
  equipo_unidad_id?: string | null;
  producto_id?: string | null;

  // Para placeholders:
  es_placeholder: boolean;
  placeholder_descripcion?: string | null;

  descripcion: string;
  cantidad_requerida: number;
  cantidad_reservada: number;
  cantidad_utilizada: number;

  estado_compra: EstadoCompra;
  estado_reserva: EstadoReserva;

  fecha_pedido?: string | null;
  fecha_estimada_llegada?: string | null;
  fecha_recibido?: string | null;
  fecha_reserva?: string | null;
  fecha_entrega?: string | null;

  precio_unitario?: number | null;
  subtotal?: number | null;
  observaciones?: string | null;

  // Enrichment opcional (join con equipos/equipos_unidades/productos):
  numero_serie?: string | null;
  codigo?: string | null;
  equipo_nombre?: string | null;
}

export interface InstalacionItemInput {
  tipo_item: TipoItem;
  equipo_unidad_id?: string | null;
  producto_id?: string | null;
  es_placeholder: boolean;
  placeholder_descripcion?: string | null;
  descripcion: string;
  cantidad_requerida: number;
  estado_compra?: EstadoCompra;
}

export interface InstalacionComentario {
  id: string;
  instalacion_id: string;
  autor_id: string;
  autor_nombre?: string | null;
  texto: string;
  menciones: Array<{ persona_id: string; nombre: string }>;
  created_at: string;
}

export interface InstalacionComentarioInput {
  texto: string;
  menciones: Array<{ persona_id: string; nombre: string }>;
}

export interface InstalacionItemHistorial {
  id: string;
  item_id: string;
  instalacion_id: string;
  estado_anterior: EstadoCompra;
  estado_nuevo: EstadoCompra;
  nota?: string | null;
  email_thread_id?: string | null;
  email_subject?: string | null;
  email_account_id?: string | null;
  autor_id: string;
  autor_nombre?: string | null;
  created_at: string;
}
