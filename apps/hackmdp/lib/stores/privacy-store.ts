import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Modo privacidad: oculta todos los montos en pesos de la app, para cuando
 * un cliente está mirando la pantalla y no debería ver saldos/totales.
 * El estado persiste en localStorage entre sesiones.
 */
interface PrivacyStore {
  hidden: boolean
  toggle: () => void
  setHidden: (hidden: boolean) => void
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      hidden: false,
      toggle: () => set((s) => ({ hidden: !s.hidden })),
      setHidden: (hidden) => set({ hidden }),
    }),
    { name: 'locus-privacy-mode' }
  )
)
