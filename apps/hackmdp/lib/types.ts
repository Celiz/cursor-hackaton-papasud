export interface Tag {
  id: string;
  nombre: string;
  color: string;
  created_at: string;
}

export interface Cliente {
  id: string; // UUID
  nombre: string;
  cuit: string;
  email: string[];
  telefono: string[];
  direccion: string;
  estado: string;
  created_at: string;
  identificador_unico?: string;
  identificador_legacy?: string; // ID del sistema anterior (Supabase) ej: CLI-1006
  nombre_fantasia?: string;
  saldo_a_favor?: number; // Saldo a favor del cliente en cuenta corriente LEGAL (facturas A, B, C)
  saldo_a_favor_ivr?: number; // Saldo a favor del cliente en cuenta corriente INTERNA (IVR)
  condicion_iva?: 'responsable_inscripto' | 'monotributista' | 'exento' | 'consumidor_final';
  tipo_documento?: 'CUIT' | 'CUIL' | 'DNI';
  tipo?: string; // 'particular' | 'empresa' (modelo nuevo Uno)
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
  datos_contacto?: {
    first?: string;
    second?: string;
    email?: string[];
    telefono?: string[];
  };
  factor_precio?: number; // Multiplicador de precio: 1.0 = lista, 0.9 = -10%, 1.15 = +15%
  score?: number; // Scoring de lead/cliente
  score_detalle?: Record<string, number>; // Detalle del score por regla
  score_updated_at?: string;
  division?: string;
  transporte_id?: string; // Transporte preferido para envíos
  transporte?: Transporte; // Relación con transporte (populated)
  tags?: Tag[]; // Tags/etiquetas del cliente
  es_legacy?: boolean; // Duplicado de importación: oculto de selectores
}

export interface Equipo {
  id: string;
  marca: string;
  modelo: string;
  tipo: string;
  estado: string;
  created_at: string;
  updated_at?: string;

  // Información básica extendida
  codigo?: string;
  numero_serie?: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  subtipo?: string; // subtipo en cascada bajo la categoría (=tipo). Columna equipos.subtipo
  producto_id?: string;

  // Condición del equipo (nuevo/usado/demo/reacondicionado/outlet)
  condicion?: 'nuevo' | 'usado' | 'demo' | 'reacondicionado' | 'outlet';

  // Especificaciones técnicas (JSONB flexible)
  especificaciones?: Record<string, string | number | boolean> | string[];

  // Documentación y material comercial
  manual_url?: string;
  ficha_tecnica_url?: string;
  imagen_url?: string;
  folleto_url?: string;
  imagenes_adicionales?: string[];
  descripcion_comercial?: string;
  // Folleto vinculado desde biblioteca (categoría Folletos), expuesto por /api/equipos.
  folleto_recurso?: { id: string; titulo: string; archivo_url: string } | null;

  // Precio de lista
  precio_lista?: number;
  precio_lista_moneda?: 'USD' | 'ARS';

  // Alícuota de IVA del equipo en % (default 10.5 — equipo médico/lab nuevo).
  // Se usa como IVA por defecto al armar presupuestos; editable por presupuesto.
  iva?: number;

  // Precio de costo
  precio_costo?: number;
  precio_costo_moneda?: 'USD' | 'ARS';

  // Ubicación
  ubicacion_tipo?: string; // 'deposito', 'cliente', 'taller', 'transito'
  ubicacion_id?: string;
  ubicacion_detalle?: string;

  // Cliente asignado
  cliente_id?: string;
  fecha_asignacion?: string;

  // Garantía y compra
  fecha_compra?: string;
  proveedor_id?: string;
  precio_compra?: number;
  fecha_vencimiento_garantia?: string;

  // Mantenimiento
  requiere_mantenimiento?: boolean;
  frecuencia_mantenimiento_dias?: number;
  ultimo_mantenimiento?: string;
  proximo_mantenimiento?: string;

  // Control
  activo?: boolean;
  notas?: string;
  tags?: string[];

  // Metadata
  created_by?: string;
  updated_by?: string;

  // Campos calculados (de joins)
  disponible?: boolean;
  unidades_count?: number;
}

export interface EquipoUnidad {
  id: string;
  equipo_id: string;
  laboratorio_id?: string | null;
  numero_serie: string;
  fecha_compra?: string | null;
  estado_general?: string | null;
  comentarios?: unknown[] | null;
  created_at?: string | null;
  mantenimiento_config?: Record<string, unknown> | null;
  cliente_id?: string | null;
  equipos?: {
    id: string;
    marca: string;
    modelo: string;
    tipo: string;
  } | null;
  clientes?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: string;
    cuit?: string;
  } | null;
  laboratorios?: {
    id: string;
    nombre: string;
    direccion?: string;
    localidad?: string;
  } | null;
  notas?: string | null;
  codigo?: string | null;
  ubicacion_tipo?: string;
}

export interface NotaCredito {
  id: string;
  factura_id: string;
  motivo?: string;
  monto: number;
  comentarios?: string;
  created_at: string;
}

export interface Pago {
  id: string;
  factura_id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago?: string;
  recibo_url?: string;
  comentarios?: { texto: string; fecha: string }[];
  referencia?: string;
  notas?: string;
  created_at: string;
  updated_at?: string;
}

export interface FacturaItem {
  id: string;
  factura_id: string;
  servicio_id?: string;
  producto_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
}

export interface Factura {
  id: string;
  cliente_id: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  total: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'parcial' | 'anulada';
  tipo_factura: 'A' | 'B' | 'C' | 'IVR';
  tipo_operacion?: 'venta' | 'servicio' | 'nota_credito';
  comentarios?: { texto: string; fecha: string }[];
  created_at: string;

  // Campos financieros
  iva?: number;
  subtotal?: number;
  total_pagado?: number;
  saldo_pendiente?: number; // Generado automáticamente
  forma_pago?: string;
  nro_factura?: string;

  // Campos AFIP
  punto_venta?: string;
  cae?: string;
  cae_vto?: string;
  afip_resultado?: Record<string, any>;
  afip_codigo_autorizacion?: string;
  afip_fecha_autorizacion?: string;
  afip_qr_url?: string;
  afip_status?: 'pendiente' | 'autorizada' | 'rechazada';

  // Campos adicionales
  detalles?: Record<string, any>;
  numero?: string;
  total_cobrado?: number;

  // Relaciones (cuando se hace join)
  clientes?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: string;
    identificador_legacy?: string;
    cuit?: string;
    email?: string[];
    telefono?: string[];
    condicion_iva?: string;
  };
  pagos?: Pago[];
  notas_credito?: NotaCredito[];
  facturas_items?: FacturaItem[];

  // Campos calculados (legacy - ahora son campos reales)
  total_notas_credito?: number;
}

