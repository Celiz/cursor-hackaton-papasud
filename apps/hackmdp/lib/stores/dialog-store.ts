import { create } from 'zustand'

export type DialogType =
  | 'cliente'
  | 'servicio'
  | 'presupuesto'
  | 'producto'
  | 'equipo'
  | 'equipo-unidad'
  | 'oportunidad'
  | 'comodato'
  | 'factura'
  | 'pedido'
  | 'persona'
  | 'tarea'
  | 'ivr'
  | null

interface DialogStore {
  openDialog: DialogType
  setOpenDialog: (dialog: DialogType) => void
  closeDialog: () => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  openDialog: null,
  setOpenDialog: (dialog) => set({ openDialog: dialog }),
  closeDialog: () => set({ openDialog: null }),
}))
