import { usePrivacyStore } from '@/lib/stores/privacy-store'

export const CURRENCY_MASK = '$ ••••••'

/**
 * Formatea un monto en pesos respetando el modo privacidad global.
 *
 * Versión "plana" (no-hook): segura para usar a nivel de módulo, p. ej. en los
 * `columns.tsx` de las tablas. Lee el estado vía `getState()` (no reactivo por
 * sí mismo), pero como las celdas se re-renderizan cuando la página padre se
 * re-renderiza —y la página usa `useFormatCurrency()`, que sí es reactivo— el
 * toggle se propaga igual.
 *
 * Dentro de un componente React usá `useFormatCurrency()` en su lugar.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'ARS'
): string {
  if (usePrivacyStore.getState().hidden) return CURRENCY_MASK
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0)
}
