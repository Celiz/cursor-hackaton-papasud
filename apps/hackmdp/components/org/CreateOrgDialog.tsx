"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CreateOrgDialogProps {
  open: boolean
  onClose: () => void
  onCreated?: (org: { id: string; nombre: string; slug: string }) => void
}

export function CreateOrgDialog({ open, onClose, onCreated }: CreateOrgDialogProps) {
  const [nombre, setNombre] = useState("")
  const [cuit, setCuit] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return

    setIsCreating(true)

    try {
      const res = await fetch("/api/auth/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), cuit: cuit.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear organización")
      }

      const org = await res.json()
      toast.success("Organización creada correctamente")
      onCreated?.(org)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear organización")
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setNombre("")
    setCuit("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Nueva organización
          </DialogTitle>
          <DialogDescription>
            Creá un nuevo espacio de trabajo para tu equipo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-nombre">
              Nombre de la organización <span className="text-red-500">*</span>
            </Label>
            <Input
              id="org-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Mi Empresa S.A."
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-cuit">
              CUIT <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              id="org-cuit"
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="Ej: 30-12345678-9"
              disabled={isCreating}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!nombre.trim() || isCreating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear organización"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