export interface Pedido {
  id: string;
  numero?: string;
  cliente_id?: string;
  proveedor_id?: string;
  presupuesto_id?: string;
  estado: string;
  fecha_pedido?: string;
  fecha_requerida?: string;
  fecha_promesa?: string;
  fecha_estimada_entrega?: string;
  fecha_entrega_real?: string;
  tipo_entrega?: 'envio' | 'retiro_local' | 'retiro_deposito';
  direccion_entrega?: string;
  observaciones?: string;
  notas_internas?: string;
  notas_produccion?: string;
  estado_produccion?: string;
  prioridad?: 'urgente' | 'alta' | 'normal' | 'baja';
  subtotal?: number;
  descuento?: number;
  iva?: number;
  total?: number;
  facturado?: boolean;
  factura_id?: string;
  preparacion_id?: string;
  convertido_a_factura?: boolean;
  created_at: string;
  updated_at?: string;
  // Relaciones
  cliente?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    cuit?: string;
  };
  clientes?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    cuit?: string;
  };
  items?: Array<any>;
  pedidos_items?: Array<{
    id: string;
    producto_id?: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    estado?: string;
    producto?: {
      id: string;
      codigo?: string;
      nombre: string;
    };
  }>;
  // Transporte preferido del cliente (populated en listados)
  transporte_cliente?: {
    id: string;
    nombre: string;
    tipo?: string;
    telefono?: string;
  };
  // Enriched lifecycle fields (from JOINs in pedidos-ventas API)
  preparacion_numero?: string;
  preparacion_estado?: string;
  prep_fecha_listo?: string;
  prep_total_items?: number;
  prep_items_listos?: number;
  entrega_id?: string;
  entrega_estado?: string;
  entrega_transportista?: string;
  entrega_tracking?: string;
  entrega_fecha_entrega?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  unidad_medida: string;
  stock_actual?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  precio_unitario?: number;
  // Costos y márgenes
  precio_costo?: number;
  precio_venta?: number;
  moneda?: 'ARS' | 'USD';
  moneda_compra?: 'ARS' | 'USD';
  ganancia?: number;
  iva_alicuota?: number;
  precio_venta_modo?: 'calculado' | 'fijo';
  margen_porcentaje?: number;
  margen_pesos?: number;
  proveedor_habitual_id?: string;
  ultima_compra_fecha?: string;
  ultima_compra_precio?: number;
  // Campos base
  ubicacion?: string;
  lote?: string;
  fecha_vencimiento?: string;
  fabricante?: string;
  temperatura_almacenamiento?: string;
  // Campos unificados (migración 500)
  descripcion?: string;
  descripcion_corta?: string;
  slug?: string;
  imagenes?: string[];
  imagen_url?: string;
  deleted_at?: string;
  categoria_id?: string;
  marca_id?: string;
  // Campos de productos_web (e-commerce)
  precio_oferta?: number;
  caracteristicas?: Record<string, string>;
  peso_gramos?: number;
  dimensiones?: { largo: number; ancho: number; alto: number };
  destacado?: boolean;
  // Relaciones (populated via JOIN)
  categoria_nombre?: string;
  categoria_slug?: string;
  marca_nombre?: string;
  marca_slug?: string;
  marca_logo?: string;
  proveedor_nombre?: string;
  proveedor?: string;
  precio_compra?: number;
  created_at: string;
  updated_at?: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  cuit: string;
  email: string[];
  telefono: string[];
  direccion?: string;
  localidad?: string;
  provincia?: string;
  codigo_postal?: string;
  condiciones_pago?: string;
  moneda?: string;
  cuenta_bancaria?: string;
  cbu?: string;
  alias_cbu?: string;
  notas?: string;
  estado?: 'activo' | 'inactivo';
  dias_aviso_vencimiento?: number | null;
  dias_antiguedad_aviso?: number | null;
  saldo_pendiente?: number;
  created_at: string;
  updated_at?: string;
}

export interface CatalogoItem {
  id: string;
  org_id: string;
  proveedor_id: string;
  codigo_proveedor?: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  imagenes?: string[];
  url_referencia?: string;
  unidad?: string;
  activo: boolean;
  producto_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  proveedor_nombre?: string;
  precio_costo?: number;
  precio_neto?: number;
  markup_default?: number;
}

// Orden de compra a proveedor
export interface OrdenCompra {
  id: string;
  numero?: string;
  proveedor_id: string;
  proveedor?: Proveedor;
  fecha: string;
  fecha_entrega_estimada?: string;
  estado: 'pendiente' | 'borrador' | 'enviada' | 'parcial' | 'recibida' | 'cancelada';
  subtotal?: number;
  impuestos?: number;
  total?: number;
  comentarios?: string;
  items?: OrdenCompraItem[];
  created_at: string;
  updated_at?: string;
}

export interface OrdenCompraItem {
  id: string;
  orden_id: string;
  producto_id?: string;
  producto?: Producto;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
  cantidad_recibida?: number;
  lote?: string;
  vencimiento?: string;
}

// Remito de compra (factura de proveedor)
export interface RemitoCompra {
  id: string;
  numero: string;
  proveedor_id: string;
  proveedor?: Proveedor;
  fecha: string;
  fecha_vencimiento?: string;
  tipo_comprobante?: 'factura_a' | 'factura_b' | 'factura_c' | 'remito' | 'nota_credito' | 'nota_debito';
  estado: 'pendiente' | 'parcial' | 'pagada' | 'cancelada';
  subtotal?: number;
  iva?: number;
  otros_impuestos?: number;
  total: number;
  saldo_pendiente?: number;
  orden_compra_id?: string;
  orden_compra?: OrdenCompra;
  comentarios?: string;
  items?: RemitoCompraItem[];
  pagos?: PagoProveedor[];
  created_at: string;
  updated_at?: string;
}

export interface RemitoCompraItem {
  id: string;
  remito_compra_id: string;
  producto_id?: string;
  producto?: Producto;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
  marca?: string;
  rubro?: string;
}

// Pago a proveedor
export interface PagoProveedor {
  id: string;
  remito_compra_id?: string;
  proveedor_id: string;
  fecha_pago: string;
  monto: number;
  metodo_pago?: string;
  referencia?: string;
  comentarios?: string;
  created_at: string;
}

// Cuenta corriente de proveedor (vista agregada)
export interface CuentaCorrienteProveedor {
  proveedor_id: string;
  nombre: string;
  cuit?: string;
  email?: string[];
  telefono?: string[];
  total_compras: number;
  total_pagado: number;
  saldo_pendiente: number;
  cantidad_remitos: number;
  cantidad_pendientes: number;
  total_pendiente: number;
  ultima_compra?: string;
  ultima_actividad: string;
  estado?: string;
  condiciones_pago?: string;
}

