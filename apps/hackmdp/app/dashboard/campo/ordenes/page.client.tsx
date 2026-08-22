'use client'

import { useCallback, useState } from 'react'
import { useSpeechRecognition } from '@/lib/hooks/use-speech-recognition'
import useSWR, { mutate as globalMutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Mic, MicOff, Sparkles, ClipboardList, Loader2, AlertTriangle,
  Check, X, Quote, MapPin, Clock, Tractor, Beaker,
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Error al cargar')
  return data
}

interface InsumoExtraido {
  insumo_id: string | null
  insumo_nombre: string
  dosis_ha: number | null
  unidad: string | null
  cantidad: number | null
  fuera_de_rango: boolean
}

interface OrdenExtraida {
  parcela_id: string | null
  parcela_codigo: string | null
  pivote: string | null
  tercio: number | null
  superficie_ha: number | null
  tarea: string | null
  tarea_tipo_id: string | null
  fecha: string
  responsable_nombre: string | null
  maquinaria: string | null
  horas: number | null
  descripcion: string | null
  insumos: InsumoExtraido[]
  avisos: string[]
}

interface Orden {
  id: string
  numero: number
  fecha: string
  tarea: string
  descripcion: string | null
  parcela_codigo: string | null
  establecimiento: string | null
  responsable_nombre: string | null
  maquinaria: string | null
  horas: string | null
  estado: string
  origen: string
  origen_texto: string | null
  pivote: string | null
  tercio: number | null
  herramienta: string | null
  insumos: Array<{ insumo_nombre: string; cantidad: string | null; unidad: string | null; fuera_de_rango: boolean }>
}

const EJEMPLOS = [
  'Ayer tiramos Dithane dos y medio kilos por hectárea en el pivote B tercio 2, lo hicimos con el drone, aplicó Daniel.',
  'En el pivote A tercio 1 pasamos Daconil uno con tres y Magic cero seis con la pulverizadora, arrancamos seis de la mañana.',
  'Recorrí el pivote B tercio 3, hay pulgón en la cabecera norte, todavía poco pero conviene mirarlo la semana que viene.',
]

