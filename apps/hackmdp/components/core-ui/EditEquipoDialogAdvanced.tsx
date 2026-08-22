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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Equipo } from "@/lib/types";
import { convMoneda as convMonedaShared, recalcPricing, type PricingState } from "./pricing/pricing-calc";
import {
  Loader2,
  Monitor,
  Settings,
  Wrench,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  X,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { EspecificacionesEditor } from "./EspecificacionesEditor";
import { themeClasses, SheetColorTheme } from "./DetailSheetComponents";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import useSWR from "swr";
import { toast } from "sonner";
import { BibliotecaPickerDialog } from "@/components/core-ui/BibliotecaPickerDialog";

const fetcherCatEquipo = (url: string) => fetch(url).then((r) => r.json());

interface EditEquipoDialogAdvancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Equipo>) => Promise<void>;
  equipo: Equipo;
  tiposExistentes?: string[];
  categoriasExistentes?: string[];
}

// Estado del equipo de CATÁLOGO (no de una unidad física). La DB solo admite
// estos tres (equipos_estado_check). Los estados tipo disponible/asignado/
// vendido son de las UNIDADES (equipos_unidades), no del modelo de catálogo.
const ESTADOS_EQUIPO = [
  { value: "activo", label: "Activo" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "baja", label: "Dado de baja" },
];

const TIPOS_EQUIPO = [
  "comodato",
  "venta",
  "alquiler",
  "demo",
];

const CATEGORIAS_EQUIPO = [
  "bomba",
  "monitor",
  "equipo_diagnostico",
  "centrifuga",
  "analizador",
  "microscopio",
  "autoclave",
  "incubadora",
  "balanza",
  "espectrofotometro",
  "refrigerador",
  "otro",
];

// Componente de sección reutilizable (similar a DetailSheetSection)
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

// Componente de campo con icono (similar a DetailSheetInfoItem pero editable)
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