// Movimiento de cuenta corriente proveedor
export interface MovimientoProveedor {
  movimiento_id: string;
  fecha: string;
  tipo_movimiento: 'compra' | 'pago' | 'nota_credito' | 'nota_debito';
  descripcion: string;
  debito: number;
  credito: number;
  saldo_acumulado: number;
  referencia_id?: string;
  estado?: string;
}

export type Servicio = {
  id: string;
  fecha: string;
  fecha_ingreso?: string;
  fecha_estimada_entrega?: string;
  observaciones?: string;
  estado: string;
  estado_contable: string;
  tecnico: string;
  tecnico_id?: {
    name?: string;
  };
  diagnostico?: string;
  modo_de_contacto?: string;
  falla_declarada?: string;
  contacto?: string;
  garantia?: boolean;
  tipo_garantia?: string;
  detalle_privado?: string;
  insumos_utilizados?: string; // JSON string
  insumos_y_costos?: Array<{
    fecha?: string;
    codigo?: string;
    nombre?: string;
    cantidad?: number;
    producto_id?: number;
  }>; // Parsed version of insumos_utilizados
  tipo_service?: string;
  tipo_servicio?: string;
  accesorios_entrantes?: string;
  facturado?: boolean;
  factura_link?: string;
  precio?: number; // Mano de obra (labor cost)
  monto_servicio?: number; // @deprecated - use precio instead
  monto_insumos?: number; // @deprecated - supplies don't have individual prices in services
  numero_ticket?: string;
  equipo_modelo?: string;
  costo_total?: number;
  clientes?: any;
  created_at?: string;
  updated_at?: string;
  cliente_id: {
    id: string;
    identificador_unico?: string;
    nombre?: string;
    nombre_fantasia?: string;
    cuit?: string;
    datos_contacto: {
      nombre: string;
      second?: string;
      email?: string;
      telefono?: string;
    };
  } | null;
  equipo_id: {
    id: string;
    numero_serie: string;
    equipo_id: {
      id: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  } | null;
  equipo_unidad_id?: {
    numero_serie?: string;
    equipos?: {
      marca?: string;
      modelo?: string;
    };
  };
};

export interface ServicioConFactura extends Servicio {
  subtotal: number;
  iva: number;
  total: number;
}

export interface CuentaCorriente {
  cliente_id: string;
  nombre: string;
  nombre_fantasia?: string;
  identificador_unico?: string;
  cuit?: string;
  estado?: string;
  total_facturado: number;
  cantidad_facturas: number;
  total_pagado: number;
  cantidad_pagos: number;
  total_notas_credito: number;
  cantidad_nc: number;
  saldo_actual: number;
  total_vencido: number;
  cantidad_vencidas: number;
  total_pendiente: number;
  cantidad_pendientes: number;
  ultima_actividad: string;
  // Saldos a favor separados (legal vs IVR)
  saldo_a_favor_legal?: number;
  saldo_a_favor_ivr?: number;
  email?: string[];
  cliente_nombre?: string;
  saldo_pendiente?: number;
}

export interface MovimientoCuentaCorriente {
  cliente_id: string;
  movimiento_id: string;
  tipo_movimiento: 'factura' | 'pago' | 'nota_credito';
  fecha: string;
  descripcion: string;
  debito: number;
  credito: number;
  estado: string;
  created_at: string;
  cliente_nombre: string;
  cliente_nombre_fantasia?: string;
  cliente_identificador?: string;
  saldo_acumulado: number;
}

// Cuenta corriente IVR (operaciones internas)
export interface CuentaCorrienteIvr {
  cliente_id: string;
  nombre: string;
  nombre_fantasia?: string;
  identificador_unico?: string;
  identificador_legacy?: string; // ID del sistema anterior (Supabase) ej: CLI-1006
  cuit?: string;
  estado?: string;
  total_remitido: number;
  cantidad_ivr: number;
  total_cobrado: number;
  cantidad_cobros: number;
  saldo_actual: number;
  total_pendiente: number;
  cantidad_pendientes: number;
  // Desglose pendientes: vencido = fecha_vencimiento < hoy (deuda real),
  // no_vencido = sin fecha o vencimiento futuro (no es deuda aun)
  total_vencido?: number;
  cantidad_vencidas?: number;
  total_no_vencido?: number;
  cantidad_no_vencidas?: number;
  cantidad_cobrados: number;
  total_cobrado_full: number;
  ultima_actividad: string;
  // Saldos a favor separados (legal vs IVR)
  saldo_a_favor_legal?: number;
  saldo_a_favor_ivr?: number;
  total_notas_credito?: number;
  cantidad_notas_credito?: number;
}

export interface MovimientoIvr {
  cliente_id: string;
  movimiento_id: string;
  tipo_movimiento: 'ivr' | 'cobro' | 'nota_credito';
  fecha: string;
  descripcion: string;
  debito: number;
  credito: number;
  estado: string;
  created_at: string;
  cliente_nombre: string;
  cliente_nombre_fantasia?: string;
  cliente_identificador?: string;
  saldo_acumulado: number;
}

export interface PresupuestoItem {
  id: string;
  presupuesto_id: string;
  producto_id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
  // Campos enriquecidos con info de stock (solo en detalle)
  producto_codigo?: string;
  producto_nombre?: string;
  stock_disponible?: number;
  en_orden_compra?: number;
  pedido_item_id?: string; // Si ya fue incluido en un pedido
  catalogo_item_id?: string; // Si proviene de un item del catálogo de proveedores
}

export interface ComentarioInterno {
  fecha: string;
  usuario?: string;
  texto: string;
}

export interface Presupuesto {
  id: string;
  numero: string;
  cliente_id: string;
  titulo?: string;
  descripcion?: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  estado: 'borrador' | 'enviado' | 'visto' | 'aceptado' | 'aprobado' | 'rechazado' | 'vencido' | 'convertido';
  subtotal: number;
  descuento: number;
  impuestos: number;
  iva?: number;
  total: number;
  moneda?: 'ARS' | 'USD';
  cotizacion_usd?: number;
  tipo_cotizacion?: string;
  condiciones?: string;
  condiciones_pago?: string;
  notas?: string;
  notas_internas?: string;
  comentarios_internos?: ComentarioInterno[];
  observaciones?: string;
  terminos_condiciones?: string;
  validez_dias?: number;
  tiempo_entrega?: string;
  forma_pago?: string;
  created_at: string;
  updated_at: string;

  // Items del presupuesto (JSONB) - se puede acceder como items o lineas
  items: PresupuestoItem[];
  lineas?: PresupuestoItem[];
  presupuestos_items?: PresupuestoItem[];

  // Token para firma digital
  token_firma?: string;

  // Campos de firma digital
  firmado: boolean;
  firmado_at?: string;
  firmado_por?: string;
  firmado_ip?: string;
  firmado_user_agent?: string;
  firma_imagen?: string; // Base64 de la firma dibujada

  // Tracking de visualización
  visto_at?: string;
  visto_count: number;

  // Motivo de rechazo
  motivo_rechazo?: string;
  rechazado_at?: string;

  // Conversión a factura
  factura_id?: string;
  convertido_at?: string;

  // Campos legacy de tracking (para compatibilidad)
  plantilla_id?: string;
  oportunidad_id?: string;
  usuario_vendedor_id?: string;
  fecha_envio?: string;
  fecha_visto?: string;
  fecha_respuesta?: string;
  convertido_pedido?: boolean;
  pedido_id?: string;
  competidor_perdido?: string;
  margen_total?: number;
  costo_total?: number;

  // Relaciones
  clientes?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: string;
    cuit?: string;
    email?: string[];
    telefono?: string[];
    direccion?: string;
  };
  created_by?: string;
}

