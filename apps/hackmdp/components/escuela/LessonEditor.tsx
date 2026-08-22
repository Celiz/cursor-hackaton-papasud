"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, Save, X, Dumbbell, MessageCircle, PenTool, ListChecks
} from "lucide-react"
import { toast } from "sonner"

interface Lesson {
  id: string
  content_id: string
  title: string
  body: string | null
  order_index: number
  lesson_type: string | null
  reading_time_minutes: number | null
  video_url: string | null
  audio_url: string | null
}

const lessonTypes = [
  { value: "teoria", label: "Teoría", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { value: "practica", label: "Práctica", icon: Dumbbell, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
  { value: "reflexion", label: "Reflexión", icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
  { value: "ejercicio", label: "Ejercicio", icon: PenTool, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
  { value: "resumen", label: "Resumen", icon: ListChecks, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
]

function getLessonTypeConfig(type: string | null) {
  return lessonTypes.find(t => t.value === type) || lessonTypes[0]
}

export function LessonEditor({ contentId }: { contentId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [newLesson, setNewLesson] = useState({
    title: "",
    body: "",
    lesson_type: "teoria",
    reading_time_minutes: 5,
    video_url: "",
    audio_url: "",
  })

  useEffect(() => {
    loadLessons()
  }, [contentId])

  const loadLessons = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/escuela/lessons?content_id=${contentId}`)
      if (res.ok) {
        const data = await res.json()
        setLessons(data)
      }
    } catch (error) {
      console.error("Error loading lessons:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newLesson.title.trim()) return
    setCreatingLesson(true)
    try {
      const res = await fetch("/api/escuela/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: contentId,
          title: newLesson.title,
          body: newLesson.body || null,
          lesson_type: newLesson.lesson_type,
          reading_time_minutes: newLesson.reading_time_minutes,
          video_url: newLesson.video_url || null,
          audio_url: newLesson.audio_url || null,
          order_index: lessons.length + 1,
        }),
      })
      if (!res.ok) throw new Error("Error al crear")
      const created = await res.json()
      setLessons(prev => [...prev, created])
      setNewLesson({ title: "", body: "", lesson_type: "teoria", reading_time_minutes: 5, video_url: "", audio_url: "" })
      setShowNewForm(false)
      setExpandedLesson(created.id)
      toast.success("Lección creada")
    } catch (error: any) {
      toast.error(error.message || "Error al crear lección")
    } finally {
      setCreatingLesson(false)
    }
  }

  const handleUpdate = async (lesson: Lesson) => {
    setSaving(lesson.id)
    try {
      const res = await fetch(`/api/escuela/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lesson.title,
          body: lesson.body,
          lesson_type: lesson.lesson_type,
          reading_time_minutes: lesson.reading_time_minutes,
          video_url: lesson.video_url,
          audio_url: lesson.audio_url,
          order_index: lesson.order_index,
        }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success("Guardado")
    } catch (error: any) {
      toast.error(error.message || "Error al guardar lección")
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta lección?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/escuela/lessons/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      setLessons(prev => prev.filter(l => l.id !== id))
      if (expandedLesson === id) setExpandedLesson(null)
      toast.success("Lección eliminada")
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar")
    } finally {
      setDeleting(null)
    }
  }

  const moveLesson = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= lessons.length) return

    const newLessons = [...lessons]
    const [moved] = newLessons.splice(index, 1)
    newLessons.splice(newIndex, 0, moved)

    const updated = newLessons.map((l, i) => ({ ...l, order_index: i + 1 }))
    setLessons(updated)

    await Promise.all([
      handleUpdate(updated[index]),
      handleUpdate(updated[newIndex]),
    ])
  }

  const handleLessonChange = (id: string, field: keyof Lesson, value: any) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-500" />
          Lecciones ({lessons.length})
        </h3>
        {!showNewForm && (
          <Button size="sm" variant="outline" onClick={() => setShowNewForm(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            Nueva lección
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {lessons.map((lesson, index) => {
          const typeConfig = getLessonTypeConfig(lesson.lesson_type)
          const TypeIcon = typeConfig.icon
          const isExpanded = expandedLesson === lesson.id

          return (
            <div
              key={lesson.id}
              className={cn(
                "border rounded-lg overflow-hidden transition-all",
                isExpanded ? "border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-900/10" : "bg-card"
              )}
            >
              <div
                className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLesson(index, "up") }}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLesson(index, "down") }}
                    disabled={index === lessons.length - 1}
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", typeConfig.bg)}>
                  <TypeIcon className={cn("h-3.5 w-3.5", typeConfig.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeConfig.label} · {lesson.reading_time_minutes || 0} min
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {saving === lesson.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(lesson.id) }}
                    disabled={deleting === lesson.id}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 rounded-md transition-colors"
                  >
                    {deleting === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 pt-0 space-y-3 border-t">
                  <div className="grid md:grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Título</label>
                      <Input
                        value={lesson.title}
                        onChange={(e) => handleLessonChange(lesson.id, "title", e.target.value)}
                        onBlur={() => handleUpdate(lesson)}
                        className="h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Tipo</label>
                        <select
                          value={lesson.lesson_type || "teoria"}
                          onChange={(e) => {
                            handleLessonChange(lesson.id, "lesson_type", e.target.value)
                            handleUpdate({ ...lesson, lesson_type: e.target.value })
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {lessonTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Minutos</label>
                        <Input
                          type="number"
                          min="1"
                          value={lesson.reading_time_minutes || 5}
                          onChange={(e) => handleLessonChange(lesson.id, "reading_time_minutes", parseInt(e.target.value) || 5)}
                          onBlur={() => handleUpdate(lesson)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Contenido (Markdown)</label>
                    <textarea
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[160px] resize-y"
                      value={lesson.body || ""}
                      onChange={(e) => handleLessonChange(lesson.id, "body", e.target.value)}
                      onBlur={() => handleUpdate(lesson)}
                      placeholder="Escribí el contenido de la lección en Markdown..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">URL de Video (opcional)</label>
                      <Input
                        value={lesson.video_url || ""}
                        onChange={(e) => handleLessonChange(lesson.id, "video_url", e.target.value || null)}
                        onBlur={() => handleUpdate(lesson)}
                        placeholder="https://youtube.com/..."
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">URL de Audio (opcional)</label>
                      <Input
                        value={lesson.audio_url || ""}
                        onChange={(e) => handleLessonChange(lesson.id, "audio_url", e.target.value || null)}
                        onBlur={() => handleUpdate(lesson)}
                        placeholder="https://..."
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(lesson)}
                      disabled={saving === lesson.id}
                      className="gap-1.5 h-8"
                    >
                      {saving === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNewForm && (
        <div className="border-2 border-dashed border-blue-200 dark:border-blue-800/40 rounded-lg p-4 bg-blue-50/30 dark:bg-blue-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Nueva Lección</h4>
            <button onClick={() => setShowNewForm(false)} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Título *</label>
              <Input
                value={newLesson.title}
                onChange={(e) => setNewLesson(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Introducción"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Tipo</label>
                <select
                  value={newLesson.lesson_type}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, lesson_type: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {lessonTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Minutos</label>
                <Input
                  type="number"
                  min="1"
                  value={newLesson.reading_time_minutes}
                  onChange={(e) => setNewLesson(prev => ({ ...prev, reading_time_minutes: parseInt(e.target.value) || 5 }))}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Contenido (Markdown)</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-y"
              value={newLesson.body}
              onChange={(e) => setNewLesson(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Contenido de la lección..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)} className="h-8">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newLesson.title.trim() || creatingLesson}
              className="gap-1.5 h-8"
            >
              {creatingLesson ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Crear lección
            </Button>
          </div>
        </div>
      )}

      {lessons.length === 0 && !showNewForm && (
        <div className="text-center py-6 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Este contenido no tiene lecciones</p>
          <p className="text-xs">Agregá lecciones para crear un curso estructurado</p>
        </div>
      )}
    </div>
  )
}
