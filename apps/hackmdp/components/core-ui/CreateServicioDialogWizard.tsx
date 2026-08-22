"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { ServicioGlobalSearch, type ServicioGlobalSelection } from "./ServicioGlobalSearch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePreloadedData } from "@/lib/contexts/DataContext";
import { QuickAddClienteDialog } from "./QuickAddClienteDialog";
import { LaboratorioSheet } from "@/components/laboratorios/LaboratorioSheet";
import { ClienteDetailSheet } from "./ClienteDetailSheet";
import { QuickAddEquipoDialog } from "./QuickAddEquipoDialog";
import { QuickAddConfigDialog } from "./QuickAddConfigDialog";
import { QuickAddEstadoDialog } from "./QuickAddEstadoDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Check,
  CheckCircle,
  Plus,
  Loader2,
  X,
  Wrench,
  User,
  Settings,
  Settings2,
  FileText,
  Shield,
  Search,
  Hash,
  Package,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

// ============================================================================
// THEME CONFIGURATION (matching DetailSheets)
// ============================================================================

const sectionThemes = {
  blue: {
    bg: "bg-blue-50/80 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/60",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-100",
  },
  purple: {
    bg: "bg-purple-50/80 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800/60",
    icon: "text-purple-600 dark:text-purple-400",
    title: "text-purple-900 dark:text-purple-100",
  },
  gray: {
    bg: "bg-gray-50/80 dark:bg-gray-900/30",
    border: "border-gray-300 dark:border-gray-700/60",
    icon: "text-gray-600 dark:text-gray-400",
    title: "text-gray-900 dark:text-gray-100",
  },
  green: {
    bg: "bg-green-50/80 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800/60",
    icon: "text-green-600 dark:text-green-400",
    title: "text-green-900 dark:text-green-100",
  },
} as const;

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const servicioSchema = z.object({
  cliente_id: z.string().min(1, "Cliente es requerido"),
  laboratorio_id: z.string().optional(),
  equipo_id: z.string().optional(),
  tecnico: z.string().min(1, "Técnico es requerido"),
  tipo_servicio: z.string(),
  estado: z.string(),
  estado_contable: z.string(),
  fecha: z.date(),
  falla_declarada: z.string().optional(),
  diagnostico: z.string().optional(),
  detalle_privado: z.string().optional(),
  contacto: z.string().optional(),
  modo_de_contacto: z.string().optional(),
  garantia: z.boolean(),
  tipo_garantia: z.string().optional(),
  accesorios_entrantes: z.string().optional(),
  recibio: z.string().optional(),
  entrego: z.string().optional(),
  insumos_utilizados: z.array(z.any()),
  // sin_cargo (migración 887): flag por operación que reemplaza el hack
  // legacy de estado='Sin cargo'. Con esto el estado operativo queda puro
  // y sin_cargo rige el régimen de facturación por separado.
  sin_cargo: z.boolean().default(false),
  motivo_sin_cargo: z.string().optional(),
}).refine(
  (data) => !data.sin_cargo || (data.motivo_sin_cargo && data.motivo_sin_cargo.trim().length > 0),
  { message: "Si el servicio es sin cargo, el motivo es obligatorio", path: ["motivo_sin_cargo"] }
);

type ServicioFormData = z.infer<typeof servicioSchema>;

interface CreateServicioDialogWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: ServicioFormData) => Promise<void>;
  defaultClienteId?: string;
}

interface InsumoItem {
  fecha: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  producto_id: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
}

// ============================================================================
// TYPES FOR DYNAMIC DATA
// ============================================================================

interface ConfigItem {
  id: string;
  nombre: string;
}

interface EstadoItem {
  id: string;
  label: string;
  value: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateServicioDialogWizard({
  isOpen,
  onClose,
  onCreate,
  defaultClienteId,
}: CreateServicioDialogWizardProps) {
  // Preloaded data from context
  const {
    clientes,
    clientesOptions,
    equiposUnidadesOptions,
    getLaboratoriosByCliente,
    getEquiposUnidadesByLaboratorio,
    getEquiposUnidadesByCliente,
    refresh,
  } = usePreloadedData();

  const [initializing, setInitializing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [insumos, setInsumos] = useState<InsumoItem[]>([]);
  const [activeTab, setActiveTab] = useState("cliente");
  const [searchMode, setSearchMode] = useState<"all" | "codigo" | "nombre">("all");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [showAddClienteDialog, setShowAddClienteDialog] = useState(false);
  const [showAddEquipoDialog, setShowAddEquipoDialog] = useState(false);
  const [showLabSheet, setShowLabSheet] = useState(false);
  const [showClienteSheet, setShowClienteSheet] = useState(false);
  const [showAddTecnicoDialog, setShowAddTecnicoDialog] = useState(false);
  const [showAddTipoServicioDialog, setShowAddTipoServicioDialog] = useState(false);
  const [showAddModoContactoDialog, setShowAddModoContactoDialog] = useState(false);
  const [showAddEstadoDialog, setShowAddEstadoDialog] = useState(false);
  const [showAddEstadoContableDialog, setShowAddEstadoContableDialog] = useState(false);

  // Dynamic data states
  const [tecnicos, setTecnicos] = useState<ConfigItem[]>([]);
  const [tiposServicio, setTiposServicio] = useState<ConfigItem[]>([]);
  const [modosContacto, setModosContacto] = useState<ConfigItem[]>([]);
  const [estados, setEstados] = useState<EstadoItem[]>([]);
  const [estadosContable, setEstadosContable] = useState<EstadoItem[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
    control,
  } = useForm<ServicioFormData>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues: {
      tipo_servicio: "Reparación",
      estado: "Reparar",
      estado_contable: "Pendiente",
      fecha: new Date(),
      garantia: false,
      insumos_utilizados: [],
      sin_cargo: false,
      motivo_sin_cargo: "",
    },
    mode: "onChange",
  });