// ========================================
// PRESUPUESTOS DE EQUIPOS (Visual/Comercial)
// ========================================

export interface PresupuestoEquipoItem {
  id: string;
  presupuesto_equipo_id: string;
  producto_id?: string;
  equipo_id?: string;
  tipo: 'accesorio' | 'servicio' | 'insumo' | 'repuesto';
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje?: number;
  iva_porcentaje?: number;
  subtotal: number;
  // Moneda nativa del ítem (la del equipo). Un presupuesto puede mezclar USD y ARS.
  moneda?: 'ARS' | 'USD';
  es_opcional: boolean;
  incluido_en_precio: boolean;
  imagen_url?: string;
  especificaciones?: Record<string, any> | string[] | null;
  especificaciones_personalizada?: boolean;
  // Specs del catálogo del equipo de este item (para resolver/sembrar el editor).
  equipo_especificaciones?: Record<string, any> | string[] | null;
  equipo_categoria?: string | null;
  equipo?: {
    id: string;
    marca: string;
    modelo: string;
    tipo?: string;
  };
  created_at?: string;
}

export interface PresupuestoEquipo {
  id: string;
  numero: string;
  cliente_id?: string;
  equipo_id?: string;

  // Fechas
  fecha_emision: string;
  fecha_vencimiento?: string;
  validez_dias: number;

  // Estado
  estado: 'borrador' | 'enviado' | 'visto' | 'aceptado' | 'rechazado' | 'vencido';

  // Montos
  precio_base: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  subtotal: number;
  iva: number;
  total: number;

  // Moneda
  moneda: 'ARS' | 'USD';
  cotizacion_usd?: number;
  tipo_cotizacion?: 'oficial' | 'blue' | 'mep';
  mostrar_en_usd: boolean;

  // Condiciones comerciales
  forma_pago?: string;
  financiacion_cuotas?: number | null;
  interes_porcentaje?: number | null;
  tiempo_entrega?: string;
  garantia?: string;
  incluye_instalacion: boolean;
  incluye_capacitacion: boolean;
  incluye_iva?: boolean;
  lugar_entrega?: string;
  descuento?: number;
  firmado_por?: string;

  // Contenido visual/comercial
  titulo?: string;
  descripcion_comercial?: string;
  especificaciones_tecnicas?: string;
  especificaciones?: Record<string, string | number | boolean> | string[] | null;
  especificaciones_personalizada?: boolean;
  beneficios?: string;

  // Documentos adjuntos
  folleto_url?: string;
  imagen_principal_url?: string;
  imagenes_adicionales?: string[];
  ficha_tecnica_url?: string;

  // Notas
  observaciones?: string;
  notas_internas?: string;
  terminos_condiciones?: string;

  // Seguimiento
  fecha_envio?: string;
  fecha_visto?: string;
  fecha_respuesta?: string;
  motivo_rechazo?: string;
  competidor_perdido?: string;

  // Firma digital
  token_firma?: string;
  firmado: boolean;
  firmado_at?: string;
  fecha_firma?: string;
  firma_nombre?: string;
  firma_cargo?: string;
  firma_ip?: string;
  firma_imagen?: string;

  // Conversión
  convertido_pedido: boolean;
  pedido_id?: string;

  // Relaciones
  oportunidad_id?: string;
  usuario_vendedor_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // Relaciones pobladas
  cliente?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: string;
    cuit?: string;
    email?: string[];
    telefono?: string[];
  };
  equipo?: {
    id: string;
    marca: string;
    modelo: string;
    tipo?: string;
    descripcion?: string;
    imagen_url?: string;
    especificaciones?: Record<string, string | number | boolean>;
    folleto_url?: string;
  };
  items?: PresupuestoEquipoItem[];
}

// ========================================
// EQUIPOS Y COMODATOS
// ========================================

export interface EquipoContrato {
  id: string;
  equipo_unidad_id: string;
  cliente_id: string;
  tipo: 'comodato' | 'alquiler' | 'demo' | 'prestamo';
  fecha_inicio: string;
  fecha_fin?: string;
  duracion_meses?: number;
  renovacion_automatica: boolean;
  costo_mensual: number;
  costo_total: number;
  estado: 'borrador' | 'activo' | 'vencido' | 'finalizado' | 'cancelado';
  contrato_url?: string;
  contrato_firmado_url?: string;
  fecha_devolucion_real?: string;
  condicion_devolucion?: string;
  danos_registrados?: any[];
  condiciones_especiales?: string;
  requiere_mantenimiento_incluido: boolean;
  historial_precios?: { periodo: string; monto: number }[];
  categoria?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  equipo_unidad?: {
    id: string;
    codigo: string;
    numero_serie: string;
    equipo?: {
      id: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  };
  cliente?: {
    id: string;
    nombre: string;
    razon_social?: string;
    identificador_unico?: string;
  };
}

export interface EquipoServicioTecnico {
  id: string;
  equipo_unidad_id: string;
  cliente_id?: string;
  contrato_id?: string;
  tipo: 'mantenimiento_preventivo' | 'mantenimiento_correctivo' | 'reparacion' | 'instalacion' | 'desinstalacion' | 'calibracion' | 'inspeccion' | 'capacitacion';
  fecha_solicitud: string;
  fecha_programada?: string;
  fecha_inicio?: string;
  fecha_finalizacion?: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  estado: 'solicitado' | 'programado' | 'en_ruta' | 'en_proceso' | 'completado' | 'cancelado' | 'reprogramado';
  tecnico_id?: string;
  tecnico_nombre?: string;
  equipo_tecnico?: string;
  tipo_servicio?: string;
  numero?: string;
  descripcion?: string;
  falla_declarada?: string;
  contacto?: string;
  modo_contacto?: string;
  motivo?: string;
  diagnostico?: string;
  trabajo_realizado?: string;
  recomendaciones?: string;
  repuestos_utilizados?: any[];
  insumos_utilizados?: any[];
  costo_mano_obra: number;
  costo_repuestos: number;
  costo_total: number;
  facturado: boolean;
  factura_id?: string;
  fotos_antes?: any[];
  fotos_despues?: any[];
  documentos?: any[];
  firma_tecnico_url?: string;
  firma_cliente_url?: string;
  nombre_recibio?: string;
  ubicacion_servicio?: string;
  latitud?: number;
  longitud?: number;
  calificacion_cliente?: number;
  comentarios_cliente?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  equipo_unidad?: {
    id: string;
    codigo: string;
    numero_serie: string;
    contrato?: any;
    equipo?: {
      id: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  };
  cliente?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    razon_social?: string;
    identificador_unico?: string;
    cuit?: string;
    email?: string | string[];
    telefono?: string[];
    direccion?: string;
  };
  contrato?: {
    id: string;
    tipo: string;
    fecha_inicio: string;
    fecha_fin?: string;
  };
  laboratorio?: {
    id: string;
    nombre: string;
    direccion?: string;
    localidad?: string;
    provincia?: string;
  };
}

export interface EquipoMovimiento {
  id: string;
  equipo_unidad_id: string;
  tipo: 'ingreso' | 'egreso' | 'devolucion' | 'instalacion' | 'desinstalacion' | 'traslado' | 'envio_taller' | 'retorno_taller' | 'baja';
  origen_tipo?: string;
  origen_id?: string;
  origen_descripcion?: string;
  destino_tipo?: string;
  destino_id?: string;
  destino_descripcion?: string;
  cliente_id?: string;
  contrato_id?: string;
  servicio_id?: string;
  fecha_movimiento: string;
  fecha_programada?: string;
  responsable_movimiento?: string;
  transportista?: string;
  numero_seguimiento?: string;
  condicion_previa?: string;
  condicion_posterior?: string;
  observaciones?: string;
  documentos?: any[];
  fotos?: any[];
  firma_entrega_url?: string;
  firma_recepcion_url?: string;
  latitud?: number;
  longitud?: number;
  created_at: string;
  created_by?: string;

