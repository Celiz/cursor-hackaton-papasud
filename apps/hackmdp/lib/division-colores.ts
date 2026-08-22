/**
 * Colores de una división de cliente.
 *
 * `cliente_divisiones.color` guarda una CLAVE ('rojo', 'violeta', ...), no una
 * clase de CSS. El motivo: Tailwind borra en el build toda clase que no
 * encuentre escrita literal en el código, así que un `text-${color}-700` armado
 * al vuelo no existiría en producción y el color saldría transparente. Por eso
 * el mapa vive acá, con las clases completas a la vista.
 *
 * Antes esto era un ternario repetido en 10 lugares (`isVeterinaria ?
 * 'text-violet-700' : 'text-red-700'`), que ademas trataba como "humanos" a
 * cualquier división que no fuera veterinaria: una división nueva salía roja en
 * silencio, sin error.
 *
 * Para sumar un color: agregarlo acá y queda ofrecido solo en el ABM.
 */

export interface DivisionColor {
  /** Lo que se ve en el selector del ABM. */
  label: string;
  /** Texto de acento (títulos del presupuesto). */
  texto: string;
  /** Fondo de acento (barras del presupuesto). */
  fondo: string;
  /** Íconos. */
  icono: string;
  /** Badge con borde. */
  badge: string;
  /** Puntito de color en las listas. */
  punto: string;
}

export const DIVISION_COLORES: Record<string, DivisionColor> = {
  rojo:    { label: 'Rojo',    texto: 'text-red-700',     fondo: 'bg-red-700',     icono: 'text-red-500',     badge: 'border-red-300 text-red-600',         punto: 'bg-red-500' },
  violeta: { label: 'Violeta', texto: 'text-violet-700',  fondo: 'bg-violet-700',  icono: 'text-violet-500',  badge: 'border-violet-300 text-violet-600',   punto: 'bg-violet-500' },
  azul:    { label: 'Azul',    texto: 'text-blue-700',    fondo: 'bg-blue-700',    icono: 'text-blue-500',    badge: 'border-blue-300 text-blue-600',       punto: 'bg-blue-500' },
  verde:   { label: 'Verde',   texto: 'text-emerald-700', fondo: 'bg-emerald-700', icono: 'text-emerald-500', badge: 'border-emerald-300 text-emerald-600', punto: 'bg-emerald-500' },
  ambar:   { label: 'Ámbar',   texto: 'text-amber-700',   fondo: 'bg-amber-700',   icono: 'text-amber-500',   badge: 'border-amber-300 text-amber-600',     punto: 'bg-amber-500' },
  cyan:    { label: 'Cyan',    texto: 'text-cyan-700',    fondo: 'bg-cyan-700',    icono: 'text-cyan-500',    badge: 'border-cyan-300 text-cyan-600',       punto: 'bg-cyan-500' },
};

/** El de 'humanos', que es lo que salía antes cuando no era veterinaria. */
export const DIVISION_COLOR_DEFAULT = 'rojo';

export const DIVISION_COLOR_CLAVES = Object.keys(DIVISION_COLORES);

/** Nunca devuelve null: una división sin color (o con uno viejo) cae al default. */
export function coloresDeDivision(color?: string | null): DivisionColor {
  return DIVISION_COLORES[color ?? ''] ?? DIVISION_COLORES[DIVISION_COLOR_DEFAULT];
}

export interface DivisionLike {
  nombre: string;
  color?: string | null;
}

/**
 * Los colores de un cliente según su división, resueltos contra el catálogo.
 * `divisiones` es lo que devuelve GET /api/divisiones.
 */
export function coloresDeCliente(
  division: string | null | undefined,
  divisiones: DivisionLike[] | undefined
): DivisionColor {
  const encontrada = (divisiones ?? []).find((d) => d.nombre === division);
  return coloresDeDivision(encontrada?.color);
}

/** Cómo se escribe la división en pantalla. Sin catálogo, se muestra tal cual. */
export function etiquetaDeDivision(division: string | null | undefined): string {
  if (!division) return '—';
  // Las dos historicas venian en minuscula y se mostraban con nombre propio.
  if (division === 'humanos') return 'Laboratorio Humano';
  if (division === 'veterinaria') return 'Veterinaria';
  return division;
}
