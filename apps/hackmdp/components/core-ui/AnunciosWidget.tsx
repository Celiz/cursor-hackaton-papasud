'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Megaphone, Tag, Info } from 'lucide-react'
import {
  useAnuncios,
  createAnuncio,
  updateAnuncio,
  deleteAnuncio,
} from '@/lib/hooks/use-anuncios'
import { useSession } from '@/lib/hooks/use-session'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Anuncio } from '@/lib/types'

export function AnunciosWidget() {
  const { anuncios, isLoading, mutate } = useAnuncios()
  const { data: session } = useSession()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnuncio, setEditingAnuncio] = useState<Anuncio | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [titulo, setTítulo] = useState('')
  const [tipo, setTipo] = useState<'promocion' | 'info'>('info')
  const [contenido, setContenido] = useState('')
  const [vigenciaHasta, setVigenciaHasta] = useState('')

  const resetForm = () => {
    setTítulo('')
    setTipo('info')
    setContenido('')
    setVigenciaHasta('')
    setEditingAnuncio(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (anuncio: Anuncio) => {
    setEditingAnuncio(anuncio)
    setTítulo(anuncio.titulo)
    setTipo(anuncio.tipo)
    setContenido(anuncio.contenido || '')
    setVigenciaHasta(anuncio.vigencia_hasta || '')
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!titulo.trim()) return
    setSaving(true)
    try {
      await createAnuncio({
        titulo: titulo.trim(),
        tipo,
        contenido: contenido.trim() || undefined,
        vigencia_hasta: vigenciaHasta || undefined,
      })
      await mutate()
      setDialogOpen(false)
      resetForm()
      toast.success('Anuncio publicado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingAnuncio || !titulo.trim()) return
    setSaving(true)
    try {
      await updateAnuncio(editingAnuncio.id, {
        titulo: titulo.trim(),
        tipo,
        contenido: contenido.trim() || undefined,
        vigencia_hasta: vigenciaHasta || undefined,
      })
      await mutate()
      setDialogOpen(false)
      resetForm()
      toast.success('Anuncio actualizado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (anuncio: Anuncio) => {
    if (!window.confirm('¿Eliminar este anuncio?')) return
    try {
      await deleteAnuncio(anuncio.id)
      await mutate()
      toast.success('Anuncio eliminado')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSubmit = () => {
    if (editingAnuncio) {
      handleUpdate()
    } else {
      handleCreate()
    }
  }

  const currentUserId = session?.user?.id
  const isAdmin = session?.user?.isAdmin

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-purple-200/40 dark:border-purple-800/30 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Tablón del Equipo
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-white dark:bg-gray-900 border-purple-200/40 dark:border-purple-800/30 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Tablón del Equipo
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {anuncios.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin anuncios por ahora</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anuncios.map((anuncio) => {
                const isAuthor = currentUserId === anuncio.autor_id
                const canEdit = isAuthor
                const canDelete = isAuthor || isAdmin

                return (
                  <div
                    key={anuncio.id}
                    className="group p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={
                              anuncio.tipo === 'promocion'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }
                          >
                            {anuncio.tipo === 'promocion' ? 'Promoción' : 'Info'}
                          </Badge>
                          <span className="font-semibold text-sm truncate">
                            {anuncio.titulo}
                          </span>
                        </div>
                        {anuncio.contenido && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {anuncio.contenido}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Action buttons - visible on hover */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(anuncio)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(anuncio)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="text-right">
                          {anuncio.vigencia_hasta && (
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(anuncio.vigencia_hasta + 'T00:00:00'),
                                "d 'de' MMM",
                                { locale: es }
                              )}
                            </p>
                          )}
                          {anuncio.autor_nombre && (
                            <p className="text-xs text-muted-foreground">
                              {anuncio.autor_nombre}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAnuncio ? 'Editar Anuncio' : 'Nuevo Anuncio'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="anuncio-titulo">Título</Label>
              <Input
                id="anuncio-titulo"
                value={titulo}
                onChange={(e) => setTítulo(e.target.value)}
                placeholder="Título del anuncio..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipo === 'promocion' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipo('promocion')}
                  className={
                    tipo === 'promocion'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : ''
                  }
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Promoción
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'info' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipo('info')}
                  className={
                    tipo === 'info' ? 'bg-blue-600 hover:bg-blue-700' : ''
                  }
                >
                  <Info className="h-4 w-4 mr-1" />
                  Info
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anuncio-contenido">
                Contenido{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Textarea
                id="anuncio-contenido"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Detalle del anuncio..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anuncio-vigencia">
                Vigencia hasta{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id="anuncio-vigencia"
                type="date"
                value={vigenciaHasta}
                onChange={(e) => setVigenciaHasta(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!titulo.trim() || saving}
            >
              {saving
                ? 'Guardando...'
                : editingAnuncio
                  ? 'Guardar cambios'
                  : 'Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
