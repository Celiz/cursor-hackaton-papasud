'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TransporteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporte?: any
  onSuccess: () => void
}

export function TransporteFormDialog({ open, onOpenChange, transporte, onSuccess }: TransporteFormDialogProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    whatsapp: '',
    email: '',
    zona_cobertura: '',
    notas: '',
  })

  useEffect(() => {
    if (open) {
      setForm({
        nombre: transporte?.nombre ?? '',
        telefono: transporte?.telefono ?? '',
        whatsapp: transporte?.whatsapp ?? '',
        email: transporte?.email ?? '',
        zona_cobertura: transporte?.zona_cobertura ?? '',
        notas: transporte?.notas ?? '',
      })
    }
  }, [open, transporte])

  const isEdit = !!transporte

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/transportes', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: transporte.id, ...form } : form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }

      toast.success(isEdit ? 'Transporte actualizado' : 'Transporte creado')
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar transporte')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar transporte' : 'Nuevo transporte'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Andreani"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="011-4444-5555"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                placeholder="5491144445555"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="contacto@transporte.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zona_cobertura">Zona de cobertura</Label>
            <Input
              id="zona_cobertura"
              value={form.zona_cobertura}
              onChange={e => setForm(f => ({ ...f, zona_cobertura: e.target.value }))}
              placeholder="AMBA, Interior, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
