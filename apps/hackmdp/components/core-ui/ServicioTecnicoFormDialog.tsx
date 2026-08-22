"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import useSWR from "swr";

interface OpcionesServiciosDialog {
  tecnicos: Array<{ valor: string; usos: number }>;
  estados_contables: Array<{ valor: string; usos: number }>;
  tipos_servicio: Array<{ valor: string; usos: number }>;
  modos_contacto: Array<{ valor: string; usos: number }>;
}
const fetcherOpcionesDialog = (url: string) => fetch(url).then((r) => r.json());
import { searchClientes } from "@/hooks/use-client-search";
import { searchEquiposUnidades } from "@/hooks/use-equipo-search";
import { searchLaboratorios } from "@/hooks/use-laboratorio-search";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  X,
  AlertTriangle,
  Clock,
  Wrench,
  Monitor,
  Search,
  Minus,
  Trash2,
  Package,
  User,
  Building2,
  Calendar,
  FileText,
  Settings,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { EquipoServicioTecnico } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InsumoSearchPanel } from "./InsumoSearchPanel";
import confetti from "canvas-confetti";
import { CrearEquipoRapidoDialog } from "./CrearEquipoRapidoDialog";
import { QuickAddClienteDialog } from "./QuickAddClienteDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

// =============================================================================
// THEME CONFIGURATION (matching DetailSheetComponents)
// =============================================================================

type SectionTheme = "blue" | "purple" | "teal" | "amber" | "green" | "gray" | "rose" | "indigo";

const sectionThemes: Record<SectionTheme, {
  section: string;
  header: string;
  icon: string;
  iconBg: string;
  text: string;
  border: string;
  button: string;
}> = {
  blue: {
    section: "border-blue-200/50 dark:border-blue-800/40 bg-gradient-to-br from-white to-blue-50/40 dark:from-gray-900/80 dark:to-blue-950/20",
    header: "border-blue-200/60 dark:border-blue-800/40",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/50 dark:border-blue-800/40",
    text: "text-blue-900 dark:text-blue-100",
    border: "focus-within:border-blue-400 dark:focus-within:border-blue-600",
    button: "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50",
  },
  purple: {
    section: "border-purple-200/50 dark:border-purple-800/40 bg-gradient-to-br from-white to-purple-50/40 dark:from-gray-900/80 dark:to-purple-950/20",
    header: "border-purple-200/60 dark:border-purple-800/40",
    icon: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200/50 dark:border-purple-800/40",
    text: "text-purple-900 dark:text-purple-100",
    border: "focus-within:border-purple-400 dark:focus-within:border-purple-600",
    button: "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/50",
  },
  teal: {
    section: "border-teal-200/50 dark:border-teal-800/40 bg-gradient-to-br from-white to-teal-50/40 dark:from-gray-900/80 dark:to-teal-950/20",
    header: "border-teal-200/60 dark:border-teal-800/40",
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-gradient-to-br from-teal-500/10 to-teal-600/10 border-teal-200/50 dark:border-teal-800/40",
    text: "text-teal-900 dark:text-teal-100",
    border: "focus-within:border-teal-400 dark:focus-within:border-teal-600",
    button: "text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/50",
  },
  amber: {
    section: "border-amber-200/50 dark:border-amber-800/40 bg-gradient-to-br from-white to-amber-50/40 dark:from-gray-900/80 dark:to-amber-950/20",
    header: "border-amber-200/60 dark:border-amber-800/40",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-200/50 dark:border-amber-800/40",
    text: "text-amber-900 dark:text-amber-100",
    border: "focus-within:border-amber-400 dark:focus-within:border-amber-600",
    button: "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50",
  },
  green: {
    section: "border-green-200/50 dark:border-green-800/40 bg-gradient-to-br from-white to-green-50/40 dark:from-gray-900/80 dark:to-green-950/20",
    header: "border-green-200/60 dark:border-green-800/40",
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200/50 dark:border-green-800/40",
    text: "text-green-900 dark:text-green-100",
    border: "focus-within:border-green-400 dark:focus-within:border-green-600",
    button: "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50",
  },
  gray: {
    section: "border-gray-200/50 dark:border-gray-700/40 bg-gradient-to-br from-white to-gray-50/40 dark:from-gray-900/80 dark:to-gray-800/20",
    header: "border-gray-200/60 dark:border-gray-700/40",
    icon: "text-gray-600 dark:text-gray-400",
    iconBg: "bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-200/50 dark:border-gray-700/40",
    text: "text-gray-900 dark:text-gray-100",
    border: "focus-within:border-gray-400 dark:focus-within:border-gray-600",
    button: "text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50",
  },
  rose: {
    section: "border-rose-200/50 dark:border-rose-800/40 bg-gradient-to-br from-white to-rose-50/40 dark:from-gray-900/80 dark:to-rose-950/20",
    header: "border-rose-200/60 dark:border-rose-800/40",
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-gradient-to-br from-rose-500/10 to-rose-600/10 border-rose-200/50 dark:border-rose-800/40",
    text: "text-rose-900 dark:text-rose-100",
    border: "focus-within:border-rose-400 dark:focus-within:border-rose-600",
    button: "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
  },
  indigo: {
    section: "border-indigo-200/50 dark:border-indigo-800/40 bg-gradient-to-br from-white to-indigo-50/40 dark:from-gray-900/80 dark:to-indigo-950/20",
    header: "border-indigo-200/60 dark:border-indigo-800/40",
    icon: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-200/50 dark:border-indigo-800/40",
    text: "text-indigo-900 dark:text-indigo-100",
    border: "focus-within:border-indigo-400 dark:focus-within:border-indigo-600",
    button: "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50",
  },
};