export function EditEquipoDialogAdvanced({
  open,
  onOpenChange,
  onSave,
  equipo,
  tiposExistentes = [],
  categoriasExistentes = [],
}: EditEquipoDialogAdvancedProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    garantia: false,
    mantenimiento: false,
    otros: false,
  });

  // Catalogos desde las tablas org-scoped (marcas, tipos_equipos)
  const { data: marcasData, mutate: mutateMarcas } = useSWR<Array<{ nombre: string }>>(
    open ? "/api/marcas" : null,
    fetcherCatEquipo,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const { data: tiposData, mutate: mutateTipos } = useSWR<Array<{ nombre: string }>>(
    open ? "/api/tipos-equipos" : null,
    fetcherCatEquipo,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  // Cotización del día (USD→ARS) para convertir costo↔venta cuando difieren las monedas.
  const { data: cotizacionData } = useSWR<{ valor_venta?: number }>(
    open ? "/api/cotizaciones" : null,
    fetcherCatEquipo,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const cotDia = Number(cotizacionData?.valor_venta) || 0;
  // Delega al cálculo compartido (pricing-calc), cerrando sobre la cotización del día.
  const convMoneda = (monto: number, origen: string, destino: string) =>
    convMonedaShared(monto, origen, destino, cotDia);
  const marcasList = useMemo(
    () => (marcasData || []).map((m) => m.nombre).filter(Boolean),
    [marcasData]
  );
  const allTipos = useMemo(
    () => (tiposData || []).map((t) => t.nombre).filter(Boolean),
    [tiposData]
  );

  // Categoría sigue siendo TEXT libre
  const allCategorias = useMemo(() => {
    const set = new Set([...CATEGORIAS_EQUIPO, ...categoriasExistentes]);
    return Array.from(set).filter(Boolean).sort();
  }, [categoriasExistentes]);

  const createCatalogEquipo = async (
    endpoint: string,
    mutate: () => void,
    label: string,
    nombre: string,
    extraBody: Record<string, unknown> = {}
  ) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, ...extraBody }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `No se pudo agregar ${label}`);
        return;
      }
      const created = await res.json();
      toast.success(`${label} "${created.nombre}" agregado`);
      mutate();
    } catch {
      toast.error(`Error al agregar ${label}`);
    }
  };

  const [formData, setFormData] = useState({
    // Info básica
    marca: "",
    modelo: "",
    nombre: "",
    tipo: "",
    subtipo: "",
    categoria: "",
    estado: "activo",
    descripcion: "",

    // Precio de Lista y Comercial
    condicion: "nuevo" as "nuevo" | "usado" | "demo" | "reacondicionado" | "outlet",
    iva: "10.5", // alícuota de IVA en % (equipo nuevo → 10,5%)
    precio_costo: "",
    moneda_compra: "USD" as "USD" | "ARS",
    ganancia: "",
    precio_lista: "",
    precio_lista_moneda: "USD" as "USD" | "ARS",
    precio_venta_modo: "calculado" as "calculado" | "fijo",
    descripcion_comercial: "",
    folleto_url: "",

    // Especificaciones
    especificaciones: {} as Record<string, string | number | boolean> | string[],
    manual_url: "",
    ficha_tecnica_url: "",
    imagen_url: "",
    imagenes_adicionales: [] as string[],

    // Avanzado - Garantía
    fecha_compra: "",
    precio_compra: "",
    fecha_vencimiento_garantia: "",

    // Avanzado - Mantenimiento
    requiere_mantenimiento: true,
    frecuencia_mantenimiento_dias: 90,

    // Avanzado - Otros
    activo: true,
    notas: "",
    tags: [] as string[],
  });

  // Subtipos en cascada según la Categoría (familia) elegida → equipos.tipo.
  const { data: subtiposData, mutate: mutateSubtipos } = useSWR<Array<{ nombre: string }>>(
    open && formData.tipo?.trim()
      ? `/api/subtipos-equipos?categoria=${encodeURIComponent(formData.tipo.trim())}`
      : null,
    fetcherCatEquipo
  );
  const allSubtipos = useMemo(
    () => (subtiposData || []).map((s) => s.nombre).filter(Boolean),
    [subtiposData]
  );

  const [newTag, setNewTag] = useState("");
  // Folleto vinculado desde biblioteca (categoría Folletos) — reemplaza la URL manual.
  const [folletoVinculado, setFolletoVinculado] = useState<{ id: string; titulo: string; archivo_url: string } | null>(equipo.folleto_recurso ?? null);
  const [folletoPickerOpen, setFolletoPickerOpen] = useState(false);

  // Inicializar formulario con datos del equipo
  useEffect(() => {
    if (equipo && open) {
      setFolletoVinculado(equipo.folleto_recurso ?? null);
      setFormData({
        marca: equipo.marca || "",
        modelo: equipo.modelo || "",
        nombre: equipo.nombre || "",
        tipo: equipo.tipo || "",
        subtipo: equipo.subtipo || "",
        categoria: equipo.categoria || "",
        estado: equipo.estado || "activo",
        descripcion: equipo.descripcion || "",
        // Precio de Lista y Comercial
        condicion: equipo.condicion || "nuevo",
        iva: (equipo as any).iva != null ? String((equipo as any).iva) : "10.5",
        precio_costo: (equipo as any).precio_costo?.toString() || "",
        moneda_compra: ((equipo as any).moneda_compra || equipo.precio_lista_moneda || "USD") as "USD" | "ARS",
        ganancia: (equipo as any).ganancia?.toString() || "",
        precio_lista: equipo.precio_lista?.toString() || "",
        precio_lista_moneda: equipo.precio_lista_moneda || "USD",
        precio_venta_modo: ((equipo as any).precio_venta_modo === "fijo" ? "fijo" : "calculado") as "calculado" | "fijo",
        descripcion_comercial: equipo.descripcion_comercial || "",
        folleto_url: equipo.folleto_url || "",
        // Especificaciones
        especificaciones: equipo.especificaciones || {},
        manual_url: equipo.manual_url || "",
        ficha_tecnica_url: equipo.ficha_tecnica_url || "",
        imagen_url: equipo.imagen_url || "",
        imagenes_adicionales: equipo.imagenes_adicionales || [],
        // Garantía
        fecha_compra: equipo.fecha_compra?.split("T")[0] || "",
        precio_compra: equipo.precio_compra?.toString() || "",
        fecha_vencimiento_garantia: equipo.fecha_vencimiento_garantia?.split("T")[0] || "",
        requiere_mantenimiento: equipo.requiere_mantenimiento ?? true,
        frecuencia_mantenimiento_dias: equipo.frecuencia_mantenimiento_dias || 90,
        activo: equipo.activo ?? true,
        notas: equipo.notas || "",
        tags: equipo.tags || [],
      });
      setActiveTab("basico");
    }
  }, [equipo, open]);

  // Vincular/desvincular el folleto del equipo desde la biblioteca.
  const vincularFolleto = async (recursos: { id: string; titulo: string; archivo_url?: string }[]) => {
    const r = recursos[0];
    if (!r || !equipo.id) return;
    try {
      const res = await fetch("/api/biblioteca/vinculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurso_id: r.id, entidad_tipo: "equipo", entidad_id: equipo.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al vincular");
      setFolletoVinculado({ id: r.id, titulo: r.titulo, archivo_url: r.archivo_url || "" });
      toast.success("Folleto vinculado");
    } catch (e: any) {
      toast.error(e.message || "Error al vincular folleto");
    }
  };
  const desvincularFolleto = async () => {
    if (!folletoVinculado || !equipo.id) return;
    try {
      const res = await fetch(
        `/api/biblioteca/vinculos?recurso_id=${folletoVinculado.id}&entidad_tipo=equipo&entidad_id=${equipo.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error || "Error al desvincular");
      setFolletoVinculado(null);
      toast.success("Folleto desvinculado");
    } catch (e: any) {
      toast.error(e.message || "Error al desvincular");
    }
  };

  // Función para limpiar especificaciones (remover valores vacíos/null)
  const cleanEspecificaciones = (specs: Record<string, unknown> | string[]): Record<string, unknown> | string[] => {
    if (Array.isArray(specs)) {
      return specs.filter(item => item && String(item).trim() !== '');
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(specs)) {
      if (val === null || val === undefined || val === '') continue;
      if (typeof val === 'object' && !Array.isArray(val)) {
        const cleanedNested = cleanEspecificaciones(val as Record<string, unknown>);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned;
  };

  // Costo (en moneda_compra) convertido a la moneda de VENTA con la cotización del día.
  // Precio de lista (venta) = costoEnVenta * (1 + ganancia%).
  //  - modo 'calculado': la lista es derivada (read-only) desde costo+ganancia+cotización.
  //  - modo 'fijo': la lista la carga el usuario; la ganancia queda informativa.
  const aplicarPrecio = (patch: Partial<typeof formData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch };
      // Matemática compartida (pricing-calc), mapeando los nombres de equipos
      // (precio_lista / precio_lista_moneda) a PricingState.
      const ps: PricingState = {
        precio_costo: next.precio_costo,
        moneda_compra: next.moneda_compra,
        ganancia: next.ganancia,
        precio_venta: next.precio_lista,
        moneda: next.precio_lista_moneda,
        precio_venta_modo: next.precio_venta_modo,
      };
      const r = recalcPricing(ps, cotDia);
      next.precio_lista = r.precio_venta;
      next.ganancia = r.ganancia;
      return next;
    });
  };
  const handleCostoChange = (val: string) => aplicarPrecio({ precio_costo: val });
  const handleGananciaChange = (val: string) => aplicarPrecio({ ganancia: val });
  const handleListaChange = (val: string) => aplicarPrecio({ precio_lista: val });

  // Recalcular la lista (modo calculado) cuando llega/cambia la cotización del día.
  useEffect(() => {
    if (!open || formData.precio_venta_modo !== "calculado") return;
    if (formData.moneda_compra === formData.precio_lista_moneda) return;
    const r = recalcPricing(
      {
        precio_costo: formData.precio_costo,
        moneda_compra: formData.moneda_compra,
        ganancia: formData.ganancia,
        precio_venta: formData.precio_lista,
        moneda: formData.precio_lista_moneda,
        precio_venta_modo: formData.precio_venta_modo,
      },
      cotDia,
    );
    if (r.precio_venta !== formData.precio_lista) setFormData((prev) => ({ ...prev, precio_lista: r.precio_venta }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotDia, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanedSpecs = cleanEspecificaciones(formData.especificaciones);

      const dataToSave: Partial<Equipo> & { precio_costo?: number; ganancia?: number; moneda_compra?: string; precio_venta_modo?: string; iva?: number } = {
        ...formData,
        especificaciones: cleanedSpecs as Record<string, string | number | boolean>,
        iva: formData.iva !== "" ? parseFloat(formData.iva) : undefined,
        precio_compra: formData.precio_compra ? parseFloat(formData.precio_compra) : undefined,
        precio_costo: formData.precio_costo ? parseFloat(formData.precio_costo) : undefined,
        ganancia: formData.ganancia ? parseFloat(formData.ganancia) : undefined,
        moneda_compra: formData.moneda_compra,
        precio_venta_modo: formData.precio_venta_modo,
        precio_lista: formData.precio_lista ? parseFloat(formData.precio_lista) : undefined,
        fecha_compra: formData.fecha_compra || undefined,
        fecha_vencimiento_garantia: formData.fecha_vencimiento_garantia || undefined,
        imagenes_adicionales: formData.imagenes_adicionales.length > 0 ? formData.imagenes_adicionales : undefined,
      };

      // subtipo vacío = limpiar en DB (null), no omitir: si se omite, al recategorizar queda el subtipo viejo
      if ((dataToSave as any).subtipo === "") (dataToSave as any).subtipo = null;

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

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (!formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const specsCount = useMemo(() => {
    if (Array.isArray(formData.especificaciones)) {
      return formData.especificaciones.length;
    }
    return Object.keys(formData.especificaciones || {}).length;
  }, [formData.especificaciones]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/40">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-indigo-200/60 dark:border-indigo-700/40 bg-gradient-to-r from-white to-indigo-50/40 dark:from-gray-900 dark:to-indigo-950/20 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="bg-gradient-to-br p-3 rounded-2xl border shadow-sm bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200/60 dark:border-indigo-700/40">
              <Monitor className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl bg-gradient-to-r from-indigo-900 to-indigo-700 dark:from-indigo-100 dark:to-indigo-300 bg-clip-text text-transparent">
                Editar Equipo
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
                    data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-indigo-600 data-[state=inactive]:hover:bg-indigo-50 dark:data-[state=inactive]:hover:bg-indigo-950/30
                    data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-indigo-900/40 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300"
                >
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">Info Básica</span>
                </TabsTrigger>
                <TabsTrigger
                  value="especificaciones"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-purple-600 data-[state=inactive]:hover:bg-purple-50 dark:data-[state=inactive]:hover:bg-purple-950/30
                    data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/40 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                >
                  <Settings className="h-4 w-4" />
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
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">Avanzado</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="space-y-4 px-6 pb-6 pt-4">
                {/* Tab: Info Básica */}
                <TabsContent value="basico" className="mt-0 space-y-4">
                  <FormSection icon={Monitor} title="Información General" theme="indigo">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FormField icon={Tag} label="Marca *" theme="indigo">
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
                              if (
                                v.trim() &&
                                !marcasList.some(
                                  (m) => m.toLowerCase() === v.trim().toLowerCase()
                                )
                              ) {
                                await createCatalogEquipo(
                                  "/api/marcas",
                                  mutateMarcas,
                                  "Marca",
                                  v.trim()
                                );
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
                                await createCatalogEquipo(
                                  "/api/tipos-equipos",
                                  mutateTipos,
                                  "Categoría",
                                  v.trim()
                                );
                              }
                            }}
                          />
                        </div>
                      </FormField>

                      <FormField icon={Settings} label="Tipo" theme="purple">
                        <div className="h-9 flex items-center px-3 rounded-md border border-input bg-white dark:bg-gray-950 text-sm">
                          <QuickEditableCombobox
                            value={formData.subtipo}
                            options={allSubtipos}
                            disabled={!formData.tipo?.trim()}
                            placeholder="No hay tipos para esta categoría"
                            searchPlaceholder="Buscar tipo..."
                            emptyLabel={
                              formData.tipo?.trim()
                                ? "Sin tipo"
                                : "Elegí una categoría primero"
                            }
                            triggerClassName="font-normal"
                            onChange={async (v) => {
                              setFormData((prev) => ({ ...prev, subtipo: v }));
                              if (
                                v.trim() &&
                                formData.tipo?.trim() &&
                                !allSubtipos.some(
                                  (s) => s.toLowerCase() === v.trim().toLowerCase()
                                )
                              ) {
                                await createCatalogEquipo(
                                  "/api/subtipos-equipos",
                                  mutateSubtipos,
                                  "Tipo",
                                  v.trim(),
                                  { categoria: formData.tipo.trim() }
                                );
                              }
                            }}
                          />
                        </div>
                      </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField icon={Monitor} label="Nombre interno (alias de búsqueda)" theme="indigo">
                        <Input
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Cómo le dicen (ej: el grande, CM chico)"
                          className="h-9"
                        />
                      </FormField>

                      <FormField icon={Tag} label="Estado" theme="green">
                        <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
                          <SelectContent>
                            {ESTADOS_EQUIPO.map((e) => (
                              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <FormField icon={FileText} label="Descripción" theme="gray" className="col-span-full">
                      <Textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="Descripción detallada del equipo..."
                        rows={3}
                        className="resize-none"
                      />
                    </FormField>
                  </FormSection>

                  {/* Sección Precio de Lista y Comercial */}
                  <FormSection icon={DollarSign} title="Precio de Lista y Comercial" theme="green">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FormField icon={Tag} label="Condición" theme="green">
                        <Select value={formData.condicion} onValueChange={(v) => setFormData({ ...formData, condicion: v as any })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Condición" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nuevo">Nuevo</SelectItem>
                            <SelectItem value="usado">Usado</SelectItem>
                            <SelectItem value="demo">Demo</SelectItem>
                            <SelectItem value="reacondicionado">Reacondicionado</SelectItem>
                            <SelectItem value="outlet">Outlet</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField icon={Tag} label="IVA" theme="green">
                        <Select value={formData.iva} onValueChange={(v) => setFormData({ ...formData, iva: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="IVA" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="10.5">10,5%</SelectItem>
                            <SelectItem value="21">21%</SelectItem>
                            <SelectItem value="27">27%</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">Equipo nuevo: 10,5%</p>
                      </FormField>

                      <FormField icon={DollarSign} label="Precio de Costo" theme="green">
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.precio_costo}
                          onChange={(e) => handleCostoChange(e.target.value)}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </FormField>

                      <FormField icon={DollarSign} label="Moneda compra" theme="green">
                        <Select value={formData.moneda_compra} onValueChange={(v) => aplicarPrecio({ moneda_compra: v as "USD" | "ARS" })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Moneda" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD (Dólares)</SelectItem>
                            <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField icon={Tag} label="Ganancia (%)" theme="green">
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.ganancia}
                          onChange={(e) => handleGananciaChange(e.target.value)}
                          placeholder="0"
                          className="h-9"
                          disabled={formData.precio_venta_modo === "fijo"}
                        />
                      </FormField>

                      <FormField icon={DollarSign} label="Moneda venta" theme="green">
                        <Select value={formData.precio_lista_moneda} onValueChange={(v) => aplicarPrecio({ precio_lista_moneda: v as "USD" | "ARS" })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Moneda" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD (Dólares)</SelectItem>
                            <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      {formData.moneda_compra !== formData.precio_lista_moneda && (
                        <FormField icon={Tag} label="Precio de venta" theme="green">
                          <Select value={formData.precio_venta_modo} onValueChange={(v) => aplicarPrecio({ precio_venta_modo: v as "calculado" | "fijo" })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="calculado">Calculado al dólar</SelectItem>
                              <SelectItem value="fijo">Fijo (a mano)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      )}

                      <FormField icon={DollarSign} label="Precio de Lista" theme="green">
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.precio_lista}
                          onChange={(e) => handleListaChange(e.target.value)}
                          placeholder="0.00"
                          className="h-9"
                          readOnly={formData.precio_venta_modo === "calculado"}
                          disabled={formData.precio_venta_modo === "calculado"}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formData.precio_venta_modo === "calculado"
                            ? "Costo + ganancia (al dólar del día)"
                            : "Precio fijo en moneda de venta"}
                        </p>
                      </FormField>

                      <FormField icon={FileText} label="Folleto (biblioteca)" theme="cyan">
                        {folletoVinculado ? (
                          <div className="flex items-center gap-2 h-9">
                            <a
                              href={folletoVinculado.archivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline truncate flex-1"
                            >
                              {folletoVinculado.titulo}
                            </a>
                            <button
                              type="button"
                              onClick={desvincularFolleto}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFolletoPickerOpen(true)}
                            className="h-9 px-3 inline-flex items-center rounded-md border border-dashed border-cyan-300 text-sm text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                          >
                            Vincular desde biblioteca
                          </button>
                        )}
                      </FormField>
                      <BibliotecaPickerDialog
                        open={folletoPickerOpen}
                        onOpenChange={setFolletoPickerOpen}
                        selectedIds={folletoVinculado ? [folletoVinculado.id] : []}
                        onConfirm={(recursos) => {
                          vincularFolleto(recursos);
                          setFolletoPickerOpen(false);
                        }}
                        title="Vincular folleto"
                        description="Elegí el folleto del equipo desde la biblioteca (categoría Folletos)."
                      />
                    </div>

                    {formData.moneda_compra !== formData.precio_lista_moneda && (
                      <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        {cotDia > 0 ? (
                          <>
                            Compra en <strong>{formData.moneda_compra}</strong> · venta en <strong>{formData.precio_lista_moneda}</strong>.{" "}
                            Cotización del día: <strong>${cotDia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>.
                            {(() => {
                              const cev = convMoneda(parseFloat(formData.precio_costo), formData.moneda_compra, formData.precio_lista_moneda);
                              const lista = parseFloat(formData.precio_lista);
                              if (isNaN(cev)) return null;
                              const simb = formData.precio_lista_moneda === "ARS" ? "$" : "US$";
                              return (
                                <>
                                  {" "}Costo ≈ <strong>{simb} {cev.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
                                  {!isNaN(lista) && <> · Precio de venta: <strong>{simb} {lista.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong></>}
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <>Compra y venta en monedas distintas, pero no hay cotización del día cargada — no se puede convertir el precio.</>
                        )}
                      </div>
                    )}

                    <FormField icon={FileText} label="Descripción Comercial" theme="green" className="col-span-full">
                      <Textarea
                        value={formData.descripcion_comercial}
                        onChange={(e) => setFormData({ ...formData, descripcion_comercial: e.target.value })}
                        placeholder="Descripción para presupuestos y material comercial..."
                        rows={2}
                        className="resize-none"
                      />
                    </FormField>
                  </FormSection>
                </TabsContent>

                {/* Tab: Especificaciones */}
                <TabsContent value="especificaciones" className="mt-0 space-y-4">
                  <FormSection icon={Settings} title="Especificaciones Técnicas" theme="purple">
                    <EspecificacionesEditor
                      value={formData.especificaciones as Record<string, unknown> | string[]}
                      onChange={(value) => setFormData({ ...formData, especificaciones: value as any })}
                      categoria={formData.tipo}
                      compact
                    />
                  </FormSection>

                  <FormSection icon={FileText} title="Documentación" theme="gray">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField icon={FileText} label="URL del Manual" theme="gray">
                        <Input
                          type="url"
                          value={formData.manual_url}
                          onChange={(e) => setFormData({ ...formData, manual_url: e.target.value })}
                          placeholder="https://drive.google.com/..."
                          className="h-9"
                        />
                      </FormField>

                      {/* La ficha técnica del equipo son sus ESPECIFICACIONES (editables
                          en su sección y renderizadas en el PDF del presupuesto). El input
                          de URL manual se retiró por redundante. */}
                    </div>

                    <FormField icon={FileText} label="URL de Imagen" theme="cyan">
                      <Input
                        type="url"
                        value={formData.imagen_url}
                        onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                        placeholder="https://..."
                        className="h-9"
                      />
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
                    </FormField>
                  </FormSection>
                </TabsContent>

                {/* Tab: Avanzado */}
                <TabsContent value="avanzado" className="mt-0 space-y-4">
                  {/* Sección Garantía - Colapsable */}
                  <div className={cn(
                    "rounded-xl border shadow-sm overflow-hidden",
                    themeClasses.amber.section
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleSection("garantia")}
                      className="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", themeClasses.amber.iconBg)}>
                          <Calendar className={cn("h-4 w-4", themeClasses.amber.icon)} />
                        </div>
                        <div className="text-left">
                          <span className={cn("font-semibold text-sm", themeClasses.amber.text)}>
                            Garantía y Compra
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Fechas, proveedor y costos
                          </p>
                        </div>
                      </div>
                      {expandedSections.garantia ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedSections.garantia && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <FormField icon={Calendar} label="Fecha de Compra" theme="amber">
                              <Input
                                type="date"
                                value={formData.fecha_compra}
                                onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                                className="h-9"
                              />
                            </FormField>

                            <FormField icon={DollarSign} label="Precio de Compra" theme="green">
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.precio_compra}
                                onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                                placeholder="0.00"
                                className="h-9"
                              />
                            </FormField>

                            <FormField icon={Calendar} label="Venc. Garantía" theme="rose">
                              <Input
                                type="date"
                                value={formData.fecha_vencimiento_garantia}
                                onChange={(e) => setFormData({ ...formData, fecha_vencimiento_garantia: e.target.value })}
                                className="h-9"
                              />
                            </FormField>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sección Mantenimiento - Colapsable */}
                  <div className={cn(
                    "rounded-xl border shadow-sm overflow-hidden",
                    themeClasses.blue.section
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleSection("mantenimiento")}
                      className="w-full flex items-center justify-between p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", themeClasses.blue.iconBg)}>
                          <Wrench className={cn("h-4 w-4", themeClasses.blue.icon)} />
                        </div>
                        <div className="text-left">
                          <span className={cn("font-semibold text-sm", themeClasses.blue.text)}>
                            Mantenimiento
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Configuración de mantenimiento preventivo
                          </p>
                        </div>
                        {formData.requiere_mantenimiento && (
                          <Badge variant="secondary" className="text-xs">
                            Activo
                          </Badge>
                        )}
                      </div>
                      {expandedSections.mantenimiento ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedSections.mantenimiento && (
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
                                <Label className="text-sm font-medium">Requiere Mantenimiento</Label>
                                <p className="text-xs text-muted-foreground">
                                  Activar para programar mantenimientos preventivos
                                </p>
                              </div>
                              <Switch
                                checked={formData.requiere_mantenimiento}
                                onCheckedChange={(checked) =>
                                  setFormData({ ...formData, requiere_mantenimiento: checked })
                                }
                              />
                            </div>

                            {formData.requiere_mantenimiento && (
                              <FormField icon={Calendar} label="Frecuencia (días)" theme="blue">
                                <Input
                                  type="number"
                                  min={1}
                                  value={formData.frecuencia_mantenimiento_dias}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      frecuencia_mantenimiento_dias: parseInt(e.target.value) || 90,
                                    })
                                  }
                                  placeholder="90"
                                  className="h-9"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  El sistema generará alertas cada {formData.frecuencia_mantenimiento_dias} días
                                </p>
                              </FormField>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sección Otros - Colapsable */}
                  <div className={cn(
                    "rounded-xl border shadow-sm overflow-hidden",
                    themeClasses.gray.section
                  )}>
                    <button
                      type="button"
                      onClick={() => toggleSection("otros")}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", themeClasses.gray.iconBg)}>
                          <Tag className={cn("h-4 w-4", themeClasses.gray.icon)} />
                        </div>
                        <div className="text-left">
                          <span className={cn("font-semibold text-sm", themeClasses.gray.text)}>
                            Tags y Notas
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Etiquetas y observaciones adicionales
                          </p>
                        </div>
                        {formData.tags.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {formData.tags.length} tags
                          </Badge>
                        )}
                      </div>
                      {expandedSections.otros ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedSections.otros && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-3">
                            {/* Tags */}
                            <div className="space-y-2">
                              <Label className="text-sm">Tags</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  placeholder="Agregar tag..."
                                  className="h-9"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddTag();
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddTag}
                                  disabled={!newTag.trim()}
                                  className="h-9"
                                >
                                  Agregar
                                </Button>
                              </div>
                              {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {formData.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="flex items-center gap-1 pr-1"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-1 p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Notas */}
                            <FormField icon={FileText} label="Notas" theme="gray">
                              <Textarea
                                value={formData.notas}
                                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                placeholder="Observaciones adicionales..."
                                rows={3}
                                className="resize-none"
                              />
                            </FormField>

                            {/* Activo */}
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div>
                                <Label className="text-sm font-medium">Equipo Activo</Label>
                                <p className="text-xs text-muted-foreground">
                                  Los equipos inactivos no aparecen en listados principales
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
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || !formData.marca || !formData.modelo}
                    className="min-w-[120px] bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all border-0"
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
