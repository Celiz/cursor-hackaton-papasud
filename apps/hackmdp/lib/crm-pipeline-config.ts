import {
  Sparkles,
  FileText,
  Truck,
  Trophy,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from 'lucide-react'

export interface EtapaConfig {
  id: string
  nombre: string
  color: string
  borderColor: string
  iconBg: string
  textColor: string
  icon: LucideIcon
  probabilidad: number
}

export const ETAPAS: EtapaConfig[] = [
  {
    id: 'nuevo',
    nombre: 'Nuevos',
    color: 'from-slate-500/20 to-slate-600/10',
    borderColor: 'border-slate-300 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    icon: Sparkles,
    probabilidad: 10,
  },
  {
    id: 'propuesta',
    nombre: 'Propuesta',
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-300 dark:border-purple-700',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    textColor: 'text-purple-600 dark:text-purple-400',
    icon: FileText,
    probabilidad: 50,
  },
  {
    id: 'ganado',
    nombre: 'Ganados',
    color: 'from-yellow-500/20 to-amber-600/10',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    icon: Trophy,
    probabilidad: 100,
  },
  {
    id: 'logistica',
    nombre: 'Logística',
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-300 dark:border-blue-700',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: Truck,
    probabilidad: 100,
  },
  {
    id: 'finalizado',
    nombre: 'Finalizados',
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
    probabilidad: 100,
  },
  {
    id: 'interesados a futuro',
    nombre: 'Interesados a futuro',
    color: 'from-cyan-500/20 to-cyan-600/10',
    borderColor: 'border-cyan-300 dark:border-cyan-700',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    icon: Clock,
    probabilidad: 25,
  },
]
