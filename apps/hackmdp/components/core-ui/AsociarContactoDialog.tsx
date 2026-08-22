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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PersonaFormData, TipoPersona, RolLaboratorio } from "@/lib/types/personas";
import { toast } from "sonner";
import { User, Users, Plus, Search, Check, Briefcase, Mail, Phone, Loader2 } from "lucide-react";

interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo?: string;
  email?: string[];
  telefono?: string[];
  cargo?: string;
  tipo_persona?: string;
}

interface PersonaLaboratorio {
  id: string;
  persona_id: string;
  laboratorio_id: string;
}

interface AsociarContactoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laboratorioId: string;
  laboratorioNombre: string;
  contactosExistentes?: string[]; // IDs de personas ya asociadas
  onContactoAsociado: () => void;
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

const ROLES_LABORATORIO: { value: RolLaboratorio; label: string }[] = [
  { value: "bioquimico_responsable", label: "Bioquímico Responsable" },
  { value: "bioquimico", label: "Bioquímico" },
  { value: "tecnico_principal", label: "Técnico Principal" },
  { value: "tecnico", label: "Técnico" },
  { value: "administrativo", label: "Administrativo" },
  { value: "otro", label: "Otro" },
];

export function AsociarContactoDialog({
  open,
  onOpenChange,
  laboratorioId,
  laboratorioNombre,
  contactosExistentes = [],
  onContactoAsociado,
}: AsociarContactoDialogProps) {
  const [activeTab, setActiveTab] = useState<"asociar" | "crear">("asociar");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [selectedRol, setSelectedRol] = useState<RolLaboratorio | "">("");

  // Form data para crear nuevo contacto
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
  const [telefonoInput, setTelefonoInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [nuevoRol, setNuevoRol] = useState<RolLaboratorio | "">("");

  // Fetch todas las personas para buscar
  const { data: allPersonas, isLoading: loadingPersonas } = useSWR<Persona[]>(
    open ? "/api/personas" : null,
    fetcher
  );

  // Filtrar personas disponibles (no asociadas ya)
  const personasDisponibles = useMemo(() => {
    if (!allPersonas || !Array.isArray(allPersonas)) return [];
    return allPersonas.filter(
      (persona) => !contactosExistentes.includes(persona.id)
    );
  }, [allPersonas, contactosExistentes]);

  // Filtrar por búsqueda
  const personasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return personasDisponibles;
    const query = searchQuery.toLowerCase();
    return personasDisponibles.filter(
      (persona) =>
        persona.nombre_completo?.toLowerCase().includes(query) ||
        persona.nombre?.toLowerCase().includes(query) ||
        persona.apellido?.toLowerCase().includes(query) ||
        persona.email?.some(e => e.toLowerCase().includes(query)) ||
        persona.cargo?.toLowerCase().includes(query)
    );
  }, [personasDisponibles, searchQuery]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("asociar");
      setSearchQuery("");
      setSelectedPersonaId("");
      setSelectedRol("");
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
        notas: "",
        activo: true,
      });
      setTelefonoInput("");
      setEmailInput("");
      setNuevoRol("");
    }
  }, [open]);

  const handleAsociar = async () => {
    if (!selectedPersonaId) {
      toast.error("Selecciona un contacto para asociar");
      return;
    }

    setLoading(true);
    try {
      // Crear relación persona-laboratorio
      const res = await fetch("/api/personas-laboratorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_id: selectedPersonaId,
          laboratorio_id: laboratorioId,
          rol: selectedRol || undefined,
          activo: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al asociar contacto");
      }

      toast.success("Contacto asociado correctamente");
      onContactoAsociado();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error asociando contacto:", error);
      toast.error(error.message || "Error al asociar contacto");
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      toast.error("El nombre y apellido son requeridos");
      return;
    }

    setLoading(true);
    try {
      // Crear la persona
      const dataToSave: PersonaFormData = {
        ...formData,
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
      };

      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear contacto");
      }

      const persona = await res.json();

      // Crear relación persona-laboratorio
      if (persona.id) {
        await fetch("/api/personas-laboratorios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona_id: persona.id,
            laboratorio_id: laboratorioId,
            rol: nuevoRol || undefined,
            activo: true,
          }),
        });
      }

      toast.success("Contacto creado y asociado correctamente");
      onContactoAsociado();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creando contacto:", error);
      toast.error(error.message || "Error al crear contacto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-500" />
            Agregar Contacto
          </DialogTitle>
          <DialogDescription className="text-sm">
            Asocia un contacto existente o crea uno nuevo para <strong>{laboratorioNombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "asociar" | "crear")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl h-auto">
            <TabsTrigger value="asociar" className="gap-2 rounded-lg py-2.5 px-4 border-0 data-[state=active]:border-0 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:shadow-none">
              <Search className="h-4 w-4" />
              Asociar Existente
            </TabsTrigger>
            <TabsTrigger value="crear" className="gap-2 rounded-lg py-2.5 px-4 border-0 data-[state=active]:border-0 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:shadow-none">
              <Plus className="h-4 w-4" />
              Crear Nuevo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="asociar" className="flex-1 flex flex-col min-h-0 mt-0 px-6 py-4">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Buscador */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Buscar contacto</Label>
                <Input
                  placeholder="Buscar por nombre, email, cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Rol en el laboratorio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rol en el laboratorio</Label>
                <Select
                  value={selectedRol}
                  onValueChange={(value) => setSelectedRol(value as RolLaboratorio)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Seleccionar rol (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_LABORATORIO.map((rol) => (
                      <SelectItem key={rol.value} value={rol.value}>
                        {rol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de contactos */}
              <div className="flex-1 min-h-0">
                <Label className="text-sm font-medium mb-2 block">
                  Contactos disponibles ({personasFiltradas.length})
                </Label>
                <ScrollArea className="h-[200px] border rounded-lg">
                  {loadingPersonas ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : personasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No se encontraron contactos" : "No hay contactos disponibles"}
                      </p>
                      <Button
                        type="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setActiveTab("crear")}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Crear nuevo
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {personasFiltradas.map((persona) => (
                        <div
                          key={persona.id}
                          onClick={() => setSelectedPersonaId(persona.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedPersonaId === persona.id
                              ? "bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-500"
                              : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            selectedPersonaId === persona.id
                              ? "bg-rose-500 text-white"
                              : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                          }`}>
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {persona.nombre_completo || `${persona.nombre} ${persona.apellido}`}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {persona.cargo && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {persona.cargo}
                                </span>
                              )}
                              {persona.email?.[0] && (
                                <>
                                  {persona.cargo && <span>•</span>}
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="h-3 w-3" />
                                    {persona.email[0]}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {selectedPersonaId === persona.id && (
                            <Check className="h-5 w-5 text-rose-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  htmlType="button"
                  type="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  htmlType="button"
                  type="primary"
                  onClick={handleAsociar}
                  disabled={loading || !selectedPersonaId}
                  loading={loading}
                >
                  Asociar Contacto
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="crear" className="flex-1 flex flex-col min-h-0 mt-0">
            <form onSubmit={handleCrear} className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
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
                      <Label htmlFor="nuevoRol" className="text-sm font-medium">
                        Rol en el laboratorio
                      </Label>
                      <Select
                        value={nuevoRol}
                        onValueChange={(value) => setNuevoRol(value as RolLaboratorio)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES_LABORATORIO.map((rol) => (
                            <SelectItem key={rol.value} value={rol.value}>
                              {rol.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contacto */}
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
                    </div>
                  </div>

                  {/* Notas */}
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
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t">
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    htmlType="button"
                    type="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    htmlType="submit"
                    type="primary"
                    disabled={loading}
                    loading={loading}
                  >
                    Crear y Asociar
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