  // Relaciones
  equipo_unidad?: {
    id: string;
    codigo: string;
    numero_serie: string;
    equipo?: {
      id: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  };
  cliente?: {
    id: string;
    nombre: string;
    razon_social?: string;
  };
}

export interface EquipoAlerta {
  id: string;
  tipo: 'vencimiento_contrato' | 'mantenimiento_preventivo' | 'revision_calibracion' | 'garantia_proxima' | 'stock_bajo' | 'documentacion_pendiente' | 'otro';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  titulo: string;
  descripcion?: string;
  fecha_alerta: string;
  fecha_vencimiento?: string;
  estado: 'pendiente' | 'en_proceso' | 'resuelta' | 'cancelada';
  equipo_unidad_id?: string;
  contrato_id?: string;
  servicio_id?: string;
  usuario_asignado_id?: string;
  notas?: string;
  fecha_resolucion?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  equipo_unidad?: {
    id: string;
    codigo: string;
    numero_serie: string;
    equipo?: {
      id: string;
      marca: string;
      modelo: string;
      tipo: string;
    };
  };
}

export interface Tarea {
  id: string;
  codigo: string;

  // Origen
  cliente_id?: string | null;
  cliente_nombre?: string | null;

  // Descripción
  titulo: string;
  descripcion?: string | null;
  tipo: 'servicio_tecnico' | 'instalacion' | 'reparacion' | 'mantenimiento' | 'consulta_tecnica' | 'presupuesto' | 'seguimiento_comercial' | 'reclamo' | 'otro';

  // Prioridad y Estado
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  estado: 'pendiente' | 'asignada' | 'en_proceso' | 'en_espera' | 'completada' | 'cancelada';

  // Asignación
  asignado_a?: string | null;
  asignado_a_nombre?: string | null;
  equipo_id?: string | null;

  // Fechas
  fecha_requerida?: string | null;
  fecha_asignacion?: string | null;
  fecha_inicio?: string | null;
  fecha_completada?: string | null;
  fecha_cancelada?: string | null;

  // Ubicación
  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;

  // Resultado
  resultado?: string | null;
  notas_cancelacion?: string | null;

  // Conversión
  convertido_a_servicio: boolean;
  servicio_id?: string | null;

  // Auditoría
  creado_por?: string | null;
  creado_por_nombre?: string | null;
  created_at: string;
  updated_at: string;

  // Relaciones
  clientes?: {
    id: string;
    nombre: string;
    email?: string[];
    telefono?: string[];
    direccion?: string;
  } | null;
  equipos?: {
    id: string;
    codigo: string;
    marca: string;
    modelo: string;
    numero_serie?: string;
  } | null;
  servicios?: {
    id: string;
    codigo: string;
    estado: string;
  } | null;
}

export interface TareaComentario {
  id: string;
  tarea_id: string;
  comentario: string;
  usuario_id?: string | null;
  usuario_nombre?: string | null;
  es_interno: boolean;
  adjuntos?: any | null;
  created_at: string;
  updated_at: string;
}

export interface TareaHistorial {
  id: string;
  tarea_id: string;
  accion: string;
  descripcion: string;
  campo_modificado?: string | null;
  valor_anterior?: string | null;
  valor_nuevo?: string | null;
  usuario_id?: string | null;
  usuario_nombre?: string | null;
  created_at: string;
}

// ========================================
// SISTEMA DE VENTAS MEJORADO
// ========================================

export interface HistorialPrecio {
  id: string;
  producto_id: string;
  precio_anterior: number;
  precio_nuevo: number;
  tipo_precio: 'costo' | 'venta' | 'oferta';
  motivo_cambio?: string;
  usuario_id?: string;
  cliente_id?: string;
  presupuesto_id?: string;
  created_at: string;
}

export interface DescuentoPromocion {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'porcentaje' | 'monto_fijo' | 'por_volumen' | 'combo';
  valor: number;

  // Condiciones
  cantidad_minima?: number;
  monto_minimo?: number;

  // Aplicable a
  producto_id?: string;
  categoria?: string;
  categoria_producto?: string;
  cliente_id?: string;
  tipo_cliente?: string;
  productos_combo?: any[];

  // Vigencia
  fecha_inicio?: string;
  fecha_fin?: string;
  codigo_promocional?: string;

  // Control
  activo: boolean;
  uso_maximo?: number;
  uso_actual: number;

  created_at: string;
  updated_at: string;

  // Relaciones
  producto?: Producto;
  cliente?: {
    id: string;
    nombre: string;
  };
}

export interface StockReservado {
  id: string;
  producto_id: string;
  cantidad: number;

  // Origen
  presupuesto_id?: string;
  pedido_id?: string;
  factura_id?: string;

