import { cn } from '@/lib/utils';

// Pill de estado/tipo consistente en todo Servicio Técnico (mismo estilo que Préstamos):
// texto sobre tinte suave + borde + puntito de color. Un solo lugar para el look.
export type PillColor =
  | 'gray' | 'green' | 'emerald' | 'red' | 'blue' | 'amber' | 'yellow'
  | 'purple' | 'cyan' | 'indigo' | 'orange' | 'teal';

const pillStyles: Record<PillColor, { pill: string; dot: string }> = {
  gray:    { pill: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700/50 dark:bg-gray-800/40 dark:text-gray-300', dot: 'bg-gray-500' },
  green:   { pill: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-300', dot: 'bg-green-500' },
  emerald: { pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  red:     { pill: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300', dot: 'bg-red-500' },
  blue:    { pill: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300', dot: 'bg-blue-500' },
  amber:   { pill: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300', dot: 'bg-amber-500' },
  yellow:  { pill: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800/50 dark:bg-yellow-950/40 dark:text-yellow-300', dot: 'bg-yellow-500' },
  purple:  { pill: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-300', dot: 'bg-purple-500' },
  cyan:    { pill: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/50 dark:bg-cyan-950/40 dark:text-cyan-300', dot: 'bg-cyan-500' },
  indigo:  { pill: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-300', dot: 'bg-indigo-500' },
  orange:  { pill: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/40 dark:text-orange-300', dot: 'bg-orange-500' },
  teal:    { pill: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300', dot: 'bg-teal-500' },
};

export function EstadoPill({
  label,
  color,
  className,
}: {
  label: string;
  color: PillColor;
  className?: string;
}) {
  const s = pillStyles[color] ?? pillStyles.gray;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        s.pill,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
      {label}
    </span>
  );
}
