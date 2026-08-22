import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { redirect } from "next/navigation";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

/**
 * Formats a number as currency (ARS by default)
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'ARS')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an IVR number with the "IVR-" prefix
 * The database stores just the number (e.g., "000001"), this adds the prefix for display
 * @param {string | null | undefined} nroFactura - The IVR number from the database
 * @returns {string} Formatted IVR number (e.g., "IVR-000001")
 */
/**
 * Returns today's date as YYYY-MM-DD in Buenos Aires timezone.
 * Safe replacement for new Date().toISOString().split('T')[0] which returns UTC.
 */
export function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export function formatIvrNumber(nroFactura: string | null | undefined): string {
  if (!nroFactura) return 'IVR';
  // If it already has the prefix (legacy data), return as-is
  if (nroFactura.startsWith('IVR-')) return nroFactura;
  // Otherwise, add the prefix
  return `IVR-${nroFactura}`;
}