export default function OrdenesPageClient() {
  const { data: catalogos } = useSWR('/api/campo/catalogos', fetcher)
  const { data, isLoading, mutate } = useSWR<{ ordenes: Orden[] }>('/api/campo/ordenes', fetcher)

  const [texto, setTexto] = useState('')
  const [interpretando, setInterpretando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [orden, setOrden] = useState<OrdenExtraida | null>(null)

  // ── Dictado ──────────────────────────────────────────────────────────────
  // Reusa el hook de reconocimiento de voz de quirófano, acumulando frases:
  // una orden se dicta en varios tramos, no de un tirón.
  const {
    isListening: escuchando,
    isSupported: soportado,
    transcript: parcial,
    toggleListening: alternarDictado,
    stopListening: detenerDictado,
  } = useSpeechRecognition({
    lang: 'es-AR',
    continuous: true,
    onResult: useCallback((frase: string) => {
      const limpia = frase.trim()
      if (!limpia) return
      setTexto((prev) => (prev ? `${prev} ${limpia}` : limpia))
    }, []),
  })

  // ── Interpretación ───────────────────────────────────────────────────────
  const interpretar = async () => {
    if (texto.trim().length < 3) return
    if (escuchando) detenerDictado()
    setInterpretando(true)
    try {
      const res = await fetch('/api/campo/ordenes/extraer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo interpretar')
      setOrden(json.orden)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo interpretar')
    } finally {
      setInterpretando(false)
    }
  }

  const guardar = async () => {
    if (!orden) return
    setGuardando(true)
    try {
      const res = await fetch('/api/campo/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orden,
          estado: 'completada',
          herramienta: orden.maquinaria,
          origen: 'voz',
          origen_texto: texto,
          extraccion: { avisos: orden.avisos },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo guardar')
      toast.success(`Orden #${json.orden.numero} registrada`)
      setOrden(null)
      setTexto('')
      mutate()
      globalMutate('/api/campo/parcelas')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const parcelas = catalogos?.parcelas ?? []
  const tareas = catalogos?.tareas ?? []

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Órdenes de trabajo</h1>
          <p className="text-sm text-muted-foreground">
            Contá lo que hiciste. El sistema arma la orden.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          {data?.ordenes?.length ?? 0} registradas
        </Badge>
      </div>

      {/* ── Dictado ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Nueva orden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-start">
            <Button
              type="button"
              size="lg"
              variant={escuchando ? 'destructive' : 'default'}
              onClick={alternarDictado}
              disabled={!soportado}
              className="h-16 w-16 shrink-0 rounded-full p-0"
              aria-label={escuchando ? 'Detener dictado' : 'Dictar'}
            >
              {escuchando
                ? <MicOff className="h-6 w-6" />
                : <Mic className="h-6 w-6" />}
            </Button>

            <div className="flex-1 space-y-1.5">
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
                placeholder="Dictá o escribí lo que hiciste, con tus palabras…"
                className="resize-none"
              />
              {escuchando && (
                <p className="text-xs text-muted-foreground italic min-h-4">
                  {parcial || 'Escuchando…'}
                </p>
              )}
              {!soportado && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Este navegador no reconoce voz. Escribilo a mano — el resto funciona igual.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={interpretar} disabled={interpretando || texto.trim().length < 3}>
              {interpretando
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Interpretando…</>
                : <><Sparkles className="h-4 w-4 mr-2" />Armar la orden</>}
            </Button>
            {texto && (
              <Button variant="ghost" size="sm" onClick={() => { setTexto(''); setOrden(null) }}>
                Limpiar
              </Button>
            )}
            <div className="flex-1" />
            {!texto && EJEMPLOS.map((ej, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setTexto(ej)}
              >
                Ejemplo {i + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Lo extraído, editable ──────────────────────────────────────── */}
      {orden && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revisá antes de guardar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Quote className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="italic">{texto}</span>
              </div>
            </div>

            {orden.avisos.length > 0 && (
              <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3 space-y-1">
                {orden.avisos.map((a, i) => (
                  <p key={i} className="text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {a}
                  </p>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />Lote</Label>
                <Select
                  value={orden.parcela_id ?? ''}
                  onValueChange={(v) => {
                    const p = parcelas.find((x: { id: string }) => x.id === v)
                    setOrden({
                      ...orden,
                      parcela_id: v,
                      parcela_codigo: p?.codigo ?? null,
                      superficie_ha: p ? Number(p.superficie_ha) : null,
                    })
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Elegí el lote" /></SelectTrigger>
                  <SelectContent>
                    {parcelas.map((p: { id: string; codigo: string; establecimiento: string }) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo} — {p.establecimiento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ubicación</Label>
                <div className="h-9 flex items-center px-3 rounded-md border text-sm text-muted-foreground">
                  {orden.pivote
                    ? `Pivote ${orden.pivote}${orden.tercio ? ` · tercio ${orden.tercio}` : ''}`
                    : '—'}
                  {orden.superficie_ha && (
                    <span className="ml-auto tabular-nums">{orden.superficie_ha} ha</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tarea</Label>
                <Select
                  value={orden.tarea_tipo_id ?? ''}
                  onValueChange={(v) => {
                    const t = tareas.find((x: { id: string }) => x.id === v)
                    setOrden({ ...orden, tarea_tipo_id: v, tarea: t?.nombre ?? orden.tarea })
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={orden.tarea ?? 'Elegí la tarea'} /></SelectTrigger>
                  <SelectContent>
                    {tareas.map((t: { id: string; nombre: string }) => (
                      <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  value={orden.fecha}
                  onChange={(e) => setOrden({ ...orden, fecha: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Responsable</Label>
                <Input
                  value={orden.responsable_nombre ?? ''}
                  onChange={(e) => setOrden({ ...orden, responsable_nombre: e.target.value })}
                  placeholder="Sin asignar"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Tractor className="h-3 w-3" />Maquinaria</Label>
                <Input
                  value={orden.maquinaria ?? ''}
                  onChange={(e) => setOrden({ ...orden, maquinaria: e.target.value })}
                  placeholder="—"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Horas</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={orden.horas ?? ''}
                  onChange={(e) => setOrden({ ...orden, horas: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>

            {orden.insumos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Beaker className="h-3 w-3" />Insumos</Label>
                <div className="rounded-md border divide-y">
                  {orden.insumos.map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                      <span className="font-medium">{i.insumo_nombre}</span>
                      <span className="text-muted-foreground">
                        {i.dosis_ha ?? '—'} {i.unidad ?? ''}
                        {i.cantidad !== null && (
                          <span className="ml-2 text-foreground">· total {i.cantidad} {i.unidad?.split('/')[0] ?? ''}</span>
                        )}
                      </span>
                      {i.fuera_de_rango && (
                        <Badge variant="destructive" className="shrink-0">fuera de rango</Badge>
                      )}
                      {!i.insumo_id && (
                        <Badge variant="outline" className="shrink-0">sin catalogar</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones</Label>
              <Textarea
                rows={2}
                value={orden.descripcion ?? ''}
                onChange={(e) => setOrden({ ...orden, descripcion: e.target.value })}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={guardar} disabled={guardando || !orden.tarea}>
                {guardando
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
                  : <><Check className="h-4 w-4 mr-2" />Guardar orden</>}
              </Button>
              <Button variant="ghost" onClick={() => setOrden(null)}>
                <X className="h-4 w-4 mr-2" />Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Historial ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimas órdenes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Cargando…</p>
          )}
          <div className="divide-y">
            {(data?.ordenes ?? []).slice(0, 40).map((o) => (
              <div key={o.id} className="p-3 md:px-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-xs text-muted-foreground tabular-nums w-12">#{o.numero}</span>
                <span className="text-xs text-muted-foreground tabular-nums w-24">
                  {new Date(o.fecha).toLocaleDateString('es-AR')}
                </span>
                <Badge variant="outline" className="shrink-0">{o.parcela_codigo ?? 'sin lote'}</Badge>
                {o.pivote && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    piv. {o.pivote}{o.tercio ? `/${o.tercio}` : ''}
                  </span>
                )}
                <span className="text-sm font-medium flex-1 min-w-40">{o.tarea}</span>
                {o.responsable_nombre && (
                  <span className="text-xs text-muted-foreground">{o.responsable_nombre}</span>
                )}
                {o.herramienta && (
                  <span className="text-xs text-muted-foreground shrink-0">{o.herramienta}</span>
                )}
                {o.horas && (
                  <span className="text-xs text-muted-foreground tabular-nums">{Number(o.horas)} h</span>
                )}
                {o.origen !== 'manual' && (
                  <Badge className="gap-1 shrink-0">
                    {o.origen === 'voz' ? <Mic className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {o.origen}
                  </Badge>
                )}
                <Badge variant={o.estado === 'completada' ? 'secondary' : 'outline'} className="shrink-0">
                  {o.estado}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
