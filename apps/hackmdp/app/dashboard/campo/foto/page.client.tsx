'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useGps } from '@/lib/hooks/use-gps'
import { ubicarEnCampo, type Pivote } from '@/lib/campo/pivote'
import { UMBRAL_CONFIANZA, type Diagnostico } from '@/lib/campo/vision'
import { referenciaDe } from '@/lib/campo/referencia'
import {
  Camera, Upload, Loader2, AlertTriangle, MapPin, Save, X, Eye, Satellite,
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const d = await res.json()
  if (!res.ok) throw new Error(d.error ?? 'Error')
  return d
}

interface PivoteApi extends Pivote { cuadrante_base: number }
interface Lote {
  id: string; codigo: string; pivote: string | null
  cuadrante: number | null; anillo_desde: number | null; anillo_hasta: number | null
}

const COLOR_HALLAZGO: Record<string, string> = {
  tizon_tardio: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300',
  virosis: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300',
  tizon_temprano: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
  dano_por_insecto: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
  sana: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
  no_concluyente: 'bg-muted text-muted-foreground',
}

export default function FotoPageClient() {
  const { data } = useSWR<{ pivotes: PivoteApi[]; lotes: Lote[] }>('/api/campo/pivotes', fetcher)
  const gps = useGps()
  const inputRef = useRef<HTMLInputElement>(null)

  const [imagen, setImagen] = useState<string | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [diag, setDiag] = useState<Diagnostico | null>(null)
  const [loteManual, setLoteManual] = useState<string | null>(null)

  const lotes = data?.lotes ?? []

  // El GPS propone el lote; se puede corregir a mano.
  const ubicacion = useMemo(() => {
    if (!gps.lectura || !data?.pivotes?.length) return null
    return ubicarEnCampo(gps.lectura.latitud, gps.lectura.longitud, data.pivotes)
  }, [gps.lectura, data?.pivotes])

  const loteGps = useMemo(() => {
    if (!ubicacion) return null
    return lotes.find(
      (l) =>
        l.pivote === ubicacion.pivote &&
        l.cuadrante === ubicacion.cuadrante &&
        ubicacion.radio * 100 >= Number(l.anillo_desde ?? 0) &&
        ubicacion.radio * 100 <= Number(l.anillo_hasta ?? 100)
    ) ?? null
  }, [ubicacion, lotes])

  const loteElegido = loteManual ?? loteGps?.id ?? null
  const lote = lotes.find((l) => l.id === loteElegido) ?? null

  const tomarFoto = useCallback((archivo: File) => {
    if (archivo.size > 6 * 1024 * 1024) {
      toast.error('La foto pesa más de 6 MB. Sacala con menos resolución.')
      return
    }
    const lector = new FileReader()
    lector.onload = () => {
      setImagen(lector.result as string)
      setDiag(null)
    }
    lector.readAsDataURL(archivo)
  }, [])

  const analizar = async () => {
    if (!imagen) return
    setAnalizando(true)
    setDiag(null)
    try {
      const res = await fetch('/api/campo/foto/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen,
          parcela_id: loteElegido,
          latitud: gps.lectura?.latitud ?? null,
          longitud: gps.lectura?.longitud ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo analizar')
      setDiag(json.diagnostico)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo analizar')
    } finally {
      setAnalizando(false)
    }
  }

  const guardar = async () => {
    if (!imagen || !diag) return
    setGuardando(true)
    try {
      const res = await fetch('/api/campo/foto/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen,
          parcela_id: loteElegido,
          latitud: gps.lectura?.latitud ?? null,
          longitud: gps.lectura?.longitud ?? null,
          guardar: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo guardar')
      toast.success(`Observación guardada en ${lote?.codigo ?? 'el lote'}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Foto del cultivo</h1>
        <p className="text-sm text-muted-foreground">
          Sacá la foto en el lote. El GPS dice dónde estás y el análisis queda adjunto ahí.
        </p>
      </div>

      {/* Dónde estás */}
      <Card>
        <CardContent className="p-3.5 flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            variant={gps.estado === 'siguiendo' ? 'secondary' : 'outline'}
            onClick={gps.estado === 'siguiendo' ? gps.detener : gps.arrancar}
          >
            <Satellite className="h-4 w-4 mr-1.5" />
            {gps.estado === 'siguiendo' ? 'GPS activo' : 'Prender GPS'}
          </Button>

          {ubicacion && (
            <span className="text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Pivote {ubicacion.pivote} · cuadrante {ubicacion.cuadrante}
              {gps.lectura && (
                <span className="text-xs text-muted-foreground">
                  ±{gps.lectura.precision_m.toFixed(0)} m
                </span>
              )}
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Label className="text-xs text-muted-foreground">Lote</Label>
            <Select value={loteElegido ?? ''} onValueChange={setLoteManual}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Elegí el lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.codigo}{l.pivote ? ` · piv. ${l.pivote}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* La foto */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {imagen ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagen} alt="Foto del cultivo" className="w-full rounded-md max-h-96 object-contain bg-muted" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => { setImagen(null); setDiag(null) }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-28 flex-col gap-2"
                onClick={() => inputRef.current?.click()}
              >
                <Camera className="h-7 w-7" />
                <span className="text-sm">Sacar foto</span>
              </Button>
              <Button
                variant="outline"
                className="h-28 flex-col gap-2"
                onClick={() => {
                  const i = document.createElement('input')
                  i.type = 'file'; i.accept = 'image/*'
                  i.onchange = () => i.files?.[0] && tomarFoto(i.files[0])
                  i.click()
                }}
              >
                <Upload className="h-7 w-7" />
                <span className="text-sm">Subir del rollo</span>
              </Button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && tomarFoto(e.target.files[0])}
          />

          {imagen && (
            <Button onClick={analizar} disabled={analizando} className="w-full">
              {analizando
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mirando la foto…</>
                : <><Eye className="h-4 w-4 mr-2" />Analizar</>}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* El diagnóstico */}
      {diag && (
        <Card className={diag.urgente ? 'border-red-400 dark:border-red-800' : undefined}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-md border text-sm font-medium ${
                  COLOR_HALLAZGO[diag.hallazgo] ?? COLOR_HALLAZGO.no_concluyente
                }`}
              >
                {diag.etiqueta}
              </span>
              <div className="flex items-center gap-2">
                {diag.severidad && <Badge variant="outline">severidad {diag.severidad}</Badge>}
                <Badge variant={diag.confianza >= UMBRAL_CONFIANZA ? 'secondary' : 'outline'}>
                  confianza {(diag.confianza * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>

            {diag.urgente && (
              <p className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                En semilla fiscalizada esto conviene confirmarlo el mismo día.
              </p>
            )}

            {diag.visible && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lo que se ve</p>
                <p className="text-sm">{diag.visible}</p>
              </div>
            )}
            {diag.observacion && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Interpretación</p>
                <p className="text-sm">{diag.observacion}</p>
              </div>
            )}
            {diag.recomendacion && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sugerencia</p>
                <p className="text-sm">{diag.recomendacion}</p>
              </div>
            )}

            {diag.avisos.length > 0 && (
              <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-2.5 space-y-1">
                {diag.avisos.map((a, i) => (
                  <p key={i} className="text-xs text-amber-800 dark:text-amber-300">{a}</p>
                ))}
              </div>
            )}

            {/* Lo que el sistema sabe de ese cuadro. Es una consulta real a la
                referencia local por la clase que devolvió el modelo. */}
            {(() => {
              const ref = referenciaDe(diag.hallazgo)
              if (!ref) return null
              return (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Ficha de {diag.etiqueta.toLowerCase()}
                  </p>
                  <ul className="text-sm space-y-0.5 list-disc list-inside marker:text-muted-foreground">
                    {ref.signos.map((sg, i) => <li key={i}>{sg}</li>)}
                  </ul>
                  {ref.diferencial && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Se confunde con: </span>
                      {ref.diferencial}
                    </p>
                  )}
                  {ref.manejo && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Manejo: </span>{ref.manejo}
                    </p>
                  )}
                  {ref.ventana_dias && (
                    <p className="text-xs text-muted-foreground">
                      Ventana de referencia entre aplicaciones preventivas:{' '}
                      {ref.ventana_dias} días.
                    </p>
                  )}
                </div>
              )
            })()}

            <p className="text-[11px] text-muted-foreground border-t pt-2">
              Esto es una observación, no un diagnóstico de laboratorio. No indica dosis
              ni dispara una aplicación: la decisión es del agrónomo.
            </p>

            <Button onClick={guardar} disabled={guardando || !loteElegido} className="w-full">
              {guardando
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
                : <><Save className="h-4 w-4 mr-2" />Guardar en {lote?.codigo ?? 'el lote'}</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
