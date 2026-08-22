"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import { LaboratorioFormData } from "@/lib/types/laboratorios";
import { toast } from "sonner";

interface CreateLaboratorioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: LaboratorioFormData) => Promise<void>;
  defaultRazonSocialId?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TIPOS_LABORATORIO = [
  "hospital",
  "clínica",
  "laboratorio",
  "centro_médico",
  "universidad",
  "industria",
  "otro",
];

export function CreateLaboratorioDialog({
  open,
  onOpenChange,
  onSave,
  defaultRazonSocialId,
}: CreateLaboratorioDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LaboratorioFormData>({
    nombre: "",
    codigo: "",
    direccion: "",
    localidad: "",
    provincia: "",
    telefono: [],
    email: [],
    tipo: "",
    rubro: "humano",
    razon_social_id: "",
    activo: true,
    notas: "",
  });

  // Estado para inputs de texto (antes de convertir a arrays)
  const [telefonoInput, setTelefonoInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // Fetch empresas para el selector
  const { data: empresas } = useSWR<Array<{ id: string; nombre: string; cuit?: string }>>(
    open ? "/api/clientes?activos=true" : null,
    fetcher
  );

  // Transformar empresas al formato del combobox
  const empresasOptions: ComboboxOption[] = useMemo(() => {
    if (!Array.isArray(empresas)) return [];
    return empresas.map((empresa) => ({
      value: empresa.id,
      label: empresa.nombre,
      secondaryLabel: empresa.cuit || undefined,
    }));
  }, [empresas]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        nombre: "",
        codigo: "",
        direccion: "",
        localidad: "",
        provincia: "",
        telefono: [],
        email: [],
        tipo: "",
        rubro: "humano",
        razon_social_id: defaultRazonSocialId || "",
        activo: true,
        notas: "",
      });
      setTelefonoInput("");
      setEmailInput("");
    }
  }, [open, defaultRazonSocialId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      // Convertir inputs de texto a arrays
      const dataToSave: LaboratorioFormData = {
        ...formData,
        telefono: telefonoInput
          ? telefonoInput.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        email: emailInput
          ? emailInput.split(",").map((e) => e.trim()).filter(Boolean)
          : [],
        razon_social_id: formData.razon_social_id || undefined,
        tipo: formData.tipo || undefined,
        rubro: formData.rubro || "humano",
        codigo: formData.codigo || undefined,
      };

      await onSave(dataToSave);
      toast.success("Laboratorio creado correctamente");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating laboratorio:", error);
      toast.error("Error al crear laboratorio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl">Crear Nuevo Laboratorio</DialogTitle>
            <DialogDescription className="text-sm">
              Completa la información del laboratorio. Los campos con * son
              obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                    placeholder="Nombre del laboratorio"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo" className="text-sm font-medium">
                    Código
                  </Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo: e.target.value })
                    }
                    placeholder="LAB-001"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Rubro <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  {(["humano", "veterinario"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, rubro: r })}
                      className={
                        "flex-1 h-10 px-4 rounded-md border-2 text-sm font-medium transition-all " +
                        (formData.rubro === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700")
                      }
                    >
                      {r === "humano" ? "Salud humana" : "Veterinario"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium">
                    Tipo
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_LABORATORIO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo.charAt(0).toUpperCase() +
                            tipo.slice(1).replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razon_social" className="text-sm font-medium">
                    Empresa
                  </Label>
                  <SearchableCombobox
                    value={formData.razon_social_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, razon_social_id: value })
                    }
                    preloadedOptions={empresasOptions}
                    enableLocalSearch={true}
                    placeholder="Seleccionar empresa"
                    emptyMessage="No se encontraron empresas"
                  />
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Contacto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para múltiples emails, separa con comas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-sm font-medium">
                      Teléfono
                    </Label>
                    <Input
                      id="telefono"
                      value={telefonoInput}
                      onChange={(e) => setTelefonoInput(e.target.value)}
                      placeholder="+54 11 1234-5678"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para múltiples teléfonos, separa con comas
                    </p>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Ubicación
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="direccion" className="text-sm font-medium">
                    Dirección
                  </Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) =>
                      setFormData({ ...formData, direccion: e.target.value })
                    }
                    placeholder="Calle y número"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="localidad" className="text-sm font-medium">
                      Localidad
                    </Label>
                    <Input
                      id="localidad"
                      value={formData.localidad}
                      onChange={(e) =>
                        setFormData({ ...formData, localidad: e.target.value })
                      }
                      placeholder="Ciudad"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provincia" className="text-sm font-medium">
                      Provincia
                    </Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) =>
                        setFormData({ ...formData, provincia: e.target.value })
                      }
                      placeholder="Provincia"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Notas y Estado */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="space-y-2">
                  <Label htmlFor="notas" className="text-sm font-medium">
                    Notas
                  </Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) =>
                      setFormData({ ...formData, notas: e.target.value })
                    }
                    placeholder="Notas adicionales sobre el laboratorio..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Activo</Label>
                    <p className="text-xs text-muted-foreground">
                      El laboratorio estará disponible para asignaciones
                    </p>
                  </div>
                  <Switch
                    checked={formData.activo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, activo: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                htmlType="button"
                type="outline"
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
                Crear Laboratorio
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