  const clienteId = watch("cliente_id");
  const laboratorioId = watch("laboratorio_id");
  const equipoId = watch("equipo_id");
  const garantiaValue = watch("garantia");
  const sinCargoValue = watch("sin_cargo");

  // Quick-search por Nº cliente: bidireccional con el cliente_id del form.
  const [quickIdValue, setQuickIdValue] = useState("");
  useEffect(() => {
    if (!clienteId) {
      setQuickIdValue("");
      return;
    }
    const c = clientes.find((cl) => cl.id === clienteId);
    setQuickIdValue(c?.identificador_unico ? String(c.identificador_unico) : "");
  }, [clienteId, clientes]);

  // Cuando el buscador global autocompleta la cascada, los efectos de reset
  // (cliente→limpia lab/equipo, lab→limpia equipo) la romperían. Este ref
  // marca un backfill en curso para que esos efectos no pisen los valores.
  const backfillRef = useRef<{ c: string; l: string; e: string } | null>(null);

  const aplicarSeleccionGlobal = (sel: ServicioGlobalSelection) => {
    // Equipo en stock/duplicado sin cliente: se permite, pero hay que elegir
    // el cliente a mano (el form lo pide igual como requerido).
    if (sel.equipo_id && !sel.cliente_id) {
      toast.info("Este equipo no tiene un cliente asociado. Elegí el cliente para la orden.");
    }
    if (sel.laboratorio_id || sel.equipo_id) {
      backfillRef.current = {
        c: sel.cliente_id || "",
        l: sel.laboratorio_id || "",
        e: sel.equipo_id || "",
      };
      setValue("cliente_id", sel.cliente_id || "", { shouldValidate: true });
      setValue("laboratorio_id", sel.laboratorio_id || "", { shouldValidate: true });
      setValue("equipo_id", sel.equipo_id || "", { shouldValidate: true });
      // Red de seguridad: liberar el guard aunque algún valor no cambie.
      setTimeout(() => {
        backfillRef.current = null;
      }, 250);
    } else {
      // Resultado de cliente: cascada normal (resetea lab/equipo, autoselecciona).
      setValue("cliente_id", sel.cliente_id || "", { shouldValidate: true });
    }
  };

  // Alerta de servicios recientes (garantía)
  const [serviciosRecientes, setServiciosRecientes] = useState<{
    tiene_servicios_recientes: boolean;
    dias_alerta: number;
    servicios: any[];
  } | null>(null);
  const [loadingRecientes, setLoadingRecientes] = useState(false);

