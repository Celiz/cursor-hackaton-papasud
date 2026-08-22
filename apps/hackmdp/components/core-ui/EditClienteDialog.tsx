"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente, Transporte } from "@/lib/types";
import { Loader2, Truck, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TagSelector } from "@/components/core-ui/TagSelector";
import { ChipInput } from "@/components/core-ui/ChipInput";
import { EstadoCombobox } from "@/components/core-ui/EstadoCombobox";
import { getEstadoStyle } from "@/lib/estado-helpers";
import { cn } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface EditClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Cliente>) => Promise<void>;
  cliente: Cliente;
}

export function EditClienteDialog({ open, onOpenChange, onSave, cliente }: EditClienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    nombre_fantasia: "",
    cuit: "",
    email: [] as string[],
    telefono: [] as string[],
    direccion: "",
    localidad: "",
    provincia: "",
    codigo_postal: "",
    estado: "En Orden",
    condicion_iva: "consumidor_final",
    transporte_id: "",
    division: "humanos" as "humanos" | "veterinaria",
    es_legacy: false,
  });

  // Cargar lista de transportes
  const { data: transportes } = useSWR<Transporte[]>(open ? "/api/transportes" : null, fetcher);

  useEffect(() => {
    if (cliente) {
      const emailArr = Array.isArray(cliente.email)
        ? cliente.email
        : cliente.email
          ? String(cliente.email).split(/[,;]/).map(s => s.trim()).filter(Boolean)
          : [];
      const telArr = Array.isArray(cliente.telefono)
        ? cliente.telefono
        : cliente.telefono
          ? String(cliente.telefono).split(/[,;]/).map(s => s.trim()).filter(Boolean)
          : [];
      setFormData({
        nombre: cliente.nombre ?? "",
        nombre_fantasia: cliente.nombre_fantasia ?? "",
        cuit: cliente.cuit ?? "",
        email: emailArr,
        telefono: telArr,
        direccion: cliente.direccion ?? "",
        localidad: (cliente as any).localidad ?? "",
        provincia: (cliente as any).provincia ?? "",
        codigo_postal: (cliente as any).codigo_postal ?? "",
        estado: cliente.estado ?? "En Orden",
        condicion_iva: (cliente as any).condicion_iva ?? "consumidor_final",
        transporte_id: cliente.transporte_id ?? "",
        division: (cliente as any).division ?? "humanos",
        es_legacy: (cliente as any).es_legacy ?? false,
      });
      setSelectedTags(
        Array.isArray((cliente as any).tags)
          ? (cliente as any).tags.map((t: any) => t.id)
          : []
      );
    }
  }, [cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...formData,
        email: formData.email,
        telefono: formData.telefono,
        tags: selectedTags as any,
        transporte_id: formData.transporte_id || undefined,
        condicion_iva: formData.condicion_iva as any,
        localidad: formData.localidad || undefined,
        provincia: formData.provincia || undefined,
        codigo_postal: formData.codigo_postal || undefined,
        division: formData.division,
        es_legacy: formData.es_legacy,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">Editar Empresa</DialogTitle>
              {(() => {
                const s = getEstadoStyle(formData.estado || cliente.estado);
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      s.badgeClass,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dotClass)} />
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <DialogDescription className="text-sm">
              Completa los datos de la empresa. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* Información Básica - 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Razón Social <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Nombre completo o razón social"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre_fantasia" className="text-sm font-medium">
                    Nombre de fantasía
                  </Label>
                  <Input
                    id="nombre_fantasia"
                    value={formData.nombre_fantasia}
                    onChange={(e) => setFormData({ ...formData, nombre_fantasia: e.target.value })}
                    placeholder="Nombre comercial o secundario (opcional)"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicion_iva" className="text-sm font-medium">
                    Condición IVA
                  </Label>
                  <Select
                    value={formData.condicion_iva}
                    onValueChange={(value) => setFormData({ ...formData, condicion_iva: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                      <SelectItem value="monotributista">Monotributista</SelectItem>
                      <SelectItem value="exento">Exento</SelectItem>
                      <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuit" className="text-sm font-medium">
                    CUIT / DNI
                  </Label>
                  <Input
                    id="cuit"
                    value={formData.cuit}
                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                    placeholder="CUIT o DNI"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional. Para consumidor final usar DNI
                  </p>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Contacto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Emails</Label>
                    <ChipInput
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(next) => setFormData({ ...formData, email: next })}
                      placeholder="email@ejemplo.com"
                      ariaLabel="Lista de emails"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter o coma para agregar. Backspace borra el último.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-sm font-medium">Teléfonos</Label>
                    <ChipInput
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(next) => setFormData({ ...formData, telefono: next })}
                      placeholder="+54 11 1234-5678"
                      ariaLabel="Lista de teléfonos"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter o coma para agregar. Backspace borra el último.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion" className="text-sm font-medium">Dirección</Label>
                  <Textarea
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="localidad" className="text-sm font-medium">Localidad</Label>
                    <Input
                      id="localidad"
                      value={formData.localidad}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                      placeholder="Ciudad"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provincia" className="text-sm font-medium">Provincia</Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="Provincia"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigo_postal" className="text-sm font-medium">Código Postal</Label>
                    <Input
                      id="codigo_postal"
                      value={formData.codigo_postal}
                      onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                      placeholder="Ej. 7600"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Estado y Transporte */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Configuración
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estado" className="text-sm font-medium">Estado</Label>
                    <EstadoCombobox
                      id="estado"
                      value={formData.estado}
                      onChange={(value) => setFormData({ ...formData, estado: value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      "En Orden" por defecto. Si algo no va bien, escribí un motivo y se marca en amarillo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transporte" className="text-sm font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Transporte Preferido
                    </Label>
                    <Select
                      value={formData.transporte_id || "__none__"}
                      onValueChange={(value) => setFormData({ ...formData, transporte_id: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Sin transporte asignado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin transporte asignado</SelectItem>
                        {transportes?.filter(t => t.activo).map((transporte) => (
                          <SelectItem key={transporte.id} value={transporte.id}>
                            {transporte.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Se mostrará en los pedidos para saber a quién avisar
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="division" className="text-sm font-medium flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    División
                  </Label>
                  <Select
                    value={formData.division}
                    onValueChange={(value: "humanos" | "veterinaria") => setFormData({ ...formData, division: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="humanos">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          Laboratorio Humano
                        </span>
                      </SelectItem>
                      <SelectItem value="veterinaria">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-500" />
                          Veterinaria
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determina el color del encabezado en presupuestos y documentos PDF
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Tags
                </h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Etiquetas
                  </Label>
                  <TagSelector
                    selectedTagIds={selectedTags}
                    onChange={setSelectedTags}
                  />
                  <p className="text-xs text-muted-foreground">
                    Clasifica la empresa con etiquetas para estadísticas y listas de difusión
                  </p>
                </div>
              </div>

              {/* Legacy */}
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_legacy}
                    onChange={(e) => setFormData({ ...formData, es_legacy: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <span>
                    <span className="text-sm font-medium">Cliente legacy (ocultar)</span>
                    <p className="text-xs text-muted-foreground">
                      Duplicado de importación. Se oculta del wizard de nueva orden y de
                      la búsqueda; los servicios históricos lo siguen mostrando.
                    </p>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                htmlType="button"
                type="default"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 sm:flex-initial h-10"
              >
                Cancelar
              </Button>
              <Button
                htmlType="submit"
                type="primary"
                disabled={loading}
                loading={loading}
                className="flex-1 sm:flex-initial h-10"
              >
                Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
