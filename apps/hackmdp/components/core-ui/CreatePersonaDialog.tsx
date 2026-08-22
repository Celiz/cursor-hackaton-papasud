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
import { CiudadCombobox } from "./CiudadCombobox";
import { searchClientes } from "@/hooks/use-client-search";
import { TagSelector } from "@/components/core-ui/TagSelector";
import { PersonaFormData, TipoPersona } from "@/lib/types/personas";
import { toast } from "sonner";

interface CreatePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PersonaFormData) => Promise<void>;
  defaultLaboratorioId?: string;
  defaultClienteId?: string;
  /** Nombre del cliente precargado. Si viene, el campo se llena al instante y
   *  no hace falta ir a buscarlo a la API. */
  defaultClienteNombre?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TIPOS_PERSONA: { value: TipoPersona; label: string }[] = [
  { value: "contacto_ventas", label: "Contacto de Ventas" },
  { value: "bioquimico", label: "Bioquímico" },
  { value: "veterinario", label: "Veterinario" },
  { value: "tecnico", label: "Técnico" },
  { value: "administrativo", label: "Administrativo" },
  { value: "responsable_tecnico", label: "Responsable Técnico" },
  { value: "otro", label: "Otro" },
];

export function CreatePersonaDialog({
  open,
  onOpenChange,
  onSave,
  defaultLaboratorioId,
  defaultClienteId,
  defaultClienteNombre,
}: CreatePersonaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [laboratorioId, setLaboratorioId] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  // Opción elegida en el combobox de cliente. Se guarda acá y no se busca en
  // una lista precargada: son 1400+ clientes y la lista traía sólo los últimos
  // 500, así que el cliente del que venías podía no estar y el campo se veía
  // vacío aunque estuviera bien seteado.
  const [clienteOption, setClienteOption] = useState<ComboboxOption | null>(null);
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
    fecha_nacimiento: "",
    ciudad: "",
    provincia: "",
    direccion: "",
    notas: "",
    activo: true,
  });

  // Estado para inputs de texto (antes de convertir a arrays)
  const [telefonoInput, setTelefonoInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // Fetch laboratorios disponibles (para el combobox de vinculación).
  // Si hay cliente seleccionado, filtrar sólo sus laboratorios vinculados;
  // si no, mostrar todos (permite crear contacto con laboratorio suelto).
  const laboratoriosUrl = open
    ? `/api/laboratorios?activos=true&limit=500${clienteId ? `&cliente_id=${clienteId}` : ""}`
    : null;
  const { data: laboratorios } = useSWR<Array<{ id: string; nombre: string; localidad?: string; rubro?: string }>>(
    laboratoriosUrl,
    fetcher
  );

  const laboratoriosOptions: ComboboxOption[] = useMemo(() => {
    if (!Array.isArray(laboratorios)) return [];
    return laboratorios.map((l) => ({
      value: l.id,
      label: l.nombre,
      secondaryLabel: [l.rubro === "veterinario" ? "Vet" : null, l.localidad].filter(Boolean).join(" · ") || undefined,
    }));
  }, [laboratorios]);

  const laboratorioNombre = useMemo(() => {
    if (!laboratorios || !Array.isArray(laboratorios) || !laboratorioId) return null;
    const lab = laboratorios.find(l => l.id === laboratorioId);
    return lab?.nombre;
  }, [laboratorios, laboratorioId]);

  // Cliente precargado: si quien abre el diálogo ya sabe cómo se llama (la
  // ficha del cliente, por ejemplo) el campo se llena al instante. Si no, se
  // resuelve por id. Nunca se busca dentro de una lista precargada: esa lista
  // tardaba segundos y el campo se veía vacío mientras tanto.
  const { data: clientePrecargado } = useSWR<{ id: string; nombre: string; nombre_fantasia?: string; localidad?: string }>(
    open && defaultClienteId && !defaultClienteNombre ? `/api/clientes/${defaultClienteId}` : null,
    fetcher
  );

  const clienteOptionPrecargada: ComboboxOption | null = useMemo(() => {
    if (!defaultClienteId) return null;
    if (defaultClienteNombre) {
      return { value: defaultClienteId, label: defaultClienteNombre };
    }
    if (!clientePrecargado?.id) return null;
    return {
      value: clientePrecargado.id,
      label: clientePrecargado.nombre_fantasia || clientePrecargado.nombre,
      secondaryLabel: clientePrecargado.localidad || undefined,
    };
  }, [defaultClienteId, defaultClienteNombre, clientePrecargado]);

  // El nombre a mostrar sale de la opción elegida a mano o, si no se tocó nada,
  // de la precargada.
  const clienteNombre = useMemo(() => {
    if (!clienteId) return null;
    if (clienteOption?.value === clienteId) return clienteOption.label;
    if (clienteOptionPrecargada?.value === clienteId) return clienteOptionPrecargada.label;
    return null;
  }, [clienteId, clienteOption, clienteOptionPrecargada]);

  // Si el laboratorio seleccionado no pertenece al cliente actual, limpiarlo.
  useEffect(() => {
    if (!laboratorioId || !Array.isArray(laboratorios)) return;
    const stillValid = laboratorios.some((l) => l.id === laboratorioId);
    if (!stillValid) setLaboratorioId("");
  }, [laboratorios, laboratorioId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        nombre: "",
        apellido: "",
        dni: "",
        email: [],
        telefono: [],
        tipo_persona: "contacto_ventas",
        profesion: "",
        matricula_profesional: "",
        cargo: "",
        fecha_nacimiento: "",
        ciudad: "",
        provincia: "",
        direccion: "",
        notas: "",
        activo: true,
      });
      setTelefonoInput("");
      setEmailInput("");
      setSelectedTags([]);
      setLaboratorioId(defaultLaboratorioId || "");
      setClienteId(defaultClienteId || "");
      setClienteOption(null);
    }
  }, [open, defaultLaboratorioId, defaultClienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      // Convertir inputs de texto a arrays
      const dataToSave: PersonaFormData = {
        ...formData,
        tags: selectedTags,
        telefono: telefonoInput
          ? telefonoInput.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        email: emailInput
          ? emailInput.split(",").map((e) => e.trim()).filter(Boolean)
          : [],
        dni: formData.dni || undefined,
        profesion: formData.profesion || undefined,
        matricula_profesional: formData.matricula_profesional || undefined,
        cargo: formData.cargo || undefined,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        ciudad: formData.ciudad || undefined,
        provincia: formData.provincia || undefined,
        direccion: formData.direccion || undefined,
        laboratorio_id: laboratorioId || undefined,
        cliente_id: clienteId || undefined,
      };

      await onSave(dataToSave);

      toast.success("Contacto creado correctamente");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating persona:", error);
      toast.error("Error al crear contacto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl">Crear Nuevo Contacto</DialogTitle>
            <DialogDescription className="text-sm">
              Completa la información del contacto. Los campos con * son
              obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* Vínculo a cliente (opcional) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Cliente <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <SearchableCombobox
                  value={clienteId}
                  onValueChange={(v, option) => {
                    setClienteId(v);
                    setClienteOption(option ?? null);
                  }}
                  searchFn={searchClientes}
                  defaultSelectedOption={clienteOptionPrecargada}
                  placeholder="Sin cliente asignado"
                  emptyMessage="No se encontraron clientes"
                />
                <p className="text-xs text-muted-foreground">
                  {clienteId && clienteNombre
                    ? `Se vinculará a: ${clienteNombre}`
                    : "Podés crear el contacto sin cliente y vincularlo después."}
                </p>
              </div>

              {/* Vínculo a laboratorio (opcional) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Laboratorio <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <SearchableCombobox
                  value={laboratorioId}
                  onValueChange={setLaboratorioId}
                  preloadedOptions={laboratoriosOptions}
                  enableLocalSearch={true}
                  placeholder="Sin laboratorio asignado"
                  emptyMessage="No se encontraron laboratorios"
                />
                <p className="text-xs text-muted-foreground">
                  {laboratorioId && laboratorioNombre
                    ? `Se vinculará a: ${laboratorioNombre}`
                    : "Podés crear el contacto sin laboratorio y vincularlo después."}
                </p>
              </div>

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
                    Apellido
                  </Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
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

              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento" className="text-sm font-medium">
                  Fecha de nacimiento
                </Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_nacimiento: e.target.value })
                  }
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Se usa para el saludo automático de cumpleaños.
                </p>
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
                  <Label className="text-sm font-medium">Dirección</Label>
                  <Input
                    value={formData.direccion || ""}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número, piso..."
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ciudad" className="text-sm font-medium">Localidad</Label>
                    <CiudadCombobox
                      value={formData.ciudad || ""}
                      onChange={(v) => setFormData({ ...formData, ciudad: v })}
                      onSelect={(loc, prov) => setFormData({ ...formData, ciudad: loc, provincia: prov })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Provincia</Label>
                    <Input
                      value={formData.provincia || ""}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value.toUpperCase() })}
                      placeholder="(se completa con la localidad)"
                      className="h-10"
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
                Crear Contacto
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
