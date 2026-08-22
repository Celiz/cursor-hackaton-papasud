/**
 * Geometría del pivote de riego.
 *
 * El campo de Papasud no son parcelas rectangulares: son círculos de riego.
 * Cada pivote se parte en cuatro cuadrantes, y dentro de cada cuadrante los
 * lotes son anillos concéntricos. Un lote, entonces, es un sector anular:
 * una franja entre dos radios y entre dos ángulos.
 *
 * Los ángulos van en grados de brújula — 0° al norte, creciendo en sentido
 * horario — porque así se lee el plano, que tiene la rosa de los vientos.
 */

export interface Sector {
  /** Radio interno, 0..1 (fracción del radio del pivote). */
  rDesde: number;
  /** Radio externo, 0..1. */
  rHasta: number;
  /** Ángulo inicial en grados de brújula (0 = norte). */
  desde: number;
  /** Ángulo final. */
  hasta: number;
}

/** Un punto del plano, en el sistema de coordenadas del SVG. */
export interface Punto {
  x: number;
  y: number;
}

/**
 * Cuadrantes tal como los numera el plano de Santa Ana: el pivote A usa 1 a 4
 * y el B usa 5 a 8, y en los dos el 1 (o el 5) es el noroeste, siguiendo en
 * sentido horario.
 */
export function anguloDeCuadrante(cuadrante: number): { desde: number; hasta: number } {
  const q = ((cuadrante - 1) % 4 + 4) % 4; // 0 = NO, 1 = NE, 2 = SE, 3 = SO
  const inicio = [270, 0, 90, 180][q];
  return { desde: inicio, hasta: inicio + 90 };
}

/**
 * Grados de brújula a coordenadas del SVG. En SVG el eje Y crece hacia abajo,
 * así que el norte es -y.
 */
export function puntoEnCirculo(cx: number, cy: number, radio: number, grados: number): Punto {
  const rad = ((grados - 90) * Math.PI) / 180; // -90 lleva el 0° al norte
  return {
    x: cx + radio * Math.cos(rad),
    y: cy + radio * Math.sin(rad),
  };
}

/**
 * Camino SVG de un sector anular. Se dibuja: arco externo en sentido horario,
 * baja al radio interno, arco interno de vuelta, cierra.
 *
 * `radio` es el radio del pivote en unidades del SVG; `rDesde` y `rHasta` son
 * fracciones de ese radio.
 */
