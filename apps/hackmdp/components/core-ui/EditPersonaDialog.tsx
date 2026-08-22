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
import { TagSelector } from "@/components/core-ui/TagSelector";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import { Persona, PersonaFormData, TipoPersona } from "@/lib/types/personas";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface EditPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona;
  onSave: (data: Partial<PersonaFormData> & { id: string }) => Promise<void>;
}

const TIPOS_PERSONA: { value: TipoPersona; label: string }[] = [
  { value: "contacto_ventas", label: "Contacto de Ventas" },
  { value: "bioquimico", label: "Bioquímico" },
  { value: "veterinario", label: "Veterinario" },
  { value: "tecnico", label: "Técnico" },
  { value: "administrativo", label: "Administrativo" },
  { value: "responsable_tecnico", label: "Responsable Técnico" },
  { value: "otro", label: "Otro" },
];

export function EditPersonaDialog({
  open,
  onOpenChange,
  persona,
  onSave,
}: EditPersonaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [responsableId, setResponsableId] = useState<string>("");

  // Fetch team members for responsable selector
  const { data: teamMembers } = useSWR<any[]>(open ? "/api/users" : null, fetcher);
  const teamOptions = useMemo<ComboboxOption[]>(() => {
    if (!teamMembers || !Array.isArray(teamMembers)) return [];
    return teamMembers.map((m) => ({
      value: m.id,
      label: m.nombre || m.email,
      subtitle: m.email,
    }));
  }, [teamMembers]);

  const [formData, setFormData] = useState<PersonaFormData>({
    nombre: "",
    apellido: "",
    dni: "",
    email: [],
    telefono: [],
    tipo_persona: "contacto_ventas",
    profesion: "",
    matricula_profesional: "",
    cargo: "",
    notas: "",
    activo: true,
  });

  // Estado para inputs de texto (antes de convertir a arrays)
  const [telefonoInput, setTelefonoInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // Populate form when dialog opens
  useEffect(() => {
    if (open && persona) {
      setFormData({
        nombre: persona.nombre || "",
        apellido: persona.apellido || "",
        dni: persona.dni || "",
        email: persona.email || [],
        telefono: persona.telefono || [],
        tipo_persona: persona.tipo_persona || "contacto_ventas",
        profesion: persona.profesion || "",
        matricula_profesional: persona.matricula_profesional || "",
        cargo: persona.cargo || "",
        notas: persona.notas || "",
        activo: persona.activo ?? true,
      });
      setTelefonoInput(persona.telefono?.join(", ") || "");
      setEmailInput(persona.email?.join(", ") || "");
      setSelectedTags(
        Array.isArray((persona as any).tags)
          ? (persona as any).tags.map((t: any) => t.id)
          : []
      );
      setResponsableId(persona.usuario_asignado_id || "");
    }
  }, [open, persona]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      toast.error("El nombre y apellido son requeridos");
      return;
    }

    setLoading(true);
    try {
      // Convertir inputs de texto a arrays
      // Nota: nombre_completo es una columna generada, no se debe incluir
      const dataToSave: Partial<PersonaFormData> & { id: string } = {
        id: persona.id,
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: telefonoInput
          ? telefonoInput.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        email: emailInput
          ? emailInput.split(",").map((e) => e.trim()).filter(Boolean)
          : [],
        dni: formData.dni || undefined,
        tipo_persona: formData.tipo_persona,
        profesion: formData.profesion || undefined,
        matricula_profesional: formData.matricula_profesional || undefined,
        cargo: formData.cargo || undefined,
        notas: formData.notas || undefined,
        activo: formData.activo,
        tags: selectedTags,
        usuario_asignado_id: responsableId || undefined,
      };

      await onSave(dataToSave);
      toast.success("Contacto actualizado correctamente");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating persona:", error);
      toast.error("Error al actualizar contacto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl">Editar Contacto</DialogTitle>
            <DialogDescription className="text-sm">
              Modifica la información del contacto. Los campos con * son
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
                    placeholder="Nombre"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido" className="text-sm font-medium">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
                    required
                    placeholder="Apellido"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni" className="text-sm font-medium">
                    DNI
                  </Label>
                  <Input
                    id="dni"
                    value={formData.dni}
                    onChange={(e) =>
                      setFormData({ ...formData, dni: e.target.value })
                    }
                    placeholder="12345678"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_persona" className="text-sm font-medium">
                    Tipo de Contacto
                  </Label>
                  <Select
                    value={formData.tipo_persona}
                    onValueChange={(value: TipoPersona) =>
                      setFormData({ ...formData, tipo_persona: value })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PERSONA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Información Profesional */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Información Profesional
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cargo" className="text-sm font-medium">
                      Cargo
                    </Label>
                    <Input
                      id="cargo"
                      value={formData.cargo}
                      onChange={(e) =>
                        setFormData({ ...formData, cargo: e.target.value })
                      }
                      placeholder="Ej: Director Técnico"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profesion" className="text-sm font-medium">
                      Profesión
                    </Label>
                    <Input
                      id="profesion"
                      value={formData.profesion}
                      onChange={(e) =>
                        setFormData({ ...formData, profesion: e.target.value })
                      }
                      placeholder="Ej: Bioquímico"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="matricula_profesional" className="text-sm font-medium">
                      Matrícula Profesional
                    </Label>
                    <Input
                      id="matricula_profesional"
                      value={formData.matricula_profesional}
                      onChange={(e) =>
                        setFormData({ ...formData, matricula_profesional: e.target.value })
                      }
                      placeholder="Número de matrícula"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsable" className="text-sm font-medium">
                      Responsable de Ventas
                    </Label>
                    <SearchableCombobox
                      preloadedOptions={teamOptions}
                      value={responsableId}
                      onValueChange={setResponsableId}
                      placeholder="Asignar responsable..."
                      emptyMessage="No se encontraron miembros"
                      enableLocalSearch
                    />
                  </div>
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
                    Clasifica el contacto para listas de difusión y estadísticas
                  </p>
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
                    placeholder="Notas adicionales sobre el contacto..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Activo</Label>
                    <p className="text-xs text-muted-foreground">
                      El contacto estará disponible para selección
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
                Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
