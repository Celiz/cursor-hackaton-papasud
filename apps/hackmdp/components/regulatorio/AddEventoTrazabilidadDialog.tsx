"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type {
  RegTipoEventoEquipo,
  RegTipoEventoReactivo,
} from "@locus/db/schema/regulatory"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddEventoTrazabilidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "equipo" | "reactivo"
  targetId: string
  onCreated: () => void
}

// ---------------------------------------------------------------------------
// Event type options
// ---------------------------------------------------------------------------

const EQUIPO_TIPOS: { value: RegTipoEventoEquipo; label: string }[] = [
  { value: "venta", label: "Venta" },
  { value: "instalacion", label: "Instalacion" },
  { value: "calibracion", label: "Calibracion" },
  { value: "mantenimiento_preventivo", label: "Mantenimiento Preventivo" },
  { value: "mantenimiento_correctivo", label: "Mantenimiento Correctivo" },
  { value: "traslado", label: "Traslado" },
  { value: "retiro", label: "Retiro" },
  { value: "baja", label: "Baja" },
]

const REACTIVO_TIPOS: { value: RegTipoEventoReactivo; label: string }[] = [
  { value: "recepcion", label: "Recepcion" },
  { value: "almacenamiento", label: "Almacenamiento" },
  { value: "uso", label: "Uso" },
  { value: "descarte", label: "Descarte" },
  { value: "devolucion", label: "Devolucion" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddEventoTrazabilidadDialog({
  open,
  onOpenChange,
  mode,
  targetId,
  onCreated,
}: AddEventoTrazabilidadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Shared fields
  const [tipoEvento, setTipoEvento] = useState("")
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [observaciones, setObservaciones] = useState("")

  // Equipo-specific
  const [institucion, setInstitucion] = useState("")
  const [proximaFecha, setProximaFecha] = useState("")

  // Reactivo-specific
  const [numeroLote, setNumeroLote] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [unidad, setUnidad] = useState("")
  const [proveedor, setProveedor] = useState("")
  const [condiciones, setCondiciones] = useState("")

  function resetForm() {
    setTipoEvento("")
    setFecha(new Date().toISOString().slice(0, 10))
    setObservaciones("")
    setInstitucion("")
    setProximaFecha("")
    setNumeroLote("")
    setCantidad("")
    setUnidad("")
    setProveedor("")
    setCondiciones("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!tipoEvento || !fecha) {
      toast.error("Complete los campos requeridos: tipo de evento y fecha")
      return
    }

    setIsSubmitting(true)

    try {
      let url: string
      let body: Record<string, unknown>

      if (mode === "equipo") {
        url = "/api/regulatorio/trazabilidad/equipos"
        body = {
          equipo_instancia_id: targetId,
          tipo_evento: tipoEvento,
          fecha,
          institucion: institucion || null,
          observaciones: observaciones || null,
          proxima_fecha: proximaFecha || null,
        }
      } else {
        url = "/api/regulatorio/trazabilidad/reactivos"
        body = {
          reactivo_id: targetId,
          tipo_evento: tipoEvento,
          fecha,
          numero_lote: numeroLote || null,
          cantidad: cantidad ? Number(cantidad) : null,
          unidad: unidad || null,
          proveedor: proveedor || null,
          condiciones: condiciones || null,
          observaciones: observaciones || null,
        }
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al crear evento")
      }

      toast.success("Evento registrado correctamente")
      resetForm()
      onOpenChange(false)
      onCreated()
    } catch (error: any) {
      toast.error(error.message || "Error al registrar evento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const tipos = mode === "equipo" ? EQUIPO_TIPOS : REACTIVO_TIPOS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Evento de Trazabilidad</DialogTitle>
          <DialogDescription>
            {mode === "equipo"
              ? "Registre un evento en el historial de este equipo."
              : "Registre un evento en el historial de este reactivo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo Evento */}
          <div className="space-y-2">
            <Label htmlFor="tipo_evento">
              Tipo de Evento <span className="text-red-500">*</span>
            </Label>
            <Select value={tipoEvento} onValueChange={setTipoEvento}>
              <SelectTrigger id="tipo_evento">
                <SelectValue placeholder="Seleccione tipo..." />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha">
              Fecha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Equipo-specific fields */}
          {mode === "equipo" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="institucion">Institucion</Label>
                <Input
                  id="institucion"
                  value={institucion}
                  onChange={(e) => setInstitucion(e.target.value)}
                  placeholder="Hospital, clinica, laboratorio..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proxima_fecha">Proxima fecha programada</Label>
                <Input
                  id="proxima_fecha"
                  type="date"
                  value={proximaFecha}
                  onChange={(e) => setProximaFecha(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Reactivo-specific fields */}
          {mode === "reactivo" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_lote">Numero de Lote</Label>
                  <Input
                    id="numero_lote"
                    value={numeroLote}
                    onChange={(e) => setNumeroLote(e.target.value)}
                    placeholder="Ej: LOT-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidad">Unidad</Label>
                  <Input
                    id="unidad"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    placeholder="Ej: ml, unidades, kits"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="0"
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                />
              </div>

              {tipoEvento === "recepcion" && (
                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Input
                    id="proveedor"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="condiciones">Condiciones</Label>
                <Input
                  id="condiciones"
                  value={condiciones}
                  onChange={(e) => setCondiciones(e.target.value)}
                  placeholder="Ej: 2-8C, ambiente, congelado"
                />
              </div>
            </>
          )}

          {/* Observaciones (shared) */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
