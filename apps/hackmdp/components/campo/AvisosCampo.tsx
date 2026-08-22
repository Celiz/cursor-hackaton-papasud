'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ETIQUETA_HALLAZGO } from '@/lib/campo/vision'
import { referenciaDe } from '@/lib/campo/referencia'
import {
  AlertTriangle, Check, MapPin, Camera, ArrowRight, Loader2, RotateCcw,
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const d = await res.json()
  if (!res.ok) throw new Error(d.error ?? 'Error')
  return d
}

export interface Aviso {
  id: string
  hallazgo: string
  confianza: number
  urgente: boolean
  miniatura: string | null
  analisis_ia: string | null
  tomada_at: string
  tomada_por: string | null
  hace_seg: number
  latitud: number | null
  longitud: number | null
  parcela_id: string | null
  lote: string | null
  pivote: string | null
  tercio: number | null
  establecimiento: string | null
  revisado: boolean
  revisado_por: string | null
  resultado: string | null
}

function hace(seg: number): string {
  if (seg < 60) return `hace ${seg} s`
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  return `hace ${Math.floor(seg / 86400)} d`
}

/**
 * Los problemas que detectaron las fotos y todavía no revisó nadie.
 *
 * Se muestran con el lote para que alguien pueda ir a mirarlo, y se cierran
 * dejando por escrito qué se encontró — no se borran. Si la semana que viene
 * el lote sale con tizón, se puede volver y ver cuándo apareció el primer
 * signo y qué dijo quien fue a revisar.
 */
export function AvisosCampo({ compacto = false }: { compacto?: boolean }) {
  const { data, mutate } = useSWR<{ avisos: Aviso[]; abiertos: number; urgentes: number }>(
    '/api/campo/avisos', fetcher, { refreshInterval: 10_000 }
  )
  const [abierto, setAbierto] = useState<string | null>(null)
  const [resultado, setResultado] = useState('')
  const [guardando, setGuardando] = useState(false)

  const avisos = data?.avisos ?? []

  const marcar = async (a: Aviso, reabrir = false) => {
    setGuardando(true)
    try {
      const res = await fetch('/api/campo/avisos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: a.id,
          reabrir,
          resultado: reabrir ? null : (resultado || null),
          revisado_por:
            (typeof window !== 'undefined' && localStorage.getItem('papasud.nombre')) || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo guardar')
      toast.success(reabrir ? 'Aviso reabierto' : `${a.lote ?? 'Aviso'} marcado como revisado`)
      setAbierto(null)
      setResultado('')
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (avisos.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2.5 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-emerald-600" />
          Sin avisos pendientes. Las fotos que se sacaron no detectaron problemas.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={data?.urgentes ? 'border-red-400 dark:border-red-800' : undefined}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 p-3.5 pb-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <AlertTriangle className={`h-4 w-4 ${data?.urgentes ? 'text-red-600' : 'text-amber-600'}`} />
            Avisos del campo
          </p>
          <div className="flex items-center gap-1.5">
            {data?.urgentes ? (
              <Badge variant="destructive">{data.urgentes} urgente{data.urgentes > 1 ? 's' : ''}</Badge>
            ) : null}
            <Badge variant="outline">{data?.abiertos ?? 0} sin revisar</Badge>
          </div>
        </div>

        <div className="divide-y">
          {avisos.slice(0, compacto ? 4 : 20).map((a) => {
            const ref = referenciaDe(a.hallazgo as never)
            const expandido = abierto === a.id
            return (
              <div key={a.id} className={a.revisado ? 'opacity-55' : undefined}>
                <div
                  className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/40"
                  onClick={() => { setAbierto(expandido ? null : a.id); setResultado('') }}
                >
                  {a.miniatura ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.miniatura} alt="" className="w-14 h-14 rounded object-cover shrink-0 border" />
                  ) : (
                    <span className="w-14 h-14 rounded border grid place-items-center shrink-0 text-muted-foreground">
                      <Camera className="h-5 w-5" />
                    </span>
                  )}

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {ETIQUETA_HALLAZGO[a.hallazgo as keyof typeof ETIQUETA_HALLAZGO] ?? a.hallazgo}
                      </span>
                      {a.urgente && !a.revisado && <Badge variant="destructive" className="text-[10px]">urgente</Badge>}
                      {a.revisado && <Badge variant="secondary" className="text-[10px]">revisado</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {(a.confianza * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <MapPin className="h-3 w-3" />
                      {a.lote ?? 'sin lote'}
                      {a.pivote && ` · pivote ${a.pivote}${a.tercio ? `, tercio ${a.tercio}` : ''}`}
                      {' · '}{hace(a.hace_seg)}
                      {a.tomada_por && ` · ${a.tomada_por}`}
                    </p>
                    {a.revisado && a.resultado && (
                      <p className="text-xs italic">«{a.resultado}» — {a.revisado_por ?? 'alguien'}</p>
                    )}
                  </div>
                </div>

                {expandido && (
                  <div className="px-3 pb-3 pl-20 space-y-2">
                    {/* Las coordenadas exactas donde se sacó la foto: es lo que
                        permite ir al punto y no al lote entero, que son hectáreas. */}
                    {a.latitud !== null && a.longitud !== null && (
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {a.latitud.toFixed(6)}, {a.longitud.toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${a.latitud},${a.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--badge-blue-500)] underline underline-offset-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          cómo llegar
                        </a>
                        <button
                          type="button"
                          className="text-muted-foreground underline underline-offset-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard?.writeText(`${a.latitud}, ${a.longitud}`)
                            toast.success('Coordenadas copiadas')
                          }}
                        >
                          copiar
                        </button>
                      </div>
                    )}

                    {ref?.diferencial && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Qué mirar: </span>
                        {ref.diferencial}
                      </p>
                    )}
                    {a.revisado ? (
                      <Button size="sm" variant="outline" onClick={() => marcar(a, true)} disabled={guardando}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reabrir
                      </Button>
                    ) : (
                      <>
                        <Input
                          value={resultado}
                          onChange={(e) => setResultado(e.target.value)}
                          placeholder="Qué encontraste al ir a mirar…"
                          className="h-9"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => marcar(a)} disabled={guardando}>
                            {guardando
                              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              : <Check className="h-3.5 w-3.5 mr-1.5" />}
                            Marcar revisado
                          </Button>
                          {a.parcela_id && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/dashboard/campo/ordenes?lote=${a.parcela_id}`}>
                                Cargar orden <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
