// Shared utilities for Creación pages

export const estadoColor: Record<string, string> = {
  idea: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  en_proceso: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  activa: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  pausada: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

export const estadoLabel: Record<string, string> = {
  idea: 'Idea',
  en_proceso: 'En proceso',
  activa: 'Activa',
  pausada: 'Pausada',
}

export function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}
