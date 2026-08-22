/**
 * Acumulación de lo que dicta el reconocimiento de voz.
 *
 * EL PROBLEMA: Chrome entrega `event.results` de forma ACUMULATIVA, y vuelve a
 * disparar `onresult` sobre resultados que ya había dado por finales. Si uno
 * simplemente concatena lo que llega, la misma frase entra dos y tres veces:
 * "pasamos con la pulverizadora pasamos con la pulverizadora".
 *
 * `event.resultIndex` debería marcar desde dónde hay novedades, pero no es
 * confiable: en dictado continuo Chrome lo deja quieto y reenvía el mismo
 * índice ya finalizado.
 *
 * LA SOLUCIÓN: llevar la cuenta de qué índices ya se emitieron y no volver a
 * emitirlos nunca. El índice, no el texto — dos frases iguales dichas a
 * propósito ("sí, sí") tienen que poder entrar las dos.
 *
 * Está acá y no adentro del hook para poder testearlo sin un navegador.
 */

export interface ResultadoVoz {
  /** Índice dentro de event.results. */
  indice: number
  texto: string
  esFinal: boolean
}

export interface EstadoDictado {
  /** El mayor índice ya emitido como final. -1 si no hubo ninguno. */
  ultimoFinal: number
}

export interface SalidaDictado {
  estado: EstadoDictado
  /** Lo nuevo que hay que agregar al texto acumulado. Vacío si no hubo novedad. */
  definitivo: string
  /** Lo que se está diciendo ahora, para mostrar en gris. */
  parcial: string
}

export const estadoInicial: EstadoDictado = { ultimoFinal: -1 }

/**
 * Decide qué es novedad y qué es repetición.
 *
 * Solo se emite lo final cuyo índice sea MAYOR al último emitido. Lo parcial se
 * devuelve siempre: es efímero y no se acumula.
 */
export function procesarResultados(
  resultados: ResultadoVoz[],
  estado: EstadoDictado
): SalidaDictado {
  let ultimoFinal = estado.ultimoFinal
  const nuevos: string[] = []
  const parciales: string[] = []

  for (const r of resultados) {
    if (r.esFinal) {
      if (r.indice > ultimoFinal) {
        const t = r.texto.trim()
        if (t) nuevos.push(t)
        ultimoFinal = r.indice
      }
      // Índice ya visto: es el reenvío de Chrome. Se descarta.
    } else {
      const t = r.texto.trim()
      if (t) parciales.push(t)
    }
  }

  return {
    estado: { ultimoFinal },
    definitivo: nuevos.join(' '),
    parcial: parciales.join(' '),
  }
}

/**
 * Une lo nuevo con lo que ya había, con un espacio y sin dobles espacios.
 * Si la frase nueva es idéntica a la última del texto acumulado, se descarta:
 * es la última red contra el reenvío, por si el índice tampoco alcanzó.
 */
export function unirDictado(acumulado: string, nuevo: string): string {
  const n = nuevo.trim()
  if (!n) return acumulado
  const a = acumulado.trim()
  if (!a) return n
  if (a.toLowerCase().endsWith(n.toLowerCase())) return a
  return `${a} ${n}`.replace(/\s+/g, ' ')
}
