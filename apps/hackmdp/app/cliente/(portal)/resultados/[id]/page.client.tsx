'use client'

import useSWR from 'swr'
import { ArrowLeft, Download, AlertTriangle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function MiniSparkline({ points }: { points: { valor: string; fecha: string }[] }) {
  // Parse numeric values
  const nums = points
    .map(p => ({ val: parseFloat(p.valor), fecha: p.fecha }))
    .filter(p => !isNaN(p.val))

  if (nums.length < 2) return null

  const min = Math.min(...nums.map(n => n.val))
  const max = Math.max(...nums.map(n => n.val))
  const range = max - min || 1
  const w = 80
  const h = 24
  const padding = 2

  const pathPoints = nums.map((n, i) => {
    const x = padding + (i / (nums.length - 1)) * (w - padding * 2)
    const y = h - padding - ((n.val - min) / range) * (h - padding * 2)
    return `${x},${y}`
  })

  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline
        points={pathPoints.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-blue-500"
      />
      {/* Last point dot */}
      {(() => {
        const last = pathPoints[pathPoints.length - 1].split(',')
        return <circle cx={last[0]} cy={last[1]} r="2" className="fill-blue-500" />
      })()}
    </svg>
  )
}

function calculateAge(fechaNacimiento: string): string {
  const birth = new Date(fechaNacimiento)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  if (years > 0) return `${years} año${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`
  return 'Cachorro/a'
}

export default function ResultadoDetailClient({ ordenId, orgTheme }: { ordenId: string; orgTheme: string }) {
  const router = useRouter()
  const { data, error } = useSWR(`/cliente/api/resultados/${ordenId}`, fetcher)

  if (error) return <p className="text-red-500">Error al cargar los resultados</p>
  if (!data) return <p className="text-muted-foreground">Cargando...</p>

  const { orden, paciente, estudios, historial } = data

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/cliente/resultados')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Orden #{orden.numero}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(orden.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/vet/ordenes/${ordenId}/pdf`} target="_blank">
            <Download className="w-4 h-4 mr-2" /> PDF
          </a>
        </Button>
      </div>

      {/* Paciente info */}
      {paciente && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Paciente: </span>
                <span className="font-medium">{paciente.nombre}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Especie: </span>
                <span>{paciente.especie}</span>
              </div>
              {paciente.raza && (
                <div>
                  <span className="text-muted-foreground">Raza: </span>
                  <span>{paciente.raza}</span>
                </div>
              )}
              {paciente.sexo && (
                <div>
                  <span className="text-muted-foreground">Sexo: </span>
                  <span className="capitalize">{paciente.sexo}</span>
                </div>
              )}
              {paciente.fecha_nacimiento && (
                <div>
                  <span className="text-muted-foreground">Edad: </span>
                  <span>{calculateAge(paciente.fecha_nacimiento)}</span>
                </div>
              )}
              {paciente.peso && (
                <div>
                  <span className="text-muted-foreground">Peso: </span>
                  <span>{paciente.peso} kg</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estudios + Resultados */}
      {estudios.map((estudio: any) => (
        <Card key={estudio.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {estudio.nombre}
              <Badge variant="outline" className="text-xs">{estudio.estado}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estudio.resultados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pendiente de resultados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Parametro</th>
                      <th className="py-2 pr-4">Valor</th>
                      <th className="py-2 pr-4">Unidad</th>
                      <th className="py-2 pr-4">Referencia</th>
                      <th className="py-2">Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudio.resultados.map((r: any, i: number) => {
                      const outOfRange = r.fuera_rango
                      const history = historial[r.parametro]
                      return (
                        <tr key={i} className={`border-b last:border-0 ${outOfRange ? 'bg-red-50' : ''}`}>
                          <td className="py-2 pr-4 font-medium">
                            {r.parametro}
                            {outOfRange && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />}
                          </td>
                          <td className={`py-2 pr-4 ${outOfRange ? 'text-red-600 font-bold' : ''}`}>
                            {r.valor}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{r.unidad}</td>
                          <td className="py-2 pr-4 text-muted-foreground text-xs">
                            {r.ref_min != null && r.ref_max != null
                              ? `${r.ref_min} - ${r.ref_max}`
                              : r.ref_min != null
                                ? `>= ${r.ref_min}`
                                : r.ref_max != null
                                  ? `<= ${r.ref_max}`
                                  : '-'}
                          </td>
                          <td className="py-2">
                            {history && history.length > 1 && (
                              <MiniSparkline points={history} />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Observaciones */}
      {orden.observaciones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{orden.observaciones}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
