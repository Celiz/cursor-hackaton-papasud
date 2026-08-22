/** Factor multiplicativo de un ajuste en % (con signo). aj=10 → 1.1 ; aj=-5 → 0.95. */
export function factorAjuste(ajuste: number | string | null | undefined): number {
  const n = typeof ajuste === "string" ? parseFloat(ajuste) : (ajuste ?? 0);
  return 1 + (Number.isFinite(n) ? n : 0) / 100;
}

/** Precio con el ajuste de la lista aplicado, redondeado a 2 decimales. */
export function precioConAjuste(precioNeto: number, ajuste: number | string | null | undefined): number {
  return Math.round(precioNeto * factorAjuste(ajuste) * 100) / 100;
}
