import { usePrivacyStore } from '@/lib/stores/privacy-store'
import { formatCurrency } from '@/lib/format-currency'

/**
 * Formateador de montos consciente del modo privacidad, para usar dentro de
 * componentes React. Reemplaza las definiciones locales de `formatCurrency`:
 * misma firma `(amount, currency?) => string`.
 *
 * Suscribe al store de privacidad, así el componente se re-renderiza cuando se
 * activa/desactiva el modo privacidad desde el header.
 *
 * Uso:
 *   const formatCurrency = useFormatCurrency()
 *   ...
 *   {formatCurrency(saldo)}
 */
export function useFormatCurrency() {
  // Suscripción: fuerza el re-render del componente al togglear privacidad.
  usePrivacyStore((s) => s.hidden)
  return formatCurrency
}
