import { format, formatDistanceToNow, isValid } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formateadores de fecha SEGUROS: una fecha nula/inválida/ausente devuelve el
 * fallback en vez de tirar "RangeError: Invalid time value" (que crashea todo
 * el árbol de React). Acepta strings ISO, date-only, Date o undefined.
 */
export function safeFormat(
  value: string | Date | null | undefined,
  pattern: string,
  fallback = "—"
): string {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, pattern, { locale: es }) : fallback;
}

export function safeRelative(
  value: string | Date | null | undefined,
  fallback = ""
): string {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: es }) : fallback;
}
