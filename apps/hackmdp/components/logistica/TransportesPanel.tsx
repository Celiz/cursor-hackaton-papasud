'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Phone, MessageCircle, Edit, Trash2, Plus, Truck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TransporteFormDialog } from './TransporteFormDialog'

interface TransportesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function TransportesPanel({ open, onOpenChange }: TransportesPanelProps) {
  const { data: transportes, mutate, isLoading } = useSWR<any[]>(
    open ? '/api/transportes' : null,
    fetcher,
    { dedupingInterval: 30000 }
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function handleAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function handleEdit(t: any) {
    setEditing(t)
    setFormOpen(true)
  }

  async function handleDelete(t: any) {
    if (!confirm(`Eliminar transporte "${t.nombre}"?`)) return
    setDeleting(t.id)
    try {
      const res = await fetch(`/api/transportes?id=${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Transporte eliminado')
      mutate()
    } catch {
      toast.error('Error al eliminar transporte')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" title="Transportes">
          <SheetHeader>
            <div className="flex items-center justify-between w-full pr-6">
              <h3 className="font-semibold text-lg">Transportes</h3>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && (!transportes || transportes.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Truck className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No hay transportes registrados</p>
                <Button size="sm" variant="outline" onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar tu primer transporte
                </Button>
              </div>
            )}

            {transportes?.map(t => (
              <div
                key={t.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div>
                  <p className="font-medium text-sm">{t.nombre}</p>
                  {t.zona_cobertura && (
                    <p className="text-xs text-muted-foreground">{t.zona_cobertura}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {t.telefono && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <a href={`tel:${t.telefono}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {t.whatsapp && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <a
                        href={`https://wa.me/${t.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleEdit(t)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.id}
                  >
                    {deleting === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <TransporteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transporte={editing}
        onSuccess={() => mutate()}
      />
    </>
  )
}
