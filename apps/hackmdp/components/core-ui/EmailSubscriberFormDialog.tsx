"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { EmailSubscriber } from "@/app/dashboard/email-marketing/subscribers/columns"

interface EmailSubscriberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriber?: EmailSubscriber | null
  onSave: (data: Partial<EmailSubscriber>) => Promise<void>
}

export function EmailSubscriberFormDialog({
  open,
  onOpenChange,
  subscriber,
  onSave,
}: EmailSubscriberFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    apellido: "",
    empresa: "",
    telefono: "",
    estado: "activo",
  })

  useEffect(() => {
    if (subscriber) {
      setFormData({
        email: subscriber.email || "",
        nombre: subscriber.nombre || "",
        apellido: subscriber.apellido || "",
        empresa: subscriber.empresa || "",
        telefono: subscriber.telefono || "",
        estado: subscriber.estado || "activo",
      })
    } else {
      setFormData({
        email: "",
        nombre: "",
        apellido: "",
        empresa: "",
        telefono: "",
        estado: "activo",
      })
    }
  }, [subscriber, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(formData as Partial<EmailSubscriber>)
      onOpenChange(false)
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{subscriber ? "Editar Suscriptor" : "Nuevo Suscriptor"}</DialogTitle>
          <DialogDescription>
            {subscriber
              ? "Modifica la información del suscriptor."
              : "Completa los campos para agregar un nuevo suscriptor."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@ejemplo.com"
              required
              disabled={!!subscriber} // No permitir cambiar email en edición
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Juan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+54 11 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={formData.estado}
              onValueChange={(value) => setFormData({ ...formData, estado: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="unsubscribed">Desuscrito</SelectItem>
                <SelectItem value="bounced">Rebotado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {subscriber ? "Guardar cambios" : "Crear suscriptor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
