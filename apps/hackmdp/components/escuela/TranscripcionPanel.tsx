"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Upload, Loader2, FileAudio, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Brain, Lightbulb, Users, MessageSquareText
} from "lucide-react"
import { toast } from "sonner"
import { useTranscripcionPolling } from "@/lib/hooks/use-transcripcion"

interface TranscripcionPanelProps {
  eventId?: string
  mentorshipSessionId?: string
  sessionTitle?: string
  sessionType?: string
  transcripcion: any | null
  onUploaded: () => void
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En cola", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
  transcribing: { label: "Transcribiendo...", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20" },
  analyzing: { label: "Analizando...", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20" },
  completed: { label: "Completado", color: "text-green-600 bg-green-50 dark:bg-green-950/20" },
  error: { label: "Error", color: "text-red-600 bg-red-50 dark:bg-red-950/20" },
}

export default function TranscripcionPanel({
  eventId, mentorshipSessionId, sessionTitle, sessionType,
  transcripcion: initialData, onUploaded,
}: TranscripcionPanelProps) {
  const [uploading, setUploading] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>("resumen")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Poll while processing
  const isProcessing = initialData && !['completed', 'error'].includes(initialData.status)
  const { data: polledData } = useTranscripcionPolling(
    initialData?.id || null,
    isProcessing
  )

  const transcripcion = polledData || initialData

  // If polling shows completed, refresh parent
  useEffect(() => {
    if (polledData && polledData.status === 'completed' && initialData?.status !== 'completed') {
      onUploaded()
    }
  }, [polledData?.status, initialData?.status, onUploaded])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (eventId) formData.append('event_id', eventId)
      if (mentorshipSessionId) formData.append('mentorship_session_id', mentorshipSessionId)
      if (sessionTitle) formData.append('title', sessionTitle)
      if (sessionType) formData.append('type', sessionType)

      const res = await fetch('/api/escuela/transcripciones', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al subir')
      }

      toast.success('Audio subido, procesando transcripción...')
      onUploaded()
    } catch (err: any) {
      toast.error(err.message || 'Error al subir audio')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [eventId, mentorshipSessionId, sessionTitle, sessionType, onUploaded])

  function toggleSection(key: string) {
    setExpandedSection(prev => prev === key ? null : key)
  }

  // No transcription yet — show upload
  if (!transcripcion) {
    return (
      <div className="border-t border-border/40 px-4 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/mp4,video/webm"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-rose-300/30 rounded-xl cursor-pointer hover:border-rose-400/50 hover:bg-rose-500/[0.02] transition-all"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-rose-400 animate-spin mb-2" />
          ) : (
            <Upload className="h-8 w-8 text-rose-400 mb-2" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {uploading ? 'Subiendo...' : 'Subir audio de la sesión'}
          </span>
          <span className="text-xs text-muted-foreground/60 mt-1">
            MP3, WAV, OGG, MP4 — máx 500MB
          </span>
        </button>
      </div>
    )
  }

  const status = statusLabels[transcripcion.status] || statusLabels.pending

  // Processing state
  if (transcripcion.status !== 'completed' && transcripcion.status !== 'error') {
    return (
      <div className="border-t border-border/40 px-4 py-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30">
          <Loader2 className="h-5 w-5 text-rose-500 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{transcripcion.audio_filename}</span>
            </div>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block", status.color)}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (transcripcion.status === 'error') {
    return (
      <div className="border-t border-border/40 px-4 py-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/30">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-600">Error en transcripción</p>
            <p className="text-xs text-red-500/80 mt-0.5">{transcripcion.error_message}</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}>
            Reintentar
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*,video/mp4,video/webm"
          className="hidden" onChange={handleUpload} />
      </div>
    )
  }

  // Completed — show results
  return (
    <div className="border-t border-border/40">
      {/* Audio info bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50/50 dark:bg-green-950/10 border-b border-border/30">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <FileAudio className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground truncate flex-1">{transcripcion.audio_filename}</span>
        <a href={transcripcion.audio_url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-rose-600 hover:underline">Descargar</a>
      </div>

      {/* Collapsible sections */}
      <div className="divide-y divide-border/30">
        {/* Resumen */}
        {transcripcion.resumen && (
          <CollapsibleSection
            icon={<Brain className="h-4 w-4 text-purple-500" />}
            title="Resumen"
            expanded={expandedSection === 'resumen'}
            onToggle={() => toggleSection('resumen')}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{transcripcion.resumen}</p>
          </CollapsibleSection>
        )}

        {/* Transcripción */}
        <CollapsibleSection
          icon={<MessageSquareText className="h-4 w-4 text-blue-500" />}
          title="Transcripción completa"
          expanded={expandedSection === 'transcripcion'}
          onToggle={() => toggleSection('transcripcion')}
        >
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
            {transcripcion.transcript_text}
          </pre>
        </CollapsibleSection>

        {/* Patrones */}
        {transcripcion.patrones && (
          <CollapsibleSection
            icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
            title="Patrones y temas"
            expanded={expandedSection === 'patrones'}
            onToggle={() => toggleSection('patrones')}
          >
            <div className="space-y-3">
              {transcripcion.patrones.temas?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Temas principales</p>
                  <div className="flex flex-wrap gap-1.5">
                    {transcripcion.patrones.temas.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {transcripcion.patrones.momentos_clave?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Momentos clave</p>
                  <ul className="space-y-1">
                    {transcripcion.patrones.momentos_clave.map((m: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-amber-500 shrink-0">•</span> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {transcripcion.patrones.palabras_frecuentes?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Palabras frecuentes</p>
                  <div className="flex flex-wrap gap-1">
                    {transcripcion.patrones.palabras_frecuentes.map((w: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[11px] bg-muted/50 text-muted-foreground">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Insights por clienta */}
        {transcripcion.insights_clientas?.length > 0 && (
          <CollapsibleSection
            icon={<Users className="h-4 w-4 text-rose-500" />}
            title={`Insights por participante (${transcripcion.insights_clientas.length})`}
            expanded={expandedSection === 'insights'}
            onToggle={() => toggleSection('insights')}
          >
            <div className="space-y-3">
              {transcripcion.insights_clientas.map((c: any, i: number) => (
                <div key={i} className="rounded-lg bg-rose-500/[0.03] border border-rose-200/30 dark:border-rose-800/20 p-3">
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-400 mb-1">{c.nombre}</p>
                  <ul className="space-y-0.5">
                    {c.observaciones.map((o: string, j: number) => (
                      <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-rose-400 shrink-0">—</span> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({ icon, title, expanded, onToggle, children }: {
  icon: React.ReactNode; title: string; expanded: boolean
  onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left">
        {icon}
        <span className="text-sm font-medium flex-1">{title}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> :
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1">{children}</div>
      )}
    </div>
  )
}
