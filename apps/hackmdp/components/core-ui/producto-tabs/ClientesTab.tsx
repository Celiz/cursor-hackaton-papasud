'use client'
import useSWR from 'swr'
const f = (u: string) => fetch(u).then((r) => r.json())
export function ClientesTab({ productoId }: { productoId: string }) {
  // GET /api/productos/[id]/consumo returns { producto, clientes: [...], resumen }
  const { data, isLoading } = useSWR<{ clientes: any[] }>(`/api/productos/${productoId}/consumo`, f)
  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Cargando…</p>
  const clientes = data?.clientes ?? []
  if (!clientes.length) return <p className="text-sm text-muted-foreground p-4">Ningún cliente registrado consume este insumo.</p>
  return (
    <div className="divide-y">
      {clientes.map((c) => (
        <div key={c.cliente_id} className="flex items-center justify-between py-2 px-1">
          <div>
            <p className="text-sm font-medium">{c.cliente_nombre}</p>
            <p className="text-xs text-muted-foreground">
              {c.total_compras} compras
              {c.ultima_compra
                ? ` · última ${new Date(c.ultima_compra).toLocaleDateString('es-AR')}`
                : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm tabular-nums">{c.total_unidades} u</p>
            {c.promedio_mensual ? (
              <p className="text-xs text-muted-foreground">{c.promedio_mensual}/mes</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