  // Control
  fecha_reserva: string;
  fecha_liberacion?: string;
  estado: 'reservado' | 'confirmado' | 'liberado' | 'consumido';
  motivo_liberacion?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  producto?: Producto;
}

export interface MetaVenta {
  id: string;
  usuario_id: string;

  // Período
  periodo_tipo: 'mensual' | 'trimestral' | 'anual';
  periodo_inicio: string;
  periodo_fin: string;

  // Metas
  meta_monto?: number;
  meta_cantidad?: number;
  meta_clientes_nuevos?: number;

  // Progreso
  progreso_monto: number;
  progreso_cantidad: number;
  progreso_clientes_nuevos: number;

  // Comisiones
  comision_porcentaje?: number;
  comision_base?: number;
  comision_extra_porcentaje?: number;
  comision_calculada: number;

  // Estado
  estado: 'activo' | 'completado' | 'cancelado';

  created_at: string;
  updated_at: string;
}

export interface PlantillaPresupuesto {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;

  // Items
  items: any[]; // Array de items con producto_id, cantidad, descripcion

  // Configuración
  tiempo_entrega_default?: string;
  forma_pago_default?: string;
  terminos_condiciones_default?: string;
  observaciones_default?: string;

  // Control
  activo: boolean;
  uso_contador: number;
  usuario_creador_id?: string;

  created_at: string;
  updated_at: string;
}

export interface SeguimientoPresupuesto {
  id: string;
  presupuesto_id: string;

  // Acción
  tipo_accion: 'creado' | 'enviado' | 'visto' | 'recordatorio_enviado' | 'modificado' | 'aprobado' | 'rechazado';
  metodo?: 'email' | 'whatsapp' | 'telefono' | 'presencial';

  // Detalles
  notas?: string;
  resultado?: string;
  usuario_id?: string;

  // Recordatorios
  recordatorio_programado?: string;
  recordatorio_enviado: boolean;

  created_at: string;
}

export interface OportunidadVenta {
  id: string;
  nombre: string;
  descripcion?: string;

  // Cliente
  cliente_id: string;
  cliente_nombre?: string;
  tipo_equipo?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_email?: string;

  // Montos
  monto_estimado?: number;
  probabilidad_cierre?: number;
  monto_ponderado?: number; // calculado: monto * probabilidad / 100

  // Pipeline
  etapa: 'nuevo' | 'propuesta' | 'logistica' | 'ganado' | 'interesados a futuro' | 'perdido';

  // Fechas
  fecha_estimada_cierre?: string;
  fecha_primer_contacto?: string;
  fecha_ultimo_contacto?: string;
  dias_en_etapa: number;

  // Relaciones
  presupuesto_id?: string;
  pedido_id?: string;
  factura_id?: string;

  // Asignación (multi-persona)
  usuarios_asignados?: { id: string; nombre_completo: string }[];
  vendedor_id?: string;
  vendedor?: { id: string; name: string };
  creado_por?: string;
  creador?: { id: string; nombre_completo: string } | null;

  // Origen
  fuente?: string; // 'web', 'telefono', 'referido', 'marketing'

  // Si se pierde
  motivo_perdida?: string;
  perdida_descripcion?: string;
  competidor?: string;

  // CRM features (Odoo-like)
  etiquetas?: string[]; // Tags: 'veterinaria equipos', 'bioquimica', 'licitación', etc.
  prioridad?: 'baja' | 'normal' | 'alta' | 'urgente';
  empresa_nombre?: string; // Cuando no hay cliente registrado
  moneda?: string; // 'ARS', 'USD', etc.

  // Estado
  estado: 'abierto' | 'ganado' | 'perdido' | 'cancelado' | 'entregado' | 'finalizado';

  created_at: string;
  updated_at: string;

  // Relaciones
  cliente?: {
    id: string;
    nombre: string;
    nombre_fantasia?: string;
    identificador_unico?: string;
    cuit?: string;
  };
  presupuesto?: Presupuesto;
  presupuestos?: Array<{
    id: string;
    numero: string;
    total: number;
    estado: string;
  }>;
  laboratorio_id?: string;
  laboratorio?: {
    id: string;
    nombre: string;
    direccion?: string;
    localidad?: string;
  } | null;
  actividades?: OportunidadActividad[];
}

// Actividad de oportunidad de venta
export interface OportunidadActividad {
  id: string;
  oportunidad_id: string;
  tipo: 'nota' | 'llamada' | 'email' | 'reunion' | 'etapa_cambio' | 'presupuesto_creado' | 'presupuesto_enviado' | 'ganada' | 'perdida' | 'archivo';
  titulo?: string;
  descripcion?: string;
  metadata?: {
    // Para email
    destinatario?: string;
    asunto?: string;
    email_id?: string;
    // Para etapa_cambio
    etapa_anterior?: string;
    etapa_nueva?: string;
    // Para presupuesto
    presupuesto_id?: string;
    numero?: string;
    total?: number;
    // Para perdida
    motivo?: string;
    competidor?: string;
    // Para archivo
    url?: string;
    nombre?: string;
    tamaño?: number;
  };
  usuario_id?: string;
  usuario_nombre?: string;
  created_at: string;
}

// Tipos de actividad programada CRM
export type CrmActividadTipo = 'llamada' | 'email' | 'reunion_online' | 'visita' | 'enviar_presupuesto' | 'instalacion' | 'capacitacion' | 'seguimiento' | 'escribir';
export type CrmActividadPrioridad = 'baja' | 'normal' | 'alta' | 'urgente';
export type CrmActividadEstado = 'pendiente' | 'completada' | 'cancelada';

export interface CrmActividad {
  id: string;
  org_id: string;
  oportunidad_id?: string;
  cliente_id?: string;
  tipo: CrmActividadTipo;
  titulo?: string;
  nota?: string;
  fecha_limite: string;
  hora?: string | null;
  prioridad: CrmActividadPrioridad;
  asignado_id?: string;
  asignado_nombre?: string;
  estado: CrmActividadEstado;
  completada_at?: string;
  completada_por?: string;
  completada_por_nombre?: string;
  resultado?: string;
  created_by?: string;
  created_by_nombre?: string;
  created_at: string;
  updated_at: string;
}

// Item de oportunidad con datos de equipo/producto
export interface OportunidadItem {
  id: string;
  oportunidad_id: string;
  producto_id?: string;
  equipo_id?: string;
  equipo_unidad_id?: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario?: number;
  estado_item: 'cotizado' | 'reservado' | 'pedido_compra' | 'recibido' | 'entregado' | 'cancelado';
  notas?: string;
  fecha_reserva?: string;
  created_at: string;

  // Datos del equipo (JOIN)
  equipo_marca?: string;
  equipo_modelo?: string;
  equipo_tipo?: string;
  equipo_categoria?: string;
  equipo_condicion?: string;
  equipo_precio_lista?: number;
  equipo_imagen?: string;

