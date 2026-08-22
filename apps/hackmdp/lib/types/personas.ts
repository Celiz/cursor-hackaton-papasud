// Tipos para la gestión de personas, laboratorios y razones sociales

export type TipoPersona =
  | 'contacto_ventas'
  | 'bioquimico'
  | 'veterinario'
  | 'tecnico'
  | 'administrativo'
  | 'responsable_tecnico'
  | 'otro';

export type RolLaboratorio =
  | 'bioquimico_responsable'
  | 'bioquimico'
  | 'tecnico_principal'
  | 'tecnico'
  | 'administrativo'
  | 'otro';

export type TipoRelacionRazonSocial =
  | 'contacto_principal'
  | 'contacto_ventas'
  | 'contacto_administrativo'
  | 'contacto_tecnico'
  | 'responsable_compras'
  | 'responsable_pagos'
  | 'otro';

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo?: string; // Generated column
  cliente_nombre?: string;
  dni?: string;
  email?: string[];
  telefono?: string[];
  tipo_persona: TipoPersona;
  profesion?: string;
  matricula_profesional?: string;
  categoria_id?: string;
  ubicacion_id?: string;
  cargo?: string;
  notas?: string;
  razon_social_id?: string;
  usuario_asignado_id?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;

  // Relaciones populadas
  categoria?: {
    id: string;
    nombre: string;
    color?: string;
  };
  ubicacion?: {
    id: string;
    nombre: string;
  };
  responsable?: {
    id: string;
    nombre: string;
    apellido: string;
    nombre_completo: string;
  };
  empresa?: {
    id: string;
    nombre: string;
  };
}

export interface PersonaLaboratorio {
  id: string;
  persona_id: string;
  laboratorio_id: string;
  rol?: RolLaboratorio;
  activo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
  created_at: string;
  updated_at: string;

  // Relaciones populadas
  persona?: {
    id: string;
    nombre_completo: string;
    tipo_persona: TipoPersona;
    email?: string[];
    telefono?: string[];
  };
  laboratorio?: {
    id: string;
    nombre: string;
    direccion?: string;
    localidad?: string;
  };
}

export interface PersonaRazonSocial {
  id: string;
  persona_id: string;
  razon_social_id: string;
  tipo_relacion: TipoRelacionRazonSocial;
  es_contacto_principal: boolean;
  recibe_facturas: boolean;
  recibe_presupuestos: boolean;
  recibe_notificaciones: boolean;
  activo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
  created_at: string;
  updated_at: string;

  // Relaciones populadas
  persona?: {
    id: string;
    nombre_completo: string;
    tipo_persona: TipoPersona;
    email?: string[];
    telefono?: string[];
  };
  razon_social?: {
    id: string;
    nombre: string;
    cuit?: string;
  };
}

// Form data types (para crear/editar)
export interface PersonaFormData {
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string[];
  telefono?: string[];
  tipo_persona: TipoPersona;
  profesion?: string;
  matricula_profesional?: string;
  categoria_id?: string;
  ubicacion_id?: string;
  cargo?: string;
  notas?: string;
  activo?: boolean;
  tags?: string[];
  usuario_asignado_id?: string;
  // Campo virtual: si se envía al POST /api/personas, vincula la persona
  // recién creada al laboratorio (tabla personas_laboratorios). No se persiste en personas.
  laboratorio_id?: string;
  // Campo virtual: id de cliente opcional para futura vinculación. Hoy no persiste.
  cliente_id?: string;
}

export interface PersonaLaboratorioFormData {
  persona_id: string;
  laboratorio_id: string;
  rol?: RolLaboratorio;
  activo?: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
}

export interface PersonaRazonSocialFormData {
  persona_id: string;
  razon_social_id: string;
  tipo_relacion: TipoRelacionRazonSocial;
  es_contacto_principal?: boolean;
  recibe_facturas?: boolean;
  recibe_presupuestos?: boolean;
  recibe_notificaciones?: boolean;
  activo?: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
}
