/**
 * Cola de captura offline.
 *
 * En el campo no hay señal. El teléfono igual puede sacar fotos y leer el GPS
 * —el GPS es satelital, no necesita datos— y el ingeniero puede escribir lo que
 * hizo. Lo que NO se puede hacer sin internet es analizar la foto ni extraer la
 * orden: eso necesita el modelo, que es remoto.
 *
 * Entonces: se CAPTURA offline y se PROCESA online. Todo lo que se saca en el
 * campo queda guardado en el teléfono, y cuando vuelve la señal se manda solo.
 *
 * Se usa IndexedDB y no localStorage porque las fotos son blobs de varios MB y
 * localStorage guarda strings con un tope de ~5 MB para todo el sitio.
 */

const BASE = 'papasud-campo'
const VERSION = 1
const TIENDA = 'pendientes'

export type TipoPendiente = 'foto' | 'orden'

export interface Pendiente {
  id: string
  tipo: TipoPendiente
  /** El cuerpo que hay que mandar cuando haya señal. */
  carga: Record<string, unknown>
  creado_at: number
  intentos: number
  ultimo_error: string | null
  /** Para mostrarlo en la lista sin abrir la carga. */
  resumen: string
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(BASE, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(TIENDA)) {
        const t = db.createObjectStore(TIENDA, { keyPath: 'id' })
        t.createIndex('creado_at', 'creado_at')
      }
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

async function conTienda<T>(
  modo: IDBTransactionMode,
  fn: (t: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await abrir()
  return new Promise<T>((res, rej) => {
    const tx = db.transaction(TIENDA, modo)
    const req = fn(tx.objectStore(TIENDA))
    req.onsuccess = () => res(req.result as T)
    req.onerror = () => rej(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function encolar(
  tipo: TipoPendiente,
  carga: Record<string, unknown>,
  resumen: string
): Promise<Pendiente> {
  const p: Pendiente = {
    id: `${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    carga,
    creado_at: Date.now(),
    intentos: 0,
    ultimo_error: null,
    resumen,
  }
  await conTienda('readwrite', (t) => t.add(p))
  return p
}

export async function pendientes(): Promise<Pendiente[]> {
  const todos = await conTienda<Pendiente[]>('readonly', (t) => t.getAll())
  return todos.sort((a, b) => a.creado_at - b.creado_at)
}

export async function quitar(id: string): Promise<void> {
  await conTienda('readwrite', (t) => t.delete(id))
}

async function marcarError(p: Pendiente, error: string): Promise<void> {
  await conTienda('readwrite', (t) =>
    t.put({ ...p, intentos: p.intentos + 1, ultimo_error: error })
  )
}

/** A dónde va cada tipo cuando se sincroniza. */
const DESTINO: Record<TipoPendiente, string> = {
  foto: '/api/campo/foto/analizar',
  orden: '/api/campo/ordenes',
}

/**
 * Cuántas veces se reintenta antes de dejar de insistir. Después de esto el
 * pendiente queda en la lista para que alguien decida a mano: puede ser una
 * foto corrupta, y reintentarla para siempre no la va a arreglar.
 */
export const MAX_INTENTOS = 5

export interface ResultadoSync {
  subidos: number
  fallados: number
  quedan: number
}

/**
 * Vacía la cola. Uno por uno y en orden: si la señal es mala, mejor que entre
 * el primero completo a que fallen cinco a medias.
 */
export async function sincronizar(
  alProgreso?: (p: Pendiente, ok: boolean) => void
): Promise<ResultadoSync> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { subidos: 0, fallados: 0, quedan: (await pendientes()).length }
  }

  let subidos = 0
  let fallados = 0

  for (const p of await pendientes()) {
    if (p.intentos >= MAX_INTENTOS) continue
    try {
      const res = await fetch(DESTINO[p.tipo], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.carga),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${res.status}`)
      }
      await quitar(p.id)
      subidos++
      alProgreso?.(p, true)
    } catch (e) {
      await marcarError(p, e instanceof Error ? e.message : 'Sin conexión')
      fallados++
      alProgreso?.(p, false)
      // Si se cortó la señal, no tiene sentido seguir intentando con el resto.
      if (typeof navigator !== 'undefined' && !navigator.onLine) break
    }
  }

  return { subidos, fallados, quedan: (await pendientes()).length }
}

/** Cuánto ocupa la cola, para avisar antes de llenar el teléfono. */
export async function espacioUsado(): Promise<{ bytes: number; cuota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  const e = await navigator.storage.estimate()
  return { bytes: e.usage ?? 0, cuota: e.quota ?? 0 }
}