  // Datos de la unidad reservada (JOIN)
  unidad_numero_serie?: string;
  unidad_codigo?: string;
  unidad_estado?: string;

  // Datos del producto (JOIN)
  producto_nombre?: string;
  producto_codigo?: string;
  producto_precio?: number;

  // Datos del pedido de compra (JOIN)
  pedido_id?: string;
  pedido_estado?: string;
  pedido_fecha_estimada?: string;
  pedido_proveedor_id?: string;
  pedido_proveedor_nombre?: string;
}

// Pedido de equipo nuevo para oportunidad
export interface OportunidadEquipoPedido {
  id: string;
  oportunidad_id: string;
  oportunidad_item_id?: string;
  equipo_id: string;
  cantidad: number;
  especificaciones?: string;
  estado: 'pendiente' | 'solicitado' | 'en_transito' | 'recibido' | 'asignado' | 'cancelado';
  orden_compra_id?: string;
  proveedor_id?: string;
  fecha_solicitud?: string;
  fecha_estimada_llegada?: string;
  fecha_recepcion?: string;
  equipo_unidad_id?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Datos del equipo (JOIN)
  marca?: string;
  modelo?: string;
  tipo?: string;
  categoria?: string;

  // Datos de la oportunidad (JOIN)
  oportunidad_nombre?: string;
  oportunidad_etapa?: string;
  oportunidad_estado?: string;

  // Datos del cliente (JOIN)
  cliente_nombre?: string;

  // Datos del proveedor (JOIN)
  proveedor_nombre?: string;
}

// Equipo disponible para reservar
export interface EquipoDisponibleReserva {
  unidad_id: string;
  numero_serie: string;
  codigo?: string;
  estado_general: string;
  fecha_compra?: string;
  equipo_id: string;
  marca: string;
  modelo: string;
  tipo?: string;
  categoria?: string;
  condicion: string;
  precio_lista?: number;
  precio_lista_moneda?: string;
  imagen_url?: string;
}

export interface AnalisisABCProducto {
  id: string;
  producto_id: string;

  // Período
  periodo_inicio: string;
  periodo_fin: string;

  // Métricas
  cantidad_vendida?: number;
  monto_total_ventas?: number;
  cantidad_transacciones?: number;
  margen_total?: number;

  // Clasificación
  clasificacion_abc?: 'A' | 'B' | 'C';
  porcentaje_ingresos?: number;
  posicion_ranking?: number;

  // Indicadores
  tendencia?: 'creciente' | 'estable' | 'decreciente';
  rotacion?: number;

  created_at: string;

  // Relaciones
  producto?: Producto;
}

// ========================================
// SISTEMA DE ENCUESTAS
// ========================================

export type TipoPreguntaEncuesta = 'nps' | 'estrellas' | 'texto' | 'opcion_multiple';

export interface PreguntaEncuesta {
  tipo: TipoPreguntaEncuesta;
  pregunta: string;
  opciones?: string[]; // Solo para opcion_multiple
  requerida: boolean;
}

export interface Encuesta {
  id: string;
  nombre: string;
  descripcion?: string;
  preguntas: PreguntaEncuesta[];
  activa: boolean;
  trigger_automatico?: 'post_servicio' | 'post_entrega' | 'post_instalacion' | null;
  dias_despues_trigger?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Métricas calculadas
  total_respuestas?: number;
  respuestas_completadas?: number;
  respuestas_pendientes?: number;
  promedio_nps?: number;
}

export interface RespuestaEncuesta {
  pregunta_idx: number;
  valor: number | string | string[];
}

export interface EncuestaRespuesta {
  id: string;
  encuesta_id: string;
  cliente_id?: string;
  servicio_id?: string;
  pedido_id?: string;
  token: string;
  respuestas: RespuestaEncuesta[];
  nps_score?: number;
  completada: boolean;
  completada_at?: string;
  email_enviado_at?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;

