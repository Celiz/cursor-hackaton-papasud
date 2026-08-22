'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  PlanoPivote, type LotePivote, type DispositivoEnPlano, type FotoEnPlano,
} from '@/components/campo/PlanoPivote'
import { useGps } from '@/lib/hooks/use-gps'
import {
  usePresencia, idDispositivo, nombreGuardado, guardarNombre, miniaturaDe,
} from '@/lib/hooks/use-presencia'
import { distanciaMetros, rumboGrados, type Pivote } from '@/lib/campo/pivote'
import { UMBRAL_CONFIANZA, ETIQUETA_HALLAZGO, type Diagnostico } from '@/lib/campo/vision'
import {
  Camera, Satellite, Users, Loader2, AlertTriangle, X, Radio, MapPin,
} from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const d = await res.json()
  if (!res.ok) throw new Error(d.error ?? 'Error')
  return d
}

interface PivoteApi extends Pivote { id: string; cuadrante_base: number }
interface DispositivoApi {
  dispositivo: string; nombre: string | null
  latitud: number; longitud: number; precision_m: number | null
  velocidad_ms: number | null; pivote: string | null; cuadrante: number | null
  tercio: number | null; lote: string | null; hace_seg: number
}
interface FotoApi {
  id: string; latitud: number | null; longitud: number | null
  tomada_por: string | null; hallazgo: string | null; confianza: number | null
  urgente: boolean; miniatura: string | null; hace_seg: number
  lote: string | null; pivote: string | null; analisis_ia: string | null
}

/** Modo demo: el pivote se centra donde estás y se achica, para mostrarlo caminando. */
const RADIO_DEMO_M = 40

