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
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LaboratorioFormData } from "@/lib/types/laboratorios";
import { toast } from "sonner";
import { FlaskConical, Plus, Search, Check, Building2, MapPin, Loader2 } from "lucide-react";

interface Laboratorio {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  localidad?: string;
  tipo?: string;
  razon_social_id?: string;
  razon_social?: {
    id: string;
    nombre: string;
  };
}

interface AsociarLaboratorioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNombre: string;
  laboratoriosExistentes?: string[]; // IDs de laboratorios ya asociados
  onLaboratorioAsociado: () => void;
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

export function AsociarLaboratorioDialog({
  open,
  onOpenChange,
  clienteId,
  clienteNombre,
  laboratoriosExistentes = [],
  onLaboratorioAsociado,
}: AsociarLaboratorioDialogProps) {
  const [activeTab, setActiveTab] = useState<"asociar" | "crear">("asociar");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLaboratorioId, setSelectedLaboratorioId] = useState<string>("");

  // Form data para crear nuevo laboratorio
  const [formData, setFormData] = useState<LaboratorioFormData>({
    nombre: "",
    codigo: "",
    direccion: "",
    localidad: "",
    provincia: "",
    telefono: [],
    email: [],
    tipo: "",
    razon_social_id: clienteId,
    activo: true,
    notas: "",
  });
  const [telefonoInput, setTelefonoInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  // Fetch todos los laboratorios para buscar
  const { data: allLaboratorios, isLoading: loadingLabs } = useSWR<Laboratorio[]>(
    open ? "/api/laboratorios" : null,
    fetcher
  );

  // Filtrar laboratorios disponibles (no asociados ya)
  const laboratoriosDisponibles = useMemo(() => {
    if (!allLaboratorios || !Array.isArray(allLaboratorios)) return [];
    return allLaboratorios.filter(
      (lab) => !laboratoriosExistentes.includes(lab.id)
    );
  }, [allLaboratorios, laboratoriosExistentes]);

  // Filtrar por búsqueda
  const laboratoriosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return laboratoriosDisponibles;
    const query = searchQuery.toLowerCase();
    return laboratoriosDisponibles.filter(
      (lab) =>
        lab.nombre.toLowerCase().includes(query) ||
        lab.codigo?.toLowerCase().includes(query) ||
        lab.direccion?.toLowerCase().includes(query) ||
        lab.localidad?.toLowerCase().includes(query)
    );
  }, [laboratoriosDisponibles, searchQuery]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("asociar");
      setSearchQuery("");
      setSelectedLaboratorioId("");
      setFormData({
        nombre: "",
        codigo: "",
        direccion: "",
        localidad: "",
        provincia: "",
        telefono: [],
        email: [],
        tipo: "",
        razon_social_id: clienteId,
        activo: true,
        notas: "",
      });
      setTelefonoInput("");
      setEmailInput("");
    }
  }, [open, clienteId]);

  const handleAsociar = async () => {
    if (!selectedLaboratorioId) {
      toast.error("Selecciona un laboratorio para asociar");
      return;
    }

    setLoading(true);
    try {
      // Vincular el laboratorio a esta razón social vía la relación M:N
      // (laboratorio_razones_sociales, migración 884). Es la tabla desde la que
      // lee el detalle del cliente; PATCH de razon_social_id no la actualizaría.
      const res = await fetch(
        `/api/laboratorios/${selectedLaboratorioId}/razones-sociales`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente_id: clienteId }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al asociar laboratorio");
      }

      toast.success("Laboratorio asociado correctamente");
      onLaboratorioAsociado();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error asociando laboratorio:", error);
      toast.error(error.message || "Error al asociar laboratorio");
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      const dataToSave: LaboratorioFormData = {
        ...formData,
        telefono: telefonoInput
          ? telefonoInput.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        email: emailInput
          ? emailInput.split(",").map((e) => e.trim()).filter(Boolean)
          : [],
        razon_social_id: clienteId,
        tipo: formData.tipo || undefined,
        codigo: formData.codigo || undefined,
      };

      const res = await fetch("/api/laboratorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear laboratorio");
      }

      toast.success("Laboratorio creado y asociado correctamente");
      onLaboratorioAsociado();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creando laboratorio:", error);
      toast.error(error.message || "Error al crear laboratorio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-500" />
            Agregar Laboratorio
          </DialogTitle>
          <DialogDescription className="text-sm">
            Asocia un laboratorio existente o crea uno nuevo para <strong>{clienteNombre}</strong>
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
                <Label className="text-sm font-medium">Buscar laboratorio</Label>
                <Input
                  placeholder="Buscar por nombre, código, dirección..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Lista de laboratorios */}
              <div className="flex-1 min-h-0">
                <Label className="text-sm font-medium mb-2 block">
                  Laboratorios disponibles ({laboratoriosFiltrados.length})
                </Label>
                <ScrollArea className="h-[250px] border rounded-lg">
                  {loadingLabs ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : laboratoriosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <FlaskConical className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No se encontraron laboratorios" : "No hay laboratorios disponibles"}
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
                      {laboratoriosFiltrados.map((lab) => (
                        <div
                          key={lab.id}
                          onClick={() => setSelectedLaboratorioId(lab.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedLaboratorioId === lab.id
                              ? "bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500"
                              : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent"
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            selectedLaboratorioId === lab.id
                              ? "bg-violet-500 text-white"
                              : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                          }`}>
                            <FlaskConical className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lab.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {lab.tipo && (
                                <span className="capitalize">{lab.tipo.replace("_", " ")}</span>
                              )}
                              {lab.localidad && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {lab.localidad}
                                  </span>
                                </>
                              )}
                            </div>
                            {lab.razon_social && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                Actualmente en: {lab.razon_social.nombre}
                              </p>
                            )}
                          </div>
                          {selectedLaboratorioId === lab.id && (
                            <Check className="h-5 w-5 text-violet-500 flex-shrink-0" />
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
                  disabled={loading || !selectedLaboratorioId}
                  loading={loading}
                >
                  Asociar Laboratorio
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
                        placeholder="Nombre del laboratorio"
                        className="h-10"
                      />
                    </div>

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

                  {/* Ubicación */}
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
