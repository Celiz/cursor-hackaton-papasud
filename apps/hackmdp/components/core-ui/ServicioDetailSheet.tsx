"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sheetClasses, tableClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { TableSecondaryText, TableCodeText } from "@/components/core-ui/TableTextTruncate";
import { useSession } from "@/lib/hooks/use-session";
import { ExpandableEmailButton } from "@/components/core-ui/ExpandableEmailButton";
import { ExpandableDownloadButton } from "@/components/core-ui/ExpandableDownloadButton";
import { ExpandableDeleteButton } from "@/components/core-ui/ExpandableConfirmButton";
import {
  FileText,
  Wrench,
  Package,
  History,
  AlertCircle,
  Loader2,
  ExternalLink,
  User,
  Monitor,
  Receipt,
  MessageSquare,
  Pencil,
  Trash2,
  Plus,
  Minus,
  Search,
  Save,
  Lock,
  Check,
  X as XIcon,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { GarantiaTabPanel } from "@/components/core-ui/GarantiaTabPanel";
import { useRouter } from "next/navigation";
import { Servicio } from "@/lib/types";
import { WhatsAppShareDialog } from "@/components/core-ui/WhatsAppShareDialog";
import { FacturarServicioDialogMejorado } from "@/components/core-ui/FacturarServicioDialogMejorado";
import { PresupuestarServicioDialog } from "@/components/core-ui/PresupuestarServicioDialog";
import { ServicioChatter } from "@/components/core-ui/ServicioChatter";
import { useConfirm } from "@/lib/hooks/use-confirm";
import { ServicioTecnicoFormDialog } from "@/components/core-ui/ServicioTecnicoFormDialog";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { InsumoSearchPanel } from './InsumoSearchPanel';
import { toast } from "@locus/ui";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { usePreloadedData } from "@/lib/contexts/DataContext";
import { LaboratorioSheet } from "@/components/laboratorios/LaboratorioSheet";
import { ClienteDetailSheet } from "./ClienteDetailSheet";
import { QuickEditableCombobox } from "@/components/ui/quick-editable-combobox";
import { EnviarAFabricaDialog } from "@/components/core-ui/EnviarAFabricaDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Truck, Send, CheckCircle2, X } from "lucide-react";

interface OpcionesServicios {
  tecnicos: Array<{ valor: string; usos: number }>;
  estados_contables: Array<{ valor: string; usos: number }>;
  tipos_servicio: Array<{ valor: string; usos: number }>;
  modos_contacto: Array<{ valor: string; usos: number }>;
}
const fetcherOpciones = (url: string) => fetch(url).then((r) => r.json());

interface InsumoItem {
  fecha?: string;
  codigo?: string;
  nombre?: string;
  cantidad?: number;
  producto_id?: number;
}

// Mapa de colores semánticos a valores CSS
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

// Helper para convertir color semántico a CSS
const getColorValue = (color: string): string => {
  return semanticColorMap[color] || color;
};

function EditableFechaField({ fecha, onSave }: { fecha: string | null; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const startEdit = () => {
    if (fecha) {
      const d = new Date(fecha);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      setValue(local.toISOString().slice(0, 16));
    } else {
      setValue("");
    }
    setEditing(true);
  };

  const save = async () => {
    if (!value) return;
    await onSave(new Date(value).toISOString());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 border border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50/40 dark:bg-purple-950/20">
        <TableSecondaryText>Fecha</TableSecondaryText>
        <div className="flex items-center gap-1.5 mt-1">
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            autoFocus
          />
          <Button type="primary" size="tiny" onClick={save} className="h-8 w-8 p-0" disabled={!value}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button type="default" variant="outline" size="tiny" onClick={() => setEditing(false)} className="h-8 w-8 p-0">
            <XIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-lg bg-white dark:bg-gray-900 cursor-pointer hover:border-purple-300 transition-colors group"
      onClick={startEdit}
      title="Click para editar fecha"
    >
      <TableSecondaryText>Fecha</TableSecondaryText>
      <div className="flex items-center gap-1.5 mt-0.5">
        <p className="font-medium text-sm">
          {fecha
            ? new Date(fecha).toLocaleDateString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })
            : "-"}
        </p>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function EditableTextareaField({
  label,
  value: currentValue,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(currentValue || "");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</Label>
        <div className="mt-1.5 p-3 border border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50/40 dark:bg-purple-950/20">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <Button type="default" variant="outline" size="tiny" onClick={() => setEditing(false)} disabled={saving} className="h-8 w-8 p-0">
              <XIcon className="h-3.5 w-3.5" />
            </Button>
            <Button type="primary" size="tiny" onClick={save} loading={saving} className="h-8 w-8 p-0">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</Label>
      <div
        className="mt-1.5 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
        onClick={startEdit}
        title="Click para editar"
      >
        <div className="flex items-start gap-1.5">
          <p className={`text-sm flex-1 whitespace-pre-wrap ${currentValue ? "" : "text-muted-foreground italic"}`}>
            {currentValue || placeholder}
          </p>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        </div>
      </div>
    </div>
  );
}

interface ServicioDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Servicio;
  onRefresh?: () => void;
  onServiceChange?: (service: Servicio) => void;
  initialTab?: string;
}

export function ServicioDetailSheet({
  open,
  onOpenChange,
  service,
  onRefresh,
  onServiceChange,
  initialTab,
}: ServicioDetailSheetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';

  const [activeTab, setActiveTab] = useState(initialTab ?? "resumen");

  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);
  const [historial, setHistorial] = useState<Servicio[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [switchingService, setSwitchingService] = useState(false);
  const [activeHistorialId, setActiveHistorialId] = useState(service.id);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [facturarDialogOpen, setFacturarDialogOpen] = useState(false);
  const [facturarTipoInicial, setFacturarTipoInicial] = useState<string>("IVR");
  const [presupuestarDialogOpen, setPresupuestarDialogOpen] = useState(false);
  const [presupuestoOverride, setPresupuestoOverride] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [enviarFabricaOpen, setEnviarFabricaOpen] = useState(false);
  const [estadosDisponibles, setEstadosDisponibles] = useState<Array<{ value: string; label: string; color: string }>>([]);
  const [changingEstado, setChangingEstado] = useState(false);
  const [currentService, setCurrentService] = useState(service);
  const [markingPrecioListo, setMarkingPrecioListo] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const [editingMonto, setEditingMonto] = useState(false);
  const [montoServicioDraft, setMontoServicioDraft] = useState<string>(
    service.monto_servicio ? String(service.monto_servicio) : ''
  );

  // Derivar si el servicio está facturado (boolean O estado_contable)
  const isFacturado = !!(service.facturado || service.estado_contable === 'Facturado');

  // Sin cargo (garantía, cortesía, etc.): no corresponde facturar.
  const isSinCargo = (currentService.estado_contable || '')
    .toLowerCase()
    .includes('sin cargo');

  // Estados para edición inline del cascade Cliente → Lab → Equipo
  const { clientes, clientesOptions, getLaboratoriosByCliente, getEquiposUnidadesByLaboratorio, refresh: refreshPreload } = usePreloadedData();
  const [editingCascade, setEditingCascade] = useState(false);
  const [savingCascade, setSavingCascade] = useState(false);
  const [cascadeCliente, setCascadeCliente] = useState<string>("");
  const [cascadeLab, setCascadeLab] = useState<string>("");
  const [cascadeEquipo, setCascadeEquipo] = useState<string>("");
  const [showLabSheet, setShowLabSheet] = useState(false);
  const [showClienteSheet, setShowClienteSheet] = useState(false);

  // Estados para manejo de insumos inline
  const [insumos, setInsumos] = useState<InsumoItem[]>([]);
  const [savingInsumos, setSavingInsumos] = useState(false);
  const [insumosModified, setInsumosModified] = useState(false);

  const fetchPdfBlob = async (): Promise<Blob> => {
    const res = await fetch(`/api/servicios/${service.id}/pdf`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Error al generar PDF' }));
      throw new Error(data.error || 'Error al generar PDF');
    }
    return res.blob();
  };

  const handlePrint = async () => {
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          win.print();
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al imprimir');
      console.error(error);
    }
  };

  const handleFacturar = (tipoInicial: string = "IVR") => {
    if (isSinCargo) {
      toast.info('El servicio es sin cargo — no corresponde facturar');
      return;
    }
    setFacturarTipoInicial(tipoInicial);
    setFacturarDialogOpen(true);
  };

  const handlePresupuestar = () => {
    setPresupuestarDialogOpen(true);
  };

  // Presupuesto vinculado via SWR — revalida al recuperar foco y hace polling
  // mientras el presupuesto está pendiente de respuesta del cliente (enviado/visto),
  // así se actualiza solo cuando el cliente firma desde el link público.
  const presupuestoKey = open && service?.id
    ? `/api/presupuestos?servicio_id=${service.id}`
    : null;
  const {
    data: presupuestoSWR,
    isLoading: loadingPresupuesto,
    mutate: mutatePresupuesto,
  } = useSWR(
    presupuestoKey,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      return list[0] || null;
    },
    {
      revalidateOnFocus: true,
      refreshInterval: (latest) => {
        if (!latest) return 0;
        const pendientes = ['enviado', 'visto', 'borrador'];
        return pendientes.includes(latest.estado) ? 20000 : 0;
      },
    }
  );

  // Override local para updates optimistas tras aceptar/rechazar
  const presupuestoLinked = presupuestoOverride ?? presupuestoSWR ?? null;
  useEffect(() => {
    setPresupuestoOverride(null);
  }, [presupuestoSWR]);
  useEffect(() => {
    if (!open) setPresupuestoOverride(null);
  }, [open]);

  // Si el presupuesto pasa a aceptado/aprobado, el servicio cambia de estado —
  // disparar onRefresh para que el parent recargue la lista y el header.
  const prevPresupuestoEstadoRef = useRef<string | null>(null);
  useEffect(() => {
    const estado = presupuestoSWR?.estado ?? null;
    const prev = prevPresupuestoEstadoRef.current;
    const aprobadoStates = ['aprobado', 'aceptado', 'firmado', 'rechazado'];
    if (prev && prev !== estado && estado && aprobadoStates.includes(estado)) {
      onRefresh?.();
    }
    prevPresupuestoEstadoRef.current = estado;
  }, [presupuestoSWR?.estado, onRefresh]);

  const handleAceptarPresupuesto = async () => {
    if (!presupuestoLinked?.id) return;
    try {
      const res = await fetch('/api/presupuestos/aceptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto_id: presupuestoLinked.id }),
      });
      if (!res.ok) throw new Error('Error al aceptar');
      toast.success('Presupuesto aceptado');
      setPresupuestoOverride({ ...presupuestoLinked, estado: 'aprobado' });
      mutatePresupuesto();
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message || 'Error al aceptar presupuesto');
    }
  };

  const handleRechazarPresupuesto = async () => {
    if (!presupuestoLinked?.id) return;
    try {
      const res = await fetch('/api/presupuestos/rechazar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto_id: presupuestoLinked.id }),
      });
      if (!res.ok) throw new Error('Error al rechazar');
      toast.success('Presupuesto rechazado');
      setPresupuestoOverride({ ...presupuestoLinked, estado: 'rechazado' });
      mutatePresupuesto();
    } catch (e: any) {
      toast.error(e.message || 'Error al rechazar presupuesto');
    }
  };

  const handleConvertirPresupuestoAIvr = () => {
    handleFacturar("IVR");
  };

  const handleFacturacionSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
    router.refresh();
    toast.success("Servicio facturado correctamente");
  };

  const handleEstadoChange = async (newEstado: string) => {
    setChangingEstado(true);
    try {
      const response = await fetch(`/api/servicios/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newEstado }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      const updatedService = await response.json();
      setCurrentService(updatedService);

      toast.success('Estado actualizado correctamente');
      if (onRefresh) {
        onRefresh();
      }
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar estado');
    } finally {
      setChangingEstado(false);
    }
  };

  // Lista de técnicos y estados contables — distinct de la propia tabla servicios,
  // con conteo de usos. Cuando se agrega uno nuevo vía handleFieldPatch, el
  // próximo fetch lo incluye automáticamente (la tabla es la fuente de verdad).
  const { data: opcionesServicios, mutate: mutateOpciones } = useSWR<OpcionesServicios>(
    '/api/servicios/opciones',
    fetcherOpciones,
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const tecnicosList = opcionesServicios?.tecnicos || [];
  const estadosContablesList = opcionesServicios?.estados_contables || [];
  const tiposServicioList = opcionesServicios?.tipos_servicio || [];
  const modosContactoList = opcionesServicios?.modos_contacto || [];

  type CampoEditable = 'tecnico' | 'estado_contable' | 'tipo_servicio' | 'modo_de_contacto';
  const labelsCampo: Record<CampoEditable, string> = {
    tecnico: 'Técnico',
    estado_contable: 'Estado contable',
    tipo_servicio: 'Tipo de servicio',
    modo_de_contacto: 'Modo de contacto',
  };

  const handleFieldPatch = async (field: CampoEditable, value: string) => {
    try {
      const response = await fetch(`/api/servicios/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Error al actualizar');
      const updated = await response.json();
      setCurrentService(updated);
      toast.success(`${labelsCampo[field]} actualizado`);
      // Si el valor es nuevo, refrescamos la lista de opciones para que aparezca
      const lista =
        field === 'tecnico' ? tecnicosList :
        field === 'estado_contable' ? estadosContablesList :
        field === 'modo_de_contacto' ? modosContactoList :
        tiposServicioList;
      const existsInList = lista.some((t) => t.valor === value);
      if (!existsInList) {
        mutateOpciones();
      }
      if (onRefresh) onRefresh();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    }
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  // Iniciar edición del cascade con valores actuales
  const startEditCascade = () => {
    const currentClienteId = (service.cliente_id as any)?.id || "";
    const currentEquipoUnidadId = (service.equipo_id as any)?.id || "";
    const currentLabId = (service.equipo_id as any)?.laboratorio_id || "";
    setCascadeCliente(currentClienteId);
    setCascadeLab(currentLabId);
    setCascadeEquipo(currentEquipoUnidadId);
    setEditingCascade(true);
  };

  const cancelEditCascade = () => {
    setEditingCascade(false);
    setCascadeCliente("");
    setCascadeLab("");
    setCascadeEquipo("");
  };

  const saveCascade = async () => {
    if (!cascadeCliente || !cascadeLab || !cascadeEquipo) {
      toast.error("Seleccioná cliente, laboratorio y equipo");
      return;
    }
    setSavingCascade(true);
    try {
      const response = await fetch(`/api/servicios/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: cascadeCliente,
          equipo_id: cascadeEquipo,
        }),
      });
      if (!response.ok) throw new Error("Error al actualizar");
      const updated = await response.json();
      setCurrentService(updated);
      toast.success("Cliente / Lab / Equipo actualizados");
      setEditingCascade(false);
      if (onRefresh) onRefresh();
      if (onServiceChange) onServiceChange(updated);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar los cambios");
    } finally {
      setSavingCascade(false);
    }
  };

  const handleEditSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
    router.refresh();
    toast.success("Servicio actualizado correctamente");
  };

  // Guardado inline de campos técnicos (falla declarada, diagnóstico, etc.)
  const saveCampoTecnico = async (campo: keyof Servicio, valor: string) => {
    const response = await fetch(`/api/servicios/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor || null }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Error al guardar");
    }
    // Merge solo el campo cambiado para no pisar cliente_id/equipo_id expandidos.
    const merged = { ...currentService, [campo]: valor || null };
    setCurrentService(merged);
    toast.success("Guardado");
    if (onRefresh) onRefresh();
    if (onServiceChange) onServiceChange(merged);
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/servicios/${service.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar el servicio');
    }

    toast.success('Servicio eliminado correctamente');
    onOpenChange(false);
    router.refresh();
  };

  // Obtener emails del cliente como array
  // El email puede venir en cliente_id.email (directo) o en cliente_id.datos_contacto.email
  const clienteEmails: string[] = React.useMemo(() => {
    // Intentar primero el campo directo email, luego datos_contacto.email
    const clienteData = service.cliente_id as any;
    const email = clienteData?.email || clienteData?.datos_contacto?.email;
    if (!email) return [];
    if (Array.isArray(email)) return email.filter(Boolean);
    // Extraer emails de un string
    if (typeof email === 'string') {
      const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
      const emails = email.match(emailRegex);
      return emails || [email].filter(Boolean);
    }
    return [];
  }, [service.cliente_id]);

  // Función para enviar email con PDF adjunto
  const handleSendEmail = async (email: string) => {
    const toastId = toast.loading(`Enviando orden de servicio a ${email}...`);

    try {
      const blob = await fetchPdfBlob();
      const arrayBuffer = await blob.arrayBuffer();
      const pdfBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await fetch('/api/org-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [email],
          subject: `Orden de Servicio #${service.id.slice(0, 8)} - ${service.equipo_id?.equipo_id?.marca || ''} ${service.equipo_id?.equipo_id?.modelo || ''}`,
          body: `Estimado/a ${service.cliente_id?.nombre || ''},\n\nAdjunto encontrará la orden de servicio correspondiente a su equipo.\n\nEstado actual: ${service.estado}\n\nSaludos cordiales.`,
          attachmentBase64: pdfBase64,
          attachmentName: `orden-servicio-${service.id.slice(0, 8)}.pdf`,
        }),
      });

      // Handle non-JSON responses (e.g., 404, server errors returning HTML)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from /api/org-email/send:', text.slice(0, 200));
        throw new Error('Error del servidor al enviar email');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar email');
      }

      toast.success('Email enviado correctamente', {
        id: toastId,
        description: `Enviado a ${email}`,
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Error al enviar email', { id: toastId });
    }
  };

  // Función para descargar PDF
  const handleDownloadPDF = async () => {
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden-servicio-${service.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF generado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al generar PDF');
      console.error(error);
    }
  };

  // Sync currentService with service prop
  useEffect(() => {
    setCurrentService(service);
    setActiveHistorialId(service.id);
  }, [service]);

  // Fetch estados disponibles
  useEffect(() => {
    if (open) {
      fetch('/api/configuracion-estados?tipo=servicio')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEstadosDisponibles(data);
          }
        })
        .catch(err => console.error("Error loading estados:", err));
    }
  }, [open]);

  // Track current equipo to detect equipment changes
  const prevEquipoIdRef = useRef<string | null>(null);

  // Fetch historial when tab is activated or equipment changes
  useEffect(() => {
    const equipoId = service?.equipo_id?.id;
    const equipoChanged = equipoId !== prevEquipoIdRef.current;

    if (activeTab === "historial" && equipoId) {
      if (equipoChanged) {
        prevEquipoIdRef.current = equipoId;
        setHistorial([]);
      }
      setLoadingHistorial(true);
      fetch(`/api/equipos-unidades/${equipoId}/historial`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setHistorial(data);
          }
        })
        .catch(err => console.error("Error loading historial:", err))
        .finally(() => setLoadingHistorial(false));
    }
  }, [activeTab, service?.equipo_id?.id, service?.monto_servicio, (service as any)?.precio_listo_at]);

  // Reset historial when service changes or sheet closes
  useEffect(() => {
    if (!open) {
      setHistorial([]);
      setActiveTab("resumen");
      setInsumosModified(false);
    }
  }, [open]);

  // Load insumos from service
  useEffect(() => {
    if (service?.insumos_y_costos && Array.isArray(service.insumos_y_costos)) {
      setInsumos(service.insumos_y_costos);
    } else {
      setInsumos([]);
    }
    setInsumosModified(false);
  }, [service]);

  // Save insumos
  const handleSaveInsumos = async () => {
    setSavingInsumos(true);
    try {
      const response = await fetch(`/api/servicios/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumos_utilizados: insumos }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar insumos');
      }

      toast.success('Insumos guardados correctamente');
      setInsumosModified(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar insumos');
    } finally {
      setSavingInsumos(false);
    }
  };

  if (!service) return null;


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-white dark:bg-gray-950">
        <div className="h-full flex flex-col">
          {/* Banner SIN CARGO — visible y destacado cuando el servicio tiene
              el flag sin_cargo=true (migración 887). No es editable desde acá,
              se setea en la creación del servicio. */}
          {(currentService as any).sin_cargo && (
            <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold gap-1">
                SIN CARGO
              </Badge>
              <span className="text-xs text-amber-700 dark:text-amber-400 truncate">
                {(currentService as any).motivo_sin_cargo || "Sin motivo especificado"}
              </span>
              <span className="text-[10px] text-amber-600 ml-auto shrink-0">
                No se factura — costo absorbido por Uno
              </span>
            </div>
          )}

          {/* Header */}
          <SheetHeader className="px-4 md:px-6 py-3 border-b border-purple-200/50 dark:border-purple-800/30 shrink-0 overflow-visible">
            <div className="flex flex-col gap-2.5 overflow-visible">
              {/* Fila principal: ID + Título + Estado + Acciones */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 md:pr-8">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                  <SheetTitle className="text-lg font-semibold text-foreground shrink-0">
                    Orden de Servicio
                  </SheetTitle>
                  <TableCodeText className="shrink-0">
                    #{service.id?.slice(0, 8).toUpperCase() || "-"}
                  </TableCodeText>

                  {/* Estado como badge/select prominente */}
                  {(() => {
                    const estadoConfig = estadosDisponibles.find(e => e.value === currentService.estado);
                    const estadoColor = getColorValue(estadoConfig?.color || 'purple');
                    const estadoLabel = estadoConfig?.label || currentService.estado || 'Sin estado';
                    return (
                      <Select
                        value={currentService.estado}
                        onValueChange={handleEstadoChange}
                        disabled={changingEstado}
                      >
                        <SelectTrigger
                          className="h-7 w-auto gap-1.5 border-0 px-3 rounded-full text-xs font-semibold shadow-sm cursor-pointer"
                          style={{
                            backgroundColor: `${estadoColor}18`,
                            color: estadoColor,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: estadoColor }}
                          />
                          {estadosDisponibles.length > 0 && estadoConfig
                            ? <SelectValue placeholder="Estado" />
                            : <span>{estadoLabel}</span>
                          }
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {!estadoConfig && currentService.estado && (
                            <SelectItem value={currentService.estado} className="text-sm py-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block"
                                style={{ backgroundColor: estadoColor }}
                              />
                              <span>{currentService.estado}</span>
                            </SelectItem>
                          )}
                          {estadosDisponibles.map((estado) => (
                            <SelectItem key={estado.value} value={estado.value} className="text-sm py-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block"
                                style={{ backgroundColor: getColorValue(estado.color) }}
                              />
                              <span>{estado.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}

                  {changingEstado && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>

                {/* Acciones — scrolleables horizontalmente en mobile */}
                <div className="flex items-center gap-1.5 md:ml-auto md:shrink-0 overflow-x-auto overflow-y-visible md:overflow-visible relative z-10 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  {/* Acciones primarias — Editar disponible incluso facturado */}
                  <Button
                    type="default"
                    size="tiny"
                    onClick={handleEdit}
                    icon={<Pencil />}
                    title="Editar servicio"
                    className="shrink-0"
                  />

                  {!isFacturado && !service.precio_listo_at && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-amber-300 dark:border-amber-700 rounded-md overflow-hidden h-8">
                        <span className="px-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30">$</span>
                        <input
                          type="number"
                          value={montoServicioDraft}
                          onChange={(e) => setMontoServicioDraft(e.target.value)}
                          onFocus={() => setEditingMonto(true)}
                          onBlur={() => setEditingMonto(false)}
                          placeholder="Precio"
                          disabled={markingPrecioListo}
                          className="w-24 h-full px-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <Button
                        type="default"
                        size="tiny"
                        disabled={markingPrecioListo || !montoServicioDraft || Number(montoServicioDraft) <= 0}
                        onClick={async () => {
                          const monto = Number(montoServicioDraft);
                          if (!monto || monto <= 0) {
                            toast.error('Ingresá un precio antes de marcar como listo');
                            return;
                          }
                          setMarkingPrecioListo(true);
                          const loadingToast = toast.loading('Marcando precio listo...');
                          try {
                            const res = await fetch(`/api/servicios/${service.id}/precio-listo`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ monto_servicio: monto }),
                            });
                            if (!res.ok) throw new Error('Error');
                            toast.dismiss(loadingToast);
                            toast.success('Precio listo. El servicio está en cola para avisar al cliente.', {
                              action: {
                                label: 'Deshacer',
                                onClick: async () => {
                                  try {
                                    await fetch(`/api/servicios/${service.id}/precio-listo`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ deshacer: true }),
                                    });
                                    toast.success('Se deshizo el marcado');
                                    onRefresh?.();
                                  } catch {
                                    toast.error('No se pudo deshacer');
                                  }
                                },
                              },
                              duration: 6000,
                            });
                            onRefresh?.();
                          } catch {
                            toast.dismiss(loadingToast);
                            toast.error('No se pudo marcar precio listo');
                          } finally {
                            setMarkingPrecioListo(false);
                          }
                        }}
                        icon={markingPrecioListo ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300"
                      >
                        {markingPrecioListo ? 'Marcando...' : 'Precio listo'}
                      </Button>
                    </div>
                  )}

                  {!isFacturado && service.precio_listo_at && (
                    <div className="flex items-center h-7 border border-amber-300 dark:border-amber-700 rounded-md overflow-hidden shrink-0">
                      <span className="flex items-center gap-1 px-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30">
                        <CheckCircle2 className="h-3 w-3" />
                        Precio listo
                      </span>
                      <button
                        type="button"
                        disabled={markingPrecioListo}
                        title="Deshacer precio listo"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Deshacer "Precio listo"',
                            description: 'Se va a quitar el marcado y el servicio vuelve a quedar pendiente de precio. ¿Confirmás?',
                            confirmText: 'Deshacer',
                            cancelText: 'Cancelar',
                            variant: 'destructive',
                          });
                          if (!ok) return;
                          setMarkingPrecioListo(true);
                          const t = toast.loading('Deshaciendo...');
                          try {
                            const res = await fetch(`/api/servicios/${service.id}/precio-listo`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ deshacer: true }),
                            });
                            if (!res.ok) throw new Error();
                            toast.dismiss(t);
                            toast.success('Precio listo deshecho');
                            onRefresh?.();
                          } catch {
                            toast.dismiss(t);
                            toast.error('No se pudo deshacer');
                          } finally {
                            setMarkingPrecioListo(false);
                          }
                        }}
                        className="px-1.5 h-full border-l border-amber-300 dark:border-amber-700 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                      >
                        {markingPrecioListo ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      </button>
                    </div>
                  )}

                  {!isFacturado && !presupuestoLinked && (
                    <Button
                      type="default"
                      size="tiny"
                      onClick={handlePresupuestar}
                      icon={<FileText />}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 shrink-0"
                    >
                      Presupuestar
                    </Button>
                  )}

                  {!isFacturado && !isSinCargo && (
                    <Button
                      type="primary"
                      size="tiny"
                      onClick={() => handleFacturar("IVR")}
                      icon={<Receipt />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shrink-0"
                    >
                      Facturar
                    </Button>
                  )}
                  {isFacturado && service.factura_link && (
                    <Button
                      type="default"
                      size="tiny"
                      onClick={async () => {
                        // Prefer the joined `factura_tipo` from the servicios
                        // endpoint — no extra fetch, no failure modes. Fall
                        // back to a fetch only if the field isn't present
                        // (older cached row).
                        let tipo = (
                          (service as { factura_tipo?: string }).factura_tipo || ''
                        ).toUpperCase();
                        if (!tipo) {
                          try {
                            const res = await fetch(`/api/facturas/${service.factura_link}`);
                            if (res.ok) {
                              const factura = await res.json();
                              tipo = (factura?.tipo_factura || '').toUpperCase();
                            }
                          } catch {
                            /* ignored — falls through to default route */
                          }
                        }
                        const dest = tipo === 'IVR' ? '/dashboard/ivr' : '/dashboard/facturas';
                        router.push(`${dest}?id=${service.factura_link}`);
                      }}
                      icon={<Receipt />}
                      className="shrink-0"
                    >
                      Ver Factura
                    </Button>
                  )}

                  {/* Separador visual */}
                  <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

                  {/* Compartir / Exportar */}
                  <ExpandableDownloadButton
                    onDownloadPDF={handleDownloadPDF}
                    onPrint={handlePrint}
                    onSendEmail={clienteEmails.length > 0 ? () => handleSendEmail(clienteEmails[0]) : undefined}
                  />
                  <ExpandableEmailButton
                    emails={clienteEmails}
                    onSendEmail={handleSendEmail}
                  />
                  <Button
                    type="default"
                    size="tiny"
                    onClick={() => setWhatsappDialogOpen(true)}
                    icon={<MessageSquare />}
                    title="Enviar por WhatsApp"
                    className="shrink-0"
                  />
                  <ShareToInternalChatButton
                    entity={{
                      type: 'servicio',
                      id: service.id,
                      label: service.clientes?.nombre || service.equipo_modelo || 'Servicio',
                      number: service.numero_ticket || service.id.slice(0, 8),
                      amount: service.precio || service.costo_total,
                      link: `/dashboard/servicios?id=${service.id}`,
                    }}
                  />

                  {/* Menú de acciones excepcionales — solo cosas que se usan poco
                      (envío a fábrica, etc.). Se mantiene fuera del action bar
                      principal para no saturar la UI. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="default"
                        size="tiny"
                        icon={<MoreVertical />}
                        title="Más acciones"
                        className="shrink-0"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Acciones excepcionales
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setEnviarFabricaOpen(true)}
                        disabled={!service.equipo_id}
                        className="gap-2 cursor-pointer"
                      >
                        <Truck className="h-4 w-4 text-purple-600" />
                        <span>Enviar a fábrica / taller</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Eliminar al final */}
                  {!isFacturado && (
                    <>
                      <div className="w-px h-5 bg-border mx-0.5 shrink-0" />
                      <div className="shrink-0">
                        <ExpandableDeleteButton
                          onDelete={handleDelete}
                          itemName="servicio"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 md:px-6 pt-3 pb-2 shrink-0 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
              <TabsList className={cn(sheetClasses.tabsList, "md:grid-cols-6 flex md:grid w-auto md:w-full")}>
                <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-1.5 shrink-0")}>
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Resumen</span>
                </TabsTrigger>
                <TabsTrigger value="tecnico" className={cn(sheetClasses.tabsTrigger, "gap-1.5 shrink-0")}>
                  <Wrench className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Detalles Técnicos</span>
                </TabsTrigger>
                <TabsTrigger value="insumos" className={cn(sheetClasses.tabsTrigger, "gap-1.5 shrink-0")}>
                  <Package className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Insumos y Costos</span>
                </TabsTrigger>
                <TabsTrigger value="garantia" className={cn(sheetClasses.tabsTrigger, "gap-1.5 shrink-0")}>
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Garantía</span>
                </TabsTrigger>
                <TabsTrigger value="actividad" className={cn(sheetClasses.tabsTrigger, "gap-1.5 shrink-0")}>
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Actividad</span>
                </TabsTrigger>
                <TabsTrigger value="historial" className={cn(sheetClasses.tabsTrigger, "gap-1.5 shrink-0")}>
                  <History className="w-4 h-4" />
                  <span className="text-sm whitespace-nowrap">Historial del Equipo</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === "resumen" && (
                <TabsContent value="resumen" className="mt-0 p-4 space-y-4">
                    <motion.div
                      key="resumen"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      {/* Edit cascade header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Cliente y equipo
                        </h3>
                        {!editingCascade ? (
                          <Button
                            type="default"
                            variant="outline"
                            size="tiny"
                            onClick={startEditCascade}
                            className="h-7 gap-1.5 text-xs"
                          >
                            <Pencil className="w-3 h-3" />
                            Cambiar
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="primary"
                              size="tiny"
                              onClick={saveCascade}
                              disabled={savingCascade || !cascadeCliente || !cascadeLab || !cascadeEquipo}
                              className="h-7 gap-1.5 text-xs"
                            >
                              {savingCascade ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Guardar
                            </Button>
                            <Button
                              type="default"
                              variant="outline"
                              size="tiny"
                              onClick={cancelEditCascade}
                              disabled={savingCascade}
                              className="h-7 gap-1.5 text-xs"
                            >
                              <XIcon className="w-3 h-3" />
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Edit mode: cascading selectors */}
                      {editingCascade && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-4 border border-purple-200 dark:border-purple-800 rounded-xl bg-purple-50/40 dark:bg-purple-950/10">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Cliente</Label>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1">
                                <SearchableCombobox
                                  preloadedOptions={clientesOptions}
                                  value={cascadeCliente}
                                  onValueChange={(v) => {
                                    setCascadeCliente(v);
                                    setCascadeLab("");
                                    setCascadeEquipo("");
                                  }}
                                  placeholder="Buscar cliente..."
                                  emptyMessage="No se encontraron clientes."
                                />
                              </div>
                              <Button
                                type="default"
                                variant="outline"
                                size="tiny"
                                className="h-9 w-9 shrink-0 p-0"
                                disabled={!cascadeCliente}
                                onClick={() => setShowClienteSheet(true)}
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Laboratorio</Label>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1">
                                {(() => {
                                  const labs = cascadeCliente ? getLaboratoriosByCliente(cascadeCliente) : [];
                                  return (
                                    <SearchableCombobox
                                      key={cascadeCliente || "no-cli"}
                                      preloadedOptions={labs}
                                      value={cascadeLab}
                                      onValueChange={(v) => {
                                        setCascadeLab(v);
                                        setCascadeEquipo("");
                                      }}
                                      placeholder={
                                        !cascadeCliente
                                          ? "Primero elegí cliente"
                                          : labs.length === 0
                                          ? "Sin laboratorios"
                                          : "Seleccionar lab"
                                      }
                                      disabled={!cascadeCliente || labs.length === 0}
                                      emptyMessage="Sin laboratorios"
                                    />
                                  );
                                })()}
                              </div>
                              <Button
                                type="default"
                                variant="outline"
                                size="tiny"
                                className="h-9 w-9 shrink-0 p-0"
                                disabled={!cascadeLab}
                                onClick={() => setShowLabSheet(true)}
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Equipo</Label>
                            <SearchableCombobox
                              key={cascadeLab || "no-lab"}
                              preloadedOptions={cascadeLab ? getEquiposUnidadesByLaboratorio(cascadeLab) : []}
                              value={cascadeEquipo}
                              onValueChange={setCascadeEquipo}
                              placeholder={cascadeLab ? "Seleccionar equipo" : "Primero elegí lab"}
                              disabled={!cascadeLab}
                              emptyMessage="Sin equipos en este lab"
                            />
                          </div>
                        </div>
                      )}

                      {/* Cliente y Equipo (read-only cards, hidden en edit mode) */}
                      {!editingCascade && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Cliente */}
                        <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all">
                          <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-800/30 pb-2">
                            <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              Cliente
                            </h3>
                            {service.cliente_id?.id && (
                              <button
                                onClick={() => {
                                  if (service.cliente_id?.id) {
                                    onOpenChange(false);
                                    setTimeout(() => {
                                      router.push(`/dashboard/empresas?id=${service.cliente_id?.id}`);
                                    }, 300);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-lg transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver Cliente
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <TableSecondaryText>Nombre</TableSecondaryText>
                              <p className="font-medium text-sm mt-0.5">
                                {service.cliente_id?.nombre || "-"}
                              </p>
                            </div>
                            {service.cliente_id?.nombre_fantasia && (
                              <div>
                                <TableSecondaryText>Nombre Fantasía</TableSecondaryText>
                                <p className="font-medium text-sm mt-0.5">
                                  {service.cliente_id.nombre_fantasia}
                                </p>
                              </div>
                            )}
                            <div>
                              <TableSecondaryText>CUIT</TableSecondaryText>
                              <TableCodeText className="block mt-0.5">
                                {service.cliente_id?.cuit || "-"}
                              </TableCodeText>
                            </div>
                            <div>
                              <TableSecondaryText>Contacto</TableSecondaryText>
                              <div className="mt-0.5 space-y-0.5">
                                {(() => {
                                  const email = service.cliente_id?.datos_contacto?.email;
                                  if (!email) return <p className="font-medium text-sm">-</p>;

                                  // Si es un array, mostrar todos
                                  if (Array.isArray(email)) {
                                    return email.map((e, i) => (
                                      <p key={i} className="font-medium text-sm break-all">{e}</p>
                                    ));
                                  }

                                  // Si es string, extraer todos los emails
                                  if (typeof email === 'string') {
                                    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
                                    const emails = email.match(emailRegex);
                                    if (emails && emails.length > 0) {
                                      return emails.map((e, i) => (
                                        <p key={i} className="font-medium text-sm break-all">{e}</p>
                                      ));
                                    }
                                  }

                                  return <p className="font-medium text-sm break-all">{email}</p>;
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Equipo */}
                        <div className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm hover:shadow-md hover:shadow-purple-500/10 transition-all">
                          <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/30 pb-2">
                            <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                              <Monitor className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              Equipo
                            </h3>
                            {service.equipo_id?.id && (
                              <button
                                onClick={() => {
                                  if (service.equipo_id?.id) {
                                    onOpenChange(false);
                                    setTimeout(() => {
                                      router.push(`/dashboard/equipos-unidades?id=${service.equipo_id?.id}`);
                                    }, 300);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-lg transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver Equipo
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div>
                              <TableSecondaryText>Marca</TableSecondaryText>
                              <p className="font-medium text-sm mt-0.5">
                                {service.equipo_id?.equipo_id?.marca || "-"}
                              </p>
                            </div>
                            <div>
                              <TableSecondaryText>Modelo</TableSecondaryText>
                              <p className="font-medium text-sm mt-0.5">
                                {service.equipo_id?.equipo_id?.modelo || "-"}
                              </p>
                            </div>
                            <div>
                              <TableSecondaryText>Tipo</TableSecondaryText>
                              <p className="font-medium text-sm mt-0.5">
                                {service.equipo_id?.equipo_id?.tipo || "-"}
                              </p>
                            </div>
                            <div>
                              <TableSecondaryText>N° Serie</TableSecondaryText>
                              <TableCodeText className="block mt-0.5">
                                {service.equipo_id?.numero_serie || "-"}
                              </TableCodeText>
                            </div>
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Info del Servicio */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <EditableFechaField
                          fecha={currentService.fecha}
                          onSave={async (newFecha) => {
                            try {
                              const response = await fetch(`/api/servicios/${service.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fecha: newFecha }),
                              });
                              if (!response.ok) throw new Error('Error al actualizar');
                              const updated = await response.json();
                              setCurrentService(updated);
                              toast.success('Fecha actualizada');
                              if (onRefresh) onRefresh();
                              router.refresh();
                            } catch (error: any) {
                              toast.error(error.message || 'Error al actualizar fecha');
                            }
                          }}
                        />
                        <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-lg bg-white dark:bg-gray-900">
                          <TableSecondaryText>Técnico</TableSecondaryText>
                          <QuickEditableCombobox
                            value={currentService.tecnico}
                            options={tecnicosList.map(t => t.valor)}
                            placeholder="No se encontró técnico"
                            searchPlaceholder="Buscar técnico..."
                            emptyLabel="Sin asignar"
                            onChange={(v) => handleFieldPatch('tecnico', v)}
                          />
                        </div>
                        <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-lg bg-white dark:bg-gray-900">
                          <TableSecondaryText>Modo de Contacto</TableSecondaryText>
                          <QuickEditableCombobox
                            value={currentService.modo_de_contacto || ''}
                            options={modosContactoList.map(m => m.valor)}
                            placeholder="No se encontró modo"
                            searchPlaceholder="Buscar modo..."
                            emptyLabel="Sin modo"
                            onChange={(v) => handleFieldPatch('modo_de_contacto', v)}
                          />
                        </div>
                        <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-lg bg-white dark:bg-gray-900">
                          <TableSecondaryText>Tipo Servicio</TableSecondaryText>
                          <QuickEditableCombobox
                            value={currentService.tipo_servicio}
                            options={tiposServicioList.map(t => t.valor)}
                            placeholder="No se encontró tipo"
                            searchPlaceholder="Buscar tipo..."
                            emptyLabel="Sin tipo"
                            onChange={(v) => handleFieldPatch('tipo_servicio', v)}
                          />
                        </div>
                        <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-lg bg-white dark:bg-gray-900">
                          <TableSecondaryText>Estado Contable</TableSecondaryText>
                          <QuickEditableCombobox
                            value={currentService.estado_contable}
                            options={estadosContablesList.map(e => e.valor)}
                            placeholder="No se encontró estado"
                            searchPlaceholder="Buscar estado..."
                            emptyLabel="Sin estado"
                            onChange={(v) => handleFieldPatch('estado_contable', v)}
                          />
                        </div>
                      </div>

                      {/* Presupuesto vinculado */}
                      {presupuestoLinked && (() => {
                        const presupuestoAprobado =
                          presupuestoLinked.estado === 'aprobado' ||
                          presupuestoLinked.estado === 'aceptado' ||
                          presupuestoLinked.estado === 'firmado' ||
                          presupuestoLinked.firmado === true;
                        return (
                        <div className={cn(
                          "p-4 border rounded-lg",
                          presupuestoLinked.estado === 'borrador' && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
                          presupuestoAprobado && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20",
                          presupuestoLinked.estado === 'rechazado' && "border-red-300 bg-red-50/50 dark:bg-red-950/20",
                          presupuestoLinked.estado === 'enviado' && "border-purple-300 bg-purple-50/50 dark:bg-purple-950/20",
                          presupuestoLinked.estado === 'convertido' && "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20",
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/presupuestos?id=${presupuestoLinked.id}`)}
                              className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                              title="Ver presupuesto"
                            >
                              <FileText className="h-4 w-4 text-purple-600" />
                              <span className="font-semibold text-sm group-hover:underline">
                                Presupuesto {presupuestoLinked.numero}
                              </span>
                              <Badge variant="outline" className="capitalize text-xs">
                                {presupuestoLinked.estado}
                              </Badge>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <span className="text-sm font-bold">
                              {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(presupuestoLinked.total || 0)}
                            </span>
                          </div>

                          {presupuestoLinked.estado === 'borrador' && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                En borrador — todavía no fue enviado al cliente.
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<Send />}
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/presupuestos?id=${presupuestoLinked.id}&action=enviar`
                                    )
                                  }
                                  className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                                >
                                  Enviar al cliente
                                </Button>
                                <Button
                                  type="default"
                                  size="small"
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/presupuestos?id=${presupuestoLinked.id}`
                                    )
                                  }
                                >
                                  Ver / Editar
                                </Button>
                              </div>
                            </div>
                          )}

                          {presupuestoLinked.estado === 'enviado' && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              <Button
                                type="primary"
                                size="small"
                                onClick={handleAceptarPresupuesto}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                              >
                                Aceptar
                              </Button>
                              <Button
                                type="default"
                                size="small"
                                onClick={handleRechazarPresupuesto}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                              >
                                Rechazar
                              </Button>
                              <Button
                                type="default"
                                size="small"
                                icon={<Send />}
                                onClick={() =>
                                  router.push(
                                    `/dashboard/presupuestos?id=${presupuestoLinked.id}&action=enviar`
                                  )
                                }
                              >
                                Reenviar
                              </Button>
                            </div>
                          )}

                          {presupuestoAprobado && !presupuestoLinked.convertido_a_ivr && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                type="primary"
                                size="small"
                                onClick={handleConvertirPresupuestoAIvr}
                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                              >
                                Convertir a IVR
                              </Button>
                              <Button
                                type="default"
                                size="small"
                                onClick={() => handleFacturar("A")}
                              >
                                Convertir a Factura
                              </Button>
                            </div>
                          )}

                          {presupuestoLinked.estado === 'convertido' && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Ya fue convertido a IVR/Factura.
                            </p>
                          )}
                        </div>
                        );
                      })()}
                    </motion.div>
                </TabsContent>
                )}

                {/* Tab: Detalles Técnicos */}
                {activeTab === "tecnico" && (
                <TabsContent value="tecnico" className="mt-0 p-4 space-y-4">
                    <motion.div
                      key="tecnico"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      <div className="space-y-2.5">
                        <EditableTextareaField
                          label="Falla Declarada"
                          value={currentService.falla_declarada || null}
                          placeholder="Sin información"
                          onSave={(v) => saveCampoTecnico("falla_declarada", v)}
                        />

                        <EditableTextareaField
                          label="Diagnóstico"
                          value={currentService.diagnostico || null}
                          placeholder="Sin diagnóstico"
                          onSave={(v) => saveCampoTecnico("diagnostico", v)}
                        />

                        <EditableTextareaField
                          label="Accesorios Entrantes"
                          value={currentService.accesorios_entrantes || null}
                          placeholder="Sin accesorios"
                          onSave={(v) => saveCampoTecnico("accesorios_entrantes", v)}
                        />

                        <EditableTextareaField
                          label="Detalle Privado"
                          value={currentService.detalle_privado || null}
                          placeholder="Sin detalle privado"
                          onSave={(v) => saveCampoTecnico("detalle_privado", v)}
                        />

                        {service.garantia && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-600">Garantía Activa</Badge>
                              {service.tipo_garantia && (
                                <span className="text-sm text-muted-foreground">
                                  Tipo: {service.tipo_garantia}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                </TabsContent>
                )}

                {/* Tab: Insumos y Costos */}
                {activeTab === "insumos" && (
                <TabsContent value="insumos" className="mt-0 p-4 space-y-4">
                    <motion.div
                      key="insumos"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      {/* Header con buscador */}
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Package className="h-4 w-4 text-purple-600" />
                          Insumos Utilizados
                          {insumos.length > 0 && (
                            <Badge variant="secondary" className="ml-1">
                              {insumos.length}
                            </Badge>
                          )}
                        </h3>
                        {insumosModified && (
                          <Button
                            type="primary"
                            size="tiny"
                            onClick={handleSaveInsumos}
                            disabled={savingInsumos}
                            icon={savingInsumos ? <Loader2 className="animate-spin" /> : <Save />}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Guardar Cambios
                          </Button>
                        )}
                      </div>

                      <InsumoSearchPanel
                        insumos={insumos as any}
                        onChange={(next) => {
                          setInsumos(next as any);
                          setInsumosModified(true);
                        }}
                        resultsHeight={220}
                        listHeight={260}
                      />

                      <Separator />

                      {/* Precio del servicio */}
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Precio del Servicio</span>
                          <span className="font-mono font-bold text-2xl text-purple-600 dark:text-purple-400">
                            ${service.precio?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-2">
                          * Los costos de insumos se determinan al momento de facturar
                        </p>
                      </div>
                    </motion.div>
                </TabsContent>
                )}

                {/* Tab: Garantía */}
                {activeTab === "garantia" && (
                <TabsContent value="garantia" className="mt-0 p-4">
                  <motion.div
                    key="garantia"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GarantiaTabPanel servicioId={service.id} />
                  </motion.div>
                </TabsContent>
                )}

                {/* Tab: Actividad */}
                {activeTab === "actividad" && (
                <TabsContent value="actividad" className="mt-0 p-0 h-full">
                  <div className="h-[calc(100vh-220px)]">
                    <ServicioChatter servicioId={service.id} onCollapse={() => setActiveTab('resumen')} />
                  </div>
                </TabsContent>
                )}

                {/* Tab: Historial */}
                {activeTab === "historial" && (
                <TabsContent value="historial" className="mt-0 p-4 space-y-4">
                    <motion.div
                      key="historial"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      {/* Header del equipo */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20 dark:to-transparent rounded-xl border border-purple-200/50 dark:border-purple-800/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                            <Monitor className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                              {service.equipo_id?.equipo_id?.marca} {service.equipo_id?.equipo_id?.modelo}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {service.equipo_id?.equipo_id?.tipo}
                            </p>
                          </div>
                        </div>
                        {service.equipo_id?.numero_serie && (
                          <Badge variant="outline" className="font-mono text-xs">
                            S/N: {service.equipo_id.numero_serie}
                          </Badge>
                        )}
                      </div>

                      {!service?.equipo_id?.id ? (
                        <div className="text-center p-8 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
                          <h3 className="font-semibold mb-1 text-amber-900 dark:text-amber-200">Equipo no asignado</h3>
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            Edita el servicio para asociarlo con un equipo
                          </p>
                        </div>
                      ) : loadingHistorial ? (
                        <div className="flex items-center justify-center p-12">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                      ) : historial.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                          <History className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <h3 className="font-semibold mb-1">Primer servicio</h3>
                          <p className="text-sm text-muted-foreground">
                            Este es el primer servicio registrado para este equipo
                          </p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px] pr-2">
                          {/* Timeline */}
                          <div className="relative pl-6">
                            {/* Línea vertical */}
                            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-400 via-purple-300 to-gray-200 dark:from-purple-600 dark:via-purple-700 dark:to-gray-800" />

                            <LayoutGroup>
                            <div className="space-y-4">
                              {historial.map((servicio, idx) => {
                                const isCurrentService = servicio.id === activeHistorialId;
                                const estadoColor = servicio.estado?.toLowerCase().includes('complet') || servicio.estado?.toLowerCase().includes('entreg')
                                  ? 'emerald'
                                  : servicio.estado?.toLowerCase().includes('proceso') || servicio.estado?.toLowerCase().includes('reparar')
                                  ? 'blue'
                                  : 'gray';

                                return (
                                  <motion.div
                                    key={servicio.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.08 }}
                                    className="relative"
                                  >
                                    {/* Punto en la timeline */}
                                    <div className="absolute -left-6 top-3 w-[18px] h-[18px] z-10">
                                      {/* Dot inner — fastest */}
                                      {isCurrentService && (
                                        <motion.div
                                          layoutId="historial-active-dot"
                                          className="absolute inset-0 rounded-full bg-purple-500 border-2 border-purple-300 dark:border-purple-700"
                                          transition={{ type: "spring", stiffness: 600, damping: 28 }}
                                        >
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                          </div>
                                        </motion.div>
                                      )}
                                      {/* Dot ring — trails behind */}
                                      {isCurrentService && (
                                        <motion.div
                                          layoutId="historial-active-dot-ring"
                                          className="absolute -inset-[5px] rounded-full ring-4 ring-purple-100 dark:ring-purple-900/50"
                                          transition={{ type: "spring", stiffness: 320, damping: 24 }}
                                        />
                                      )}
                                      <div className={cn(
                                        "w-full h-full rounded-full border-2 flex items-center justify-center transition-colors duration-300",
                                        isCurrentService
                                          ? "border-transparent"
                                          : estadoColor === 'emerald'
                                          ? "bg-emerald-500 border-emerald-300 dark:border-emerald-700"
                                          : estadoColor === 'blue'
                                          ? "bg-blue-500 border-blue-300 dark:border-blue-700"
                                          : "bg-gray-400 border-gray-300 dark:border-gray-600"
                                      )} />
                                    </div>

                                    {/* Card del servicio */}
                                    <motion.div
                                      layout
                                      className={cn(
                                        "ml-4 p-4 rounded-xl border relative",
                                        isCurrentService
                                          ? "border-purple-300 dark:border-purple-700 shadow-lg shadow-purple-200/40 dark:shadow-purple-900/30"
                                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 cursor-pointer",
                                        switchingService && !isCurrentService && "pointer-events-none"
                                      )}
                                      animate={{
                                        scale: isCurrentService ? 1 : switchingService ? 0.98 : 1,
                                        opacity: switchingService && !isCurrentService ? 0.5 : 1,
                                      }}
                                      whileHover={!isCurrentService && !switchingService ? { scale: 1.01, borderColor: "rgb(216 180 254)" } : {}}
                                      whileTap={!isCurrentService && !switchingService ? { scale: 0.98 } : {}}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      onClick={async () => {
                                        if (!isCurrentService && !switchingService) {
                                          if (onServiceChange) {
                                            // Update highlight position immediately (triggers layout animation)
                                            setActiveHistorialId(servicio.id);
                                            setSwitchingService(true);
                                            try {
                                              const res = await fetch(`/api/servicios/${servicio.id}`);
                                              const data = await res.json();
                                              if (data && !data.error) {
                                                onServiceChange(data);
                                                router.replace(`/dashboard/servicios?id=${servicio.id}`, { scroll: false });
                                              }
                                            } catch (err) {
                                              console.error('Error fetching servicio:', err);
                                              // Revert highlight on error
                                              setActiveHistorialId(service.id);
                                            } finally {
                                              setSwitchingService(false);
                                            }
                                          } else {
                                            onOpenChange(false);
                                            setTimeout(() => {
                                              router.push(`/dashboard/servicios?id=${servicio.id}`);
                                            }, 300);
                                          }
                                        }
                                      }}
                                    >
                                      {/* Animated highlight — 3 layers with staggered springs for elastic feel */}
                                      {/* Layer 1: Core (fastest — arrives first) */}
                                      {isCurrentService && (
                                        <motion.div
                                          layoutId="historial-active-core"
                                          className="absolute inset-x-4 inset-y-2 bg-purple-100/70 dark:bg-purple-900/30 rounded-lg"
                                          transition={{ type: "spring", stiffness: 600, damping: 28 }}
                                        />
                                      )}
                                      {/* Layer 2: Fill (medium — stretches to catch up) */}
                                      {isCurrentService && (
                                        <motion.div
                                          layoutId="historial-active-highlight"
                                          className="absolute inset-0 bg-gradient-to-br from-purple-50 via-purple-100/60 to-fuchsia-50/40 dark:from-purple-950/50 dark:via-purple-900/30 dark:to-fuchsia-950/20 rounded-xl"
                                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                      )}
                                      {/* Layer 3: Border glow (slowest — trails behind) */}
                                      {isCurrentService && (
                                        <motion.div
                                          layoutId="historial-active-border"
                                          className="absolute -inset-[1px] rounded-xl ring-1 ring-purple-400/50 dark:ring-purple-500/30 shadow-lg shadow-purple-300/20 dark:shadow-purple-800/20"
                                          transition={{ type: "spring", stiffness: 280, damping: 26 }}
                                        />
                                      )}
                                      <div className="relative z-10">
                                      {/* Header */}
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={cn(
                                            "text-lg font-bold transition-colors duration-300",
                                            isCurrentService && "text-purple-900 dark:text-purple-100"
                                          )}>
                                            {new Date(servicio.fecha).toLocaleDateString('es-AR', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: '2-digit'
                                            })}
                                          </span>
                                          {isCurrentService && (
                                            <motion.div
                                              layoutId="historial-actual-badge"
                                              transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                            >
                                              <Badge className="bg-purple-600 text-white text-xs shadow-sm shadow-purple-400/30">
                                                Actual
                                              </Badge>
                                            </motion.div>
                                          )}
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-xs shrink-0",
                                            estadoColor === 'emerald' && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                                            estadoColor === 'blue' && "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                          )}
                                        >
                                          {servicio.estado}
                                        </Badge>
                                      </div>

                                      {/* Info principal */}
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-4 text-sm">
                                          <div className="flex items-center gap-1.5">
                                            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-medium">{servicio.tipo_servicio || 'Sin tipo'}</span>
                                          </div>
                                          {servicio.tecnico && (
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                              <User className="h-3.5 w-3.5" />
                                              <span>{servicio.tecnico}</span>
                                            </div>
                                          )}
                                        </div>

                                        {servicio.falla_declarada && (
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            <span className="font-medium text-foreground">Falla:</span> {servicio.falla_declarada}
                                          </p>
                                        )}

                                        {servicio.diagnostico && (
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            <span className="font-medium text-foreground">Diagnóstico:</span> {servicio.diagnostico}
                                          </p>
                                        )}
                                      </div>

                                      {/* Footer */}
                                      <div className={cn(
                                        "flex items-center justify-between mt-3 pt-3 border-t transition-colors duration-300",
                                        isCurrentService
                                          ? "border-purple-200/60 dark:border-purple-800/40"
                                          : "border-gray-100 dark:border-gray-800"
                                      )}>
                                        <div className="flex items-center gap-3">
                                          {servicio.insumos_y_costos && Array.isArray(servicio.insumos_y_costos) && servicio.insumos_y_costos.length > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Package className="h-3 w-3" />
                                              <span>{servicio.insumos_y_costos.length} insumos</span>
                                            </div>
                                          )}
                                          {servicio.garantia && (
                                            <Badge variant="outline" className="text-xs border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                              Garantía
                                            </Badge>
                                          )}
                                          {servicio.facturado && (
                                            <Badge variant="outline" className="text-xs">
                                              <Receipt className="h-3 w-3 mr-1" />
                                              Facturado
                                            </Badge>
                                          )}
                                        </div>
                                        <span className={cn(
                                          "font-mono font-bold",
                                          isCurrentService ? "text-purple-600 dark:text-purple-400" : "text-foreground"
                                        )}>
                                          ${(Number(servicio.precio ?? (servicio as any).monto_servicio) || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                    </motion.div>
                                  </motion.div>
                                );
                              })}
                            </div>
                            </LayoutGroup>
                          </div>
                        </ScrollArea>
                      )}

                      {/* Resumen */}
                      {historial.length > 1 && (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-purple-600">{historial.length}</p>
                            <p className="text-xs text-muted-foreground">Servicios totales</p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-emerald-600">
                              ${historial.reduce((sum, s) => sum + (Number(s.precio ?? (s as any).monto_servicio) || 0), 0).toFixed(0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total histórico</p>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">
                              {historial.filter(s => s.insumos_y_costos && Array.isArray(s.insumos_y_costos) && s.insumos_y_costos.length > 0).reduce((sum, s) =>
                                sum + (Array.isArray(s.insumos_y_costos) ? s.insumos_y_costos.reduce((acc: number, ins: InsumoItem) => acc + (ins.cantidad || 0), 0) : 0), 0
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">Insumos usados</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                </TabsContent>
                )}
              </AnimatePresence>
            </div>
          </Tabs>

        </div>
      </SheetContent>

      <WhatsAppShareDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        defaultPhone={service.cliente_id?.datos_contacto?.telefono || ""}
        defaultMessage={`Hola ${service.cliente_id?.nombre || ''}! Su equipo ${service.equipo_id?.equipo_id?.marca || ''} ${service.equipo_id?.equipo_id?.modelo || ''} está ${service.estado?.toLowerCase() === 'listo/reparado' || service.estado?.toLowerCase() === 'entregar/enviar' ? 'listo para retirar' : 'en ' + service.estado?.toLowerCase()}.\n\n${service.precio ? `Precio: $${service.precio.toFixed(2)}` : ''}\n\nGracias!`}
        documentType="servicio"
      />

      <FacturarServicioDialogMejorado
        open={facturarDialogOpen}
        onOpenChange={setFacturarDialogOpen}
        servicio={service}
        onSuccess={handleFacturacionSuccess}
        presupuestoId={presupuestoLinked?.id || null}
        initialTipoFactura={facturarTipoInicial}
      />

      <PresupuestarServicioDialog
        open={presupuestarDialogOpen}
        onOpenChange={setPresupuestarDialogOpen}
        servicio={service}
        onSuccess={() => {
          setPresupuestarDialogOpen(false);
          mutatePresupuesto();
          onRefresh?.();
        }}
      />

      <ServicioTecnicoFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        servicio={service as any}
        onSuccess={handleEditSuccess}
      />

      <EnviarAFabricaDialog
        open={enviarFabricaOpen}
        onOpenChange={setEnviarFabricaOpen}
        servicioId={service.id}
        equipoUnidadId={
          typeof service.equipo_id === "object"
            ? (service.equipo_id as any)?.id
            : (service.equipo_id as any)
        }
        equipoLabel={
          typeof service.equipo_id === "object"
            ? `${(service.equipo_id as any)?.equipo?.marca || ""} ${(service.equipo_id as any)?.equipo?.modelo || ""}`.trim() ||
              (service.equipo_id as any)?.numero_serie ||
              undefined
            : undefined
        }
        onSuccess={() => {
          if (onRefresh) onRefresh();
          router.refresh();
        }}
      />

      <LaboratorioSheet
        open={showLabSheet}
        onOpenChange={setShowLabSheet}
        laboratorioId={cascadeLab || null}
        clienteId={cascadeCliente || null}
        onChange={async () => {
          await refreshPreload();
        }}
      />

      <ClienteDetailSheet
        cliente={clientes.find((c) => c.id === cascadeCliente) || null}
        open={showClienteSheet}
        onOpenChange={(open) => {
          setShowClienteSheet(open);
          if (!open) refreshPreload();
        }}
      />
      <ConfirmDialog />
    </Sheet>
  );
}
