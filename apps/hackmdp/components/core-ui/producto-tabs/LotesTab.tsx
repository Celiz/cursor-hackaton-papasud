'use client'
import useSWR from 'swr'
const f = (u: string) => fetch(u).then((r) => r.json())
export function LotesTab({ productoId }: { productoId: string }) {
  // GET /api/inventario/lotes returns a bare array
  const { data, isLoading } = useSWR<any[]>(`/api/inventario/lotes?producto_id=${productoId}`, f)
  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Cargando…</p>
  const lotes = Array.isArray(data) ? data : []
  if (!lotes.length) return <p className="text-sm text-muted-foreground p-4">Sin lotes registrados.</p>
  return (
    <div className="divide-y">
      {lotes.map((l) => {
        const vencido = l.dias_hasta_vencimiento != null && l.dias_hasta_vencimiento < 0
        return (
          <div key={l.id} className="flex items-center justify-between py-2 px-1">
            <div>
              <p className="text-sm font-medium">{l.numero_lote}</p>
              <p className={`text-xs ${vencido ? 'text-red-600' : 'text-muted-foreground'}`}>
                {l.fecha_vencimiento
                  ? new Date(l.fecha_vencimiento).toLocaleDateString('es-AR')
                  : 'Sin vencimiento'}
              </p>
            </div>
            <span className="text-sm tabular-nums">{l.cantidad_disponible} u</span>
          </div>
        )
      })}
    </div>
  )
}