interface ServicioTecnicoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio?: EquipoServicioTecnico | null;
  onSuccess: () => void;
  prefilledData?: {
    equipo_unidad_id?: string;
    cliente_id?: string;
    tipo?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const tipoOptions = [
  { value: "reparacion", label: "Reparación" },
  { value: "reacondicionamiento", label: "Reacondicionamiento" },
  { value: "mantenimiento_preventivo", label: "Mantenimiento Preventivo" },
  { value: "mantenimiento_correctivo", label: "Mantenimiento Correctivo" },
  { value: "instalacion", label: "Instalación" },
  { value: "desinstalacion", label: "Desinstalación" },
  { value: "calibracion", label: "Calibración" },
  { value: "inspeccion", label: "Inspección" },
  { value: "capacitacion", label: "Capacitación" },
];

// Normaliza un valor arbitrario (etiqueta o slug) al slug canonico de tipoOptions.
// La BD legacy guarda "Reparación" / "Reparacion" en vez del slug "reparacion",
// lo que rompía el pre-fill del Select al editar un servicio existente.
function normalizeTipoServicio(raw: string | null | undefined): string {
  if (!raw) return "reparacion";
  const slug = raw
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  const match = tipoOptions.find(
    (o) => o.value === slug || o.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === slug
  );
  return match ? match.value : "reparacion";
}

const MODOS_CONTACTO = ["Domicilio", "Telefónico", "Remoto", "Taller"];
const TIPOS_GARANTIA = [
  "Garantía del fabricante",
  "Garantía extendida",
  "Garantía por servicio previo",
  "Sin garantía",
];

// Mapa de colores semánticos
const semanticColorMap: Record<string, string> = {
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  outline: "#6b7280",
  default: "#6b7280",
  secondary: "#64748b",
};

const getColorValue = (color: string): string => {
  return semanticColorMap[color] || color;
};

// Confetti celebration
const triggerConfetti = () => {
  const count = 200;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

export function ServicioTecnicoFormDialog({
  open,
  onOpenChange,
  servicio,
  onSuccess,
  prefilledData,
}: ServicioTecnicoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [serviciosRecientes, setServiciosRecientes] = useState<{
    tiene_servicios_recientes: boolean;
    dias_alerta: number;
    servicios: any[];
    mensaje: string | null;
  } | null>(null);
  const [loadingRecientes, setLoadingRecientes] = useState(false);
  const [insumosUtilizados, setInsumosUtilizados] = useState<any[]>([]);
  const [crearEquipoOpen, setCrearEquipoOpen] = useState(false);
  const [crearClienteOpen, setCrearClienteOpen] = useState(false);
  const [insumosExpanded, setInsumosExpanded] = useState(false);
  const [equipoInfo, setEquipoInfo] = useState<{
    marca?: string;
    modelo?: string;
    numero_serie?: string;
    codigo?: string;
  } | null>(null);

  // Estados configurables
  const [estadosDisponibles, setEstadosDisponibles] = useState<
    Array<{ value: string; label: string; color: string }>
  >([]);
  const [estadosContables, setEstadosContables] = useState<
    Array<{ value: string; label: string; color: string }>
  >([]);

  // Pre-resolved options para los comboboxes async al editar.
  // Evita que tengan que buscar en frío un cliente/equipo/lab específico
  // cuando los searchFn paginan y el objetivo no cae en los primeros 50.
  const [defaultClienteOption, setDefaultClienteOption] = useState<ComboboxOption | null>(null);
  const [defaultEquipoOption, setDefaultEquipoOption] = useState<ComboboxOption | null>(null);
  const [defaultLabOption, setDefaultLabOption] = useState<ComboboxOption | null>(null);

  const [formData, setFormData] = useState({
    equipo_unidad_id: "",
    cliente_id: "",
    laboratorio_id: "",
    tipo: "reparacion",
    fecha_programada: new Date().toISOString().slice(0, 16),
    prioridad: "media",
    estado: "Reparar",
    estado_contable: "Pendiente",
    tecnico_nombre: "",
    motivo: "",
    diagnostico: "",
    trabajo_realizado: "",
    recomendaciones: "",
    costo_mano_obra: "",
    costo_repuestos: "",
    ubicacion_servicio: "",
    contacto: "",
    modo_contacto: "",
    falla_declarada: "",
    accesorios_entrantes: "",
    garantia: false,
    tipo_garantia: "",
    detalle_privado: "",
    recibio: "",
    entrego: "",
  });

  // Función de búsqueda de laboratorios filtrada por cliente
  const searchLaboratoriosFiltered = useCallback(
    (query: string) => {
      return searchLaboratorios(query, formData.cliente_id || undefined);
    },
    [formData.cliente_id]
  );

  // Búsqueda de equipos filtrada por el laboratorio seleccionado (si hay),
  // fallback al cliente. Así la lista solo muestra equipos de esa sede.
  const searchEquiposUnidadesFiltered = useCallback(
    (query: string) => {
      return searchEquiposUnidades(
        query,
        formData.cliente_id || undefined,
        formData.laboratorio_id || undefined
      );
    },
    [formData.cliente_id, formData.laboratorio_id]
  );

  // Opciones dinámicas (técnicos, estados contables, tipos) leídas de la BD.
  // Solo se carga cuando el dialog está abierto. SWR dedupea con la llamada
  // del detail sheet si ya estaba activa.
  const { data: opcionesServiciosDialog, mutate: mutateOpcionesDialog } =
    useSWR<OpcionesServiciosDialog>(
      open ? "/api/servicios/opciones" : null,
      fetcherOpcionesDialog,
      { dedupingInterval: 2 * 60 * 1000 }
    );
  const tecnicosListDialog = opcionesServiciosDialog?.tecnicos || [];
  const tiposServicioListDialog = opcionesServiciosDialog?.tipos_servicio || [];
  const estadosContablesListDialog = opcionesServiciosDialog?.estados_contables || [];
  const modosContactoListDialog = opcionesServiciosDialog?.modos_contacto || [];

  // Cargar estados configurables
  useEffect(() => {
    if (open) {
      // Estados de servicio
      fetch("/api/configuracion-estados?tipo=servicio")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEstadosDisponibles(data);
          }
        })
        .catch((err) => console.error("Error loading estados:", err));

      // Estados contables
      fetch("/api/configuracion-estados?tipo=contable")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEstadosContables(data);
          }
        })
        .catch((err) => console.error("Error loading estados contables:", err));
    }
  }, [open]);

  useEffect(() => {
    if (servicio) {
      const s = servicio as any;
      let fechaProgramada = new Date().toISOString().slice(0, 16);
      // servicios usa la columna `fecha` (date); fecha_programada es del
      // esquema viejo. Tomar la que exista.
      const fechaRaw = s.fecha_programada || s.fecha;
      if (fechaRaw) {
        const fecha = new Date(fechaRaw);
        if (!isNaN(fecha.getTime())) {
          fechaProgramada = fecha.toISOString().slice(0, 16);
        }
      }
      const equipoUnidadId = s.equipo_unidad_id || s.equipo_id?.id || "";
      const clienteObj = typeof s.cliente_id === "object" ? s.cliente_id : null;
      const clienteId = clienteObj?.id || (typeof s.cliente_id === "string" ? s.cliente_id : "") || "";
      const equipoObj = typeof s.equipo_id === "object" ? s.equipo_id : null;
      const labObj = typeof s.laboratorio_id === "object" ? s.laboratorio_id : null;
      const labId = labObj?.id || (typeof s.laboratorio_id === "string" ? s.laboratorio_id : "") || "";
      const tipo = normalizeTipoServicio(s.tipo || s.tipo_servicio || s.tipo_service);

      // Pre-resolve las opciones del combobox con datos ya expandidos.
      // Sin esto los combobox async no podrían mostrar el cliente seleccionado
      // porque su fallback solo busca entre los primeros 50 resultados.
      if (clienteObj && clienteObj.id) {
        setDefaultClienteOption({
          value: clienteObj.id,
          label: clienteObj.nombre_fantasia || clienteObj.nombre || "Cliente",
          secondaryLabel:
            clienteObj.nombre_fantasia && clienteObj.nombre && clienteObj.nombre_fantasia !== clienteObj.nombre
              ? clienteObj.nombre
              : undefined,
          badge: clienteObj.identificador_unico || clienteObj.identificador_legacy || undefined,
        });
      } else {
        setDefaultClienteOption(null);
      }

      if (equipoObj && equipoObj.id) {
        const equipo = equipoObj.equipo || {};
        const marcaModelo = [equipo.marca, equipo.modelo].filter(Boolean).join(" ");
        setDefaultEquipoOption({
          value: equipoObj.id,
          label: marcaModelo || equipoObj.numero_serie || equipoObj.codigo || "Equipo",
          secondaryLabel: equipoObj.numero_serie ? `N° serie: ${equipoObj.numero_serie}` : undefined,
          badge: equipoObj.codigo || undefined,
        });
      } else {
        setDefaultEquipoOption(null);
      }

      if (labObj && labObj.id) {
        setDefaultLabOption({
          value: labObj.id,
          label: labObj.nombre || "Laboratorio",
          secondaryLabel: labObj.direccion || undefined,
        });
      } else {
        setDefaultLabOption(null);
      }
      const tecnicoNombre = s.tecnico_nombre || s.tecnico || "";
      const costoManoObra =
        s.costo_mano_obra?.toString() ||
        s.monto_servicio?.toString() ||
        s.precio?.toString() ||
        "";
      const costoRepuestos =
        s.costo_repuestos?.toString() || s.monto_insumos?.toString() || "";
      const modoContacto = s.modo_contacto || s.modo_de_contacto || "";

      setFormData({
        equipo_unidad_id: equipoUnidadId,
        cliente_id: clienteId,
        laboratorio_id: labId,
        tipo: tipo,
        fecha_programada: fechaProgramada,
        prioridad: s.prioridad || "media",
        estado: s.estado || "Reparar",
        estado_contable: s.estado_contable || "Pendiente",
        tecnico_nombre: tecnicoNombre,
        motivo: s.motivo || "",
        diagnostico: s.diagnostico || "",
        trabajo_realizado: s.trabajo_realizado || "",
        recomendaciones: s.recomendaciones || "",
        costo_mano_obra: costoManoObra,
        costo_repuestos: costoRepuestos,
        ubicacion_servicio: s.ubicacion_servicio || "",
        contacto: s.contacto || "",
        modo_contacto: modoContacto,
        falla_declarada: s.falla_declarada || "",
        accesorios_entrantes: s.accesorios_entrantes || "",
        garantia: s.garantia || false,
        tipo_garantia: s.tipo_garantia || "",
        detalle_privado: s.detalle_privado || "",
        recibio: s.recibio || s.nombre_recibio || "",
        entrego: s.entrego || "",
      });
    } else {
      setDefaultClienteOption(null);
      setDefaultEquipoOption(null);
      setDefaultLabOption(null);
      setFormData({
        equipo_unidad_id: prefilledData?.equipo_unidad_id || "",
        cliente_id: prefilledData?.cliente_id || "",
        laboratorio_id: "",
        tipo: prefilledData?.tipo || "reparacion",
        fecha_programada: new Date().toISOString().slice(0, 16),
        prioridad: "media",
        estado: "Reparar",
        estado_contable: "Pendiente",
        tecnico_nombre: "",
        motivo: "",
        diagnostico: "",
        trabajo_realizado: "",
        recomendaciones: "",
        costo_mano_obra: "",
        costo_repuestos: "",
        ubicacion_servicio: "",
        contacto: "",
        modo_contacto: "",
        falla_declarada: "",
        accesorios_entrantes: "",
        garantia: false,
        tipo_garantia: "",
        detalle_privado: "",
        recibio: "",
        entrego: "",
      });
    }

    // Load insumos
    if (servicio) {
      const s = servicio as any;
      const insumos = s.insumos_utilizados || s.insumos_y_costos || [];
      if (typeof insumos === "string") {
        try {
          setInsumosUtilizados(JSON.parse(insumos));
        } catch {
          setInsumosUtilizados([]);
        }
      } else {
        setInsumosUtilizados(Array.isArray(insumos) ? insumos : []);
      }
    } else {
      setInsumosUtilizados([]);
    }

    setServiciosRecientes(null);
  }, [servicio, open, prefilledData]);

  // Verificar servicios recientes
  useEffect(() => {
    const checkServiciosRecientes = async () => {
      const equipoId = formData.equipo_unidad_id;
      if (!equipoId || servicio) {
        setServiciosRecientes(null);
        return;
      }

      setLoadingRecientes(true);
      try {
        const res = await fetch(
          `/api/equipos-servicios-tecnicos/recientes?equipo_unidad_id=${equipoId}`
        );
        if (res.ok) {
          const data = await res.json();
          setServiciosRecientes(data);
        }
      } catch (error) {
        console.error("Error checking recent services:", error);
      } finally {
        setLoadingRecientes(false);
      }
    };

    checkServiciosRecientes();
  }, [formData.equipo_unidad_id, servicio]);

  const isFormValid =
    formData.cliente_id.trim() !== "" &&
    formData.equipo_unidad_id.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id.trim()) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!formData.equipo_unidad_id.trim()) {
      toast.error("Selecciona un equipo");
      return;
    }

    setLoading(true);

    try {
      // Los servicios viven en la tabla `servicios`. Mapear los campos del
      // form a sus columnas. `laboratorio_id` solo filtra el buscador de
      // equipos — no se persiste (el lab se deriva del equipo). `motivo`,
      // `prioridad`, `trabajo_realizado`, etc. no tienen columna y se omiten.
      const payload: Record<string, any> = {
        cliente_id: formData.cliente_id,
        equipo_id: formData.equipo_unidad_id,
        tecnico: formData.tecnico_nombre || null,
        // formData.tipo es un slug ("reparacion"); persistir la etiqueta
        // canónica ("Reparación") que usa el resto de la app (filtros/stats).
        tipo_servicio:
          tipoOptions.find((o) => o.value === formData.tipo)?.label ||
          formData.tipo ||
          null,
        fecha: formData.fecha_programada
          ? formData.fecha_programada.slice(0, 10)
          : null,
        estado: formData.estado || null,
        estado_contable: formData.estado_contable || null,
        diagnostico: formData.diagnostico || null,
        falla_declarada: formData.falla_declarada || null,
        modo_de_contacto: formData.modo_contacto || null,
        contacto: formData.contacto || null,
        garantia: formData.garantia,
        tipo_garantia: formData.tipo_garantia || null,
        detalle_privado: formData.detalle_privado || null,
        accesorios_entrantes: formData.accesorios_entrantes || null,
        monto_servicio: parseFloat(formData.costo_mano_obra) || 0,
        monto_insumos: parseFloat(formData.costo_repuestos) || 0,
        insumos_utilizados: insumosUtilizados,
      };

      const res = servicio
        ? await fetch(`/api/servicios/${servicio.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/servicios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar servicio");
      }

      const isNewService = !servicio;

      if (isNewService) {
        toast.success(
          "Servicio #" + (data.nro_orden || "nuevo") + " creado exitosamente!"
        );
      } else {
        toast.success("Servicio actualizado");
      }

      onSuccess();
      onOpenChange(false);

      if (isNewService) {
        setTimeout(() => {
          triggerConfetti();
        }, 300);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar servicio técnico");
    } finally {
      setLoading(false);
    }
  };

  // Theme helpers
  const clienteTheme = sectionThemes.blue;
  const servicioTheme = sectionThemes.purple;
  const insumosTheme = sectionThemes.teal;
  const detallesTheme = sectionThemes.gray;
  const garantiaTheme = sectionThemes.green;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-purple-950/20 border-purple-200/50 dark:border-purple-800/30">
        {/* Header con gradiente elegante */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/60 via-purple-50/30 to-transparent dark:from-purple-950/30 dark:via-purple-950/10 dark:to-transparent relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-400/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-center gap-4 relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-purple-500/15 to-purple-600/15 p-3 rounded-2xl border border-purple-200/40 dark:border-purple-700/40 shadow-lg shadow-purple-500/10"
            >
              <ClipboardList className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-900 via-purple-700 to-purple-600 dark:from-purple-100 dark:via-purple-200 dark:to-purple-300 bg-clip-text text-transparent">
                {servicio ? "Editar Orden de Servicio" : "Nueva Orden de Servicio"}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1 text-purple-600/70 dark:text-purple-400/70">
                {servicio
                  ? "Modifica los detalles del servicio técnico"
                  : "Registra un nuevo servicio técnico, mantenimiento o reparación"}
              </DialogDescription>
            </div>
            {!servicio && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100/50 dark:bg-purple-900/30 border border-purple-200/50 dark:border-purple-700/50">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Nuevo</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Alerta de servicios recientes */}
            {serviciosRecientes?.tiene_servicios_recientes && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                        Equipo con servicio reciente
                      </h4>
                      <Badge
                        variant="outline"
                        className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300"
                      >
                        {serviciosRecientes.servicios.length} servicio(s) en{" "}
                        {serviciosRecientes.dias_alerta} días
                      </Badge>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Este equipo ya fue atendido recientemente. Revisa si el problema está
                      relacionado con el servicio anterior.
                    </p>
                    <div className="mt-3 space-y-2">
                      {serviciosRecientes.servicios.slice(0, 3).map((srv: any) => (
                        <div
                          key={srv.id}
                          className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-700"
                        >
                          <Wrench className="h-4 w-4 text-amber-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                #{srv.numero_orden}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {srv.tipo?.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {srv.fecha_completado
                              ? new Date(srv.fecha_completado).toLocaleDateString(
                                  "es-AR"
                                )
                              : "Sin fecha"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loadingRecientes && formData.equipo_unidad_id && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando historial de servicios...
              </div>
            )}

            {/* Grid principal de 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* COLUMNA IZQUIERDA: Información del Cliente */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={cn(
                  "space-y-4 p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow",
                  clienteTheme.section
                )}
              >
                {/* Header de sección */}
                <div className={cn("flex items-center gap-3 pb-3 border-b", clienteTheme.header)}>
                  <div className={cn("p-2 rounded-xl border shadow-sm", clienteTheme.iconBg)}>
                    <User className={cn("h-4 w-4", clienteTheme.icon)} />
                  </div>
                  <div>
                    <h3 className={cn("font-semibold text-sm", clienteTheme.text)}>
                      Cliente y Equipo
                    </h3>
                    <p className="text-xs text-muted-foreground">Información del propietario</p>
                  </div>
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <span>Cliente</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCrearClienteOpen(true)}
                      className={cn("h-7 text-xs gap-1.5 rounded-lg", clienteTheme.button)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear nuevo
                    </Button>
                  </div>
                  <div className={cn("rounded-lg transition-all", clienteTheme.border)}>
                    <SearchableCombobox
                      value={formData.cliente_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cliente_id: value, laboratorio_id: "" })
                      }
                      searchFn={searchClientes}
                      defaultSelectedOption={defaultClienteOption}
                      placeholder="Buscar cliente por nombre o CUIT..."
                      emptyMessage="No se encontraron clientes"
                    />
                  </div>
                </div>

                {/* Laboratorio */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Laboratorio</span>
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <SearchableCombobox
                    key={formData.cliente_id} // Re-render cuando cambia el cliente
                    value={formData.laboratorio_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, laboratorio_id: value })
                    }
                    searchFn={searchLaboratoriosFiltered}
                    defaultSelectedOption={defaultLabOption}
                    placeholder={formData.cliente_id ? "Buscar laboratorio del cliente..." : "Buscar laboratorio..."}
                    emptyMessage={formData.cliente_id ? "Este cliente no tiene laboratorios" : "No se encontraron laboratorios"}
                  />
                </div>

                {/* Equipo */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <span>Equipo</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCrearEquipoOpen(true)}
                      className={cn("h-7 text-xs gap-1.5 rounded-lg", servicioTheme.button)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear nuevo
                    </Button>
                  </div>
                  <div className={cn("rounded-lg transition-all", servicioTheme.border)}>
                    <SearchableCombobox
                      key={`${formData.cliente_id}-${formData.laboratorio_id}`}
                      value={formData.equipo_unidad_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, equipo_unidad_id: value });
                        setEquipoInfo(null);
                      }}
                      searchFn={searchEquiposUnidadesFiltered}
                      defaultSelectedOption={defaultEquipoOption}
                      placeholder={
                        formData.laboratorio_id
                          ? "Buscar equipo de esta sede..."
                          : formData.cliente_id
                            ? "Buscar equipo del cliente..."
                            : "Buscar por marca, modelo o N° serie..."
                      }
                      emptyMessage={
                        formData.laboratorio_id
                          ? "Esta sede no tiene equipos"
                          : "No se encontraron equipos"
                      }
                    />
                  </div>
                  {equipoInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 p-2 rounded-lg border border-purple-200/50 dark:border-purple-800/50"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {equipoInfo.marca} {equipoInfo.modelo}
                      </span>
                      {equipoInfo.codigo && (
                        <Badge variant="outline" className="text-[10px] py-0 border-purple-300 dark:border-purple-700">
                          {equipoInfo.codigo}
                        </Badge>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* COLUMNA DERECHA: Detalles del Servicio */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className={cn(
                  "space-y-4 p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow",
                  servicioTheme.section
                )}
              >
                {/* Header de sección */}
                <div className={cn("flex items-center gap-3 pb-3 border-b", servicioTheme.header)}>
                  <div className={cn("p-2 rounded-xl border shadow-sm", servicioTheme.iconBg)}>
                    <Settings className={cn("h-4 w-4", servicioTheme.icon)} />
                  </div>
                  <div>
                    <h3 className={cn("font-semibold text-sm", servicioTheme.text)}>
                      Detalles del Servicio
                    </h3>
                    <p className="text-xs text-muted-foreground">Configuración y asignación</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Fecha de ingreso */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha de ingreso</Label>
                    <Input
                      type="datetime-local"
                      value={formData.fecha_programada}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha_programada: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Técnico — combobox con opciones dinámicas + agregar nuevo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Técnico asignado</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-input bg-transparent text-sm w-full">
                      <QuickEditableCombobox
                        value={formData.tecnico_nombre}
                        options={tecnicosListDialog.map((t) => t.valor)}
                        placeholder="No se encontró técnico"
                        searchPlaceholder="Buscar o escribir técnico..."
                        emptyLabel="Sin asignar"
                        triggerClassName="font-normal w-full"
                        onChange={(v) => {
                          setFormData({ ...formData, tecnico_nombre: v });
                        }}
                        onCreateNew={async (nombre) => {
                          const res = await fetch("/api/servicio-tecnicos", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ nombre }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            toast.error(err?.error || "No se pudo agregar el técnico");
                            throw new Error(err?.error || "Error");
                          }
                          const created = await res.json();
                          toast.success(`Técnico "${created.nombre}" agregado`);
                          mutateOpcionesDialog();
                          return created.nombre as string;
                        }}
                      />
                    </div>
                  </div>

                  {/* Modo de contacto */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modo de contacto</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-input bg-transparent text-sm w-full">
                      <QuickEditableCombobox
                        value={formData.modo_contacto}
                        options={
                          modosContactoListDialog.length > 0
                            ? modosContactoListDialog.map((m) => m.valor)
                            : MODOS_CONTACTO
                        }
                        placeholder="No se encontró modo"
                        searchPlaceholder="Buscar o escribir modo..."
                        emptyLabel="Seleccionar modo"
                        triggerClassName="font-normal w-full"
                        onChange={(v) =>
                          setFormData({ ...formData, modo_contacto: v })
                        }
                        onCreateNew={async (nuevo) => {
                          // No hay catalog table — basta con setearlo y la
                          // proxima llamada a /api/servicios/opciones lo
                          // incluye (read from distinct servicios.modo_de_contacto).
                          mutateOpcionesDialog();
                          return nuevo;
                        }}
                      />
                    </div>
                  </div>

                  {/* Estado del servicio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado del servicio</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-input bg-transparent text-sm w-full">
                      <QuickEditableCombobox
                        value={
                          // Si el estado es uno configurado, mostramos el label.
                          // Si es texto libre, se muestra tal cual.
                          estadosDisponibles.find((e) => e.value === formData.estado)?.label ||
                          formData.estado
                        }
                        options={estadosDisponibles.map((e) => e.label)}
                        placeholder="No se encontró estado"
                        searchPlaceholder="Buscar o escribir estado..."
                        emptyLabel="Seleccionar estado"
                        triggerClassName="font-normal w-full"
                        onChange={(v) => {
                          // Si el label coincide con uno configurado, guardamos
                          // el value interno. Si no, guardamos el texto tal cual.
                          const match = estadosDisponibles.find((e) => e.label === v);
                          setFormData({
                            ...formData,
                            estado: match ? match.value : v,
                          });
                        }}
                        onCreateNew={async (nuevo) => {
                          setFormData({ ...formData, estado: nuevo });
                          return nuevo;
                        }}
                      />
                    </div>
                  </div>

                  {/* Estado contable */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado contable</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-input bg-transparent text-sm w-full">
                      <QuickEditableCombobox
                        value={formData.estado_contable}
                        options={(estadosContablesListDialog.length > 0
                          ? estadosContablesListDialog.map((t) => t.valor)
                          : estadosContables.map((e) => e.label)
                        )}
                        placeholder="No se encontró estado"
                        searchPlaceholder="Buscar o escribir estado..."
                        emptyLabel="Seleccionar"
                        triggerClassName="font-normal w-full"
                        onChange={(v) =>
                          setFormData({ ...formData, estado_contable: v })
                        }
                        onCreateNew={async (nombre) => {
                          const res = await fetch(
                            "/api/servicio-estados-contables",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ nombre }),
                            }
                          );
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            toast.error(
                              err?.error || "No se pudo agregar el estado"
                            );
                            throw new Error(err?.error || "Error");
                          }
                          const created = await res.json();
                          toast.success(`Estado "${created.nombre}" agregado`);
                          mutateOpcionesDialog();
                          return created.nombre as string;
                        }}
                      />
                    </div>
                  </div>

                  {/* Tipo de servicio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de servicio</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-input bg-transparent text-sm w-full">
                      <QuickEditableCombobox
                        value={
                          tiposServicioListDialog.find(
                            (t) => t.valor.toLowerCase() === formData.tipo.toLowerCase()
                          )?.valor ||
                          tipoOptions.find((o) => o.value === formData.tipo)?.label ||
                          formData.tipo
                        }
                        options={(tiposServicioListDialog.length > 0
                          ? tiposServicioListDialog.map((t) => t.valor)
                          : tipoOptions.map((o) => o.label)
                        )}
                        placeholder="No se encontró tipo"
                        searchPlaceholder="Buscar o escribir tipo..."
                        emptyLabel="Seleccionar tipo"
                        triggerClassName="font-normal w-full"
                        onChange={(v) => setFormData({ ...formData, tipo: v })}
                        onCreateNew={async (nombre) => {
                          const res = await fetch("/api/servicio-tipos", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ nombre }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            toast.error(
                              err?.error || "No se pudo agregar el tipo"
                            );
                            throw new Error(err?.error || "Error");
                          }
                          const created = await res.json();
                          toast.success(`Tipo "${created.nombre}" agregado`);
                          mutateOpcionesDialog();
                          return created.nombre as string;
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sección: Agregar Insumos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className={cn(
                "rounded-2xl border-2 border-dashed overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                insumosTheme.section
              )}
            >
              <button
                type="button"
                onClick={() => setInsumosExpanded(!insumosExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-teal-100/30 dark:hover:bg-teal-900/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl border shadow-sm", insumosTheme.iconBg)}>
                    <Package className={cn("h-4 w-4", insumosTheme.icon)} />
                  </div>
                  <div className="text-left">
                    <span className={cn("font-semibold text-sm", insumosTheme.text)}>
                      Insumos y Repuestos
                    </span>
                    <p className="text-xs text-muted-foreground">Productos utilizados en el servicio</p>
                  </div>
                  {insumosUtilizados.length > 0 && (
                    <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                      {insumosUtilizados.length} item{insumosUtilizados.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {insumosExpanded ? 'Contraer' : 'Expandir'}
                  </span>
                  <div className={cn("p-1 rounded-lg", insumosTheme.iconBg)}>
                    {insumosExpanded ? (
                      <ChevronUp className={cn("h-4 w-4", insumosTheme.icon)} />
                    ) : (
                      <ChevronDown className={cn("h-4 w-4", insumosTheme.icon)} />
                    )}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {insumosExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-3 border-t border-teal-200/50 dark:border-teal-800/30">
                      <InsumoSearchPanel
                        insumos={insumosUtilizados as any}
                        onChange={(next) => setInsumosUtilizados(next as any)}
                        showWrapper={false}
                        resultsHeight={220}
                        listHeight={220}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Sección: Detalles y Observaciones */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className={cn(
                "space-y-4 p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow",
                detallesTheme.section
              )}
            >
              {/* Header de sección */}
              <div className={cn("flex items-center gap-3 pb-3 border-b", detallesTheme.header)}>
                <div className={cn("p-2 rounded-xl border shadow-sm", detallesTheme.iconBg)}>
                  <FileText className={cn("h-4 w-4", detallesTheme.icon)} />
                </div>
                <div>
                  <h3 className={cn("font-semibold text-sm", detallesTheme.text)}>
                    Detalles y Observaciones
                  </h3>
                  <p className="text-xs text-muted-foreground">Información técnica del servicio</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Falla declarada
                  </Label>
                  <Textarea
                    value={formData.falla_declarada}
                    onChange={(e) =>
                      setFormData({ ...formData, falla_declarada: e.target.value })
                    }
                    placeholder="Describe el problema reportado por el cliente..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Diagnóstico (opcional)</Label>
                  <Textarea
                    value={formData.diagnostico}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnostico: e.target.value })
                    }
                    placeholder="Diagnóstico técnico del problema..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Accesorios entrantes</Label>
                  <Input
                    value={formData.accesorios_entrantes}
                    onChange={(e) =>
                      setFormData({ ...formData, accesorios_entrantes: e.target.value })
                    }
                    placeholder="Ej: Cable de poder, manual, caja..."
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Detalle privado (opcional)</Label>
                  <Input
                    value={formData.detalle_privado}
                    onChange={(e) =>
                      setFormData({ ...formData, detalle_privado: e.target.value })
                    }
                    placeholder="Notas internas..."
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Recibió</Label>
                  <Input
                    value={formData.recibio}
                    onChange={(e) =>
                      setFormData({ ...formData, recibio: e.target.value })
                    }
                    placeholder="Nombre de quien recibió..."
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Entregó</Label>
                  <Input
                    value={formData.entrego}
                    onChange={(e) =>
                      setFormData({ ...formData, entrego: e.target.value })
                    }
                    placeholder="Nombre de quien entregó..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Garantía */}
              <motion.div
                animate={{
                  backgroundColor: formData.garantia ? "rgb(240 253 244)" : "rgb(255 255 255)",
                  borderColor: formData.garantia ? "rgb(187 247 208)" : "rgb(229 231 235)",
                }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  formData.garantia && "shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl border transition-all",
                    formData.garantia
                      ? "bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800"
                      : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  )}>
                    <Shield
                      className={cn(
                        "h-5 w-5 transition-colors",
                        formData.garantia
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-400"
                      )}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">¿Servicio en garantía?</Label>
                    <p className="text-xs text-muted-foreground">
                      Activa si el servicio está cubierto
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {formData.garantia && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Select
                          value={formData.tipo_garantia}
                          onValueChange={(value) =>
                            setFormData({ ...formData, tipo_garantia: value })
                          }
                        >
                          <SelectTrigger className="w-[180px] h-9 text-sm border-green-200 dark:border-green-800">
                            <SelectValue placeholder="Tipo de garantía" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_GARANTIA.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                {tipo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Switch
                    checked={formData.garantia}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, garantia: checked })
                    }
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </motion.div>
            </motion.div>
          </form>
        </ScrollArea>

        {/* Footer mejorado */}
        <div className="px-6 py-4 border-t border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-white via-purple-50/20 to-purple-50/40 dark:from-gray-900 dark:via-purple-950/10 dark:to-purple-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Los campos con * son obligatorios</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || (!servicio && !isFormValid)}
              className="px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!loading && <Sparkles className="mr-2 h-4 w-4" />}
              {servicio ? "Guardar Cambios" : "Crear Orden"}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Dialogs auxiliares */}
      <CrearEquipoRapidoDialog
        open={crearEquipoOpen}
        onOpenChange={setCrearEquipoOpen}
        onSuccess={(equipoUnidadId, info) => {
          setFormData({ ...formData, equipo_unidad_id: equipoUnidadId });
          setEquipoInfo(info);
          toast.success(`Equipo ${info.marca} ${info.modelo} creado`);
        }}
        preselectedClienteId={formData.cliente_id}
      />

      <QuickAddClienteDialog
        open={crearClienteOpen}
        onOpenChange={setCrearClienteOpen}
        onSuccess={(clienteId, clienteNombre) => {
          setFormData({ ...formData, cliente_id: clienteId });
          toast.success(`Cliente ${clienteNombre} creado`);
        }}
      />
    </Dialog>
  );
}
