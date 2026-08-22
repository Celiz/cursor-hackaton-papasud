/**
 * Normaliza un valor de fecha que viene de la API al formato `YYYY-MM-DD` que
 * exige `<input type="date">`.
 *
 * POR QUÉ EXISTE: `pg` devuelve las columnas `DATE` como objetos `Date` de JS,
 * que al serializarse a JSON salen como `2026-08-06T03:00:00.000Z`. Un
 * `<input type="date">` rechaza ese formato en silencio y se muestra VACÍO —
 * el dato está en la base pero el usuario ve el campo en blanco y cree que se
 * perdió. (Pasó con "Fecha planificada" en la ficha de instalación.)
 *
 * Corta el string en vez de reconstruir la fecha a propósito: una columna
 * `DATE` no tiene hora ni zona, y pasarla por `new Date(...).toISOString()` en
 * un huso al este de UTC la correría un día para atrás.
 */
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const s = value instanceof Date ? value.toISOString() : String(value);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : '';
}

/**
 * Muestra una columna `DATE` como `DD/MM/AAAA`, sin pasar por `Date`.
 *
 * `new Date('2026-08-13').toLocaleDateString('es-AR')` interpreta el string
 * como medianoche UTC y en Argentina (UTC-3) lo muestra como 12/08: un día
 * menos. Para una fecha sin hora eso es siempre un error, así que se arma
 * desde las partes del string.
 */
export function formatFechaAR(value: string | Date | null | undefined): string {
  const iso = toDateInput(value);
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
