'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  encolar, pendientes, sincronizar, quitar,
  type Pendiente, type TipoPendiente,
} from '@/lib/campo/cola-offline'

interface Retorno {
  enLinea: boolean
  cola: Pendiente[]
  sincronizando: boolean
  /** Guarda para mandar después. Devuelve lo que quedó encolado. */
  guardar: (tipo: TipoPendiente, carga: Record<string, unknown>, resumen: string) => Promise<Pendiente>
  /** Intenta vaciar la cola ahora. */
  sincronizarYa: () => Promise<void>
  descartar: (id: string) => Promise<void>
  refrescar: () => Promise<void>
}

/**
 * Estado de conexión y cola de pendientes.
 *
 * `navigator.onLine` miente seguido: dice que hay red cuando el celular está
 * enganchado a una antena que no llega a ningún lado. Por eso la señal
 * definitiva de que hay internet es que una subida funcione — y si falla, el
 * pendiente vuelve a la cola. El indicador de la pantalla es una pista, no una
 * promesa.
 */
export function useOffline(): Retorno {
  const [enLinea, setEnLinea] = useState(true)
  const [cola, setCola] = useState<Pendiente[]>([])
  const [sincronizando, setSincronizando] = useState(false)

  const refrescar = useCallback(async () => {
    try { setCola(await pendientes()) } catch { /* IndexedDB puede no estar */ }
  }, [])

  const sincronizarYa = useCallback(async () => {
    if (sincronizando) return
    setSincronizando(true)
    try {
      await sincronizar()
      await refrescar()
    } finally {
      setSincronizando(false)
    }
  }, [sincronizando, refrescar])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setEnLinea(navigator.onLine)
    void refrescar()

    const volvio = () => { setEnLinea(true); void sincronizarYa() }
    const cayo = () => setEnLinea(false)
    window.addEventListener('online', volvio)
    window.addEventListener('offline', cayo)

    // Reintento periódico: `online` no dispara si la señal vuelve sin que el
    // sistema operativo lo note, que en el campo pasa todo el tiempo.
    const t = setInterval(() => { if (navigator.onLine) void sincronizarYa() }, 30_000)

    return () => {
      window.removeEventListener('online', volvio)
      window.removeEventListener('offline', cayo)
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardar = useCallback(
    async (tipo: TipoPendiente, carga: Record<string, unknown>, resumen: string) => {
      const p = await encolar(tipo, carga, resumen)
      await refrescar()
      // Si hay señal se intenta al toque; si no, queda esperando.
      if (typeof navigator !== 'undefined' && navigator.onLine) void sincronizarYa()
      return p
    },
    [refrescar, sincronizarYa]
  )

  const descartar = useCallback(async (id: string) => {
    await quitar(id)
    await refrescar()
  }, [refrescar])

  return { enLinea, cola, sincronizando, guardar, sincronizarYa, descartar, refrescar }
}
