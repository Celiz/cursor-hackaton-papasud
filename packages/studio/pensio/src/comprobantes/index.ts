export type {
  Comprobante,
  ComprobanteItem,
  CreateComprobante,
  ComprobanteConPersona,
} from './types'

export {
  getComprobanteById,
  getComprobantesByOrg,
  getNextNumero,
  createComprobante,
  updateComprobanteAfip,
} from './queries'
