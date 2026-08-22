'use client'
import useSWR from 'swr'
const f = (u: string) => fetch(u).then((r) => r.json())
export function ProveedoresTab({ productoId }: { productoId: string }) {
  const { data, isLoading } = useSWR<{ proveedores: any[] }>(`/api/productos/${productoId}/proveedores`, f)
  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Cargando…</p>
  const proveedores = data?.proveedores ?? []
  if (!proveedores.length) return <p className="text-sm text-muted-foreground p-4">Sin proveedores cargados para este insumo.</p>
  return (
    <div className="divide-y">
      {proveedores.map((p) => (
        <div key={p.id} className="flex items-center justify-between py-2 px-1">
          <div>
            <p className="text-sm font-medium">{p.proveedor_nombre}</p>
            <p className="text-xs text-muted-foreground">
              {p.codigo_proveedor ?? ''}
              {p.es_principal ? ' · principal' : ''}
            </p>
          </div>
          <div className="text-right">
            {p.ultimo_precio != null ? (
              <p className="text-sm">{p.ultima_moneda} {p.ultimo_precio}</p>
            ) : null}
            {p.plazo_entrega_dias ? (
              <p className="text-xs text-muted-foreground">{p.plazo_entrega_dias}d entrega</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
