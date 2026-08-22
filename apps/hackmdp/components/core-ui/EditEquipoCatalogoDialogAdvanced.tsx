"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EquipoCatalogo, DivisionCatalogo } from "@/lib/types";
import {
  Loader2,
  Box,
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Hash,
  Cpu,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { EspecificacionesEditor } from "./EspecificacionesEditor";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import useSWR from "swr";
import { toast } from "sonner";

const fetcherCatalogo = (url: string) => fetch(url).then((r) => r.json());
import { DivisionMultiSelect } from "./DivisionMultiSelect";
import { themeClasses, SheetColorTheme } from "./DetailSheetComponents";

interface EditEquipoCatalogoDialogAdvancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<EquipoCatalogo>) => Promise<void>;
  equipo: EquipoCatalogo | null;
  tiposExistentes?: string[];
  categoriasExistentes?: string[];
}

// Componente de sección reutilizable
function FormSection({
  icon: Icon,
  title,
  theme,
  children,
}: {
  icon: React.ElementType;
  title: string;
  theme: SheetColorTheme;
  children: React.ReactNode;
}) {
  const colors = themeClasses[theme];

  return (
    <section className={cn("space-y-4 p-4 border rounded-xl shadow-sm", colors.section)}>
      <div className={cn("flex items-center gap-2 border-b pb-2", colors.header)}>
        <div className={cn("p-1.5 rounded-lg", colors.iconBg)}>
          <Icon className={cn("h-4 w-4", colors.icon)} />
        </div>
        <h3 className={cn("font-semibold text-sm", colors.text)}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

// Componente de campo con icono
function FormField({
  icon: Icon,
  label,
  theme,
  children,
  className,
}: {
  icon: React.ElementType;
  label: string;
  theme: SheetColorTheme;
  children: React.ReactNode;
  className?: string;
}) {
  const colors = themeClasses[theme];

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
        <div className={cn("p-1 rounded", colors.iconBg)}>
          <Icon className={cn("h-3 w-3", colors.icon)} />
        </div>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function EditEquipoCatalogoDialogAdvanced({
  open,
  onOpenChange,
  onSave,
  equipo,
  tiposExistentes = [],
  categoriasExistentes = [],
}: EditEquipoCatalogoDialogAdvancedProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    visibilidad: false,
  });

  const [formData, setFormData] = useState({
    // Info básica
    marca: "",
    modelo: "",
    tipo: "",
    subtipo: "",
    categoria: "",
    utilidad: "",
    detalle: "",

    // Divisiones
    division: [] as DivisionCatalogo[],

    // Media
    imagen_url: "",

    // Especificaciones
    especificaciones: {} as Record<string, string | number | boolean>,

    // Control
    disponible: true,
    orden: 0,
  });

  // Subtipos en cascada según la Categoría (familia) elegida → equipos.tipo.
  const { data: subtiposData, mutate: mutateSubtipos } = useSWR<Array<{ nombre: string }>>(
    open && formData.tipo?.trim()
      ? `/api/subtipos-equipos?categoria=${encodeURIComponent(formData.tipo.trim())}`
      : null,
    fetcherCatalogo
  );
  const allSubtipos = useMemo(
    () => (subtiposData || []).map((s) => s.nombre).filter(Boolean),
    [subtiposData]
  );

  // Catálogos desde la BD (tablas org-scoped: marcas, tipos_equipos).
  // Solo se disparan cuando el dialog está abierto.
  const { data: marcasData, mutate: mutateMarcas } = useSWR<Array<{ id: string; nombre: string }>>(
    open ? '/api/marcas' : null,
    fetcherCatalogo,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const { data: tiposData, mutate: mutateTipos } = useSWR<Array<{ id: string; nombre: string }>>(
    open ? '/api/tipos-equipos' : null,
    fetcherCatalogo,
    { dedupingInterval: 2 * 60 * 1000 }
  );

  const marcasList = useMemo(
    () => (marcasData || []).map((m) => m.nombre).filter(Boolean),
    [marcasData]
  );
  const allTipos = useMemo(
    () => (tiposData || []).map((t) => t.nombre).filter(Boolean),
    [tiposData]
  );

  // Helper: al "Agregar nuevo" en un combobox, persiste en la tabla catálogo
  // correspondiente y revalida la lista. Devuelve el nombre final.
  const createCatalog = async (
    endpoint: string,
    mutate: () => void,
    label: string,
    nombre: string,
    extraBody: Record<string, unknown> = {}
  ): Promise<string> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, ...extraBody }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || `No se pudo agregar ${label}`);
      throw new Error(err?.error || 'Error');
    }
    const created = await res.json();
    toast.success(`${label} "${created.nombre}" agregado`);
    mutate();
    return created.nombre as string;
  };

  // Inicializar formulario con datos del equipo
  useEffect(() => {
    if (equipo && open) {
      setFormData({
        marca: equipo.marca || "",
        modelo: equipo.modelo || "",
        tipo: equipo.tipo || "",
        subtipo: (equipo as any).subtipo || "",
        categoria: equipo.categoria || "",
        utilidad: equipo.utilidad || "",
        detalle: equipo.detalle || "",
        division: (equipo.division as DivisionCatalogo[]) || [],
        imagen_url: equipo.imagen_url || "",
        especificaciones: (equipo.especificaciones as Record<string, string | number | boolean>) || {},
        disponible: equipo.disponible ?? true,
        orden: equipo.orden ?? 0,
      });
      setActiveTab("basico");
    }
  }, [equipo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave: Partial<EquipoCatalogo> = {
        ...formData,
      };

      // subtipo vacío = limpiar en DB (null), no omitir
      if ((dataToSave as any).subtipo === "") (dataToSave as any).subtipo = null;

      // Limpiar valores vacíos
      Object.keys(dataToSave).forEach((key) => {
        const value = dataToSave[key as keyof typeof dataToSave];
        if (value === "" || value === undefined) {
          delete dataToSave[key as keyof typeof dataToSave];
        }
      });

      await onSave(dataToSave);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating equipo:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const specsCount = useMemo(() => {
    return Object.keys(formData.especificaciones || {}).length;
  }, [formData.especificaciones]);

  if (!equipo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-gradient-to-br from-white via-white to-purple-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/40">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-purple-200/60 dark:border-purple-700/40 bg-gradient-to-r from-white to-purple-50/40 dark:from-gray-900 dark:to-purple-950/20 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="bg-gradient-to-br p-3 rounded-2xl border shadow-sm bg-purple-100 dark:bg-purple-900/40 border-purple-200/60 dark:border-purple-700/40">
              <Box className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl bg-gradient-to-r from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300 bg-clip-text text-transparent">
                Editar Equipo del Catálogo
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono text-gray-500">
                  {equipo.marca} {equipo.modelo}
                </span>
                {equipo.tipo && (
                  <Badge variant="outline" className="h-5 text-xs">
                    {equipo.tipo}
                  </Badge>
                )}
                <Badge
                  className={cn(
                    'h-5 text-xs',
                    equipo.disponible
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-red-100 text-red-700 border-red-200'
                  )}
                >
                  {equipo.disponible ? 'Visible' : 'Oculto'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs de navegación */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-6 flex-shrink-0">
              <TabsList className="h-12 bg-transparent gap-2 p-1">
                <TabsTrigger
                  value="basico"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-purple-600 data-[state=inactive]:hover:bg-purple-50 dark:data-[state=inactive]:hover:bg-purple-950/30
                    data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/40 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                >
                  <Box className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">Info Básica</span>
                </TabsTrigger>
                <TabsTrigger
                  value="especificaciones"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-indigo-600 data-[state=inactive]:hover:bg-indigo-50 dark:data-[state=inactive]:hover:bg-indigo-950/30
                    data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-indigo-900/40 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300"
                >
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">Especificaciones</span>
                  {specsCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {specsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="avanzado"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-amber-600 data-[state=inactive]:hover:bg-amber-50 dark:data-[state=inactive]:hover:bg-amber-950/30
                    data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">Avanzado</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-4 px-6 pb-6 pt-4">
                {/* Tab: Info Básica */}
                <TabsContent value="basico" className="mt-0 space-y-4">
                  <FormSection icon={Box} title="Información General" theme="purple">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FormField icon={Tag} label="Marca *" theme="purple">
                        <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                          <QuickEditableCombobox
                            value={formData.marca}
                            options={marcasList}
                            placeholder="No se encontraron marcas"
                            searchPlaceholder="Buscar marca..."
                            emptyLabel="Sin marca"
                            triggerClassName="font-normal"
                            onChange={async (v) => {
                              setFormData({ ...formData, marca: v });
                              // Si el valor es nuevo, persistirlo en catalogo
                              if (
                                v.trim() &&
                                !marcasList.some(
                                  (m) => m.toLowerCase() === v.trim().toLowerCase()
                                )
                              ) {
                                try {
                                  await createCatalog('/api/marcas', mutateMarcas, 'Marca', v.trim());
                                } catch {}
                              }
                            }}
                          />
                        </div>
                      </FormField>

                      <FormField icon={Hash} label="Modelo *" theme="gray">
                        <Input
                          value={formData.modelo}
                          onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                          required
                          placeholder="Modelo"
                          className="h-9 font-mono"
                        />
                      </FormField>

                      <FormField icon={FileText} label="Categoría" theme="blue">
                        <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                          <QuickEditableCombobox
                            value={formData.tipo}
                            options={allTipos}
                            placeholder="No se encontraron categorías"
                            searchPlaceholder="Buscar categoría..."
                            emptyLabel="Sin categoría"
                            triggerClassName="font-normal"
                            onChange={async (v) => {
                              // Categoría (familia) → se guarda en equipos.tipo.
                              // Al cambiar de familia, limpiamos el subtipo.
                              setFormData((prev) => ({ ...prev, tipo: v, subtipo: "" }));
                              if (
                                v.trim() &&
                                !allTipos.some(
                                  (t) => t.toLowerCase() === v.trim().toLowerCase()
                                )
                              ) {
                                try {
                                  await createCatalog(
                                    '/api/tipos-equipos',
                                    mutateTipos,
                                    'Categoría',
                                    v.trim()
                                  );
                                } catch {}
                              }
                            }}
                          />
                        </div>
                      </FormField>

                      <FormField icon={Settings} label="Tipo" theme="purple">
                        <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                          <QuickEditableCombobox
                            value={formData.subtipo || ""}
                            options={allSubtipos}
                            disabled={!formData.tipo?.trim()}
                            placeholder="No hay tipos para esta categoría"
                            searchPlaceholder="Buscar tipo..."
                            emptyLabel={formData.tipo?.trim() ? "Sin tipo" : "Elegí una categoría primero"}
                            triggerClassName="font-normal"
                            onChange={async (v) => {
                              setFormData((prev) => ({ ...prev, subtipo: v }));
                              if (
                                v.trim() &&
                                formData.tipo?.trim() &&
                                !allSubtipos.some((s) => s.toLowerCase() === v.trim().toLowerCase())
                              ) {
                                try {
                                  await createCatalog(
                                    "/api/subtipos-equipos",
                                    mutateSubtipos,
                                    "Tipo",
                                    v.trim(),
                                    { categoria: formData.tipo.trim() }
                                  );
                                } catch {}
                              }
                            }}
                          />
                        </div>
                      </FormField>
                    </div>

                    <FormField icon={FileText} label="Utilidad" theme="emerald" className="col-span-full">
                      <Input
                        value={formData.utilidad}
                        onChange={(e) => setFormData({ ...formData, utilidad: e.target.value })}
                        placeholder="Breve descripción del uso del equipo..."
                        className="h-9"
                      />
                    </FormField>

                    <FormField icon={FileText} label="Descripción Detallada" theme="gray" className="col-span-full">
                      <Textarea
                        value={formData.detalle}
                        onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                        placeholder="Descripción completa para mostrar en la web..."
                        rows={4}
                        className="resize-none"
                      />
                    </FormField>
                  </FormSection>

                  {/* Divisiones */}
                  <FormSection icon={Layers} title="Divisiones" theme="blue">
                    <DivisionMultiSelect
                      value={formData.division}
                      onChange={(division) => setFormData({ ...formData, division })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Selecciona las divisiones donde aparecerá este equipo en el catálogo web.
                    </p>
                  </FormSection>

                  {/* Imagen */}
                  <FormSection icon={ImageIcon} title="Imagen del Equipo" theme="cyan">
                    <FormField icon={Link2} label="URL de Imagen" theme="cyan">
                      <Input
                        type="url"
                        value={formData.imagen_url}
                        onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                        placeholder="https://..."
                        className="h-9"
                      />
                    </FormField>
                    {formData.imagen_url && (
                      <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <img
                          src={formData.imagen_url}
                          alt="Preview"
                          className="max-h-32 object-contain mx-auto rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </FormSection>
                </TabsContent>

                {/* Tab: Especificaciones */}
                <TabsContent value="especificaciones" className="mt-0 space-y-4">
                  <FormSection icon={Cpu} title="Especificaciones Técnicas" theme="indigo">
                    <EspecificacionesEditor
                      value={formData.especificaciones}
                      onChange={(value) => setFormData({ ...formData, especificaciones: value as Record<string, string | number | boolean> })}
                      compact
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Agrega especificaciones técnicas que se mostrarán en la ficha del equipo.
                    </p>
                  </FormSection>
                </TabsContent>

                {/* Tab: Avanzado */}
                <TabsContent value="avanzado" className="mt-0 space-y-4">
                  {/* Sección Visibilidad - Colapsable */}
                  <div className={cn(
                    "rounded-xl border shadow-sm overflow-hidden",
                    themeClasses.green.section
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleSection("visibilidad")}
                      className="w-full flex items-center justify-between p-4 hover:bg-green-50/50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", themeClasses.green.iconBg)}>
                          {formData.disponible ? (
                            <Eye className={cn("h-4 w-4", themeClasses.green.icon)} />
                          ) : (
                            <EyeOff className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="text-left">
                          <span className={cn("font-semibold text-sm", themeClasses.green.text)}>
                            Visibilidad y Control
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Configuración de visibilidad en la web
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            'ml-2 text-xs',
                            formData.disponible
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {formData.disponible ? 'Visible' : 'Oculto'}
                        </Badge>
                      </div>
                      {expandedSections.visibilidad ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedSections.visibilidad && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div>
                                <Label className="text-sm font-medium">Visible en la Web</Label>
                                <p className="text-xs text-muted-foreground">
                                  Los equipos ocultos no aparecen en el catálogo público
                                </p>
                              </div>
                              <Switch
                                checked={formData.disponible}
                                onCheckedChange={(checked) =>
                                  setFormData({ ...formData, disponible: checked })
                                }
                              />
                            </div>

                            <FormField icon={Hash} label="Orden de Visualización" theme="gray">
                              <Input
                                type="number"
                                min={0}
                                value={formData.orden}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    orden: parseInt(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                className="h-9"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Equipos con menor número aparecen primero
                              </p>
                            </FormField>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </TabsContent>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-6 py-3 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  * Campos obligatorios
                </div>
                <div className="flex gap-2">
                  <Button
                    type="outline"
                    size="small"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    htmlType="button"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    htmlType="submit"
                    disabled={loading || !formData.marca || !formData.modelo || !formData.tipo}
                    className="min-w-[120px] bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg transition-all border-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
