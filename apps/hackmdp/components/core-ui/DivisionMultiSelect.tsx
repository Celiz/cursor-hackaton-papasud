'use client'

import { DIVISIONES_CATALOGO, DivisionCatalogo } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DivisionMultiSelectProps {
  value: DivisionCatalogo[]
  onChange: (value: DivisionCatalogo[]) => void
  disabled?: boolean
  className?: string
}

const DIVISION_COLORS: Record<DivisionCatalogo, string> = {
  Laboratorios: 'bg-blue-100 text-blue-800 border-blue-200',
  Veterinaria: 'bg-green-100 text-green-800 border-green-200',
  Medica: 'bg-red-100 text-red-800 border-red-200',
  Investigacion: 'bg-purple-100 text-purple-800 border-purple-200',
  Estetica: 'bg-pink-100 text-pink-800 border-pink-200',
  Rehabilitacion: 'bg-orange-100 text-orange-800 border-orange-200',
}

const DIVISION_LABELS: Record<DivisionCatalogo, string> = {
  Laboratorios: 'Laboratorio',
  Veterinaria: 'Veterinaria',
  Medica: 'Médica',
  Investigacion: 'Investigación (I+D)',
  Estetica: 'Estética',
  Rehabilitacion: 'Rehabilitación',
}

export function DivisionMultiSelect({
  value,
  onChange,
  disabled = false,
  className
}: DivisionMultiSelectProps) {
  const handleToggle = (division: DivisionCatalogo) => {
    if (disabled) return

    if (value.includes(division)) {
      onChange(value.filter(d => d !== division))
    } else {
      onChange([...value, division])
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {DIVISIONES_CATALOGO.map((division) => (
          <div
            key={division}
            className={cn(
              'flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors',
              value.includes(division)
                ? DIVISION_COLORS[division]
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => handleToggle(division)}
          >
            <Checkbox
              id={`division-${division}`}
              checked={value.includes(division)}
              onCheckedChange={() => handleToggle(division)}
              disabled={disabled}
            />
            <Label
              htmlFor={`division-${division}`}
              className="text-sm font-medium cursor-pointer"
            >
              {DIVISION_LABELS[division]}
            </Label>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="text-sm text-muted-foreground">Seleccionadas:</span>
          {value.map((division) => (
            <Badge
              key={division}
              variant="outline"
              className={cn(DIVISION_COLORS[division], 'cursor-pointer')}
              onClick={() => handleToggle(division)}
            >
              {DIVISION_LABELS[division]}
              <span className="ml-1">×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Export for use in display-only contexts
export function DivisionBadges({ divisions }: { divisions: DivisionCatalogo[] }) {
  if (!divisions || divisions.length === 0) {
    return <span className="text-muted-foreground text-sm">Sin divisiones</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {divisions.map((division) => (
        <Badge
          key={division}
          variant="outline"
          className={cn(DIVISION_COLORS[division], 'text-xs')}
        >
          {DIVISION_LABELS[division]}
        </Badge>
      ))}
    </div>
  )
}

export { DIVISION_COLORS, DIVISION_LABELS }