export function caminoDeSector(
  cx: number,
  cy: number,
  radio: number,
  s: Sector
): string {
  const r0 = Math.max(0, Math.min(1, s.rDesde)) * radio;
  const r1 = Math.max(0, Math.min(1, s.rHasta)) * radio;
  const barrido = Math.abs(s.hasta - s.desde);
  const arcoLargo = barrido > 180 ? 1 : 0;

  const externoIni = puntoEnCirculo(cx, cy, r1, s.desde);
  const externoFin = puntoEnCirculo(cx, cy, r1, s.hasta);

  // Un sector que arranca en el centro es una porción de torta, no un anillo:
  // no lleva arco interno.
  if (r0 <= 0.0001) {
    return [
      `M ${cx.toFixed(2)} ${cy.toFixed(2)}`,
      `L ${externoIni.x.toFixed(2)} ${externoIni.y.toFixed(2)}`,
      `A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${arcoLargo} 1 ${externoFin.x.toFixed(2)} ${externoFin.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  }

  const internoIni = puntoEnCirculo(cx, cy, r0, s.desde);
  const internoFin = puntoEnCirculo(cx, cy, r0, s.hasta);

  return [
    `M ${internoIni.x.toFixed(2)} ${internoIni.y.toFixed(2)}`,
    `L ${externoIni.x.toFixed(2)} ${externoIni.y.toFixed(2)}`,
    `A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${arcoLargo} 1 ${externoFin.x.toFixed(2)} ${externoFin.y.toFixed(2)}`,
    `L ${internoFin.x.toFixed(2)} ${internoFin.y.toFixed(2)}`,
    `A ${r0.toFixed(2)} ${r0.toFixed(2)} 0 ${arcoLargo} 0 ${internoIni.x.toFixed(2)} ${internoIni.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** El centro del sector, para poner ahí la etiqueta del lote. */
export function centroDeSector(cx: number, cy: number, radio: number, s: Sector): Punto {
  const rMedio = ((s.rDesde + s.rHasta) / 2) * radio;
  const anguloMedio = (s.desde + s.hasta) / 2;
  return puntoEnCirculo(cx, cy, rMedio, anguloMedio);
}

// ───────────────────────────────────────────────────────────────────────────
// Ubicar un punto del mundo real dentro del pivote
// ───────────────────────────────────────────────────────────────────────────

const RADIO_TIERRA_M = 6_371_000;

/** Distancia en metros entre dos coordenadas, por la fórmula del haversine. */
export function distanciaMetros(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const aRad = (g: number) => (g * Math.PI) / 180;
  const dLat = aRad(lat2 - lat1);
  const dLng = aRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(a));
}

/** Rumbo en grados de brújula desde un punto hacia otro. */
export function rumboGrados(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const aRad = (g: number) => (g * Math.PI) / 180;
  const φ1 = aRad(lat1), φ2 = aRad(lat2), Δλ = aRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

export interface Pivote {
  nombre: string;
  latitud: number;
  longitud: number;
  /** Radio del círculo de riego, en metros. */
  radio_m: number;
}

export interface UbicacionEnPivote {
  pivote: string;
  /** Distancia al centro, en metros. */
  distancia_m: number;
  /** Radio normalizado 0..1. Mayor a 1 significa que está afuera del círculo. */
  radio: number;
  rumbo: number;
  cuadrante: number;
  tercio: number;
}

/**
 * Dónde está parado el ingeniero. Devuelve null si el punto cae fuera del
 * círculo de riego: mejor no decir nada que decir un lote equivocado.
 *
 * `cuadranteBase` es el número del primer cuadrante del pivote — 1 para el A,
 * 5 para el B — porque el plano los numera corrido.
 */
export function ubicarEnPivote(
  lat: number,
  lng: number,
  pivote: Pivote,
  cuadranteBase = 1
): UbicacionEnPivote | null {
  const distancia = distanciaMetros(lat, lng, pivote.latitud, pivote.longitud);
  const radio = distancia / pivote.radio_m;
  if (radio > 1) return null;

  const rumbo = rumboGrados(pivote.latitud, pivote.longitud, lat, lng);

  // El cuadrante 1 (o el 5) arranca en el noroeste, o sea a 270°.
  //
  // Sobre las líneas divisorias el resultado es genuinamente ambiguo: un punto
  // a la misma latitud que el centro, hacia el oeste, tiene rumbo 269,999° y no
  // 270 — la geodésica no corre paralela al ecuador. Cae en el cuadrante de al
  // lado, y está bien que así sea. A un metro de la línea el GPS de un celular
  // tampoco distingue; por eso la pantalla muestra la precisión, para que el
  // ingeniero sepa cuándo no confiar.
  const desdeNO = (rumbo - 270 + 360) % 360;
  const indice = Math.min(3, Math.floor(desdeNO / 90)); // 0..3

  return {
    pivote: pivote.nombre,
    distancia_m: Math.round(distancia),
    radio: Math.round(radio * 1000) / 1000,
    rumbo: Math.round(rumbo),
    cuadrante: cuadranteBase + indice,
    tercio: Math.min(3, Math.floor(radio * 3) + 1),
  };
}

/** El pivote más cercano en el que el punto cae adentro. */
export function ubicarEnCampo(
  lat: number,
  lng: number,
  pivotes: Array<Pivote & { cuadrante_base?: number }>
): UbicacionEnPivote | null {
  const dentro = pivotes
    .map((p) => ubicarEnPivote(lat, lng, p, p.cuadrante_base ?? 1))
    .filter((u): u is UbicacionEnPivote => u !== null)
    .sort((a, b) => a.distancia_m - b.distancia_m);
  return dentro[0] ?? null;
}