export default function VivoPageClient() {
  const { data: base } = useSWR<{ pivotes: PivoteApi[]; lotes: LotePivote[] }>(
    '/api/campo/pivotes', fetcher
  )
  // Refresco corto: es lo que hace que se vea "en vivo".
  const { data: presencia } = useSWR<{ dispositivos: DispositivoApi[] }>(
    '/api/campo/presencia', fetcher, { refreshInterval: 2500 }
  )
  const { data: fotosData, mutate: mutarFotos } = useSWR<{ fotos: FotoApi[] }>(
    '/api/campo/fotos?limite=40', fetcher, { refreshInterval: 4000 }
  )

  const gps = useGps()
  const [nombre, setNombre] = useState('')
  const [compartir, setCompartir] = useState(false)
  const [demo, setDemo] = useState(false)
  const [ancla, setAncla] = useState<{ lat: number; lng: number } | null>(null)
  const [pivoteVisible, setPivoteVisible] = useState<string | null>(null)
  const [fotoAbierta, setFotoAbierta] = useState<FotoApi | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [ultimo, setUltimo] = useState<Diagnostico | null>(null)
  const camaraRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setNombre(nombreGuardado()) }, [])

  usePresencia(gps.lectura, nombre, compartir)

  useEffect(() => {
    if (demo && gps.lectura && !ancla) {
      setAncla({ lat: gps.lectura.latitud, lng: gps.lectura.longitud })
    }
    if (!demo) setAncla(null)
  }, [demo, gps.lectura, ancla])

  const pivotes = useMemo<PivoteApi[]>(() => {
    const reales = base?.pivotes ?? []
    if (!demo || !ancla) return reales
    const b = reales[0]
    return [{
      ...(b ?? { id: 'demo', nombre: 'A', cuadrante_base: 1 } as PivoteApi),
      latitud: ancla.lat, longitud: ancla.lng, radio_m: RADIO_DEMO_M,
    }]
  }, [base?.pivotes, demo, ancla])

  const pivoteActual = pivoteVisible ?? pivotes[0]?.nombre ?? null
  const pivoteObj = pivotes.find((p) => p.nombre === pivoteActual)
  const lotes = (base?.lotes ?? []).filter((l) => l.pivote === pivoteActual)

  /** Convierte lat/lng a radio y rumbo dentro del pivote que se está mirando. */
  const enPlano = useCallback(
    (lat: number, lng: number) => {
      if (!pivoteObj) return null
      const d = distanciaMetros(lat, lng, pivoteObj.latitud, pivoteObj.longitud)
      const r = d / pivoteObj.radio_m
      if (r > 1.05) return null
      return { radio: r, rumbo: rumboGrados(pivoteObj.latitud, pivoteObj.longitud, lat, lng) }
    },
    [pivoteObj]
  )

  const dispositivos = useMemo<DispositivoEnPlano[]>(() => {
    return (presencia?.dispositivos ?? [])
      .map((d) => {
        const p = enPlano(d.latitud, d.longitud)
        if (!p) return null
        return {
          dispositivo: d.dispositivo,
          nombre: d.nombre,
          radio: p.radio,
          rumbo: p.rumbo,
          precision_m: d.precision_m,
          hace_seg: d.hace_seg,
          lote: d.lote,
          moviendose: (d.velocidad_ms ?? 0) > 0.3,
        } as DispositivoEnPlano
      })
      .filter((d): d is DispositivoEnPlano => d !== null)
  }, [presencia?.dispositivos, enPlano])

  const fotos = useMemo<FotoEnPlano[]>(() => {
    return (fotosData?.fotos ?? [])
      .map((f) => {
        if (f.latitud === null || f.longitud === null) return null
        const p = enPlano(f.latitud, f.longitud)
        if (!p) return null
        return {
          id: f.id, radio: p.radio, rumbo: p.rumbo,
          miniatura: f.miniatura, hallazgo: f.hallazgo ? ETIQUETA_HALLAZGO[f.hallazgo as keyof typeof ETIQUETA_HALLAZGO] : null,
          urgente: f.urgente, hace_seg: f.hace_seg, lote: f.lote,
        } as FotoEnPlano
      })
      .filter((f): f is FotoEnPlano => f !== null)
  }, [fotosData?.fotos, enPlano])

  const miPosicion = gps.lectura ? enPlano(gps.lectura.latitud, gps.lectura.longitud) : null

  // ── Cámara ───────────────────────────────────────────────────────────────
  const sacarFoto = async (archivo: File) => {
    if (archivo.size > 6 * 1024 * 1024) {
      toast.error('La foto pesa más de 6 MB.')
      return
    }
    setAnalizando(true)
    setUltimo(null)
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const l = new FileReader()
        l.onload = () => res(l.result as string)
        l.onerror = rej
        l.readAsDataURL(archivo)
      })
      const mini = await miniaturaDe(dataUrl)

      // El lote sale del GPS; si no hay, queda sin lote y se elige después.
      const miDisp = (presencia?.dispositivos ?? []).find(
        (d) => d.dispositivo === idDispositivo()
      )
      const parcela = base?.lotes.find((l) => l.codigo === miDisp?.lote)

      const res = await fetch('/api/campo/foto/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen: dataUrl,
          miniatura: mini,
          parcela_id: parcela?.id ?? null,
          latitud: gps.lectura?.latitud ?? null,
          longitud: gps.lectura?.longitud ?? null,
          dispositivo: idDispositivo(),
          tomada_por: nombre || null,
          guardar: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo analizar')
      setUltimo(json.diagnostico)
      toast.success(`${json.diagnostico.etiqueta}${parcela ? ` en ${parcela.codigo}` : ''}`)
      mutarFotos()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo analizar')
    } finally {
      setAnalizando(false)
    }
  }

  const activos = presencia?.dispositivos ?? []

  return (
    <div className="p-3 md:p-5 space-y-3 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-600" />
            El campo en vivo
          </h1>
          <p className="text-sm text-muted-foreground">
            Quién está dónde, y las fotos apareciendo donde se sacan.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch id="demo" checked={demo} onCheckedChange={(v) => { setDemo(v); setAncla(null) }} />
            <Label htmlFor="demo" className="text-xs cursor-pointer">Modo demo</Label>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />{activos.length} en el campo
          </Badge>
        </div>
      </div>

      {!gps.seguro && (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardContent className="p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Por <code className="text-xs">http://</code> el navegador no da ni ubicación ni
              cámara. Hace falta <strong>https</strong> o <code className="text-xs">localhost</code>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Controles del teléfono */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant={gps.estado === 'siguiendo' ? 'secondary' : 'default'}
            onClick={gps.estado === 'siguiendo' ? gps.detener : gps.arrancar}
          >
            <Satellite className="h-4 w-4 mr-1.5" />
            {gps.estado === 'siguiendo' ? 'GPS activo' : 'Prender GPS'}
          </Button>

          <Input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); guardarNombre(e.target.value) }}
            placeholder="Tu nombre"
            className="h-9 w-36"
          />

          <div className="flex items-center gap-2">
            <Switch
              id="compartir"
              checked={compartir}
              onCheckedChange={setCompartir}
              disabled={gps.estado !== 'siguiendo'}
            />
            <Label htmlFor="compartir" className="text-xs cursor-pointer">
              Compartir mi posición
            </Label>
          </div>

          <Button
            size="sm"
            className="ml-auto"
            onClick={() => camaraRef.current?.click()}
            disabled={analizando}
          >
            {analizando
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Analizando…</>
              : <><Camera className="h-4 w-4 mr-1.5" />Sacar foto</>}
          </Button>
          <input
            ref={camaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { e.target.files?.[0] && sacarFoto(e.target.files[0]); e.target.value = '' }}
          />
        </CardContent>
      </Card>

      {ultimo && (
        <Card className={ultimo.urgente ? 'border-red-400 dark:border-red-800' : undefined}>
          <CardContent className="p-3 flex items-start gap-3 flex-wrap">
            <Badge variant={ultimo.confianza >= UMBRAL_CONFIANZA ? 'secondary' : 'outline'}>
              {ultimo.etiqueta} · {(ultimo.confianza * 100).toFixed(0)}%
            </Badge>
            <p className="text-sm flex-1 min-w-48">{ultimo.visible ?? ultimo.observacion}</p>
            <Button size="icon" variant="ghost" onClick={() => setUltimo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-1.5 mb-1">
              {pivotes.map((p) => (
                <Button
                  key={p.nombre}
                  size="sm"
                  variant={pivoteActual === p.nombre ? 'secondary' : 'ghost'}
                  onClick={() => setPivoteVisible(p.nombre)}
                >
                  Pivote {p.nombre}
                </Button>
              ))}
            </div>
            <PlanoPivote
              pivote={pivoteActual ?? ''}
              lotes={lotes}
              dispositivos={dispositivos}
              fotos={fotos}
              onFoto={(f) => setFotoAbierta(fotosData?.fotos.find((x) => x.id === f.id) ?? null)}
              posicion={
                miPosicion
                  ? { ...miPosicion, precision_m: gps.lectura?.precision_m, radio_pivote_m: pivoteObj?.radio_m }
                  : null
              }
              size={520}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          {/* Quién está en el campo */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4" />En el campo
              </p>
              {activos.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nadie compartiendo posición todavía. Prendé el GPS y activá
                  «Compartir mi posición».
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activos.map((d) => (
                    <div key={d.dispositivo} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="truncate">{d.nombre || d.dispositivo}</span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {d.lote ?? (d.pivote ? `piv. ${d.pivote}` : 'fuera')} · {d.hace_seg}s
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fotos que van saltando */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Camera className="h-4 w-4" />Últimas fotos
              </p>
              {(fotosData?.fotos ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Todavía no sacaron ninguna.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {(fotosData?.fotos ?? []).slice(0, 9).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFotoAbierta(f)}
                      className={`relative aspect-square rounded overflow-hidden border-2 ${
                        f.urgente ? 'border-red-500' : 'border-transparent'
                      } ${f.hace_seg < 60 ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                      title={`${f.hallazgo ?? ''} · ${f.lote ?? ''} · hace ${f.hace_seg}s`}
                    >
                      {f.miniatura
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={f.miniatura} alt="" className="w-full h-full object-cover" />
                        : <span className="grid place-items-center h-full text-muted-foreground"><Camera className="h-4 w-4" /></span>}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Foto ampliada */}
      {fotoAbierta && (
        <div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"
          onClick={() => setFotoAbierta(null)}
        >
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-4 space-y-2">
              {fotoAbierta.miniatura && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoAbierta.miniatura} alt="" className="w-full rounded bg-muted" />
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant={fotoAbierta.urgente ? 'destructive' : 'secondary'}>
                  {fotoAbierta.hallazgo
                    ? ETIQUETA_HALLAZGO[fotoAbierta.hallazgo as keyof typeof ETIQUETA_HALLAZGO]
                    : 'Sin diagnóstico'}
                </Badge>
                {fotoAbierta.lote && (
                  <span className="text-sm flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{fotoAbierta.lote}
                  </span>
                )}
              </div>
              {fotoAbierta.analisis_ia && (
                <p className="text-xs text-muted-foreground">{fotoAbierta.analisis_ia}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {fotoAbierta.tomada_por ? `${fotoAbierta.tomada_por} · ` : ''}
                hace {fotoAbierta.hace_seg}s
              </p>
              <Button variant="outline" className="w-full" onClick={() => setFotoAbierta(null)}>
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
