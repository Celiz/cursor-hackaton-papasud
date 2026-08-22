'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useSpeechRecognition } from '@/lib/hooks/use-speech-recognition'
import {
  Sparkles, Mic, MicOff, Loader2, Database, Send, User, AlertTriangle,
} from 'lucide-react'

interface Turno {
  pregunta: string
  respuesta?: string
  sql?: string
  filas?: Record<string, unknown>[]
  rowCount?: number
  error?: string
}

const SUGERENCIAS = [
  '¿Cómo rindió Spunta en la campaña 2021?',
  '¿Cuál fue la mejor campaña de los últimos 20 años?',
  '¿Qué variedad rinde mejor en El Ceibo?',
  '¿Cuánto stock hay en cada ubicación?',
  '¿Cuántas hectáreas sembramos por año desde 2015?',
]

export default function CopilotoPageClient() {
  const [pregunta, setPregunta] = useState('')
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [cargando, setCargando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  const {
    isListening: escuchando,
    isSupported: soportaVoz,
    transcript: parcial,
    toggleListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'es-AR',
    continuous: false,
    onResult: useCallback((frase: string) => {
      setPregunta((prev) => (prev ? `${prev} ${frase.trim()}` : frase.trim()))
    }, []),
  })

  const preguntar = async (texto: string) => {
    const q = texto.trim()
    if (!q || cargando) return
    if (escuchando) stopListening()

    setPregunta('')
    setTurnos((t) => [...t, { pregunta: q }])
    setCargando(true)

    try {
      const res = await fetch('/api/copiloto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: q }),
      })
      const json = await res.json()
      setTurnos((t) => {
        const copia = [...t]
        copia[copia.length - 1] = res.ok
          ? { pregunta: q, respuesta: json.respuesta, sql: json.sql, filas: json.filas, rowCount: json.rowCount }
          : { pregunta: q, error: json.error ?? 'No se pudo responder', sql: json.sql }
        return copia
      })
    } catch {
      setTurnos((t) => {
        const copia = [...t]
        copia[copia.length - 1] = { pregunta: q, error: 'No se pudo conectar' }
        return copia
      })
    } finally {
      setCargando(false)
      requestAnimationFrame(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Copiloto
        </h1>
        <p className="text-sm text-muted-foreground">
          Preguntale al histórico en tus palabras. Cada respuesta se arma sobre la
          consulta que corrió — podés verla.
        </p>
      </div>

      {turnos.length === 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Probá con alguna de estas:</p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
                <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => preguntar(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {turnos.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="flex gap-2 items-start justify-end">
              <p className="text-sm bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                {t.pregunta}
              </p>
              <User className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />
            </div>

            {!t.respuesta && !t.error && cargando && i === turnos.length - 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando el histórico…
              </div>
            )}

            {t.error && (
              <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {t.error}
                </p>
                {t.sql && (
                  <pre className="mt-2 text-xs overflow-x-auto text-amber-900 dark:text-amber-400">{t.sql}</pre>
                )}
              </div>
            )}

            {t.respuesta && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm leading-relaxed">{t.respuesta}</p>

                  {t.sql && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-muted-foreground flex items-center gap-1.5 select-none">
                        <Database className="h-3.5 w-3.5" />
                        Ver la consulta y las {t.rowCount ?? 0} filas que la respaldan
                      </summary>
                      <pre className="mt-2 text-xs bg-muted rounded-md p-2.5 overflow-x-auto">{t.sql}</pre>

                      {t.filas && t.filas.length > 0 && (
                        <div className="mt-2 overflow-x-auto rounded-md border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                {Object.keys(t.filas[0]).map((k) => (
                                  <th key={k} className="text-left px-2 py-1.5 font-medium whitespace-nowrap">
                                    {k}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {t.filas.slice(0, 25).map((f, ri) => (
                                <tr key={ri} className="border-t">
                                  {Object.values(f).map((v, ci) => (
                                    <td key={ci} className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                                      {v === null ? '—' : String(v)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {t.filas.length > 25 && (
                            <p className="text-xs text-muted-foreground p-2">
                              y {t.filas.length - 25} filas más
                            </p>
                          )}
                        </div>
                      )}
                    </details>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <div className="sticky bottom-4">
        <Card>
          <CardContent className="p-2 flex gap-2 items-center">
            <Button
              type="button"
              variant={escuchando ? 'destructive' : 'ghost'}
              size="icon"
              onClick={toggleListening}
              disabled={!soportaVoz}
              aria-label={escuchando ? 'Detener' : 'Preguntar por voz'}
            >
              {escuchando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  preguntar(pregunta)
                }
              }}
              placeholder={escuchando ? (parcial || 'Escuchando…') : 'Preguntá sobre el histórico…'}
              className="border-0 shadow-none focus-visible:ring-0"
            />
            <Button onClick={() => preguntar(pregunta)} disabled={cargando || !pregunta.trim()} size="icon">
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          <Badge variant="outline" className="mr-1.5 text-[10px]">sin inventar</Badge>
          Las respuestas salen de los datos reales; si la consulta no devuelve nada, se dice que no hay datos.
        </p>
      </div>
    </div>
  )
}
