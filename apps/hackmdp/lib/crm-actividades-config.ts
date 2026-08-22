import {
  Phone,
  Mail,
  Video,
  MapPin,
  FileText,
  Wrench,
  GraduationCap,
  Clock,
  PenLine,
  Calendar,
  Users,
  Package,
  Star,
  Flag,
  CheckCircle,
  Truck,
  DollarSign,
  Tag,
} from 'lucide-react';
import type { CrmActividadTipo } from '@/lib/types';

export interface ActividadTipoConfig {
  id: CrmActividadTipo | string; // fijos (CrmActividadTipo) o custom (slug 'custom_...')
  label: string;
  icon: typeof Phone;
  color: string;
  bgActive: string;
  bgInactive: string;
  panelBg: string;
}

export const CRM_ACTIVIDAD_TIPOS: ActividadTipoConfig[] = [
  {
    id: 'llamada',
    label: 'Llamada',
    icon: Phone,
    color: 'text-blue-500',
    bgActive: 'bg-blue-600 text-white',
    bgInactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50',
    panelBg: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    color: 'text-purple-500',
    bgActive: 'bg-purple-600 text-white',
    bgInactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-400 dark:hover:bg-purple-900/50',
    panelBg: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
  },
  {
    id: 'reunion_online',
    label: 'Reunión online',
    icon: Video,
    color: 'text-amber-500',
    bgActive: 'bg-amber-600 text-white',
    bgInactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-900/50',
    panelBg: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  },
  {
    id: 'visita',
    label: 'Visita',
    icon: MapPin,
    color: 'text-teal-500',
    bgActive: 'bg-teal-600 text-white',
    bgInactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-400 dark:hover:bg-teal-900/50',
    panelBg: 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800',
  },
  {
    id: 'enviar_presupuesto',
    label: 'Enviar Presupuesto',
    icon: FileText,
    color: 'text-emerald-500',
    bgActive: 'bg-emerald-600 text-white',
    bgInactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
    panelBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'instalacion',
    label: 'Instalación',
    icon: Wrench,
    color: 'text-orange-500',
    bgActive: 'bg-orange-600 text-white',
    bgInactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-400 dark:hover:bg-orange-900/50',
    panelBg: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  },
  {
    id: 'capacitacion',
    label: 'Capacitación',
    icon: GraduationCap,
    color: 'text-indigo-500',
    bgActive: 'bg-indigo-600 text-white',
    bgInactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/50',
    panelBg: 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800',
  },
  {
    id: 'seguimiento',
    label: 'Seguimiento',
    icon: Clock,
    color: 'text-gray-500',
    bgActive: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    bgInactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    panelBg: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
  },
  {
    id: 'escribir',
    label: 'Escribir',
    icon: PenLine,
    color: 'text-rose-500',
    bgActive: 'bg-rose-600 text-white',
    bgInactive: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/50',
    panelBg: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
  },
];

export const PRIORIDAD_CONFIG = {
  baja: { label: 'Baja', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  normal: { label: 'Normal', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  alta: { label: 'Alta', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  urgente: { label: 'Urgente', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
};

// ─── Tipos de actividad CUSTOM (por org) ───
// Clases Tailwind ESTÁTICAS por color (no se pueden generar dinámicas: el purgador
// las borraría). Paleta para el picker de "Nuevo tipo".
export const COLOR_CLASSES: Record<string, { color: string; bgActive: string; bgInactive: string; panelBg: string }> = {
  blue:    { color: 'text-blue-500',    bgActive: 'bg-blue-600 text-white',    bgInactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50',          panelBg: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' },
  purple:  { color: 'text-purple-500',  bgActive: 'bg-purple-600 text-white',  bgInactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-400 dark:hover:bg-purple-900/50', panelBg: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' },
  amber:   { color: 'text-amber-500',   bgActive: 'bg-amber-600 text-white',   bgInactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-900/50',     panelBg: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' },
  emerald: { color: 'text-emerald-500', bgActive: 'bg-emerald-600 text-white', bgInactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50', panelBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' },
  cyan:    { color: 'text-cyan-500',    bgActive: 'bg-cyan-600 text-white',    bgInactive: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:text-cyan-400 dark:hover:bg-cyan-900/50',          panelBg: 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800' },
  rose:    { color: 'text-rose-500',    bgActive: 'bg-rose-600 text-white',    bgInactive: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900/50',          panelBg: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800' },
  indigo:  { color: 'text-indigo-500',  bgActive: 'bg-indigo-600 text-white',  bgInactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/50', panelBg: 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' },
  orange:  { color: 'text-orange-500',  bgActive: 'bg-orange-600 text-white',  bgInactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-400 dark:hover:bg-orange-900/50', panelBg: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' },
  teal:    { color: 'text-teal-500',    bgActive: 'bg-teal-600 text-white',    bgInactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-400 dark:hover:bg-teal-900/50',          panelBg: 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800' },
  gray:    { color: 'text-gray-500',    bgActive: 'bg-gray-600 text-white',    bgInactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800',           panelBg: 'bg-gray-50/50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700' },
};

export const ACTIVIDAD_COLORS = Object.keys(COLOR_CLASSES);

// Set de íconos disponibles para tipos custom.
export const ICON_MAP: Record<string, typeof Phone> = {
  Phone, Mail, Video, MapPin, FileText, Wrench, GraduationCap, Clock,
  PenLine, Calendar, Users, Package, Star, Flag, CheckCircle, Truck, DollarSign, Tag,
};

export const ACTIVIDAD_ICONS = Object.keys(ICON_MAP);

export interface TipoActividadCustom {
  id: string;
  label: string;
  color: string;
  icon: string;
}

// Convierte un tipo custom (guardado en org.config) a ActividadTipoConfig para render.
export function buildTipoConfig(c: TipoActividadCustom): ActividadTipoConfig {
  const cc = COLOR_CLASSES[c.color] || COLOR_CLASSES.gray;
  return {
    id: c.id,
    label: c.label,
    icon: ICON_MAP[c.icon] || Tag,
    color: cc.color,
    bgActive: cc.bgActive,
    bgInactive: cc.bgInactive,
    panelBg: cc.panelBg,
  };
}
