'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker que hace que la app abra sin señal.
 *
 * Solo en producción: en desarrollo un service worker cachea el armazón viejo
 * y uno termina depurando una pantalla que ya no existe.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si falla, la app anda igual: pierde el modo offline, nada más.
    })
  }, [])
  return null
}
