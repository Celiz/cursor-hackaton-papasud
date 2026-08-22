import {
  Calendar,
  Video,
  MapPin,
  Wrench,
  GraduationCap,
  Phone,
  Mail,
  Clock,
  FileText,
  Plane,
  type LucideIcon,
} from 'lucide-react'

export interface TipoEventoConfig {
  id: string
  label: string
  icon: LucideIcon
  color: string       // tailwind color name
  bgClass: string
  textClass: string
  borderClass: string
  dotClass: string     // for calendar dots
}

// Tipos de eventos internos (tabla eventos_calendario)
export const TIPOS_EVENTO: TipoEventoConfig[] = [
  {
    id: 'evento',
    label: 'Evento',
    icon: Calendar,
    color: 'slate',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-500',
  },
  {
    id: 'reunion',
    label: 'Reunión',
    icon: Video,
    color: 'amber',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-700',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'viaje',
    label: 'Viaje',
    icon: Plane,
    color: 'cyan',
    bgClass: 'bg-cyan-50 dark:bg-cyan-900/30',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    borderClass: 'border-cyan-300 dark:border-cyan-700',
    dotClass: 'bg-cyan-500',
  },
  {
    id: 'instalacion',
    label: 'Instalación',
    icon: Wrench,
    color: 'orange',
    bgClass: 'bg-orange-50 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-300 dark:border-orange-700',
    dotClass: 'bg-orange-500',
  },
  {
    id: 'capacitacion',
    label: 'Capacitación',
    icon: GraduationCap,
    color: 'indigo',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/30',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-300 dark:border-indigo-700',
    dotClass: 'bg-indigo-500',
  },
  {
    id: 'servicio',
    label: 'Servicio',
    icon: Wrench,
    color: 'emerald',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'visita',
    label: 'Visita',
    icon: MapPin,
    color: 'teal',
    bgClass: 'bg-teal-50 dark:bg-teal-900/30',
    textClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-300 dark:border-teal-700',
    dotClass: 'bg-teal-500',
  },
  {
    id: 'otro',
    label: 'Otro',
    icon: Calendar,
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-700 dark:text-gray-300',
    borderClass: 'border-gray-300 dark:border-gray-700',
    dotClass: 'bg-gray-500',
  },
]

// Config para fuentes CRM (mapear tipos de crm_actividades a colores del calendario)
export const CRM_TIPO_COLORS: Record<string, { dotClass: string; bgClass: string; textClass: string; borderClass: string }> = {
  llamada: { dotClass: 'bg-blue-500', bgClass: 'bg-blue-50 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300', borderClass: 'border-blue-300 dark:border-blue-700' },
  email: { dotClass: 'bg-purple-500', bgClass: 'bg-purple-50 dark:bg-purple-900/30', textClass: 'text-purple-700 dark:text-purple-300', borderClass: 'border-purple-300 dark:border-purple-700' },
  reunion_online: { dotClass: 'bg-amber-500', bgClass: 'bg-amber-50 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300', borderClass: 'border-amber-300 dark:border-amber-700' },
  visita: { dotClass: 'bg-teal-500', bgClass: 'bg-teal-50 dark:bg-teal-900/30', textClass: 'text-teal-700 dark:text-teal-300', borderClass: 'border-teal-300 dark:border-teal-700' },
  enviar_presupuesto: { dotClass: 'bg-emerald-500', bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', textClass: 'text-emerald-700 dark:text-emerald-300', borderClass: 'border-emerald-300 dark:border-emerald-700' },
  instalacion: { dotClass: 'bg-orange-500', bgClass: 'bg-orange-50 dark:bg-orange-900/30', textClass: 'text-orange-700 dark:text-orange-300', borderClass: 'border-orange-300 dark:border-orange-700' },
  capacitacion: { dotClass: 'bg-indigo-500', bgClass: 'bg-indigo-50 dark:bg-indigo-900/30', textClass: 'text-indigo-700 dark:text-indigo-300', borderClass: 'border-indigo-300 dark:border-indigo-700' },
  seguimiento: { dotClass: 'bg-gray-500', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-700 dark:text-gray-300', borderClass: 'border-gray-300 dark:border-gray-700' },
}

// Turno color
export const TURNO_COLORS = {
  dotClass: 'bg-blue-500',
  bgClass: 'bg-blue-50 dark:bg-blue-900/30',
  textClass: 'text-blue-700 dark:text-blue-300',
  borderClass: 'border-blue-300 dark:border-blue-700',
}

// Google Calendar color
export const GOOGLE_COLORS = {
  dotClass: 'bg-sky-500',
  bgClass: 'bg-sky-50 dark:bg-sky-900/30',
  textClass: 'text-sky-700 dark:text-sky-300',
  borderClass: 'border-sky-300 dark:border-sky-700',
}

// Mantenimiento color
export const MANTENIMIENTO_COLORS = {
  dotClass: 'bg-amber-500',
  bgClass: 'bg-amber-50 dark:bg-amber-900/30',
  textClass: 'text-amber-700 dark:text-amber-300',
  borderClass: 'border-amber-300 dark:border-amber-700',
}

export function getTipoConfig(tipo: string): TipoEventoConfig {
  return TIPOS_EVENTO.find(t => t.id === tipo) || TIPOS_EVENTO[TIPOS_EVENTO.length - 1]
}
