'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface LecturaGps {
  latitud: number
  longitud: number
  /** Radio de incertidumbre en metros, tal como lo reporta el navegador. */
  precision_m: number
  altitud: number | null
  /** Velocidad en m/s, si el dispositivo la informa. */
  velocidad: number | null
  rumbo: number | null
  momento: number
}

export type EstadoGps =
  | 'inactivo'
  | 'pidiendo-permiso'
  | 'buscando'
  | 'siguiendo'
  | 'denegado'
  | 'no-soportado'
  | 'error'

interface Retorno {
  estado: EstadoGps
  lectura: LecturaGps | null
  error: string | null
  /** Cuántas lecturas llegaron desde que se encendió. */
  lecturas: number
  seguro: boolean
  arrancar: () => void
  detener: () => void
}

/**
 * Seguimiento del GPS en tiempo real.
 *
 * `watchPosition` con `enableHighAccuracy` deja prendido el GPS del teléfono y
 * avisa en cada lectura nueva, en vez de dar una posición única. Es lo que
 * permite ver el punto moverse mientras se camina.
 *
 * GOTCHA: el navegador solo entrega ubicación en contexto seguro. Anda en
 * https:// y en localhost, pero NO en http:// contra una IP de la red local —
 * ahí el permiso ni siquiera se pide. Por eso se expone `seguro`, para poder
 * decirlo en pantalla en vez de dejar al usuario esperando un punto que no
 * va a llegar.
 */
export function useGps(): Retorno {
  const [estado, setEstado] = useState<EstadoGps>('inactivo')
  const [lectura, setLectura] = useState<LecturaGps | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lecturas, setLecturas] = useState(0)
  const [seguro, setSeguro] = useState(true)
  const watchRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSeguro(window.isSecureContext)
  }, [])

  const detener = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setEstado('inactivo')
  }, [])

  const arrancar = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setEstado('no-soportado')
      return
    }
    if (!window.isSecureContext) {
      setSeguro(false)
      setEstado('error')
      setError('El navegador no da ubicación sobre http://. Hace falta https o localhost.')
      return
    }
    if (watchRef.current !== null) return

    setEstado(lectura ? 'siguiendo' : 'pidiendo-permiso')
    setError(null)

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setEstado('siguiendo')
        setLecturas((n) => n + 1)
        setLectura({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precision_m: pos.coords.accuracy,
          altitud: pos.coords.altitude,
          velocidad: pos.coords.speed,
          rumbo: pos.coords.heading,
          momento: pos.timestamp,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setEstado('denegado')
          setError('Permiso de ubicación denegado. Habilitalo para este sitio y volvé a intentar.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setEstado('error')
          setError('El dispositivo no pudo obtener la posición. Probá al aire libre.')
        } else {
          setEstado('error')
          setError(err.message || 'No se pudo leer el GPS.')
        }
      },
      {
        enableHighAccuracy: true,
        // Sin caché: siempre la lectura fresca, que es de lo que se trata.
        maximumAge: 0,
        timeout: 20_000,
      }
    )
  }, [lectura])

  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
  }, [])

  return { estado, lectura, error, lecturas, seguro, arrancar, detener }
}
