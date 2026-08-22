import { cn } from '@/lib/utils'

export interface Stat {
  label: string
  value: React.ReactNode
  hint?: string
  accent?: string // ej: 'text-blue-600' para el value
}

/**
 * Franja fina de métricas: reemplaza un grid de cards grandes por una sola
 * fila horizontal (~48px). Cada stat: value (grande) + label (chico) + hint.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap divide-x divide-gray-200 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        className
      )}
    >
      {stats.map((s, i) => (
        <div key={i} className="flex-1 min-w-[140px] px-3 py-2">
          <div className={cn('text-sm font-bold leading-tight text-gray-900 dark:text-gray-100', s.accent)}>
            {s.value}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
            {s.label}{s.hint ? ` · ${s.hint}` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
