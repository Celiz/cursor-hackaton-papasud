/**
 * Razón social vinculada a un laboratorio vía laboratorio_razones_sociales (M:N
 * introducida en migración 884). Cada item representa una empresa que puede
 * facturar a este laboratorio.
 */
export interface LaboratorioRazonSocial {
  cliente_id: string;
  nombre: string;
  cuit: string | null;
  es_principal: boolean;
  ambito: string | null;
  notas: string | null;
}

export type RubroLaboratorio = 'humano' | 'veterinario';

export interface Laboratorio {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string[];
  email?: string[];
  tipo?: string;
  rubro?: RubroLaboratorio;
  /**
   * Razón social PRINCIPAL (la default cuando se factura a este laboratorio).
   * Se resuelve desde la fila con es_principal=true en laboratorio_razones_sociales.
   */
  razon_social_id?: string;
  razon_social_nombre?: string;
  razon_social_cuit?: string;
  /**
   * Listado COMPLETO de razones sociales vinculadas (M:N). Incluye la principal.
   * Viene de la vista `v_laboratorios_con_razones` como jsonb.
   */
  razones_sociales?: LaboratorioRazonSocial[];
  activo: boolean;
  notas?: string;
  horario_atencion?: string;
  instrucciones_acceso?: string;
  latitud?: number;
  longitud?: number;
  created_at: string;
  updated_at: string;
  contacto_principal?: {
    id: string;
    nombre_completo: string;
    email: string[];
    telefono: string[];
    cargo: string;
  };
  cantidad_equipos?: number;
  cantidad_contactos?: number;
  /** @deprecated usar razon_social_nombre o razones_sociales */
  razon_social?: {
    id: string;
    nombre: string;
  };
}

export interface LaboratorioFormData {
  nombre: string;
  codigo?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  telefono?: string[];
  email?: string[];
  tipo?: string;
  rubro?: RubroLaboratorio;
  razon_social_id?: string;
  activo: boolean;
  notas?: string;
}