  useEffect(() => {
    if (!equipoId) {
      setServiciosRecientes(null);
      return;
    }
    let cancelled = false;
    setLoadingRecientes(true);
    fetch(`/api/equipos-servicios-tecnicos/recientes?equipo_unidad_id=${equipoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setServiciosRecientes(data);
      })
      .catch(() => {
        if (!cancelled) setServiciosRecientes(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecientes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [equipoId]);

  // Map errors to tabs for visual indicators
  const tabErrors = {
    cliente: !!(errors.cliente_id || errors.laboratorio_id || errors.equipo_id),
    servicio: !!(errors.tecnico || errors.falla_declarada || errors.tipo_servicio || errors.estado || errors.estado_contable || errors.fecha),
    insumos: false,
    detalles: !!(errors.garantia || errors.tipo_garantia),
  };
  const errorCount = Object.keys(errors).length;

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      backfillRef.current = null;
      setInsumos([]);
      setProductos([]);
      setActiveTab("cliente");
      setProductSearchTerm("");
      setSearchMode("all");
    } else {
      setInitializing(true);
      setTimeout(() => {
        setInitializing(false);
      }, 500);
    }
  }, [isOpen, reset]);

  // Pre-set client from defaultClienteId prop
  useEffect(() => {
    if (defaultClienteId && isOpen) {
      setValue("cliente_id", defaultClienteId);
    }
  }, [defaultClienteId, isOpen, setValue]);

  // Reset lab + equipo when cliente changes
  useEffect(() => {
    if (backfillRef.current) return;
    if (clienteId) {
      setValue("laboratorio_id", "");
      setValue("equipo_id", "");
    }
  }, [clienteId, setValue]);

  // Auto-seleccionar lab si el cliente tiene uno solo
  useEffect(() => {
    if (backfillRef.current) return;
    if (clienteId && !laboratorioId) {
      const labs = getLaboratoriosByCliente(clienteId);
      if (labs.length === 1) {
        setValue("laboratorio_id", labs[0].value);
      }
    }
  }, [clienteId, laboratorioId, getLaboratoriosByCliente, setValue]);

  // Reset equipo when lab changes
  useEffect(() => {
    if (backfillRef.current) return;
    if (laboratorioId) {
      setValue("equipo_id", "");
    }
  }, [laboratorioId, setValue]);

  // Liberar el guard de backfill una vez que la cascada quedó completa.
  useEffect(() => {
    const b = backfillRef.current;
    if (b && clienteId === b.c && laboratorioId === b.l && equipoId === b.e) {
      backfillRef.current = null;
    }
  }, [clienteId, laboratorioId, equipoId]);

  // Load dynamic data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadDynamicData();
    }
  }, [isOpen]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const loadDynamicData = async () => {
    try {
      // Load tecnicos, tipos de servicio y estados contables desde el catalogo
      // org-scoped (servicio_tecnicos / servicio_tipos / servicio_estados_contables).
      // Esto reemplaza las 3 llamadas al viejo /api/servicios-configuracion para
      // unificar con lo que usa el ServicioDetailSheet y evitar listas distintas.
      const opcionesRes = await fetch("/api/servicios/opciones");
      if (opcionesRes.ok) {
        const data = await opcionesRes.json();
        // Mapeamos al shape ConfigItem {id, nombre, activo, orden} que usa el wizard
        const mapToConfigItem = (arr: Array<{ id?: string; valor: string }>) =>
          arr.map((r, idx) => ({
            id: r.id || `cat-${idx}`,
            nombre: r.valor,
            activo: true,
            orden: idx,
          }));
        setTecnicos(mapToConfigItem(data.tecnicos || []) as any);
        setTiposServicio(mapToConfigItem(data.tipos_servicio || []) as any);
        setEstadosContable(
          (data.estados_contables || []).map((r: any, idx: number) => ({
            id: r.id || `ec-${idx}`,
            nombre: r.valor,
            label: r.valor,
            value: r.valor,
            color: r.color || "gray",
            orden: idx,
          })) as any
        );
      }

      // Modos de contacto: sigue viniendo del viejo endpoint (no tiene catalogo propio)
      const modosRes = await fetch("/api/servicios-configuracion?tipo=modo_contacto");
      if (modosRes.ok) {
        const data = await modosRes.json();
        setModosContacto(data);
      }

      // Estados de servicio: siguen viniendo de configuracion-estados (otro modulo)
      const estadosRes = await fetch("/api/configuracion-estados?tipo=servicio");
      if (estadosRes.ok) {
        const data = await estadosRes.json();
        setEstados(data);
      }
    } catch (error) {
      console.error("Error loading dynamic data:", error);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const onError = () => {
    // Navigate to first tab with errors
    const tabOrder = ["cliente", "servicio", "insumos", "detalles"] as const;
    for (const tab of tabOrder) {
      if (tabErrors[tab]) {
        setActiveTab(tab);
        break;
      }
    }
    toast.error("Completa los campos requeridos para crear la orden");
  };

  const onSubmit = async (data: ServicioFormData) => {
    try {
      const submitData = {
        ...data,
        insumos_utilizados: insumos,
      };

      await onCreate(submitData);

      toast.success(
        <p>
          El <strong>servicio técnico</strong> se registró correctamente
        </p>
      );

      handleClose();
    } catch (error) {
      console.error("Error creating service:", error);
      toast.error("No se pudo crear el servicio");
    }
  };

  const handleClose = () => {
    reset();
    setInsumos([]);
    setProductos([]);
    onClose();
  };

  const searchProducts = useCallback((searchTerm: string, mode: "all" | "codigo" | "nombre" = "all") => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm || searchTerm.length < 2) {
      setProductos([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    // Debounce: wait 300ms before making the API call
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          search: searchTerm,
          limit: "30",
        });
        // Solo agregar search_field si no es "all"
        if (mode !== "all") {
          params.append("search_field", mode);
        }

        const res = await fetch(`/api/productos?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setProductos([]);
          return;
        }

        // API returns { data: [...], pagination: {...} } format
        const productosArray = Array.isArray(data) ? data : (data.data || []);
        setProductos(
          productosArray.map((p: any) => ({
            id: p.id,
            codigo: p.codigo || "",
            nombre: p.nombre || "Sin nombre",
          }))
        );
      } catch (error) {
        console.error("Error al buscar productos:", error);
        setProductos([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleAddInsumo = (producto: Producto) => {
    setInsumos((prev) => {
      const existente = prev.find((i) => i.producto_id === producto.id);

      if (existente) {
        return prev.map((i) =>
          i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }

      return [
        ...prev,
        {
          fecha: new Date().toISOString(),
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: 1,
          producto_id: producto.id,
        },
      ];
    });
  };

  const handleRemoveInsumo = (index: number) => {
    setInsumos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateInsumoQuantity = (index: number, cantidad: number) => {
    if (cantidad < 1) return;
    setInsumos((prev) =>
      prev.map((insumo, i) => (i === index ? { ...insumo, cantidad } : insumo))
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!w-[1400px] !max-w-[98vw] !max-h-[95vh] !p-0 overflow-hidden flex flex-col border border-gray-300 dark:border-gray-700 shadow-2xl ring-1 ring-black/5 dark:ring-white/10" showCloseButton={false}>
        {/* Título oculto para accesibilidad */}
        <VisuallyHidden.Root>
          <DialogTitle>Nueva Orden de Servicio</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 px-6 py-5 flex-shrink-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg"
            >
              <Wrench className="h-7 w-7 text-white" />
            </motion.div>
            <div className="flex-1">
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-bold text-white tracking-tight"
              >
                Nueva Orden de Servicio
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-purple-100 text-sm mt-0.5"
              >
                Complete los datos para registrar un nuevo servicio técnico
              </motion.p>
            </div>
            <Button
              type="default"
              variant="ghost"
              size="tiny"
              className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {initializing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center p-12 flex-1"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                  <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  Preparando formulario...
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit(onSubmit, onError)}
              onKeyDown={(e) => {
                // Bloquear Enter en cualquier input para que no submitee el form accidentalmente.
                // Solo se submitea con click explícito en "Crear Orden de Servicio".
                const target = e.target as HTMLElement;
                if (e.key === 'Enter' && target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="flex-1 overflow-y-auto overflow-x-hidden"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                {/* Tab Navigation */}
                <div className="px-6 pt-4 pb-2 border-b bg-gray-50/50 dark:bg-gray-900/50">
                  <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                    <TabsTrigger value="cliente" className="flex items-center gap-2 relative">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Cliente</span>
                      {tabErrors.cliente && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
                    </TabsTrigger>
                    <TabsTrigger value="servicio" className="flex items-center gap-2 relative">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Servicio</span>
                      {tabErrors.servicio && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
                    </TabsTrigger>
                    <TabsTrigger value="insumos" className="flex items-center gap-2 relative">
                      <Package className="h-4 w-4" />
                      <span className="hidden sm:inline">Insumos</span>
                      {insumos.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {insumos.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="detalles" className="flex items-center gap-2 relative">
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Detalles</span>
                      {tabErrors.detalles && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* TAB: Cliente y Equipo */}
                  <TabsContent value="cliente" className="mt-0 space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-xl border p-5 shadow-sm", sectionThemes.blue.bg, sectionThemes.blue.border)}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                          <User className={cn("h-5 w-5", sectionThemes.blue.icon)} />
                        </div>
                        <h3 className={cn("text-base font-semibold", sectionThemes.blue.title)}>
                          Información del Cliente
                        </h3>
                        <div className="ml-auto flex items-center gap-2">
                          <Label htmlFor="quick-id-cliente" className="text-xs text-muted-foreground whitespace-nowrap">Nº cliente</Label>
                          <input
                            id="quick-id-cliente"
                            type="number"
                            inputMode="numeric"
                            placeholder="123"
                            className="h-8 w-24 px-2 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={quickIdValue}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              setQuickIdValue(val);
                              if (!val) return;
                              const c = clientes.find((cl) => String(cl.identificador_unico) === val);
                              if (c) {
                                setValue("cliente_id", c.id, { shouldValidate: true });
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Buscador global: cliente / laboratorio / equipo */}
                      <div className="mb-5 space-y-1.5">
                        <Label className="text-sm font-medium">Búsqueda rápida</Label>
                        <ServicioGlobalSearch onSelect={aplicarSeleccionGlobal} />
                        <p className="text-xs text-muted-foreground">
                          Encontrá la orden por nombre de cliente, laboratorio o por equipo
                          (n° de serie, marca o modelo). Autocompleta los tres campos.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
                        {/* Cliente */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Cliente <span className="text-red-500">*</span></Label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Controller
                                name="cliente_id"
                                control={control}
                                render={({ field }) => (
                                  <SearchableCombobox
                                    preloadedOptions={clientesOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="Buscar cliente..."
                                    emptyMessage="No se encontraron clientes."
                                  />
                                )}
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="default"
                                  variant="outline"
                                  size="tiny"
                                  className="h-9 w-9 shrink-0 p-0"
                                  disabled={!clienteId}
                                  onClick={() => setShowClienteSheet(true)}
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar cliente</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="default"
                                  variant="outline"
                                  size="tiny"
                                  className="h-9 w-9 shrink-0 p-0"
                                  onClick={() => setShowAddClienteDialog(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar cliente</TooltipContent>
                            </Tooltip>
                          </div>
                          {errors.cliente_id && (
                            <p className="text-sm text-red-600">{errors.cliente_id.message}</p>
                          )}
                        </div>

                        {/* Laboratorio */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Laboratorio <span className="text-red-500">*</span></Label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Controller
                                name="laboratorio_id"
                                control={control}
                                render={({ field }) => {
                                  const labs = clienteId ? getLaboratoriosByCliente(clienteId) : [];
                                  return (
                                    <SearchableCombobox
                                      key={clienteId || 'no-client'}
                                      preloadedOptions={labs}
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      placeholder={
                                        !clienteId
                                          ? "Primero seleccione un cliente"
                                          : labs.length === 0
                                          ? "Cliente sin laboratorios"
                                          : "Seleccionar laboratorio"
                                      }
                                      disabled={!clienteId || labs.length === 0}
                                      emptyMessage="No hay laboratorios para este cliente"
                                    />
                                  );
                                }}
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="default"
                                  variant="outline"
                                  size="tiny"
                                  className="h-9 w-9 shrink-0 p-0"
                                  disabled={!laboratorioId}
                                  onClick={() => setShowLabSheet(true)}
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Gestionar lab y equipos</TooltipContent>
                            </Tooltip>
                          </div>
                          {errors.laboratorio_id && (
                            <p className="text-sm text-red-600">{errors.laboratorio_id.message}</p>
                          )}
                        </div>

                        {/* Equipo */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Equipo <span className="text-red-500">*</span></Label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Controller
                                name="equipo_id"
                                control={control}
                                render={({ field }) => (
                                  <SearchableCombobox
                                    key={`${clienteId || 'nc'}-${laboratorioId || 'nl'}`}
                                    preloadedOptions={(() => {
                                      // Unión: equipos del laboratorio + equipos del cliente
                                      // (estos últimos cubren los que están a nivel cliente
                                      // sin laboratorio, que antes no aparecían).
                                      const byLab = laboratorioId ? getEquiposUnidadesByLaboratorio(laboratorioId) : [];
                                      const byCliente = clienteId ? getEquiposUnidadesByCliente(clienteId) : [];
                                      const seen = new Set<string>();
                                      return [...byLab, ...byCliente].filter((o) => {
                                        if (seen.has(o.value)) return false;
                                        seen.add(o.value);
                                        return true;
                                      });
                                    })()}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={clienteId ? "Seleccionar equipo" : "Primero seleccione un cliente"}
                                    disabled={!clienteId}
                                    emptyMessage="No hay equipos para este cliente"
                                  />
                                )}
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="default"
                                  variant="outline"
                                  size="tiny"
                                  className="h-9 w-9 shrink-0 p-0"
                                  disabled={!laboratorioId}
                                  onClick={() => setShowAddEquipoDialog(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar equipo</TooltipContent>
                            </Tooltip>
                          </div>
                          {errors.equipo_id && (
                            <p className="text-sm text-red-600">{errors.equipo_id.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Alerta de servicios recientes (garantía) */}
                      {equipoId && loadingRecientes && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/40 rounded-lg">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Verificando historial reciente del equipo...
                        </div>
                      )}
                      {serviciosRecientes?.tiene_servicios_recientes && (
                        <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                                  Posible garantía — servicio reciente
                                </span>
                                <Badge
                                  variant="outline"
                                  className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 text-xs"
                                >
                                  {serviciosRecientes.servicios.length} en {serviciosRecientes.dias_alerta} días
                                </Badge>
                              </div>
                              <p className="text-xs text-amber-800 dark:text-amber-300">
                                Este equipo ya fue atendido recientemente. Revisá si corresponde garantía antes de cobrar.
                              </p>
                              <div className="space-y-1 pt-1">
                                {serviciosRecientes.servicios.slice(0, 3).map((srv: any) => {
                                  const fecha = srv.fecha_referencia || srv.fecha_completado || srv.fecha_programada || srv.created_at;
                                  return (
                                    <div
                                      key={srv.id}
                                      className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-800 text-xs"
                                    >
                                      <Wrench className="h-3 w-3 text-amber-600 shrink-0" />
                                      <span className="font-medium">#{srv.numero_orden}</span>
                                      {srv.tipo && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                                          {String(srv.tipo).replace(/_/g, " ")}
                                        </Badge>
                                      )}
                                      {srv.estado && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                          {srv.estado}
                                        </Badge>
                                      )}
                                      <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {fecha ? new Date(fecha).toLocaleDateString("es-AR") : "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botón siguiente */}
                      <div className="mt-6 flex justify-end">
                        <Button
                          type="default"
                          variant="outline"
                          onClick={() => setActiveTab("servicio")}
                          className="flex items-center gap-2"
                        >
                          Siguiente: Servicio
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </TabsContent>

                  {/* TAB: Servicio */}
                  <TabsContent value="servicio" className="mt-0 space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-xl border p-5 shadow-sm", sectionThemes.purple.bg, sectionThemes.purple.border)}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                          <Settings className={cn("h-5 w-5", sectionThemes.purple.icon)} />
                        </div>
                        <h3 className={cn("text-base font-semibold", sectionThemes.purple.title)}>
                          Detalles del Servicio
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Fecha */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Fecha de ingreso</Label>
                          <Controller
                            name="fecha"
                            control={control}
                            render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex items-center justify-start w-full h-10 px-3 rounded-md border border-input bg-white dark:bg-gray-800 hover:bg-accent text-sm font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                    {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} initialFocus />
                                </PopoverContent>
                              </Popover>
                            )}
                          />
                        </div>

                        {/* Técnico */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Técnico <span className="text-red-500">*</span></Label>
                          <div className="flex items-center gap-2">
                            <Controller
                              name="tecnico"
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="bg-white dark:bg-gray-800">
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tecnicos.map((t) => (
                                      <SelectItem key={t.id} value={t.nombre}>{t.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="default" variant="outline" size="tiny" className="h-10 w-10 shrink-0" onClick={() => setShowAddTecnicoDialog(true)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar técnico</TooltipContent>
                            </Tooltip>
                          </div>
                          {errors.tecnico && <p className="text-xs text-red-600">{errors.tecnico.message}</p>}
                        </div>

                        {/* Tipo de servicio */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Tipo de servicio</Label>
                          <div className="flex items-center gap-2">
                            <Controller
                              name="tipo_servicio"
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="bg-white dark:bg-gray-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tiposServicio.map((t) => (
                                      <SelectItem key={t.id} value={t.nombre}>{t.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="default" variant="outline" size="tiny" className="h-10 w-10 shrink-0" onClick={() => setShowAddTipoServicioDialog(true)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar tipo</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Modo de contacto */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Modo de contacto</Label>
                          <div className="flex items-center gap-2">
                            <Controller
                              name="modo_de_contacto"
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="bg-white dark:bg-gray-800">
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {modosContacto.map((m) => (
                                      <SelectItem key={m.id} value={m.nombre}>{m.nombre}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="default" variant="outline" size="tiny" className="h-10 w-10 shrink-0" onClick={() => setShowAddModoContactoDialog(true)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar modo</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Estado del servicio */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Estado servicio</Label>
                          <div className="flex items-center gap-2">
                            <Controller
                              name="estado"
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="bg-white dark:bg-gray-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {estados.map((e) => (
                                      <SelectItem key={e.id} value={e.value}>{e.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="default" variant="outline" size="tiny" className="h-10 w-10 shrink-0" onClick={() => setShowAddEstadoDialog(true)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar estado</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Estado contable */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Estado contable</Label>
                          <div className="flex items-center gap-2">
                            <Controller
                              name="estado_contable"
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="bg-white dark:bg-gray-800">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {estadosContable.map((e) => (
                                      <SelectItem key={e.id} value={e.value}>{e.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="default" variant="outline" size="tiny" className="h-10 w-10 shrink-0" onClick={() => setShowAddEstadoContableDialog(true)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar estado</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>

                      {/* Botón siguiente */}
                      <div className="mt-6 flex justify-end">
                        <Button
                          type="default"
                          variant="outline"
                          onClick={() => setActiveTab("insumos")}
                          className="flex items-center gap-2"
                        >
                          Siguiente: Insumos
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </TabsContent>

                  {/* TAB: Insumos */}
                  <TabsContent value="insumos" className="mt-0 space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-xl border-2 border-dashed p-5", sectionThemes.purple.bg, "border-purple-300 dark:border-purple-700")}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                          <Package className={cn("h-5 w-5", sectionThemes.purple.icon)} />
                        </div>
                        <h3 className={cn("text-base font-semibold", sectionThemes.purple.title)}>
                          Insumos Utilizados
                        </h3>
                        {insumos.length > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {insumos.reduce((acc, i) => acc + i.cantidad, 0)} unidades
                          </Badge>
                        )}
                      </div>

                      {/* Buscador de productos mejorado */}
                      <div className="space-y-3">
                        {/* Selector de modo de búsqueda - más visible */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar:</span>
                          <div className="flex rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 p-1 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchMode("all");
                                if (productSearchTerm) searchProducts(productSearchTerm, "all");
                              }}
                              className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                searchMode === "all"
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                              )}
                            >
                              Todo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchMode("codigo");
                                if (productSearchTerm) searchProducts(productSearchTerm, "codigo");
                              }}
                              className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                                searchMode === "codigo"
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                              )}
                            >
                              <Hash className="h-3.5 w-3.5" />
                              Código
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchMode("nombre");
                                if (productSearchTerm) searchProducts(productSearchTerm, "nombre");
                              }}
                              className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                                searchMode === "nombre"
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                              )}
                            >
                              <Search className="h-3.5 w-3.5" />
                              Nombre
                            </button>
                          </div>
                        </div>

                        {/* Input de búsqueda */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            ref={searchInputRef}
                            placeholder={
                              searchMode === "codigo" ? "Buscar solo por código (PRD-001, LBCX...)..." :
                              searchMode === "nombre" ? "Buscar solo por nombre del producto..." :
                              "Buscar por código o nombre..."
                            }
                            value={productSearchTerm}
                            onChange={(e) => {
                              setProductSearchTerm(e.target.value);
                              searchProducts(e.target.value, searchMode);
                            }}
                            className="pl-9 bg-white dark:bg-gray-800"
                          />
                          {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>

                        {/* Resultados de búsqueda */}
                        {productos.length > 0 && (
                          <ScrollArea className="h-[200px] rounded-lg border bg-white dark:bg-gray-800">
                            <div className="p-2 space-y-1">
                              {productos.map((producto) => {
                                const yaAgregado = insumos.some((i) => i.producto_id === producto.id);
                                return (
                                  <button
                                    key={producto.id}
                                    type="button"
                                    onClick={() => {
                                      handleAddInsumo(producto);
                                      setProductSearchTerm("");
                                      setProductos([]);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
                                      yaAgregado
                                        ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                    )}
                                  >
                                    <Badge variant="outline" className="shrink-0 font-mono">
                                      {producto.codigo}
                                    </Badge>
                                    <span className="flex-1 text-sm truncate">{producto.nombre}</span>
                                    {yaAgregado ? (
                                      <Badge variant="secondary" className="shrink-0">
                                        <Check className="h-3 w-3 mr-1" />
                                        +1
                                      </Badge>
                                    ) : (
                                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}

                        {productSearchTerm.length >= 2 && productos.length === 0 && !searching && (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            No se encontraron productos
                          </div>
                        )}
                      </div>

                      {/* Lista de insumos agregados */}
                      {insumos.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Productos agregados</Label>
                            <span className="text-xs text-muted-foreground">
                              {insumos.length} producto{insumos.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <ScrollArea className="h-[180px]">
                            <div className="space-y-2 pr-3">
                              {insumos.map((insumo, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Badge variant="secondary" className="shrink-0 font-mono">{insumo.codigo}</Badge>
                                    <span className="text-sm truncate">{insumo.nombre}</span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                      <Button
                                        type="default"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleUpdateInsumoQuantity(index, insumo.cantidad - 1)}
                                      >
                                        -
                                      </Button>
                                      <span className="text-sm font-medium w-8 text-center">{insumo.cantidad}</span>
                                      <Button
                                        type="default"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleUpdateInsumoQuantity(index, insumo.cantidad + 1)}
                                      >
                                        +
                                      </Button>
                                    </div>
                                    <Button
                                      type="default"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleRemoveInsumo(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Botón siguiente */}
                      <div className="mt-6 flex justify-end">
                        <Button
                          type="default"
                          variant="outline"
                          onClick={() => setActiveTab("detalles")}
                          className="flex items-center gap-2"
                        >
                          Siguiente: Detalles
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  </TabsContent>

                  {/* TAB: Detalles y Observaciones */}
                  <TabsContent value="detalles" className="mt-0 space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("rounded-xl border p-5 shadow-sm", sectionThemes.gray.bg, sectionThemes.gray.border)}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                          <FileText className={cn("h-5 w-5", sectionThemes.gray.icon)} />
                        </div>
                        <h3 className={cn("text-base font-semibold", sectionThemes.gray.title)}>
                          Detalles y Observaciones
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Falla declarada</Label>
                          <Textarea
                            {...register("falla_declarada")}
                            placeholder="Describe el problema reportado por el cliente..."
                            className="min-h-[100px] bg-white dark:bg-gray-800"
                          />
                          {errors.falla_declarada && (
                            <p className="text-xs text-red-600">{errors.falla_declarada.message}</p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Detalles de service</Label>
                          <Textarea
                            {...register("diagnostico")}
                            placeholder="Diagnóstico técnico del problema..."
                            className="min-h-[100px] bg-white dark:bg-gray-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Accesorios entrantes</Label>
                          <Input {...register("accesorios_entrantes")} placeholder="Ej: Cable de poder, manual, caja..." className="bg-white dark:bg-gray-800" />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Detalle privado <span className="text-gray-400 text-xs">(interno)</span></Label>
                          <Input {...register("detalle_privado")} placeholder="Notas internas..." className="bg-white dark:bg-gray-800" />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Recibió</Label>
                          <Input {...register("recibio")} placeholder="Nombre de quien recibió..." className="bg-white dark:bg-gray-800" />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Entregó</Label>
                          <Input {...register("entrego")} placeholder="Nombre de quien entregó..." className="bg-white dark:bg-gray-800" />
                        </div>
                      </div>

                      {/* Garantía */}
                      <div className={cn(
                        "mt-5 p-4 rounded-lg border transition-all",
                        garantiaValue
                          ? "bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      )}>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Controller
                            name="garantia"
                            control={control}
                            render={({ field }) => (
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <Shield className={cn("h-4 w-4", garantiaValue ? "text-green-600" : "text-gray-400")} />
                            <Label className="text-sm font-medium">¿Servicio en garantía?</Label>
                          </div>
                          {garantiaValue && (
                            <div className="flex-1 min-w-[200px]">
                              <Input
                                {...register("tipo_garantia")}
                                placeholder="Especificar tipo de garantía..."
                                className="h-8 bg-white dark:bg-gray-800"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sin cargo — régimen de facturación (migración 887).
                          Reemplaza el hack legacy de estado='Sin cargo'. */}
                      <div className={cn(
                        "mt-3 p-4 rounded-lg border transition-all",
                        sinCargoValue
                          ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      )}>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Controller
                            name="sin_cargo"
                            control={control}
                            render={({ field }) => (
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">
                              Sin cargo {sinCargoValue && <span className="text-amber-700 dark:text-amber-400 text-[11px] ml-1">(no se facturará)</span>}
                            </Label>
                          </div>
                          {sinCargoValue && (
                            <div className="flex-1 min-w-[200px]">
                              <Input
                                {...register("motivo_sin_cargo")}
                                placeholder="Motivo (obligatorio): cortesía, garantía extendida, re-trabajo..."
                                className="h-8 bg-white dark:bg-gray-800 border-amber-200"
                              />
                              {errors.motivo_sin_cargo && (
                                <p className="text-[11px] text-destructive mt-1">{errors.motivo_sin_cargo.message as string}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {sinCargoValue && (
                          <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                            Los repuestos descargan stock igualmente. El servicio queda sin facturación AFIP.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Footer con gradiente */}
              <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/95 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/95 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                {errorCount > 0 && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {errorCount === 1 ? "Hay 1 campo requerido sin completar" : `Hay ${errorCount} campos requeridos sin completar`}
                      {tabErrors.cliente && " — pestaña Cliente"}
                      {tabErrors.servicio && " — pestaña Servicio"}
                      {tabErrors.detalles && " — pestaña Detalles"}
                    </span>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button
                    type="default"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={isSubmitting}
                    icon={isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
                  >
                    {isSubmitting ? "Guardando..." : "Crear Orden de Servicio"}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>

      {/* Quick Add Dialogs */}
      <QuickAddClienteDialog
        open={showAddClienteDialog}
        onOpenChange={setShowAddClienteDialog}
        onSuccess={async (clienteId, clienteNombre) => {
          // Refresh context data to include the new client
          await refresh();
          setValue("cliente_id", clienteId);
          toast.success(`Cliente ${clienteNombre} seleccionado`);
        }}
      />

      {clienteId && (
        <QuickAddEquipoDialog
          open={showAddEquipoDialog}
          onOpenChange={setShowAddEquipoDialog}
          clienteId={clienteId}
          laboratorioId={laboratorioId || null}
          onSuccess={async (equipoId, equipoNombre) => {
            // Refresh context data to include the new equipment
            await refresh();
            setValue("equipo_id", equipoId);
            toast.success(`Equipo ${equipoNombre} seleccionado`);
          }}
        />
      )}

      <QuickAddConfigDialog
        open={showAddTecnicoDialog}
        onOpenChange={setShowAddTecnicoDialog}
        tipo="tecnico"
        title="Nuevo Técnico"
        placeholder="Nombre del técnico"
        onSuccess={(nombre) => {
          setValue("tecnico", nombre);
          loadDynamicData();
        }}
      />

      <QuickAddConfigDialog
        open={showAddTipoServicioDialog}
        onOpenChange={setShowAddTipoServicioDialog}
        tipo="tipo_servicio"
        title="Nuevo Tipo de Servicio"
        placeholder="Nombre del tipo de servicio"
        onSuccess={(nombre) => {
          setValue("tipo_servicio", nombre);
          loadDynamicData();
        }}
      />

      <QuickAddConfigDialog
        open={showAddModoContactoDialog}
        onOpenChange={setShowAddModoContactoDialog}
        tipo="modo_contacto"
        title="Nuevo Modo de Contacto"
        placeholder="Nombre del modo de contacto"
        onSuccess={(nombre) => {
          setValue("modo_de_contacto", nombre);
          loadDynamicData();
        }}
      />

      <QuickAddEstadoDialog
        open={showAddEstadoDialog}
        onOpenChange={setShowAddEstadoDialog}
        tipo="servicio"
        title="Nuevo Estado de Servicio"
        onSuccess={(value) => {
          setValue("estado", value);
          loadDynamicData();
        }}
      />

      <QuickAddEstadoDialog
        open={showAddEstadoContableDialog}
        onOpenChange={setShowAddEstadoContableDialog}
        tipo="contable"
        title="Nuevo Estado Contable"
        onSuccess={(value) => {
          setValue("estado_contable", value);
          loadDynamicData();
        }}
      />

      <LaboratorioSheet
        open={showLabSheet}
        onOpenChange={setShowLabSheet}
        laboratorioId={laboratorioId || null}
        clienteId={clienteId || null}
        onChange={async () => {
          await refresh();
        }}
      />

      <ClienteDetailSheet
        cliente={clientes.find((c) => c.id === clienteId) || null}
        open={showClienteSheet}
        onOpenChange={(open) => {
          setShowClienteSheet(open);
          if (!open) refresh();
        }}
      />
    </Dialog>
  );
}
