/**
 * TIPOS DE ROLES Y PERMISOS
 * Sistema de control de acceso basado en roles (RBAC)
 */

// =====================================================
// MÓDULOS DEL SISTEMA
// =====================================================
export const MODULOS = [
  'dashboard',
  'clientes',
  'productos',
  'precios',
  'equipos',
  'equipos_unidades',
  'equipos_movimientos',
  'equipos_alertas',
  'servicios',
  'servicios_tecnicos',
  'facturas',
  'notas_credito',
  'presupuestos',
  'pedidos',
  'pagos',
  'cuentas_corrientes',
  'comodatos',
  'tareas',
  'personas',
  'laboratorios',
  'proveedores',
  'reportes',
  'configuracion',
  'configuracion_roles',
  'catalogo_web',
  'integraciones_bancarias',
  'oportunidades',
  'mantenimiento',
  'vet_pacientes',
  'vet_ordenes',
  'vet_estudios',
  'vet_muestras',
  'vet_resultados',
  'vet_bienestar',
  'vet_seguimientos',
  'vet_reactivos',
  'vet_derivaciones',
  'vet_analizadores',
  'vet_auditoria',
  'vet_educacion',
  'vet_citas',
  'vet_consultas',
  'vet_vacunas',
  'vet_internacion',
  'vet_cirugias',
  'vet_desparasitaciones',
  'vet_farmacia',
  'vet_diagnosticos',
  'vet_casos',
  'vet_banco_sangre',
  'regulatorio',
  'marketing',
  'reactivos_lab',
] as const;

export type Modulo = typeof MODULOS[number];

// =====================================================
// ACCIONES POR MÓDULO
// =====================================================
export const ACCIONES = [
  'leer',
  'crear',
  'editar',
  'eliminar',
  'exportar',
] as const;

export type Accion = typeof ACCIONES[number];

// =====================================================
// INTERFACES DE BASE DE DATOS
// =====================================================

export interface Role {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_admin: boolean;
  nivel?: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Permiso {
  id: string;
  modulo: Modulo;
  accion: Accion;
  descripcion: string | null;
  created_at: string;
}

export interface RolPermiso {
  id: string;
  rol_id: string;
  permiso_id: string;
  created_at: string;
}

export interface Perfil {
  id: string;
  rol_id: string | null;
  permisos_custom: PermisoCustom[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relaciones
  roles?: Role;
}

// =====================================================
// PERMISOS CUSTOM
// =====================================================
export interface PermisoCustom {
  modulo: Modulo;
  accion: Accion;
  habilitado: boolean;
}

// =====================================================
// MAPA DE PERMISOS
// =====================================================
export type PermisosMap = {
  [key in Modulo]?: Accion[];
};

// =====================================================
// DATOS COMPLETOS DEL USUARIO
// =====================================================
export interface UserWithPermissions {
  id: string;
  email: string;
  perfil: Perfil | null;
  role: Role | null;
  permisos: PermisosMap;
  es_admin: boolean;
}

// =====================================================
// NOMBRES DE ROLES PREDEFINIDOS
// =====================================================
export const ROLE_NAMES = {
  ADMIN: 'Admin',
  ADMIN_GENERAL: 'Administración General',
  ADMIN_COMERCIAL: 'Administración Comercial',
  VENTAS: 'Ventas',
  LOGISTICA: 'Logística',
  SERVICIO_TECNICO: 'Servicio Técnico',
  CONTABLE: 'Contable',
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

// =====================================================
// HOOK RETURN TYPES
// =====================================================
export interface UseUserPermissionsReturn {
  permisos: PermisosMap | null;
  role: Role | null;
  perfil: Perfil | null;
  loading: boolean;
  error: Error | null;
  hasPermission: (modulo: Modulo, accion: Accion) => boolean;
  canAccess: (modulo: Modulo) => boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

// =====================================================
// RESPUESTA DE API
// =====================================================
export interface PermissionsResponse {
  perfil: Perfil;
  role: Role;
  permisos: Permiso[];
}

// =====================================================
// FORMULARIO DE ROL
// =====================================================
export interface RoleFormData {
  nombre: string;
  descripcion: string;
  color: string;
  permisos: {
    [modulo: string]: Accion[];
  };
}

// =====================================================
// CONFIGURACIÓN DE ROL
// =====================================================
export interface RoleConfig {
  nombre: RoleName;
  descripcion: string;
  color: string;
  permisos: PermisosMap;
}

// =====================================================
// LABELS PARA UI
// =====================================================
export const MODULO_LABELS: Record<Modulo, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  productos: 'Productos',
  precios: 'Precios',
  equipos: 'Equipos',
  equipos_unidades: 'Unidades de Equipo',
  equipos_movimientos: 'Movimientos de Equipos',
  equipos_alertas: 'Alertas de Equipos',
  servicios: 'Servicios',
  servicios_tecnicos: 'Servicios Técnicos',
  facturas: 'Facturas',
  notas_credito: 'Notas de Crédito',
  presupuestos: 'Presupuestos',
  pedidos: 'Pedidos',
  pagos: 'Pagos',
  cuentas_corrientes: 'Cuentas Corrientes',
  comodatos: 'Comodatos',
  tareas: 'Tareas',
  personas: 'Personas',
  laboratorios: 'Laboratorios',
  proveedores: 'Proveedores',
  reportes: 'Reportes',
  configuracion: 'Configuración',
  configuracion_roles: 'Roles y Permisos',
  catalogo_web: 'Catálogo Web',
  integraciones_bancarias: 'Integración Bancaria',
  oportunidades: 'Oportunidades',
  mantenimiento: 'Mantenimiento',
  vet_pacientes: 'Pacientes',
  vet_ordenes: 'Órdenes de Trabajo',
  vet_estudios: 'Estudios',
  vet_muestras: 'Muestras',
  vet_resultados: 'Resultados',
  vet_bienestar: 'Bienestar',
  vet_seguimientos: 'Seguimientos',
  vet_reactivos: 'Reactivos',
  vet_derivaciones: 'Derivaciones',
  vet_analizadores: 'Analizadores LIS',
  vet_auditoria: 'Auditoría',
  vet_educacion: 'Educación',
  vet_citas: 'Agenda / Citas',
  vet_consultas: 'Consultas Clínicas',
  vet_vacunas: 'Vacunas',
  vet_internacion: 'Internación',
  vet_cirugias: 'Cirugías',
  vet_desparasitaciones: 'Desparasitaciones',
  vet_farmacia: 'Farmacia',
  vet_diagnosticos: 'Diagnósticos',
  vet_casos: 'Casos Clínicos',
  vet_banco_sangre: 'Banco de Sangre',
  regulatorio: 'Regulatorio',
  marketing: 'Marketing',
  reactivos_lab: 'Reactivos Lab',
};

export const ACCION_LABELS: Record<Accion, string> = {
  leer: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  exportar: 'Exportar',
};

// =====================================================
// ICONOS PARA ACCIONES
// =====================================================
export const ACCION_ICONS: Record<Accion, string> = {
  leer: '👁️',
  crear: '➕',
  editar: '✏️',
  eliminar: '🗑️',
  exportar: '📥',
};