  // Relaciones
  encuesta?: Encuesta;
  cliente?: {
    id: string;
    nombre: string;
    email?: string[];
  };
}

// Cliente Notas y Archivos
export interface ClienteNota {
  id: string;
  cliente_id: string;
  contenido: string;
  tipo: 'general' | 'importante' | 'seguimiento' | 'recordatorio';
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ClienteArchivo {
  id: string;
  cliente_id: string;
  nombre: string;
  url: string;
  tipo?: string; // mime type
  tamaño?: number;
  categoria: 'documento' | 'contrato' | 'factura' | 'imagen' | 'otro';
  descripcion?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

// ========================================
// CATÁLOGO WEB (Frontend público)
// ========================================

export const DIVISIONES_CATALOGO = [
  'Laboratorios',
  'Veterinaria',
  'Medica',
  'Investigacion',
  'Estetica',
  'Rehabilitacion'
] as const;

export type DivisionCatalogo = typeof DIVISIONES_CATALOGO[number];

export interface EmpresaCatalogo {
  id: string;
  nombre: string;
  logo_url?: string;
  sitio_web?: string;
}

export interface EquipoCatalogo {
  id: string;
  marca: string;
  modelo: string;
  tipo: string;
  categoria?: string;
  subtipo?: string; // subtipo en cascada bajo la categoría (=tipo). Columna equipos.subtipo
  utilidad?: string;
  division: DivisionCatalogo[];
  imagen_url?: string;
  detalle?: string;
  especificaciones: Record<string, string | number | boolean> | string[];
  disponible: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones (cuando se hace join)
  empresa?: EmpresaCatalogo;
  productos?: ProductoCatalogo[];
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  tipo: 'insumo' | 'accesorio' | 'repuesto';
  categoria?: string;
  marca?: string;
  precio_lista?: number;
  precio_final?: number;
  moneda: 'ARS' | 'USD';
  disponible: boolean;
  stock: number;
  imagen_url?: string;
  division: DivisionCatalogo[];
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  equipos?: EquipoCatalogo[];
}

export interface ProductoEquipoCatalogo {
  equipo_id: string;
  producto_id: string;
  created_at: string;
}

export interface FeaturedEquipo {
  id: string;
  equipo_id: string;
  custom_features: string[];
  badge_text?: string;
  badge_color: string;
  featured_division?: string;
  posicion: number;
  activo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  equipo?: EquipoCatalogo;
  empresa?: EmpresaCatalogo;
}

// ========================================
// LOGÍSTICA Y TRANSPORTES
// ========================================

export interface Transporte {
  id: string;
  nombre: string;
  tipo?: 'correo' | 'courier' | 'transporte_privado' | 'retiro_local' | 'retiro_deposito';
  contacto?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  created_at: string;
}

// ========================================
// ENTERPRISE FEATURES
// ========================================

// Scoring de Leads
export interface LeadScoringRule {
  id: string;
  nombre: string;
  descripcion?: string;
  condicion: {
    campo: string;
    operador: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains';
    valor: string | number;
  };
  puntos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Flujos de Aprobación
export interface ApprovalWorkflow {
  id: string;
  nombre: string;
  tipo_documento: 'presupuesto' | 'nota_credito' | 'orden_compra';
  condicion?: {
    campo: string;
    operador: string;
    valor: number;
  };
  aprobadores: string[];
  requiere_todos: boolean;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  tipo_documento: string;
  documento_id: string;
  solicitante_id: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';
  created_at: string;
  updated_at: string;
  workflow?: ApprovalWorkflow;
  decisions?: ApprovalDecision[];
}

export interface ApprovalDecision {
  id: string;
  request_id: string;
  aprobador_id: string;
  decision: 'aprobado' | 'rechazado';
  comentario?: string;
  created_at: string;
}

// Audit Trail
export interface AuditLog {
  id: string;
  tabla: string;
  registro_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  datos_anteriores?: Record<string, unknown>;
  datos_nuevos?: Record<string, unknown>;
  campos_modificados?: string[];
  usuario_id?: string;
  usuario_nombre?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Alertas Automáticas
export interface AlertaConfig {
  id: string;
  nombre: string;
  tipo: 'factura_vencida' | 'stock_bajo' | 'contrato_vencer' | 'custom';
  condicion: Record<string, unknown>;
  destinatarios: string[];
  canal: 'sistema' | 'email' | 'ambos';
  frecuencia: 'instantanea' | 'diaria' | 'semanal';
  activo: boolean;
  ultima_ejecucion?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertaEnviada {
  id: string;
  config_id?: string;
  registro_id?: string;
  tipo: string;
  mensaje: string;
  destinatario_id: string;
  canal: string;
  leida: boolean;
  enviada: boolean;
  error?: string;
  created_at: string;
}

// Workflows
export interface Workflow {
  id: string;
  nombre: string;
  descripcion?: string;
  trigger_tipo: 'crear' | 'actualizar' | 'eliminar' | 'manual' | 'programado';
  trigger_tabla?: string;
  trigger_condicion?: Record<string, unknown>;
  acciones: WorkflowAction[];
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAction {
  tipo: 'email' | 'notificacion' | 'actualizar_campo' | 'crear_tarea' | 'webhook';
  config: Record<string, unknown>;
}

// Integración Bancaria
export interface CuentaBancaria {
  id: string;
  nombre: string;
  banco: string;
  tipo_cuenta: 'cuenta_corriente' | 'caja_ahorro';
  numero_cuenta?: string;
  cbu?: string;
  alias?: string;
  moneda: string;
  saldo_actual: number;
  saldo_actualizado_at?: string;
  integracion_activa: boolean;
  integracion_tipo?: 'santander_api' | 'manual';
  integracion_config?: Record<string, unknown>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovimientoBancario {
  id: string;
  cuenta_id: string;
  fecha: string;
  fecha_valor?: string;
  descripcion: string;
  referencia?: string;
  tipo: 'debito' | 'credito';
  monto: number;
  saldo?: number;
  conciliado: boolean;
  conciliado_con_tipo?: 'pago' | 'factura' | 'gasto';
  conciliado_con_id?: string;
  importado_desde?: 'api' | 'csv' | 'ofx' | 'manual';
  datos_raw?: Record<string, unknown>;
  created_at: string;
}

// Reportes Programados
export interface ReporteProgramado {
  id: string;
  nombre: string;
  tipo_reporte: 'ventas' | 'cobranzas' | 'stock' | 'servicios' | 'custom';
  parametros?: Record<string, unknown>;
  formato: 'pdf' | 'excel' | 'csv';
  frecuencia: 'diaria' | 'semanal' | 'mensual' | 'trimestral';
  dia_ejecucion?: number;
  hora_ejecucion: string;
  destinatarios_email: string[];
  activo: boolean;
  ultima_ejecucion?: string;
  proxima_ejecucion?: string;
  created_at: string;
  updated_at: string;
}

// Intercompany
export interface EmpresaGrupo {
  id: string;
  nombre: string;
  cuit?: string;
  razon_social?: string;
  es_principal: boolean;
  config?: Record<string, unknown>;
  activo: boolean;
  created_at: string;
}

export interface TransaccionIntercompany {
  id: string;
  empresa_origen_id: string;
  empresa_destino_id: string;
  tipo: 'venta' | 'compra' | 'transferencia' | 'prestamo';
  documento_tipo?: string;
  documento_id?: string;
  descripcion?: string;
  monto: number;
  moneda: string;
  estado: 'pendiente' | 'confirmado' | 'cancelado';
  confirmado_por?: string;
  confirmado_at?: string;
  created_at: string;
}

// Customer Insights (Vista 360)
export interface CustomerInsight {
  cliente_id: string;
  nombre: string;
  nombre_fantasia?: string;
  factor_precio: number;
  score?: number;
  estado?: string;
  cliente_desde: string;
  total_facturado: number;
  total_facturas: number;
  promedio_factura: number;
  ultima_factura?: string;
  saldo_acreedor: number;
  total_servicios: number;
  ultimo_servicio?: string;
  equipos_en_comodato: number;
  ultima_interaccion?: string;
}

export interface Anuncio {
  id: string
  org_id: string
  autor_id: string
  autor_nombre?: string
  tipo: 'promocion' | 'info'
  titulo: string
  contenido?: string
  vigencia_hasta?: string
  created_at: string
  updated_at: string
}
// ============================================================
// Biblioteca de Recursos
// ============================================================

export interface BibliotecaCategoria {
  id: string;
  org_id: string;
  nombre: string;
  slug: string;
  icono?: string;
  color?: string;
  orden: number;
  created_at: string;
  recursos_count?: number;
}

export type BibliotecaTipo = 'manual' | 'folleto' | 'software' | 'ficha_tecnica' | 'politica' | 'otro';
export type BibliotecaFormato = 'pdf' | 'zip' | 'imagen' | 'link' | 'video' | 'otro';

export interface BibliotecaVinculo {
  entidad_tipo: 'equipo' | 'producto';
  entidad_id: string;
  entidad_nombre?: string;
}

export interface BibliotecaRecurso {
  id: string;
  org_id: string;
  titulo: string;
  descripcion?: string;
  categoria_id?: string;
  categoria_nombre?: string;
  categoria_slug?: string;
  categoria_color?: string;
  tipo?: BibliotecaTipo;
  formato?: BibliotecaFormato;
  archivo_url?: string;
  archivo_nombre?: string;
  archivo_tamano?: number;
  link_externo?: string;
  thumbnail_url?: string;
  tags?: string[];
  activo: boolean;
  created_by?: string;
  created_by_nombre?: string;
  created_at: string;
  updated_at: string;
  vinculos?: BibliotecaVinculo[];
}
