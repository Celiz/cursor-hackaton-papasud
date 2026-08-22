// Logistics System Types

export interface Transporte {
  id: string;
  nombre: string;
  tipo: 'correo' | 'courier' | 'transporte_privado' | 'retiro_local' | 'retiro_deposito';
  contacto?: string;
  telefono?: string;
  email?: string;
  cuit?: string;
  api_key?: string;
  api_endpoint?: string;
  tiempo_estimado_dias?: number;
  costo_base?: number;
  activo: boolean;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface Envio {
  id: string;
  numero_seguimiento: string;
  pedido_id?: string;
  orden_compra_id?: string;
  cliente_id: string;
  cliente_nombre?: string;
  transporte_id: string;
  transporte_nombre?: string;
  estado: EstadoEnvio;
  tipo_envio: TipoEnvio;
  direccion_origen: string;
  direccion_destino: string;
  fecha_despacho: string;
  fecha_entrega_estimada?: string;
  fecha_entrega_real?: string;
  peso?: number;
  dimensiones?: string;
  costo_envio?: number;
  tracking_externo_id?: string;
  url_seguimiento?: string;
  observaciones?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type EstadoEnvio =
  | 'pendiente'
  | 'preparando'
  | 'listo_para_enviar'
  | 'en_transito'
  | 'en_distribucion'
  | 'entregado'
  | 'cancelado'
  | 'devuelto';

export type TipoEnvio = 'nacional' | 'internacional' | 'retiro_local' | 'retiro_deposito';

export interface EnvioItem {
  id: string;
  envio_id: string;
  producto_id?: string;
  producto_nombre?: string;
  equipo_id?: string;
  equipo_nombre?: string;
  descripcion: string;
  cantidad_pedida: number;
  cantidad_enviada: number;
  cantidad_recibida?: number;
  diferencia: boolean; // Generated column
  motivo_diferencia?: string;
  observaciones?: string;
  created_at: string;
}

export interface Comentario {
  id: string;
  entidad_tipo: EntidadTipo;
  entidad_id: string;
  usuario_id?: string;
  usuario_nombre: string;
  comentario: string;
  tipo: TipoComentario;
  es_importante: boolean;
  requiere_accion: boolean;
  visible_cliente: boolean;
  adjuntos?: Adjunto[];
  created_at: string;
}

export type EntidadTipo =
  | 'envio'
  | 'pedido'
  | 'orden_compra'
  | 'servicio'
  | 'factura'
  | 'presupuesto'
  | 'producto'
  | 'equipo'
  | 'cliente'
  | 'otro';

export type TipoComentario = 'nota' | 'alerta' | 'cambio_estado' | 'cliente' | 'interno' | 'publico';

export interface Adjunto {
  nombre: string;
  url: string;
  tipo: string;
  tamanio: number;
}

export interface HistorialEstado {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  estado_anterior?: string;
  estado_nuevo: string;
  usuario_id?: string;
  usuario_nombre?: string;
  motivo?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  entidad_tipo?: string;
  entidad_id?: string;
  usuario_id?: string;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  leida: boolean;
  fecha_leida?: string;
  accion_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type TipoNotificacion =
  | 'diferencia_cantidad'
  | 'retraso_entrega'
  | 'cambio_estado'
  | 'comentario_nuevo'
  | 'alerta_stock'
  | 'pedido_recibido'
  | 'factura_generada'
  | 'pago_recibido'
  | 'sistema'
  | 'otro';

export interface Alerta {
  id: string;
  tipo: string;
  condicion: string;
  valor_umbral?: number;
  entidad_tipo?: string;
  entidad_id?: string;
  activa: boolean;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  acciones?: string[];
  ultima_ejecucion?: string;
  proxima_ejecucion?: string;
  created_at: string;
  updated_at: string;
}

export interface Actividad {
  id: string;
  tipo: TipoActividad;
  entidad_tipo: string;
  entidad_id: string;
  usuario_id?: string;
  usuario_nombre?: string;
  titulo: string;
  descripcion?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type TipoActividad =
  | 'creacion'
  | 'actualizacion'
  | 'eliminacion'
  | 'cambio_estado'
  | 'comentario'
  | 'documento_adjunto'
  | 'envio_email'
  | 'pago'
  | 'otro';

export interface TrackingExterno {
  id: string;
  envio_id: string;
  proveedor: 'oca' | 'correo_argentino' | 'andreani' | 'dhl' | 'fedex' | 'otro';
  tracking_number: string;
  estado_externo?: string;
  ultima_actualizacion?: string;
  eventos?: TrackingEvento[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvento {
  fecha: string;
  ubicacion?: string;
  estado: string;
  descripcion: string;
}

export interface DocumentoAdjunto {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  nombre: string;
  tipo_documento: TipoDocumento;
  tipo_archivo: string;
  tamanio: number;
  url: string;
  storage_path?: string;
  subido_por_id?: string;
  subido_por_nombre?: string;
  descripcion?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type TipoDocumento =
  | 'remito'
  | 'factura'
  | 'comprobante'
  | 'foto'
  | 'contrato'
  | 'certificado'
  | 'otro';

// View Types (generated from database views)

export interface EnvioCompleto extends Envio {
  items: EnvioItem[];
  comentarios: Comentario[];
  historial: HistorialEstado[];
  tracking_externo?: TrackingExterno;
}

export interface EnvioConAlertas extends Envio {
  tiene_diferencias: boolean;
  items_con_diferencias: number;
  comentarios_pendientes: number;
  dias_desde_despacho: number;
  dias_retraso?: number;
}

export interface ActividadReciente extends Actividad {
  entidad_nombre?: string;
}

// Form Types

export interface CreateEnvioInput {
  numero_seguimiento?: string;
  pedido_id?: string;
  orden_compra_id?: string;
  cliente_id: string;
  transporte_id: string;
  tipo_envio: TipoEnvio;
  direccion_origen: string;
  direccion_destino: string;
  fecha_despacho: string;
  fecha_entrega_estimada?: string;
  peso?: number;
  dimensiones?: string;
  costo_envio?: number;
  observaciones?: string;
  items?: CreateEnvioItemInput[];
}

export interface CreateEnvioItemInput {
  producto_id?: string;
  equipo_id?: string;
  descripcion: string;
  cantidad_pedida: number;
  cantidad_enviada: number;
  observaciones?: string;
}

export interface UpdateEnvioInput {
  estado?: EstadoEnvio;
  transporte_id?: string;
  direccion_origen?: string;
  direccion_destino?: string;
  fecha_despacho?: string;
  fecha_entrega_estimada?: string;
  fecha_entrega_real?: string;
  peso?: number;
  dimensiones?: string;
  costo_envio?: number;
  url_seguimiento?: string;
  observaciones?: string;
}

export interface CreateComentarioInput {
  entidad_tipo: EntidadTipo;
  entidad_id: string;
  comentario: string;
  tipo?: TipoComentario;
  es_importante?: boolean;
  requiere_accion?: boolean;
  visible_cliente?: boolean;
  adjuntos?: Adjunto[];
}

// Statistics Types

export interface EnviosStatistics {
  total: number;
  porEstado: Record<EstadoEnvio, number>;
  enTransito: number;
  entregadosHoy: number;
  conDiferencias: number;
  conRetrasos: number;
  costoTotalEnvios: number;
  tiempoPromedioEntrega: number;
}

export interface TransporteStatistics {
  transporte_id: string;
  transporte_nombre: string;
  total_envios: number;
  envios_entregados: number;
  tasa_exito: number;
  tiempo_promedio: number;
  costo_promedio: number;
  diferencias_encontradas: number;
}
