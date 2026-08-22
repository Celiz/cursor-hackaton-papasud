'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LecturaGps } from './use-gps'

const CLAVE_ID = 'papasud.dispositivo'
const CLAVE_NOMBRE = 'papasud.nombre'

/** Cada cuánto se reporta la posición. Menos que esto es ruido; más, se ve trabado. */
const INTERVALO_MS = 4000

/**
 * Identificador estable del teléfono. Se genera una vez y queda en el propio
 * dispositivo: no hace falta login por persona para que el mapa los distinga.
 */
export function idDispositivo(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(CLAVE_ID)
  if (!id) {
    id = `d-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(CLAVE_ID, id)
  }
  return id
}

export function nombreGuardado(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(CLAVE_NOMBRE) ?? ''
}

export function guardarNombre(n: string) {
  if (typeof window !== 'undefined') localStorage.setItem(CLAVE_NOMBRE, n)
}

interface Retorno {
  reportando: boolean
  enviados: number
  ultimoError: string | null
}

/**
 * Manda la posición al servidor mientras el GPS esté activo.
 *
 * Se acota a un envío cada 4 segundos aunque el GPS entregue lecturas más
 * seguido: caminando, entre dos lecturas de un segundo no hay diferencia
 * visible en pantalla y sí un montón de escrituras al pedo.
 */
export function usePresencia(
  lectura: LecturaGps | null,
  nombre: string,
  activo: boolean
): Retorno {
  const [enviados, setEnviados] = useState(0)
  const [ultimoError, setUltimoError] = useState<string | null>(null)
  const ultimoEnvio = useRef(0)
  const enVuelo = useRef(false)

  const reportar = useCallback(
    async (l: LecturaGps) => {
      if (enVuelo.current) return
      enVuelo.current = true
      try {
        const res = await fetch('/api/campo/presencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dispositivo: idDispositivo(),
            nombre: nombre || null,
            latitud: l.latitud,
            longitud: l.longitud,
            precision_m: l.precision_m,
            velocidad_ms: l.velocidad,
            rumbo: l.rumbo,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setUltimoError(j.error ?? `Error ${res.status}`)
        } else {
          setUltimoError(null)
          setEnviados((n) => n + 1)
        }
      } catch (e) {
        setUltimoError(e instanceof Error ? e.message : 'Sin conexión')
      } finally {
        enVuelo.current = false
      }
    },
    [nombre]
  )

  useEffect(() => {
    if (!activo || !lectura) return
    const ahora = Date.now()
    if (ahora - ultimoEnvio.current < INTERVALO_MS) return
    ultimoEnvio.current = ahora
    void reportar(lectura)
  }, [activo, lectura, reportar])

  return { reportando: activo && Boolean(lectura), enviados, ultimoError }
}

/**
 * Achica la foto a una miniatura para poder guardarla y mostrarla en el plano.
 * La imagen completa pesa megas y no hay dónde servirla.
 */
export async function miniaturaDe(dataUrl: string, lado = 160): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, lado / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * escala)
      c.height = Math.round(img.height * escala)
      const ctx = c.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
