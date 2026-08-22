'use client'
import useSWR from 'swr'
const f = (u: string) => fetch(u).then((r) => r.json())
export function CompatibilidadTab({ productoId }: { productoId: string }) {
  const { data, isLoading } = useSWR<{ equipos: any[] }>(`/api/equipos-insumos?producto_id=${productoId}`, f)
  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Cargando…</p>
  const equipos = data?.equipos ?? []
  if (!equipos.length) return <p className="text-sm text-muted-foreground p-4">Ningún equipo registrado usa este insumo.</p>
  return (
    <div className="divide-y">
      {equipos.map((e) => (
        <div key={e.id} className="flex items-center justify-between py-2 px-1">
          <div>
            <p className="text-sm font-medium">{e.marca} {e.modelo}</p>
            <p className="text-xs text-muted-foreground">{e.tipo}{e.es_recomendado ? ' · recomendado' : ''}</p>
          </div>
          {e.consumo_aproximado ? <span className="text-xs text-muted-foreground">{e.consumo_aproximado} {e.unidad_consumo ?? ''}</span> : null}
        </div>
      ))}
    </div>
  )
}
