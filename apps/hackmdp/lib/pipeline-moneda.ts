// Agregación del pipeline cuando hay oportunidades en pesos y en dólares.
//
// Existe porque el resumen del CRM hacía SUM(monto_estimado) sin mirar la
// columna moneda: sumaba 74.403.358 pesos con 2.148.535 dólares como si fueran
// la misma unidad.
//
// Se convierte a pesos con la cotización que quedó registrada en el presupuesto
// de cada oportunidad (presupuestos_equipos.cotizacion_usd), NO con la del día:
// el pipeline es una foto de lo que se cotizó, y con la cotización del día el
// número se movería solo sin que nadie venda ni pierda nada, rompiendo la
// comparación mes a mes.
//
// El desglose por moneda se devuelve SIN convertir, para que la pantalla pueda
// mostrar cuánto del total es dólar. Es el mismo criterio que
// lib/presupuesto-equipo-totales.ts.
//
// REGLA: ésta es la única implementación de la conversión. Ninguna consulta
// SQL debe sumar montos de distinta moneda; todas traen una fila por
// oportunidad y agregan acá. Si aparecen dos totales del mismo pipeline en la
// misma pantalla, tienen que salir de esta función.

export type MonedaPipeline = "ARS" | "USD";

export interface OportunidadMonto {
  /** Monto estimado en su moneda nativa. */
  monto: number;
  moneda: MonedaPipeline;
  /** Cotización del dólar registrada en el presupuesto. null si no hay. */
  cotizacion: number | null;
  /** Probabilidad de cierre en % (0-100). */
  probabilidad: number;
}

export interface TotalMoneda {
  moneda: MonedaPipeline;
  oportunidades: number;
  /** Suma en la moneda original, sin convertir. */
  monto: number;
}

export interface ResumenPipeline {
  /** Total convertido a pesos. Excluye las de USD sin cotización. */
  totalArs: number;
  /** Igual que totalArs pero multiplicando cada una por su probabilidad. */
  totalPonderadoArs: number;
  /** Desglose en moneda original. USD primero. */
  porMoneda: TotalMoneda[];
  /** Cuántas de USD no se pudieron convertir por falta de cotización. */
  sinCotizacion: number;
}

/**
 * Subconsulta SQL que trae la cotización a aplicarle a una oportunidad.
 * Asume que la tabla oportunidades_venta viene aliasada como `ov`.
 *
 * Filtra por pe.moneda = 'USD' a propósito: una oportunidad marcada en dólares
 * puede tener presupuestos en pesos, y esos presupuestos igual guardan un
 * cotizacion_usd de referencia. Sin el filtro, el monto en pesos de esa
 * oportunidad se multiplicaba por ~1495 e inflaba el pipeline de $476M a
 * $3.289M. Sin cotización propia, la oportunidad cae en `sinCotizacion` y la
 * pantalla avisa que falta el dato en vez de inventar un número.
 *
 * Está acá, junto a la regla de conversión, para que no se pueda cambiar una
 * sin ver la otra.
 */
export const SQL_COTIZACION_OPORTUNIDAD = `(SELECT MAX(pe.cotizacion_usd)
             FROM presupuestos_equipos pe
            WHERE pe.oportunidad_id = ov.id
              AND pe.moneda = 'USD')`;

const ORDEN: MonedaPipeline[] = ["USD", "ARS"];

/** Pesos que representa una oportunidad, o null si no se puede saber. */
function enPesos(item: OportunidadMonto): number | null {
  if (item.moneda === "ARS") return item.monto;
  if (item.cotizacion == null || item.cotizacion <= 0) return null;
  return item.monto * item.cotizacion;
}

export function agregarPipeline(items: OportunidadMonto[]): ResumenPipeline {
  let totalArs = 0;
  let totalPonderadoArs = 0;
  let sinCotizacion = 0;
  const acumulado = new Map<MonedaPipeline, TotalMoneda>();

  for (const item of items) {
    const actual = acumulado.get(item.moneda) ?? {
      moneda: item.moneda,
      oportunidades: 0,
      monto: 0,
    };
    actual.oportunidades += 1;
    actual.monto += item.monto;
    acumulado.set(item.moneda, actual);

    const pesos = enPesos(item);
    if (pesos == null) {
      sinCotizacion += 1;
      continue;
    }
    totalArs += pesos;
    totalPonderadoArs += (pesos * item.probabilidad) / 100;
  }

  const porMoneda = ORDEN.map((m) => acumulado.get(m)).filter(
    (t): t is TotalMoneda => t !== undefined
  );

  return { totalArs, totalPonderadoArs, porMoneda, sinCotizacion };
}

/** Cuántas oportunidades entraron en un resumen (convertidas o no). */
export function contarOportunidades(resumen: ResumenPipeline): number {
  return resumen.porMoneda.reduce((suma, m) => suma + m.oportunidades, 0);
}

/**
 * Parte el conjunto por una clave (etapa, vendedor, lo que sea) y agrega cada
 * grupo con la MISMA regla. Sirve para que el embudo por etapa y el ranking por
 * vendedor no puedan discrepar de la tarjeta principal: son la misma cuenta
 * sobre el mismo conjunto de filas.
 *
 * Devuelve un Map en orden de aparición.
 */
export function agregarPipelinePorClave<T extends OportunidadMonto>(
  items: T[],
  clave: (item: T) => string
): Map<string, ResumenPipeline> {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const k = clave(item);
    const lista = grupos.get(k);
    if (lista) lista.push(item);
    else grupos.set(k, [item]);
  }

  const resultado = new Map<string, ResumenPipeline>();
  for (const [k, lista] of grupos) {
    resultado.set(k, agregarPipeline(lista));
  }
  return resultado;
}
