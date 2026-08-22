'use client';

import { useState, useEffect, useId, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR, { mutate as swrMutate } from 'swr';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { openInternalLink } from '@/lib/open-link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OportunidadVenta, OportunidadActividad, Presupuesto, PresupuestoEquipo } from '@/lib/types';
import { PresupuestoEquipoDetailSheet } from '@/components/core-ui/PresupuestoEquipoDetailSheet';
import { PresupuestoDetailSheet } from '@/components/core-ui/PresupuestoDetailSheet';
import { ClienteDetailSheet } from '@/components/core-ui/ClienteDetailSheet';
import { EditarActividadDialog, CompletarActividadDialog } from '@/components/core-ui/ActividadDialogs';
import { CRM_ACTIVIDAD_TIPOS, PRIORIDAD_CONFIG, buildTipoConfig, type TipoActividadCustom } from '@/lib/crm-actividades-config';
import type { CrmActividad, CrmActividadTipo } from '@/lib/types';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { sheetClasses } from '@/lib/design-system';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { asArray } from "@/lib/crm-listas";
import { parseContactList } from "@/lib/contact-fields";
import { useCrmFuentes } from "@/lib/hooks/use-crm-fuentes";
import Link from "next/link";
import {
  Target,
  Building,
  Phone,
  Mail,
  DollarSign,
  Clock,
  Edit,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquare,
  PhoneCall,
  FileText,
  Send,
  Plus,
  Loader2,
  ChevronRight,
  ArrowRight,
  Trophy,
  Ban,
  User,
  Users,
  ExternalLink,
  Eye,
  UserPlus,
  Building2,
  Box,
  ShoppingCart,
  Lock,
  Unlock,
  Truck,
  Search,
  Package,
  X,
  Tag,
  Check,
  Video,
  Copy,
  Wrench,
  GraduationCap,
  CalendarDays,
  CheckSquare,
  Settings,
  Paperclip,
  Calendar as CalendarIcon,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PresupuestoFormDialog } from './PresupuestoFormDialog';
import { PresupuestoEquipoFormDialog } from './PresupuestoEquipoFormDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GanadoGateDialog } from './GanadoGateDialog';
import { CrearPedidoDialog } from './CrearPedidoDialog';
import { OportunidadChatter } from './OportunidadChatter';
import { GenerarInstalacionButton } from './instalaciones/GenerarInstalacionButton';

interface OportunidadHubSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidad: OportunidadVenta | null;
  onEdit?: (oportunidad: OportunidadVenta) => void;
  onRefresh: () => void;
}

const MOTIVOS_PERDIDA = [
  { value: 'precio', label: 'Precio muy alto' },
  { value: 'competencia', label: 'Eligió a la competencia' },
  { value: 'presupuesto', label: 'Sin presupuesto' },
  { value: 'timing', label: 'Mal momento / No es prioridad' },
  { value: 'no_responde', label: 'No responde / Sin contacto' },
  { value: 'cambio_decision', label: 'Cambió de decisión' },
  { value: 'producto_no_aplica', label: 'Producto no aplica a necesidad' },
  { value: 'especificaciones', label: 'No cumple especificaciones técnicas' },
  { value: 'tiempo_entrega', label: 'Tiempo de entrega muy largo' },
  { value: 'financiamiento', label: 'Problemas de financiamiento' },
  { value: 'otro', label: 'Otro motivo' },
];

const ETAPAS = [
  { id: 'nuevo', nombre: 'Nuevo', icon: Sparkles, color: 'slate' },
  { id: 'propuesta', nombre: 'Propuesta', icon: DollarSign, color: 'purple' },
  { id: 'ganado', nombre: 'Ganado', icon: Trophy, color: 'yellow' },
  { id: 'logistica', nombre: 'Logística', icon: Phone, color: 'blue' },
  { id: 'finalizado', nombre: 'Finalizado', icon: CheckCircle2, color: 'emerald' },
  { id: 'interesados a futuro', nombre: 'Interesados a futuro', icon: Sparkles, color: 'cyan' },
];

const ETAPA_COLORS: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  nuevo: { bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600', text: 'text-slate-700 dark:text-slate-200', ring: 'ring-slate-400' },
  propuesta: { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-300 dark:border-purple-600', text: 'text-purple-700 dark:text-purple-200', ring: 'ring-purple-400' },
  ganado: { bg: 'bg-yellow-100 dark:bg-yellow-900', border: 'border-yellow-300 dark:border-yellow-600', text: 'text-yellow-700 dark:text-yellow-200', ring: 'ring-yellow-400' },
  logistica: { bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-300 dark:border-blue-600', text: 'text-blue-700 dark:text-blue-200', ring: 'ring-blue-400' },
  finalizado: { bg: 'bg-emerald-100 dark:bg-emerald-900', border: 'border-emerald-300 dark:border-emerald-600', text: 'text-emerald-700 dark:text-emerald-200', ring: 'ring-emerald-400' },
  'interesados a futuro': { bg: 'bg-cyan-100 dark:bg-cyan-900', border: 'border-cyan-300 dark:border-cyan-600', text: 'text-cyan-700 dark:text-cyan-200', ring: 'ring-cyan-400' },
};

const ACTIVIDAD_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  nota: { icon: MessageSquare, color: 'text-gray-500', label: 'Nota' },
  llamada: { icon: PhoneCall, color: 'text-blue-500', label: 'Llamada' },
  email: { icon: Send, color: 'text-purple-500', label: 'Email' },
  reunion: { icon: User, color: 'text-amber-500', label: 'Reunión' },
  tarea: { icon: CheckCircle2, color: 'text-cyan-500', label: 'Tarea' },
  etapa_cambio: { icon: ArrowRight, color: 'text-green-500', label: 'Cambio de etapa' },
  presupuesto_creado: { icon: FileText, color: 'text-indigo-500', label: 'Presupuesto creado' },
  presupuesto_enviado: { icon: Send, color: 'text-pink-500', label: 'Presupuesto enviado' },
  ganada: { icon: Trophy, color: 'text-emerald-500', label: 'Ganada' },
  perdida: { icon: Ban, color: 'text-red-500', label: 'Perdida' },
  archivo: { icon: Paperclip, color: 'text-orange-500', label: 'Archivo' },
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar datos');
  return res.json();
};

// Fila de contacto (teléfono/email) que se copia al portapapeles al hacer click
function ContactoCopiable({ tipo, valor }: { tipo: 'telefono' | 'email'; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  const Icono = tipo === 'telefono' ? Phone : Mail;
  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      toast.success(tipo === 'telefono' ? 'Teléfono copiado' : 'Email copiado');
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopiar}
      title="Click para copiar"
      className="group/copy flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-700 dark:hover:text-green-300 transition-colors cursor-pointer text-left"
    >
      <Icono className="h-3 w-3 shrink-0" />
      <span className="break-all">{valor}</span>
      {copiado ? (
        <Check className="h-3 w-3 text-green-600 shrink-0" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover/copy:opacity-100 transition-opacity shrink-0" />
      )}
    </button>
  );
}

// Formateadores de fecha SEGUROS: una fecha nula/inválida devuelve el fallback
// en vez de tirar "RangeError: Invalid time value" (que rompía toda la ficha).
const fmtFecha = (value: string | null | undefined, pattern: string, fallback = '—'): string => {
  if (!value) return fallback;
  const d = parseISO(value);
  return isValid(d) ? format(d, pattern, { locale: es }) : fallback;
};
const fmtRel = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = parseISO(value);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: es }) : '';
};

export function OportunidadHubSheet({
  open,
  onOpenChange,
  oportunidad: oportunidadProp,
  onEdit,
  onRefresh,
}: OportunidadHubSheetProps) {
  const tabsId = useId();
  const { confirm, ConfirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState('resumen');
  const [changingEtapa, setChangingEtapa] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Estado local para la oportunidad (para actualizar el stepper inmediatamente)
  const [localOportunidad, setLocalOportunidad] = useState<OportunidadVenta | null>(null);

  // Usar la oportunidad local si existe, sino la prop
  const oportunidad = localOportunidad || oportunidadProp;

  // Panel activo para acciones inline (solo uno a la vez)
  const [activeInlinePanel, setActiveInlinePanel] = useState<'email' | 'llamada' | 'nota' | null>(null);
  const [selectedActTipo, setSelectedActTipo] = useState<CrmActividadTipo | string | null>(null);
  // Ver ficha del cliente desde la oportunidad (igual que el detail de equipos)
  const [clienteDetailOpen, setClienteDetailOpen] = useState(false);
  const [actForm, setActForm] = useState({
    fecha_limite: new Date().toISOString().split('T')[0],
    hora: '',
    prioridad: 'normal' as const,
    asignado_id: '',
    nota: '',
  });
  const [completandoId, setCompletandoId] = useState<string | null>(null);
  // Editar / completar actividad (dialogs)
  const [editAct, setEditAct] = useState<CrmActividad | null>(null);
  const [editActOpen, setEditActOpen] = useState(false);
  const [completeAct, setCompleteAct] = useState<CrmActividad | null>(null);
  const [completeActOpen, setCompleteActOpen] = useState(false);
  // Panel inline para agregar contacto rápido
  const [showContactoInline, setShowContactoInline] = useState(false);
  const [contactoInlineForm, setContactoInlineForm] = useState({ nombre: '', telefono: '', email: '' });
  // Dialogs que sí necesitan modal
  const [showPerdidaDialog, setShowPerdidaDialog] = useState(false);
  const [showEliminarDialog, setShowEliminarDialog] = useState(false);
  const [showGanadoGate, setShowGanadoGate] = useState(false);
  // Etapa que disparó el gate de "asociar cliente" (ganado o logística).
  const [gateEtapa, setGateEtapa] = useState<string>('ganado');
  const [showCrearPedido, setShowCrearPedido] = useState(false);
  const [showPresupuestoDialog, setShowPresupuestoDialog] = useState(false);
  const [showPresupuestoEquipoDialog, setShowPresupuestoEquipoDialog] = useState(false);
  const [personaIdForPresupuesto, setPersonaIdForPresupuesto] = useState<string | null>(null);

  // Al abrir presupuesto de equipos: si no hay cliente ni persona_id pero hay
  // contacto_nombre, crea la persona a partir del contacto de la oportunidad.
  const abrirPresupuestoEquipo = async () => {
    if (!oportunidad) return;
    const clienteId = oportunidad.cliente_id;
    let personaId = (oportunidad as any).persona_id as string | null | undefined;

    if (!clienteId && !personaId && oportunidad.contacto_nombre) {
      try {
        const res = await fetch(`/api/oportunidades/${oportunidad.id}/ensure-persona`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          personaId = data.persona_id;
        } else {
          toast.error('No se pudo asociar el contacto a la oportunidad');
        }
      } catch {
        toast.error('Error al preparar el contacto');
      }
    }

    setPersonaIdForPresupuesto(personaId || null);
    setShowPresupuestoEquipoDialog(true);
  };
  const [showEnviarPresupuestoDialog, setShowEnviarPresupuestoDialog] = useState(false);
  const [presupuestoToSend, setPresupuestoToSend] = useState<Presupuesto | null>(null);

  // Ver presupuesto inline (sheet apilado, sin salir del CRM)
  const [viewingPresupuestoEquipo, setViewingPresupuestoEquipo] = useState<PresupuestoEquipo | null>(null);
  const [viewPresupuestoSheetOpen, setViewPresupuestoSheetOpen] = useState(false);
  const [editingPresupuestoEquipo, setEditingPresupuestoEquipo] = useState<PresupuestoEquipo | null>(null);
  const [editPresupuestoEquipoOpen, setEditPresupuestoEquipoOpen] = useState(false);
  // Presupuesto general: ver/editar inline (igual que los de equipos, sin salir del CRM)
  const [viewingPresupuestoGeneral, setViewingPresupuestoGeneral] = useState<Presupuesto | null>(null);
  const [viewPresupuestoGeneralOpen, setViewPresupuestoGeneralOpen] = useState(false);
  const [editingPresupuestoGeneral, setEditingPresupuestoGeneral] = useState<Presupuesto | null>(null);
  const [editPresupuestoGeneralOpen, setEditPresupuestoGeneralOpen] = useState(false);

  const handleViewPresupuestoInline = async (pres: { id: string; _source?: 'general' | 'equipos' }) => {
    // Presupuesto general: abrir el detail sheet inline (antes redirigía).
    if (pres._source === 'general') {
      try {
        const res = await fetch(`/api/presupuestos?id=${pres.id}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'No se pudo cargar el presupuesto');
        setViewingPresupuestoGeneral(data as Presupuesto);
        setViewPresupuestoGeneralOpen(true);
      } catch (e: any) {
        toast.error(e.message || 'Error al cargar presupuesto');
      }
      return;
    }
    try {
      const res = await fetch(`/api/presupuestos-equipos?id=${pres.id}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo cargar el presupuesto');
      setViewingPresupuestoEquipo(data as PresupuestoEquipo);
      setViewPresupuestoSheetOpen(true);
    } catch (e: any) {
      toast.error(e.message || 'Error al cargar presupuesto');
    }
  };

  // Estados para forms
  const [emailForm, setEmailForm] = useState({ para: '', asunto: '', mensaje: '' });
  const [notaForm, setNotaForm] = useState('');
  const [llamadaForm, setLlamadaForm] = useState('');
  const [perdidaForm, setPerdidaForm] = useState({ motivo: '', descripcion: '', competidor: '' });
  const [enviarEmailDestino, setEnviarEmailDestino] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [seguimientoPopoverOpen, setSeguimientoPopoverOpen] = useState(false);

  // Chatter panel
  const [chatterOpen, setChatterOpen] = useState(true);

  // Estados para tab Items (equipos + productos)
  const [showBuscadorEquipos, setShowBuscadorEquipos] = useState(false);
  const [searchEquipo, setSearchEquipo] = useState('');
  const [equiposDisponibles, setEquiposDisponibles] = useState<any[]>([]);
  const [equiposCatalogo, setEquiposCatalogo] = useState<any[]>([]);
  const [buscandoEquipos, setBuscandoEquipos] = useState(false);
  const [showBuscadorProductos, setShowBuscadorProductos] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');
  const [productosResultados, setProductosResultados] = useState<any[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemField, setEditingItemField] = useState<string | null>(null);
  const [editingItemValue, setEditingItemValue] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar oportunidad local con prop cuando cambia
  useEffect(() => {
    if (oportunidadProp) {
      setLocalOportunidad(oportunidadProp);
    }
  }, [oportunidadProp?.id, oportunidadProp?.etapa, oportunidadProp?.cliente_id, oportunidadProp?.updated_at]);

  // Reset forms cuando se abre con nueva oportunidad
  useEffect(() => {
    if (open && oportunidad) {
      setEmailForm({
        para: oportunidad.contacto_email || '',
        asunto: `Seguimiento: ${oportunidad.nombre}`,
        mensaje: '',
      });
      setNotaForm('');
      setLlamadaForm('');
      setPerdidaForm({ motivo: '', descripcion: '', competidor: '' });
      setActiveInlinePanel(null);
      setShowContactoInline(false);
      setContactoInlineForm({ nombre: '', telefono: '', email: '' });
    }
  }, [open, oportunidad?.id]);

  // Fetch actividades
  const { data: actividades, mutate: mutateActividades } = useSWR<OportunidadActividad[]>(
    open && oportunidad ? `/api/oportunidades-actividades?oportunidad_id=${oportunidad.id}` : null,
    fetcher
  );

  // Fetch actividades programadas (pending)
  const { data: actividadesProgramadas, mutate: mutateActProgramadas } = useSWR<CrmActividad[]>(
    open && oportunidad ? `/api/crm/actividades-programadas?oportunidad_id=${oportunidad.id}&estado=pendiente,completada` : null,
    fetcher
  );

  // Fetch presupuestos de la oportunidad
  const { data: presupuestosGenerales, mutate: mutatePresupuestosGenerales } = useSWR<Presupuesto[]>(
    open && oportunidad ? `/api/presupuestos?oportunidad_id=${oportunidad.id}` : null,
    fetcher
  );
  const { data: presupuestosEquipos, mutate: mutatePresupuestosEquipos } = useSWR<any[]>(
    open && oportunidad ? `/api/presupuestos-equipos?oportunidad_id=${oportunidad.id}` : null,
    fetcher
  );

  // Merge y ordena por fecha_emision desc. Marca la fuente para render.
  const presupuestos = useMemo(() => {
    const generales = (presupuestosGenerales || []).map((p) => ({ ...p, _source: 'general' as const }));
    const equipos = (presupuestosEquipos || []).map((p) => ({ ...p, _source: 'equipos' as const }));
    return [...generales, ...equipos].sort((a, b) => {
      const da = a.fecha_emision ? new Date(a.fecha_emision).getTime() : 0;
      const db = b.fecha_emision ? new Date(b.fecha_emision).getTime() : 0;
      return db - da;
    });
  }, [presupuestosGenerales, presupuestosEquipos]);

  const mutatePresupuestos = useCallback(() => {
    mutatePresupuestosGenerales();
    mutatePresupuestosEquipos();
  }, [mutatePresupuestosGenerales, mutatePresupuestosEquipos]);

  // Fetch todos los items de la oportunidad (equipos + productos unificados)
  const { data: oportunidadItems, mutate: mutateItems } = useSWR<any[]>(
    open && oportunidad ? `/api/oportunidades-items?oportunidad_id=${oportunidad.id}` : null,
    fetcher
  );

  // Fetch pedido vinculado (si existe)
  const { data: pedidosVinculados } = useSWR<any[]>(
    open && oportunidad?.pedido_id ? `/api/pedidos-ventas?pedido_id=${oportunidad.pedido_id}` : null,
    fetcher
  );
  const pedidoVinculado = pedidosVinculados?.[0] || null;

  // Fetch equipos reservados para esta oportunidad
  const { data: equiposReservados, mutate: mutateEquipos } = useSWR<any[]>(
    open && oportunidad ? `/api/oportunidades-equipos?tipo=reservados&oportunidad_id=${oportunidad.id}` : null,
    fetcher
  );

  // Fetch pedidos de compra de equipos
  const { data: pedidosEquipos, mutate: mutatePedidos } = useSWR<any[]>(
    open && oportunidad ? `/api/oportunidades-equipos?tipo=pedidos&oportunidad_id=${oportunidad.id}` : null,
    fetcher
  );

  // Fetch equipo (vendedores) para asignación de seguimiento
  const { data: teamMembers } = useSWR<Array<{ id: string; nombre: string; email: string }>>(
    open ? '/api/equipo?vendedores=true' : null,
    fetcher
  );

  // Fetch tipos de actividad de la org: { custom, ocultos }.
  const { data: tiposData } = useSWR<{ custom: TipoActividadCustom[]; ocultos: string[] }>(
    open ? '/api/crm/actividad-tipos' : null,
    fetcher
  );
  // mergedTipos = TODOS (predeterminados + propios) — para RESOLVER/MOSTRAR actividades existentes.
  const mergedTipos = useMemo(
    () => [...CRM_ACTIVIDAD_TIPOS, ...((tiposData?.custom) || []).map(buildTipoConfig)],
    [tiposData?.custom]
  );
  // visibleTipos = lista efectiva para el SELECTOR (excluye predeterminados ocultos).
  const visibleTipos = useMemo(() => {
    const ocultos = new Set(tiposData?.ocultos || []);
    return mergedTipos.filter((t) => !ocultos.has(t.id));
  }, [mergedTipos, tiposData?.ocultos]);
  // Fuentes de lead administradas (para mostrar la fuente guardada).
  const { resolve: resolveFuenteLead } = useCrmFuentes(open);

  // Search clientes for association
  const searchClientes = async (query: string): Promise<ComboboxOption[]> => {
    if (!query || query.length < 2) return [];
    const res = await fetch(`/api/clientes?search=${encodeURIComponent(query)}&limit=10`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((c: any) => {
      const numero = c.identificador_unico ?? c.identificador_legacy ?? null;
      const fantasia = c.nombre_fantasia && c.nombre_fantasia !== c.nombre ? c.nombre_fantasia : '';
      const secondary = [fantasia, c.cuit ? `CUIT ${c.cuit}` : ''].filter(Boolean).join(' · ');
      return {
        label: c.nombre || c.nombre_fantasia || 'Sin nombre',
        value: c.id,
        badge: numero != null && numero !== '' ? `#${numero}` : undefined,
        secondaryLabel: secondary || undefined,
        subtitle: c.cuit || '',
        data: c,
      };
    });
  };

  // Caches para resolver label desde value (SearchableCombobox solo emite value)
  const labCacheRef = useRef<ComboboxOption[]>([]);
  const personaCacheRef = useRef<ComboboxOption[]>([]);

  const searchLaboratorios = async (query: string): Promise<ComboboxOption[]> => {
    if (!query || query.length < 2) return [];
    const res = await fetch(`/api/laboratorios?search=${encodeURIComponent(query)}&limit=10`);
    if (!res.ok) return [];
    const data = await res.json();
    const opts = (data || []).map((l: any) => ({
      label: l.nombre || 'Sin nombre',
      value: l.id,
      subtitle: [l.localidad, l.provincia].filter(Boolean).join(', '),
      data: {
        clienteId: l.razon_social_id || null,
        clienteNombre: l.razon_social_nombre || null,
      },
    }));
    labCacheRef.current = opts;
    return opts;
  };

  const searchPersonas = async (query: string): Promise<ComboboxOption[]> => {
    if (!query || query.length < 2) return [];
    const labId = (oportunidad as any)?.laboratorio_id;
    const labParam = labId ? `&laboratorio_id=${encodeURIComponent(labId)}` : '';
    const res = await fetch(`/api/personas?search=${encodeURIComponent(query)}&limit=10${labParam}`);
    if (!res.ok) return [];
    const data = await res.json();
    const opts = (data || []).map((p: any) => ({
      label: p.nombre_completo || 'Sin nombre',
      value: p.id,
      subtitle: p.email?.[0] || p.telefono?.[0] || '',
      data: {
        laboratorioId: p.laboratorio_id || null,
        laboratorioNombre: p.laboratorio_nombre || null,
        clienteId: p.cliente_id || null,
        clienteNombre: p.cliente_nombre || null,
      },
    }));
    personaCacheRef.current = opts;
    return opts;
  };

  // Función para crear actividad
  const createActividad = async (
    tipo: string,
    titulo: string,
    descripcion?: string,
    metadata?: any
  ) => {
    if (!oportunidad) return;

    try {
      await fetch('/api/oportunidades-actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oportunidad_id: oportunidad.id,
          tipo,
          titulo,
          descripcion,
          metadata,
        }),
      });
      mutateActividades();
    } catch (error) {
      console.error('Error creating actividad:', error);
    }
  };

  // Cambiar etapa
  const handleEtapaChange = async (nuevaEtapa: string) => {
    if (!oportunidad || nuevaEtapa === oportunidad.etapa || changingEtapa) return;

    // Gate: estas etapas requieren un cliente formal asociado (no solo
    // persona/contacto) — ganado y logística.
    if ((nuevaEtapa === 'ganado' || nuevaEtapa === 'logistica') && !oportunidad.cliente_id) {
      setGateEtapa(nuevaEtapa);
      setShowGanadoGate(true);
      return;
    }

    const etapaAnterior = oportunidad.etapa;
    setChangingEtapa(true);

    // Determinar si el estado también cambia con la etapa
    const patchBody: Record<string, string> = { etapa: nuevaEtapa };
    if (nuevaEtapa === 'ganado') {
      patchBody.estado = 'ganado';
    } else if (nuevaEtapa === 'finalizado') {
      // 'finalizado' es la columna terminal del kanban → estado canónico 'ganado'
      // (NO 'finalizado', que no es un estado válido y oculta la card del kanban).
      patchBody.estado = 'ganado';
    }

    // Actualizar estado local inmediatamente (optimistic update)
    setLocalOportunidad(prev => prev ? { ...prev, etapa: nuevaEtapa, ...(patchBody.estado ? { estado: patchBody.estado } : {}) } as OportunidadVenta : null);

    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Crear actividad de cambio de etapa
      await createActividad(
        'etapa_cambio',
        `Etapa cambiada a ${ETAPAS.find(e => e.id === nuevaEtapa)?.nombre}`,
        undefined,
        { etapa_anterior: etapaAnterior, etapa_nueva: nuevaEtapa }
      );

      toast.success(`Etapa actualizada a ${ETAPAS.find(e => e.id === nuevaEtapa)?.nombre}`);
      onRefresh();
    } catch (error: any) {
      // Revertir en caso de error
      setLocalOportunidad(prev => prev ? { ...prev, etapa: etapaAnterior } as OportunidadVenta : null);
      toast.error(error.message || 'Error al cambiar etapa');
    } finally {
      setChangingEtapa(false);
    }
  };

  // Enviar email
  const handleSendEmail = async () => {
    if (!oportunidad || !emailForm.para || !emailForm.asunto) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.para,
          subject: emailForm.asunto,
          html: emailForm.mensaje.replace(/\n/g, '<br>'),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar email');
      }

      await createActividad(
        'email',
        `Email enviado a ${emailForm.para}`,
        emailForm.mensaje,
        { destinatario: emailForm.para, asunto: emailForm.asunto }
      );

      toast.success('Email enviado');
      setEmailForm({ para: oportunidad.contacto_email || '', asunto: '', mensaje: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Registrar llamada
  const handleRegistrarLlamada = async () => {
    if (!oportunidad || !llamadaForm.trim()) {
      toast.error('Ingrese las notas de la llamada');
      return;
    }

    setSaving(true);
    try {
      await createActividad('llamada', 'Llamada realizada', llamadaForm);
      toast.success('Llamada registrada');
      setLlamadaForm('');
    } catch (error) {
      toast.error('Error al registrar llamada');
    } finally {
      setSaving(false);
    }
  };

  // Guardar nota
  const handleGuardarNota = async () => {
    if (!oportunidad || !notaForm.trim()) {
      toast.error('Ingrese una nota');
      return;
    }

    setSaving(true);
    try {
      await createActividad('nota', 'Nota agregada', notaForm);
      toast.success('Nota guardada');
      setNotaForm('');
    } catch (error) {
      toast.error('Error al guardar nota');
    } finally {
      setSaving(false);
    }
  };

  // Guardar contacto rápido
  const handleGuardarContactoRapido = async () => {
    if (!oportunidad || !contactoInlineForm.nombre.trim()) {
      toast.error('Ingrese al menos el nombre del contacto');
      return;
    }

    setSaving(true);
    try {
      const labId = (oportunidad as any).laboratorio_id || null;
      // POST /api/personas: crea la persona y, si se pasan laboratorio_id /
      // cliente_id, crea los vínculos en personas_laboratorios / personas_clientes.
      const personaRes = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: contactoInlineForm.nombre.trim(),
          email: contactoInlineForm.email.trim() || null,
          telefono: contactoInlineForm.telefono.trim() || null,
          es_tentativa: true,
          ...(labId ? { laboratorio_id: labId } : {}),
          ...(labId && oportunidad.cliente_id ? { cliente_id: oportunidad.cliente_id } : {}),
        }),
      });
      if (!personaRes.ok) {
        const data = await personaRes.json();
        throw new Error(data.error || 'Error al crear el contacto');
      }
      const persona = await personaRes.json();

      // Asociar la persona creada a la oportunidad y limpiar el fallback manual.
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: persona.id,
          contacto_nombre: null,
          contacto_telefono: null,
          contacto_email: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Rollback: la persona recién creada quedaría huérfana si no se asocia.
        // Es seguro borrarla: se acaba de crear (es_tentativa) y nadie más la tocó.
        await fetch(`/api/personas?id=${persona.id}`, { method: 'DELETE' }).catch(() => {});
        throw new Error(data.error || 'Error al asociar contacto');
      }

      setLocalOportunidad(prev => prev ? ({
        ...prev,
        persona_id: persona.id,
        persona: {
          id: persona.id,
          nombre_completo: persona.nombre_completo,
          email: contactoInlineForm.email.trim() ? [contactoInlineForm.email.trim()] : [],
          telefono: contactoInlineForm.telefono.trim() ? [contactoInlineForm.telefono.trim()] : [],
        },
        contacto_nombre: undefined,
        contacto_telefono: undefined,
        contacto_email: undefined,
      } as unknown as OportunidadVenta) : null);

      toast.success('Contacto creado y asociado');
      setShowContactoInline(false);
      setContactoInlineForm({ nombre: '', telefono: '', email: '' });
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Marcar como ganada
  const handleMarcarGanada = async () => {
    if (!oportunidad) return;

    // Gate: require cliente_id before marking as ganado
    if (!oportunidad.cliente_id) {
      setGateEtapa('ganado');
      setShowGanadoGate(true);
      return;
    }

    {
      const ok = await confirm({
        title: 'Marcar como GANADA',
        description: 'La oportunidad pasa a etapa "Ganada" y se generan los siguientes pasos comerciales.',
        confirmText: 'Marcar ganada',
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: 'ganado', estado: 'ganado' }),
      });

      if (!res.ok) throw new Error('Error al actualizar');

      await createActividad('ganada', 'Oportunidad marcada como ganada');
      toast.success('Oportunidad marcada como ganada');
      onRefresh();
    } catch (error) {
      toast.error('Error al actualizar oportunidad');
    } finally {
      setSaving(false);
    }
  };

  // Marcar como perdida
  const handleMarcarPerdida = async () => {
    if (!oportunidad || !perdidaForm.motivo.trim()) {
      toast.error('Ingrese el motivo de pérdida');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa: 'perdido',
          estado: 'perdido',
          motivo_perdida: perdidaForm.motivo,
          perdida_descripcion: perdidaForm.descripcion || null,
          competidor: perdidaForm.competidor || null,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar');

      const motivoLabel = MOTIVOS_PERDIDA.find(m => m.value === perdidaForm.motivo)?.label || perdidaForm.motivo;
      const detalle = perdidaForm.descripcion ? `${motivoLabel}: ${perdidaForm.descripcion}` : motivoLabel;
      await createActividad(
        'perdida',
        'Oportunidad marcada como perdida',
        detalle,
        { motivo: perdidaForm.motivo, descripcion: perdidaForm.descripcion, competidor: perdidaForm.competidor }
      );

      toast.success('Oportunidad marcada como perdida');
      setShowPerdidaDialog(false);
      onRefresh();
    } catch (error) {
      toast.error('Error al actualizar oportunidad');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar oportunidad (hard delete)
  const handleEliminar = async () => {
    if (!oportunidad) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'No se pudo eliminar', { description: data.details });
        return;
      }
      toast.success('Oportunidad eliminada');
      setShowEliminarDialog(false);
      onOpenChange(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  // Reactivar oportunidad cerrada (ganada, perdida o cancelada)
  const handleReactivar = async () => {
    if (!oportunidad) return;
    {
      const ok = await confirm({
        title: 'Reactivar oportunidad',
        description: 'Vuelve al estado "Lead" para retomar el seguimiento.',
        confirmText: 'Reactivar',
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: 'nuevo', estado: 'abierto' }),
      });

      if (!res.ok) throw new Error('Error al reactivar');

      await createActividad('etapa_cambio', 'Oportunidad reactivada', undefined, {
        etapa_anterior: oportunidad.etapa,
        etapa_nueva: 'nuevo',
        estado_anterior: oportunidad.estado,
        estado_nuevo: 'abierto',
      });

      setLocalOportunidad(prev => prev ? { ...prev, etapa: 'nuevo', estado: 'abierto' } as OportunidadVenta : null);
      toast.success('Oportunidad reactivada');
      onRefresh();
    } catch (error) {
      toast.error('Error al reactivar oportunidad');
    } finally {
      setSaving(false);
    }
  };

  // Crear actividad programada
  const handleCrearActProgramada = async () => {
    if (!oportunidad || !selectedActTipo) return;
    setSaving(true);
    try {
      const tipoConfig = mergedTipos.find(t => t.id === selectedActTipo);
      const res = await fetch('/api/crm/actividades-programadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oportunidad_id: oportunidad.id,
          tipo: selectedActTipo,
          titulo: tipoConfig?.label || selectedActTipo,
          nota: actForm.nota || null,
          fecha_limite: actForm.fecha_limite,
          hora: actForm.hora || null,
          prioridad: actForm.prioridad,
          asignado_id: actForm.asignado_id || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || 'Error al programar actividad');
      }
      toast.success('Actividad programada');
      setSelectedActTipo(null);
      setActForm({ fecha_limite: new Date().toISOString().split('T')[0], hora: '', prioridad: 'normal', asignado_id: '', nota: '' });
      mutateActProgramadas();
    } catch (error: any) {
      console.error('Error creando actividad programada:', error);
      toast.error(error.message || 'Error al programar actividad');
    } finally {
      setSaving(false);
    }
  };

  // Completar actividad programada
  const handleCompletarAct = async (actId: string, resultado?: string) => {
    setCompletandoId(actId);
    try {
      await fetch('/api/crm/actividades-programadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actId, estado: 'completada', resultado }),
      });
      toast.success('Actividad completada');
      mutateActProgramadas();
      mutateActividades();
    } catch (error) {
      toast.error('Error al completar actividad');
    } finally {
      setCompletandoId(null);
    }
  };

  // Cancelar actividad programada
  const handleCancelarAct = async (actId: string) => {
    try {
      await fetch('/api/crm/actividades-programadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actId, estado: 'cancelada' }),
      });
      toast.success('Actividad cancelada');
      mutateActProgramadas();
    } catch (error) {
      toast.error('Error al cancelar actividad');
    }
  };

  // Toggle seguimiento (multi-persona)
  const handleToggleSeguimiento = async (userId: string) => {
    if (!oportunidad) return;
    const currentIds = (oportunidad.usuarios_asignados || []).map(u => u.id);
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignados_ids: newIds }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      const newAsignados = newIds.map(id => {
        const member = teamMembers?.find(m => m.id === id);
        return { id, nombre_completo: member?.nombre || '' };
      });
      setLocalOportunidad(prev => prev ? {
        ...prev,
        usuarios_asignados: newAsignados,
      } as OportunidadVenta : null);
      onRefresh();
    } catch (error) {
      toast.error('Error al cambiar seguimiento');
    }
  };

  const handleClearSeguimiento = async () => {
    if (!oportunidad) return;
    setSeguimientoPopoverOpen(false);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignados_ids: [] }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setLocalOportunidad(prev => prev ? {
        ...prev,
        usuarios_asignados: [],
      } as OportunidadVenta : null);
      onRefresh();
    } catch (error) {
      toast.error('Error al cambiar seguimiento');
    }
  };

  // Sede (laboratorio) picker state — para el card en el Resumen
  const [sedePopoverOpen, setSedePopoverOpen] = useState(false);
  const [sedeNuevoMode, setSedeNuevoMode] = useState(false);
  const [sedeNuevoNombre, setSedeNuevoNombre] = useState('');
  const [sedeNuevoDireccion, setSedeNuevoDireccion] = useState('');
  const [sedeNuevoLocalidad, setSedeNuevoLocalidad] = useState('');
  const [sedeNuevoProvincia, setSedeNuevoProvincia] = useState('');
  const [savingSede, setSavingSede] = useState(false);

  // Traer sedes del cliente cuando el popover está abierto
  const { data: sedesCliente = [] } = useSWR<any[]>(
    sedePopoverOpen && oportunidad?.cliente_id
      ? `/api/laboratorios?razon_social_id=${oportunidad.cliente_id}&completos=true`
      : null,
    async (url: string) => {
      const r = await fetch(url);
      return r.json();
    }
  );

  const handleAsignarSedeExistente = async (labId: string) => {
    if (!oportunidad) return;
    setSavingSede(true);
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laboratorio_id: labId }),
      });
      if (!res.ok) throw new Error('Error');
      setSedePopoverOpen(false);
      toast.success('Sede asignada');
      onRefresh();
    } catch {
      toast.error('Error al asignar sede');
    } finally {
      setSavingSede(false);
    }
  };

  const handleCrearNuevaSede = async () => {
    if (!oportunidad?.cliente_id) return;
    if (!sedeNuevoNombre.trim() || !sedeNuevoDireccion.trim()) {
      toast.error('Nombre y dirección son requeridos');
      return;
    }
    setSavingSede(true);
    try {
      // Crear el lab
      const labRes = await fetch(`/api/laboratorios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: sedeNuevoNombre.trim(),
          direccion: sedeNuevoDireccion.trim(),
          localidad: sedeNuevoLocalidad.trim() || null,
          provincia: sedeNuevoProvincia.trim() || null,
          razon_social_id: oportunidad.cliente_id,
          activo: true,
        }),
      });
      if (!labRes.ok) throw new Error('Error creando sede');
      const nuevoLab = await labRes.json();

      // Linkear a la oportunidad
      const patchRes = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laboratorio_id: nuevoLab.id }),
      });
      if (!patchRes.ok) throw new Error('Error vinculando sede');

      toast.success(`Sede "${nuevoLab.nombre}" creada y asignada`);
      setSedePopoverOpen(false);
      setSedeNuevoMode(false);
      setSedeNuevoNombre('');
      setSedeNuevoDireccion('');
      setSedeNuevoLocalidad('');
      setSedeNuevoProvincia('');
      onRefresh();
    } catch {
      toast.error('Error al crear la sede');
    } finally {
      setSavingSede(false);
    }
  };

  // Associate/change cliente
  const handleChangeCliente = async (clienteId: string, opcion?: ComboboxOption | null) => {
    if (!oportunidad) return;
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId || null }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      // Actualizamos el estado local al instante para que el sheet refleje el
      // cambio sin necesidad de F5 (la opción trae el cliente completo en data).
      const c = (opcion?.data as any) || null;
      setLocalOportunidad(prev => prev ? ({
        ...prev,
        cliente_id: clienteId || null,
        cliente_nombre: c?.nombre ?? (clienteId ? prev.cliente_nombre : null),
        cliente: c
          ? {
              id: c.id,
              nombre: c.nombre,
              nombre_fantasia: c.nombre_fantasia,
              identificador_unico: c.identificador_unico,
              email: c.email,
              telefono: c.telefono,
            }
          : (clienteId ? prev.cliente : null),
      } as OportunidadVenta) : null);
      setEditingField(null);
      onRefresh();
    } catch (error) {
      toast.error('Error al asociar cliente');
    }
  };

  const handleChangeLaboratorio = async (laboratorioId: string, opcion: ComboboxOption | null) => {
    if (!oportunidad) return;
    try {
      // Si la oportunidad no tiene cliente, lo tomamos de la razón social
      // principal del laboratorio elegido.
      const clienteId = (opcion?.data as any)?.clienteId as string | null | undefined;
      const clienteNombre = (opcion?.data as any)?.clienteNombre as string | null | undefined;
      const completarCliente = !oportunidad.cliente_id && !!clienteId;

      const body: Record<string, any> = {
        laboratorio_id: laboratorioId,
        empresa_nombre: opcion?.label ?? null,
      };
      if (completarCliente) body.cliente_id = clienteId;

      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setLocalOportunidad(prev =>
        prev
          ? ({
              ...prev,
              laboratorio_id: laboratorioId,
              empresa_nombre: opcion?.label ?? null,
              ...(completarCliente
                ? { cliente_id: clienteId, cliente_nombre: clienteNombre ?? prev.cliente_nombre }
                : {}),
            } as OportunidadVenta)
          : null
      );
      onRefresh();
    } catch (error) {
      toast.error('Error al asociar laboratorio');
    }
  };

  const handleChangeContactoPersona = async (personaId: string, opcion: ComboboxOption | null) => {
    if (!oportunidad) return;
    try {
      // Cascada inversa: si la oportunidad no tiene lab NI cliente y el contacto
      // elegido pertenece a uno, los completamos desde el contacto.
      const d = (opcion?.data as any) || {};
      const completarDesdeContacto =
        !(oportunidad as any).laboratorio_id &&
        !oportunidad.cliente_id &&
        !!d.laboratorioId &&
        !!d.clienteId;

      const body: Record<string, any> = {
        persona_id: personaId,
        // Limpiar fallback de contacto manual cuando se asocia persona
        contacto_nombre: null,
        contacto_telefono: null,
        contacto_email: null,
      };
      if (completarDesdeContacto) {
        body.laboratorio_id = d.laboratorioId;
        body.empresa_nombre = d.laboratorioNombre ?? null;
        body.cliente_id = d.clienteId;
      }

      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setLocalOportunidad(prev =>
        prev
          ? ({
              ...prev,
              persona_id: personaId,
              contacto_nombre: undefined,
              contacto_telefono: undefined,
              contacto_email: undefined,
              ...(completarDesdeContacto
                ? {
                    laboratorio_id: d.laboratorioId,
                    empresa_nombre: d.laboratorioNombre ?? null,
                    cliente_id: d.clienteId,
                    cliente_nombre: d.clienteNombre ?? null,
                  }
                : {}),
            } as unknown as OportunidadVenta)
          : null
      );
      onRefresh();
    } catch (error) {
      toast.error('Error al asociar contacto');
    }
  };

  // "Cambiar" del card Laboratorio: limpia lab + cliente juntos para poder
  // volver a elegir un laboratorio (el lab queda bloqueado mientras hay cliente).
  const handleLimpiarLabCliente = async () => {
    if (!oportunidad) return;
    const ok = await confirm({
      title: 'Cambiar laboratorio y cliente',
      description: 'Se va a desasociar el laboratorio y el cliente de esta oportunidad. ¿Continuar?',
      confirmText: 'Sí, cambiar',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laboratorio_id: null, cliente_id: null, empresa_nombre: null }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setLocalOportunidad(prev =>
        prev
          ? ({ ...prev, laboratorio_id: null, cliente_id: null, empresa_nombre: null, cliente_nombre: null } as unknown as OportunidadVenta)
          : null
      );
      onRefresh();
    } catch (error) {
      toast.error('Error al limpiar laboratorio y cliente');
    }
  };

  // Inline field save
  const handleInlineSave = async (field: string, value: any) => {
    if (!oportunidad) return;
    try {
      const res = await fetch(`/api/oportunidades?id=${oportunidad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setLocalOportunidad(prev => prev ? { ...prev, [field]: value } as OportunidadVenta : null);
      onRefresh();
    } catch (error) {
      toast.error('Error al guardar');
    }
    setEditingField(null);
  };

  const startEditing = (field: string, currentValue: any) => {
    if (oportunidad?.estado !== 'abierto') return;
    setEditingField(field);
    setEditValue(String(currentValue ?? ''));
  };

  // Callback cuando se crea presupuesto
  const handlePresupuestoCreated = async () => {
    if (!oportunidad) return;
    mutatePresupuestos();
    await createActividad('presupuesto_creado', 'Nuevo presupuesto creado');
  };

  // === Handlers Equipos ===

  const handleBuscarEquiposDisponibles = async () => {
    setBuscandoEquipos(true);
    try {
      const [resStock, resCatalogo] = await Promise.all([
        fetch(`/api/oportunidades-equipos?tipo=disponibles`),
        fetch(`/api/equipos`),
      ]);
      if (resStock.ok) {
        const data = await resStock.json();
        setEquiposDisponibles(Array.isArray(data) ? data : []);
      }
      if (resCatalogo.ok) {
        const data = await resCatalogo.json();
        setEquiposCatalogo(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Error al buscar equipos');
    } finally {
      setBuscandoEquipos(false);
    }
  };

  // Picker de unidades de un modelo específico
  const [pickerEquipoOpen, setPickerEquipoOpen] = useState(false);
  const [pickerEquipoNombre, setPickerEquipoNombre] = useState('');
  const [pickerUnidades, setPickerUnidades] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const handleExpandirUnidadesEquipo = async (equipoId: string, equipoNombre: string) => {
    setPickerEquipoNombre(equipoNombre);
    setPickerEquipoOpen(true);
    setPickerLoading(true);
    setPickerUnidades([]);
    try {
      const res = await fetch(`/api/equipos-unidades?equipo_id=${equipoId}&estado=stock`);
      if (!res.ok) throw new Error('Error al cargar unidades');
      const data = await res.json();
      setPickerUnidades(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar unidades del equipo');
    } finally {
      setPickerLoading(false);
    }
  };

  const buildConflictoMessage = async (equipo_id: string): Promise<string | null> => {
    if (!oportunidad) return null;
    try {
      const res = await fetch(
        `/api/oportunidades-equipos/conflictos?equipo_id=${equipo_id}&exclude_oportunidad_id=${oportunidad.id}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const mismo = (data.mismoEquipo || []) as any[];
      const cat = (data.mismaCategoria || []) as any[];
      if (mismo.length === 0 && cat.length === 0) return null;
      const parts: string[] = [];
      if (mismo.length > 0) {
        parts.push(
          `Atención: este equipo ya está siendo trabajado en ${mismo.length} oportunidad${mismo.length === 1 ? '' : 'es'} abierta${mismo.length === 1 ? '' : 's'}:\n` +
            mismo
              .slice(0, 5)
              .map((o: any) => `• "${o.oportunidad_nombre}" (${o.estado_pedido}${o.vendedor_nombre ? ' — ' + o.vendedor_nombre : ''})`)
              .join('\n')
        );
      }
      if (cat.length > 0) {
        parts.push(
          `Otros equipos de la misma categoría (${data.categoria}) están en ${cat.length} oportunidad${cat.length === 1 ? '' : 'es'}:\n` +
            cat
              .slice(0, 3)
              .map((o: any) => `• "${o.oportunidad_nombre}" — ${o.equipo_marca || ''} ${o.equipo_modelo || ''} (${o.estado_pedido})`)
              .join('\n')
        );
      }
      return parts.join('\n\n');
    } catch {
      return null;
    }
  };

  const handleCrearPedidoEquipo = async (equipo_id: string, equipoNombre: string) => {
    if (!oportunidad) return;
    const conflicto = await buildConflictoMessage(equipo_id);
    const baseDesc = `Agrega "${equipoNombre}" a la lista de pendientes de pedir. No se contacta a ningún proveedor automáticamente — el pedido formal se hace después desde el módulo de Compras.`;
    const ok = await confirm({
      title: conflicto ? '⚠ Posible conflicto con otra oportunidad' : 'Marcar como faltante',
      description: conflicto ? `${conflicto}\n\n---\n\n${baseDesc}` : baseDesc,
      confirmText: conflicto ? 'Marcar igual' : 'Marcar como faltante',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch('/api/oportunidades-equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pedido',
          oportunidad_id: oportunidad.id,
          equipo_id,
          cantidad: 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear pedido');
      }
      toast.success('Marcado como faltante');
      mutatePedidos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReservarEquipo = async (equipo_unidad_id: string) => {
    if (!oportunidad) return;
    // Resolver equipo_id desde la unidad para chequear conflicto
    let conflicto: string | null = null;
    try {
      const uRes = await fetch(`/api/equipos-unidades?id_or_unidad=${equipo_unidad_id}`);
      // Fallback: buscar el equipo_id desde pickerUnidades o equiposDisponibles
      const allUnidades = [...pickerUnidades, ...equiposDisponibles];
      const unidad = allUnidades.find((u: any) => (u.equipo_unidad_id || u.id) === equipo_unidad_id);
      const equipoId = unidad?.equipo_id || unidad?.id;
      if (equipoId) {
        conflicto = await buildConflictoMessage(equipoId);
      }
    } catch {
      // ignore
    }
    const baseDesc = 'El equipo queda asociado a esta oportunidad y deja de estar disponible para otras.';
    const ok = await confirm({
      title: conflicto ? '⚠ Posible conflicto con otra oportunidad' : 'Reservar equipo',
      description: conflicto ? `${conflicto}\n\n---\n\n${baseDesc}` : baseDesc,
      confirmText: conflicto ? 'Reservar igual' : 'Reservar',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch('/api/oportunidades-equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reservar',
          oportunidad_id: oportunidad.id,
          equipo_unidad_id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al reservar');
      }
      toast.success('Equipo reservado');
      mutateEquipos();
      // Refrescar disponibles
      handleBuscarEquiposDisponibles();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLiberarReserva = async (equipo_unidad_id: string) => {
    const ok = await confirm({
      title: 'Liberar reserva',
      description: 'El equipo vuelve al stock disponible y se desvincula de la oportunidad.',
      confirmText: 'Liberar',
      variant: 'destructive',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch('/api/oportunidades-equipos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'liberar_reserva',
          equipo_unidad_id,
        }),
      });
      if (!res.ok) throw new Error('Error al liberar');
      toast.success('Reserva liberada');
      mutateEquipos();
    } catch {
      toast.error('Error al liberar reserva');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarPedido = async (pedidoId: string) => {
    const ok = await confirm({
      title: 'Cancelar pedido',
      description: 'El pedido de compra se elimina. Esta acción no se puede deshacer.',
      confirmText: 'Cancelar pedido',
      cancelText: 'Volver',
      variant: 'destructive',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades-equipos?id=${pedidoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al cancelar');
      toast.success('Pedido cancelado');
      mutatePedidos();
    } catch {
      toast.error('Error al cancelar pedido');
    } finally {
      setSaving(false);
    }
  };

  // --- Handlers para productos/insumos ---
  const handleBuscarProductos = async (term: string) => {
    setSearchProducto(term);
    if (term.length < 2) { setProductosResultados([]); return; }
    setBuscandoProductos(true);
    try {
      const res = await fetch(`/api/productos?search=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setProductosResultados(asArray<any>(data).slice(0, 20));
      }
    } catch {
      // silent
    } finally {
      setBuscandoProductos(false);
    }
  };

  const handleAgregarProducto = async (producto: any) => {
    if (!oportunidad) return;
    setSaving(true);
    try {
      const res = await fetch('/api/oportunidades-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oportunidad_id: oportunidad.id,
          producto_id: producto.id,
          descripcion: producto.nombre,
          cantidad: 1,
          precio_unitario: producto.precio_venta || producto.precio || null,
        }),
      });
      if (!res.ok) throw new Error('Error al agregar producto');
      toast.success(`${producto.nombre} agregado`);
      mutateItems();
      setSearchProducto('');
      setProductosResultados([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (itemId: string, field: string, value: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades-items?id=${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      mutateItems();
      setEditingItemId(null);
      setEditingItemField(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarItem = async (itemId: string) => {
    const ok = await confirm({
      title: 'Eliminar item',
      description: 'Se quita el ítem del listado de la oportunidad.',
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/oportunidades-items?id=${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Item eliminado');
      mutateItems();
      mutateEquipos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Derived: productos from oportunidadItems
  const productosItems = oportunidadItems?.filter((item: any) => item.producto_id) || [];
  const equiposItems = oportunidadItems?.filter((item: any) => item.equipo_id && !item.producto_id) || [];
  // Equipos "cotizados" = item con equipo_id pero aún sin unidad reservada ni pedido.
  // Provienen típicamente de presupuestos de equipos antes de elegir unidad específica.
  const equiposCotizados = equiposItems.filter(
    (item: any) => !item.equipo_unidad_id && (item.estado_item || 'cotizado') === 'cotizado'
  );
  const totalItems = oportunidadItems?.length || 0;
  const totalEstimado = oportunidadItems?.reduce((sum: number, item: any) => {
    return sum + ((item.precio_unitario || 0) * (item.cantidad || 1));
  }, 0) || 0;
  // Moneda del total: si todos los ítems comparten una, la usamos; si se
  // mezclan ARS y USD, caemos a ARS (el total mezclado no es del todo válido).
  const totalMoneda = (() => {
    const monedas = new Set((oportunidadItems || []).map((it: any) => it.equipo_moneda || 'ARS'));
    return monedas.size === 1 ? (Array.from(monedas)[0] as string) : 'ARS';
  })();

  // Abrir dialog para enviar presupuesto
  const handleOpenEnviarPresupuesto = (pres: Presupuesto) => {
    setPresupuestoToSend(pres);
    setEnviarEmailDestino(oportunidad?.contacto_email || '');
    setShowEnviarPresupuestoDialog(true);
  };

  // Enviar presupuesto al cliente
  const handleEnviarPresupuesto = async () => {
    if (!presupuestoToSend || !oportunidad) return;

    if (!enviarEmailDestino.trim()) {
      toast.error('Ingrese un email de destino');
      return;
    }

    setSaving(true);
    try {
      // Router: si el presupuesto proviene de presupuestos_equipos (lo marcamos
      // con _source = 'equipos' al mergear las listas), usamos el endpoint del
      // renderer de equipos. Si no, el genérico.
      const isEquipo = (presupuestoToSend as any)._source === 'equipos';
      const endpoint = isEquipo
        ? '/api/presupuestos-equipos/enviar'
        : '/api/presupuestos/enviar';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto_id: presupuestoToSend.id,
          email_destino: enviarEmailDestino.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar presupuesto');
      }

      // Registrar actividad
      await createActividad(
        'presupuesto_enviado',
        `Presupuesto ${presupuestoToSend.numero} enviado`,
        `Enviado a: ${enviarEmailDestino}`,
        { presupuesto_id: presupuestoToSend.id, destinatario: enviarEmailDestino }
      );

      toast.success(`Presupuesto enviado a ${enviarEmailDestino}`);
      setShowEnviarPresupuestoDialog(false);
      setPresupuestoToSend(null);
      mutatePresupuestos();
    } catch (error: any) {
      console.error('Envío presupuesto falló:', error);
      toast.error(error.message || 'Error al enviar presupuesto', {
        duration: 10000,
        description: 'Revisá la configuración de email en la cuenta predeterminada de la org.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!oportunidad) return null;

  const etapaActualIndex = ETAPAS.findIndex(e => e.id === oportunidad.etapa);
  const valorPonderado = (oportunidad.monto_estimado || 0) * (oportunidad.probabilidad_cierre || 0) / 100;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] max-h-[90vh] overflow-hidden p-0 flex flex-row bg-white dark:bg-gray-950"
          title={oportunidad.nombre}
        >
          {/* Main content area */}
          <div className={cn(
            "flex flex-col overflow-y-auto transition-all duration-200",
            chatterOpen ? "flex-1 min-w-0" : "w-full"
          )}>
          {/* Header compacto */}
          <div className={cn(
            "px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-gray-200 dark:border-gray-800 shrink-0",
            chatterOpen ? "pr-4 sm:pr-6" : "pr-20 sm:pr-24"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {editingField === 'nombre' ? (
                  <Input
                    className="h-9 text-base sm:text-xl font-bold"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleInlineSave('nombre', editValue.trim() || oportunidad.nombre)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInlineSave('nombre', editValue.trim() || oportunidad.nombre);
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <h2
                    className={cn(
                      "text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate inline-flex items-center gap-1.5 max-w-full group/title",
                      oportunidad.estado === 'abierto' && "cursor-pointer hover:text-purple-700 dark:hover:text-purple-300"
                    )}
                    onClick={() => startEditing('nombre', oportunidad.nombre)}
                    title={oportunidad.estado === 'abierto' ? 'Click para editar el título' : undefined}
                  >
                    <span className="truncate">{oportunidad.nombre}</span>
                    {oportunidad.estado === 'abierto' && (
                      <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/title:opacity-60 transition-opacity" />
                    )}
                  </h2>
                )}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {oportunidad.estado !== 'abierto' && (
                    <Badge
                      variant={['ganado', 'finalizado'].includes(oportunidad.estado) ? 'success' : 'destructive'}
                      className="text-[10px] sm:text-xs"
                    >
                      {oportunidad.estado === 'ganado' ? 'Ganada' : oportunidad.estado === 'finalizado' ? 'Finalizada' : 'Perdida'}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {oportunidad.empresa_nombre || oportunidad.cliente?.nombre || 'Sin laboratorio'}
                  </span>
                </div>
              </div>

              {/* Acciones de estado */}
              <div className="flex gap-1.5 shrink-0">
                {['abierto', 'ganado'].includes(oportunidad.estado) && (
                  <>
                    {oportunidad.estado === 'abierto' && (
                      <Button
                        type="default"
                        size="tiny"
                        onClick={handleMarcarGanada}
                        disabled={saving}
                        icon={<Trophy className="text-emerald-600" />}
                        className="border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                      >
                        Ganada
                      </Button>
                    )}
                    {oportunidad.estado === 'ganado' && oportunidad.cliente_id && (
                      <GenerarInstalacionButton
                        oportunidadId={oportunidad.id}
                        clienteId={oportunidad.cliente_id}
                        clienteNombre={oportunidad.cliente_nombre || oportunidad.cliente?.nombre || ''}
                        laboratorioId={(oportunidad as any).laboratorio_id || null}
                      />
                    )}
                    <Button
                      type="default"
                      size="tiny"
                      onClick={() => setShowPerdidaDialog(true)}
                      icon={<XCircle className="text-red-600" />}
                      className="border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-300"
                    >
                      Perdida
                    </Button>
                    <Button
                      type="text"
                      size="tiny"
                      onClick={() => setShowEliminarDialog(true)}
                      icon={<Trash2 className="text-red-500" />}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Eliminar oportunidad"
                    />
                  </>
                )}
                {['finalizado', 'perdido', 'cancelado'].includes(oportunidad.estado) && (
                  <Button
                    type="default"
                    size="tiny"
                    onClick={handleReactivar}
                    disabled={saving}
                    icon={<Unlock className="text-blue-600" />}
                    className="border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                  >
                    Reactivar
                  </Button>
                )}
              </div>
            </div>

            {/* Acciones rápidas */}
            {oportunidad.estado === 'abierto' && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                <Button
                  type="primary"
                  size="tiny"
                  onClick={() => setShowPresupuestoDialog(true)}
                  icon={<FileText />}
                  className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                >
                  Presupuesto
                </Button>
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => { setActiveTab('actividades'); setActiveInlinePanel('email'); }}
                  icon={<Send className="text-purple-600" />}
                  className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Email
                </Button>
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => { setActiveTab('actividades'); setActiveInlinePanel('llamada'); }}
                  icon={<PhoneCall className="text-blue-600" />}
                  className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Reg. Llamada
                </Button>
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => { setChatterOpen(true); setActiveTab('actividades'); setActiveInlinePanel('nota'); }}
                  icon={<MessageSquare className="text-gray-600" />}
                  className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Nota
                </Button>
              </div>
            )}
          </div>

          {/* Pipeline Stepper */}
          <div className="px-4 sm:px-6 py-2.5 border-b border-gray-200/50 dark:border-gray-800/30 shrink-0 overflow-x-auto bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-1 min-w-max">
              {ETAPAS.map((etapa, index) => {
                const isActive = etapa.id === oportunidad.etapa;
                const isPast = index < etapaActualIndex;
                const EtapaIcon = etapa.icon;
                const colors = ETAPA_COLORS[etapa.id];

                return (
                  <div key={etapa.id} className="flex items-center">
                    <button
                      onClick={() => handleEtapaChange(etapa.id)}
                      disabled={changingEtapa || ['perdido', 'cancelado', 'finalizado'].includes(oportunidad.estado)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium",
                        isActive && `${colors.bg} ${colors.border} border ${colors.text}`,
                        !isActive && "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700",
                        isPast && "opacity-60",
                        ['perdido', 'cancelado', 'finalizado'].includes(oportunidad.estado) && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <EtapaIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{etapa.nombre}</span>
                    </button>
                    {index < ETAPAS.length - 1 && (
                      <ChevronRight className={cn(
                        "h-4 w-4 mx-0.5 shrink-0",
                        isPast ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto mt-2 sm:mt-4 px-4 sm:px-6 pb-6">
              {mounted && (
                <Tabs id={`hub-tabs-${tabsId}`} value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className={cn(sheetClasses.tabsList, "grid-cols-4 h-auto")}>
                    <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                      <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-[10px] sm:text-sm">Resumen</span>
                    </TabsTrigger>
                    <TabsTrigger value="presupuestos" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-[10px] sm:text-sm">Presupuestos</span>
                      {presupuestos && presupuestos.length > 0 && (
                        <Badge variant="secondary" className="ml-0 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-xs">
                          {presupuestos.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="actividades" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-[10px] sm:text-sm">Actividades</span>
                      {(() => {
                        const pend = (actividadesProgramadas || []).filter(a => a.estado === 'pendiente').length;
                        return pend > 0 ? (
                          <Badge variant="secondary" className="ml-0 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-xs">
                            {pend}
                          </Badge>
                        ) : null;
                      })()}
                    </TabsTrigger>
                    <TabsTrigger value="equipos" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-[10px] sm:text-sm">Items</span>
                      {totalItems > 0 && (
                        <Badge variant="secondary" className="ml-0 sm:ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-xs">
                          {totalItems}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-0">
                    {/* Tab Resumen */}
                    <TabsContent value="resumen" className="space-y-4 mt-0 p-4">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                      {/* Datos clave - inline editable */}
                      <section className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-gray-200 dark:divide-gray-800">
                          {/* Monto */}
                          <div
                            className={cn("p-3 sm:p-4", oportunidad.estado === 'abierto' && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors")}
                            onClick={() => startEditing('monto_estimado', oportunidad.monto_estimado || 0)}
                          >
                            <p className="text-xs text-muted-foreground mb-1">Monto Estimado</p>
                            {editingField === 'monto_estimado' ? (
                              <Input
                                type="number"
                                className="h-8 text-base font-semibold"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave('monto_estimado', Number(editValue) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave('monto_estimado', Number(editValue) || 0);
                                  if (e.key === 'Escape') setEditingField(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(oportunidad.monto_estimado || 0)}
                              </p>
                            )}
                          </div>
                          {/* Probabilidad (auto por etapa) */}
                          <div className="p-3 sm:p-4">
                            <p className="text-xs text-muted-foreground mb-1">Probabilidad</p>
                            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {oportunidad.probabilidad_cierre || 0}%
                            </p>
                          </div>
                          {/* Proyección */}
                          <div className="p-3 sm:p-4">
                            <p className="text-xs text-muted-foreground mb-1">Proyección</p>
                            <p className="text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(valorPonderado)}
                            </p>
                          </div>
                          {/* Cierre estimado */}
                          <div
                            className={cn("p-3 sm:p-4", oportunidad.estado === 'abierto' && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors")}
                            onClick={() => startEditing('fecha_estimada_cierre', oportunidad.fecha_estimada_cierre || '')}
                          >
                            <p className="text-xs text-muted-foreground mb-1">Cierre Estimado</p>
                            {editingField === 'fecha_estimada_cierre' ? (
                              <Input
                                type="date"
                                className="h-8 text-sm font-medium"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleInlineSave('fecha_estimada_cierre', e.target.value || null);
                                }}
                                onBlur={() => setEditingField(null)}
                                onKeyDown={(e) => { if (e.key === 'Escape') setEditingField(null); }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {oportunidad.fecha_estimada_cierre
                                  ? fmtFecha(oportunidad.fecha_estimada_cierre, 'd MMM yyyy')
                                  : '—'}
                              </p>
                            )}
                          </div>
                          {/* Días en etapa */}
                          <div className="p-3 sm:p-4">
                            <p className="text-xs text-muted-foreground mb-1">Días en Etapa</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {oportunidad.dias_en_etapa || 0} días
                            </p>
                          </div>
                          {/* Prioridad */}
                          <div className="p-3 sm:p-4">
                            <p className="text-xs text-muted-foreground mb-1">Prioridad</p>
                            {oportunidad.estado === 'abierto' ? (
                              <select
                                className="text-sm font-medium bg-transparent border-none p-0 cursor-pointer focus:ring-0 text-gray-900 dark:text-gray-100"
                                value={oportunidad.prioridad || 'normal'}
                                onChange={(e) => handleInlineSave('prioridad', e.target.value)}
                              >
                                <option value="baja">Baja</option>
                                <option value="normal">Normal</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                              </select>
                            ) : (
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                {oportunidad.prioridad || 'Normal'}
                              </p>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Etiquetas */}
                      <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                        <p className="text-xs text-muted-foreground mb-2">Etiquetas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(oportunidad.etiquetas || []).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                              {oportunidad.estado === 'abierto' && (
                                <button
                                  className="ml-1 hover:text-red-500"
                                  onClick={() => handleInlineSave('etiquetas', (oportunidad.etiquetas || []).filter((_, idx) => idx !== i))}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {oportunidad.estado === 'abierto' && (
                            editingField === 'etiquetas' ? (
                              <Input
                                className="h-7 w-32 text-xs"
                                placeholder="Nueva etiqueta..."
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editValue.trim()) {
                                    handleInlineSave('etiquetas', [...(oportunidad.etiquetas || []), editValue.trim()]);
                                    setEditValue('');
                                  }
                                  if (e.key === 'Escape') setEditingField(null);
                                }}
                                onBlur={() => {
                                  if (editValue.trim()) {
                                    handleInlineSave('etiquetas', [...(oportunidad.etiquetas || []), editValue.trim()]);
                                  }
                                  setEditingField(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => { setEditingField('etiquetas'); setEditValue(''); }}
                                className="inline-flex items-center gap-1 px-2 h-6 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-xs text-muted-foreground hover:border-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                Agregar
                              </button>
                            )
                          )}
                        </div>
                      </section>

                      {/* Entidades asociadas */}
                      <div className="space-y-3">
                        {/* Cliente */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-purple-600" />
                              <span className="text-xs text-muted-foreground">Cliente</span>
                            </div>
                            {oportunidad.cliente_id && (
                              <button
                                type="button"
                                onClick={() => setClienteDetailOpen(true)}
                                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver ficha
                              </button>
                            )}
                          </div>
                          {oportunidad.estado === 'abierto' ? (
                            <SearchableCombobox
                              value={oportunidad.cliente_id || ''}
                              onValueChange={handleChangeCliente}
                              searchFn={searchClientes}
                              placeholder="Buscar cliente..."
                              emptyMessage="Sin resultados"
                              triggerClassName="h-auto min-h-[28px] border border-transparent hover:border-purple-200 dark:hover:border-purple-800 shadow-none px-1.5 font-medium text-gray-900 dark:text-gray-100 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer"
                              defaultSelectedOption={oportunidad.cliente ? {
                                label: oportunidad.cliente.nombre,
                                value: oportunidad.cliente.id,
                                badge: (oportunidad.cliente as any).identificador_unico != null
                                  ? `#${(oportunidad.cliente as any).identificador_unico}`
                                  : undefined,
                                secondaryLabel: ((oportunidad.cliente as any).nombre_fantasia && (oportunidad.cliente as any).nombre_fantasia !== oportunidad.cliente.nombre)
                                  ? (oportunidad.cliente as any).nombre_fantasia
                                  : undefined,
                                subtitle: oportunidad.cliente.cuit || '',
                              } : null}
                            />
                          ) : oportunidad.cliente ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => setClienteDetailOpen(true)}
                                className="font-medium text-left text-gray-900 dark:text-gray-100 hover:text-purple-700 dark:hover:text-purple-300 hover:underline cursor-pointer"
                              >
                                {oportunidad.cliente.nombre}
                              </button>
                              {oportunidad.cliente.cuit && (
                                <p className="text-xs text-muted-foreground mt-0.5">CUIT: {oportunidad.cliente.cuit}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No asociado</p>
                          )}
                        </div>

                        {/* Laboratorio/Empresa */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs text-muted-foreground">Laboratorio</span>
                          </div>
                          {oportunidad.estado === 'abierto' ? (
                            <SearchableCombobox
                              value={(oportunidad as any).laboratorio_id || ''}
                              onValueChange={(id) => {
                                const opt = labCacheRef.current.find(o => o.value === id) ?? null;
                                handleChangeLaboratorio(id, opt);
                              }}
                              searchFn={searchLaboratorios}
                              placeholder="Buscar laboratorio..."
                              emptyMessage="Sin resultados"
                              triggerClassName="h-auto min-h-[28px] border border-transparent hover:border-blue-200 dark:hover:border-blue-800 shadow-none px-1.5 font-medium text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                              defaultSelectedOption={
                                (oportunidad as any).laboratorio_id || oportunidad.empresa_nombre
                                  ? {
                                      label: oportunidad.empresa_nombre || oportunidad.cliente?.nombre || 'Laboratorio',
                                      value: (oportunidad as any).laboratorio_id || '',
                                      subtitle: '',
                                    }
                                  : null
                              }
                            />
                          ) : (
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {oportunidad.empresa_nombre || oportunidad.cliente?.nombre || <span className="text-muted-foreground italic font-normal">Sin laboratorio</span>}
                            </p>
                          )}
                        </div>

                        {/* Contacto */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-xs text-muted-foreground">Contacto</span>
                              {(oportunidad as any).persona && (
                                <Badge variant="success" className="h-4 text-[9px] px-1">Vinculado</Badge>
                              )}
                            </div>
                            {oportunidad.estado === 'abierto' && !showContactoInline && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowContactoInline(true);
                                  setContactoInlineForm({ nombre: '', telefono: '', email: '' });
                                }}
                                className="text-[10px] text-green-600 hover:text-green-700 underline"
                              >
                                Crear nuevo
                              </button>
                            )}
                          </div>

                          {oportunidad.estado === 'abierto' && !showContactoInline && !(oportunidad as any).persona && !oportunidad.contacto_nombre && (
                            <SearchableCombobox
                              value=""
                              onValueChange={(id) => {
                                const opt = personaCacheRef.current.find(o => o.value === id) ?? null;
                                handleChangeContactoPersona(id, opt);
                              }}
                              searchFn={searchPersonas}
                              placeholder="Buscar contacto..."
                              emptyMessage={
                                (oportunidad as any).laboratorio_id
                                  ? "Sin contactos en este laboratorio — usá 'Crear nuevo'"
                                  : "Sin resultados — usá 'Crear nuevo'"
                              }
                              triggerClassName="h-auto min-h-[28px] border border-transparent hover:border-green-200 dark:hover:border-green-800 shadow-none px-1.5 font-medium text-gray-900 dark:text-gray-100 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-300 cursor-pointer"
                              defaultSelectedOption={null}
                            />
                          )}

                          {showContactoInline ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={contactoInlineForm.nombre}
                                onChange={(e) => setContactoInlineForm({ ...contactoInlineForm, nombre: e.target.value })}
                                placeholder="Nombre *"
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={contactoInlineForm.telefono}
                                  onChange={(e) => setContactoInlineForm({ ...contactoInlineForm, telefono: e.target.value })}
                                  placeholder="Teléfono"
                                  className="h-8 text-sm"
                                />
                                <Input
                                  value={contactoInlineForm.email}
                                  onChange={(e) => setContactoInlineForm({ ...contactoInlineForm, email: e.target.value })}
                                  placeholder="Email"
                                  type="email"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <Button type="text" size="tiny" className="h-6 text-xs" onClick={() => { setShowContactoInline(false); setContactoInlineForm({ nombre: '', telefono: '', email: '' }); }}>
                                  Cancelar
                                </Button>
                                <Button type="primary" size="tiny" className="h-6 text-xs bg-green-600 hover:bg-green-700" onClick={handleGuardarContactoRapido} disabled={saving || !contactoInlineForm.nombre.trim()}>
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          ) : editingField === 'contacto_nombre' ? (
                            <Input
                              className="h-8 text-sm font-medium"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleInlineSave('contacto_nombre', editValue.trim() || null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave('contacto_nombre', editValue.trim() || null);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                            />
                          ) : editingField === 'persona_picker' ? (
                            <SearchableCombobox
                              value=""
                              onValueChange={(id) => {
                                const opt = personaCacheRef.current.find(o => o.value === id) ?? null;
                                handleChangeContactoPersona(id, opt);
                                setEditingField(null);
                              }}
                              searchFn={searchPersonas}
                              placeholder="Buscar contacto..."
                              emptyMessage={
                                (oportunidad as any).laboratorio_id
                                  ? "Sin contactos en este laboratorio"
                                  : "Sin resultados"
                              }
                              triggerClassName="h-auto min-h-[28px] border border-transparent hover:border-green-200 dark:hover:border-green-800 shadow-none px-1.5 font-medium text-gray-900 dark:text-gray-100 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-300 cursor-pointer"
                              defaultSelectedOption={null}
                            />
                          ) : (oportunidad as any).persona ? (
                            <div className="group">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{(oportunidad as any).persona.nombre_completo}</p>
                                {oportunidad.estado === 'abierto' && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingField('persona_picker')}
                                    className="text-[10px] text-green-600 hover:text-green-700 underline opacity-0 group-hover:opacity-100"
                                  >
                                    Cambiar
                                  </button>
                                )}
                              </div>
                              {(() => {
                                const tel = parseContactList((oportunidad as any).persona.telefono)[0];
                                const mail = parseContactList((oportunidad as any).persona.email)[0];
                                if (!tel && !mail) return null;
                                return (
                                  <div className="mt-1.5 space-y-0.5">
                                    {tel && <ContactoCopiable tipo="telefono" valor={tel} />}
                                    {mail && <ContactoCopiable tipo="email" valor={mail} />}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : oportunidad.contacto_nombre ? (
                            <div className="group">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{oportunidad.contacto_nombre}</p>
                                {oportunidad.estado === 'abierto' && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingField('persona_picker')}
                                    className="text-[10px] text-green-600 hover:text-green-700 underline opacity-0 group-hover:opacity-100"
                                  >
                                    Vincular existente
                                  </button>
                                )}
                              </div>
                              {(oportunidad.contacto_telefono || oportunidad.contacto_email) && (
                                <div className="mt-1.5 space-y-0.5">
                                  {oportunidad.contacto_telefono && (
                                    <ContactoCopiable tipo="telefono" valor={oportunidad.contacto_telefono} />
                                  )}
                                  {oportunidad.contacto_email && (
                                    <ContactoCopiable tipo="email" valor={oportunidad.contacto_email} />
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Sin contacto</p>
                          )}
                        </div>

                        {/* Seguimiento (multi-persona) */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-amber-600" />
                              <span className="text-xs text-muted-foreground">Seguimiento</span>
                            </div>
                            {oportunidad.creador && (
                              <span className="text-[10px] text-muted-foreground">
                                Creada por {oportunidad.creador.nombre_completo}
                              </span>
                            )}
                          </div>
                          {oportunidad.estado === 'abierto' ? (
                            <Popover open={seguimientoPopoverOpen} onOpenChange={setSeguimientoPopoverOpen}>
                              <PopoverTrigger asChild>
                                <button className="text-left font-medium text-gray-900 dark:text-gray-100 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300 rounded px-1.5 -mx-1.5 py-0.5 transition-colors w-full cursor-pointer border border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                                  {(oportunidad.usuarios_asignados?.length || 0) > 0
                                    ? oportunidad.usuarios_asignados!.map(u => u.nombre_completo).join(', ')
                                    : <span className="text-muted-foreground italic font-normal">Sin asignar</span>}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-1" align="start">
                                {(teamMembers || []).map((member) => {
                                  const isAssigned = (oportunidad.usuarios_asignados || []).some(u => u.id === member.id);
                                  return (
                                    <button
                                      key={member.id}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2",
                                        isAssigned && "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                                      )}
                                      onClick={() => handleToggleSeguimiento(member.id)}
                                    >
                                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-xs font-medium text-purple-700 dark:text-purple-300">
                                        {isAssigned ? <Check className="h-3.5 w-3.5" /> : member.nombre.charAt(0)}
                                      </div>
                                      {member.nombre}
                                    </button>
                                  );
                                })}
                                {(oportunidad.usuarios_asignados?.length || 0) > 0 && (
                                  <button
                                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 mt-1"
                                    onClick={handleClearSeguimiento}
                                  >
                                    <X className="h-4 w-4" />
                                    Quitar todos
                                  </button>
                                )}
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {(oportunidad.usuarios_asignados?.length || 0) > 0
                                ? oportunidad.usuarios_asignados!.map(u => u.nombre_completo).join(', ')
                                : <span className="text-muted-foreground italic font-normal">Sin asignar</span>}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Descripción */}
                      <section
                        className={cn(
                          "rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4",
                          oportunidad.estado === 'abierto' && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        )}
                        onClick={() => startEditing('descripcion', oportunidad.descripcion || '')}
                      >
                        <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                        {editingField === 'descripcion' ? (
                          <Textarea
                            className="text-sm min-h-[60px]"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleInlineSave('descripcion', editValue.trim() || null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {oportunidad.descripcion || <span className="text-muted-foreground italic">Sin descripción</span>}
                          </p>
                        )}
                      </section>

                      {/* Fuente del Lead */}
                      <section className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
                        <p className="text-xs text-muted-foreground mb-1">Fuente del Lead</p>
                        {(() => {
                          const fuenteKey = (oportunidad as { fuente?: string }).fuente;
                          const info = resolveFuenteLead(fuenteKey);
                          if (!info) {
                            return <p className="text-sm text-muted-foreground italic">Sin especificar</p>;
                          }
                          const Icon = info.icon;
                          return (
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{info.label}</span>
                            </div>
                          );
                        })()}
                      </section>
                      {/* Pedido Section - for ganado/finalizado deals or when pedido exists */}
                      {(['ganado', 'finalizado'].includes(oportunidad.estado) || oportunidad.pedido_id) && (
                        <section className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 overflow-hidden">
                          {oportunidad.pedido_id && pedidoVinculado ? (
                            <div className="p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-emerald-600" />
                                  <span className="text-sm font-semibold">Pedido {pedidoVinculado.numero || ''}</span>
                                </div>
                                <Badge
                                  variant={
                                    pedidoVinculado.estado === 'entregado' ? 'success' :
                                    pedidoVinculado.estado === 'cancelado' ? 'destructive' :
                                    pedidoVinculado.estado === 'en_proceso' || pedidoVinculado.estado === 'preparando' ? 'info' :
                                    'secondary'
                                  }
                                  className="capitalize"
                                >
                                  {pedidoVinculado.estado?.replace(/_/g, ' ') || 'pendiente'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {pedidoVinculado.total > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-semibold">{formatCurrency(pedidoVinculado.total)}</p>
                                  </div>
                                )}
                                {pedidoVinculado.fecha && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Fecha</p>
                                    <p className="font-medium">{fmtFecha(pedidoVinculado.fecha, 'd MMM yyyy')}</p>
                                  </div>
                                )}
                              </div>
                              <a
                                href={`/dashboard/pedidos-ventas?id=${oportunidad.pedido_id}`}
                                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                              >
                                Ver pedido completo <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : oportunidad.pedido_id ? (
                            <div className="p-3 sm:p-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium">Pedido vinculado</span>
                              </div>
                              <a
                                href={`/dashboard/pedidos-ventas?id=${oportunidad.pedido_id}`}
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                              >
                                Ver pedido <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="p-3 sm:p-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Deal ganado</p>
                                <p className="text-xs text-muted-foreground">Creá un pedido para enviar a logística</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => setShowCrearPedido(true)}
                                className="gap-1.5"
                              >
                                <Package className="h-3.5 w-3.5" />
                                Crear Pedido
                              </Button>
                            </div>
                          )}
                        </section>
                      )}
                      </motion.div>
                    </TabsContent>

                    {/* Tab Presupuestos */}
                    <TabsContent value="presupuestos" className="space-y-3 mt-0 p-4">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Presupuestos Asociados ({presupuestos?.length || 0})
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="default"
                              size="tiny"
                              icon={<Plus className="text-purple-600" />}
                              className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                              Nuevo
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={abrirPresupuestoEquipo}>
                              <Box className="h-4 w-4 mr-2 text-emerald-600" />
                              Presupuesto de equipos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowPresupuestoDialog(true)}>
                              <FileText className="h-4 w-4 mr-2 text-purple-600" />
                              Presupuesto general
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {!presupuestos || presupuestos.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No hay presupuestos asociados</p>
                          <p className="text-sm mt-1">Crea uno para avanzar en el pipeline</p>
                          <div className="flex justify-center gap-2 mt-4">
                            <Button
                              type="default"
                              size="tiny"
                              onClick={abrirPresupuestoEquipo}
                              icon={<Box className="text-emerald-600" />}
                              className="border-zinc-200 dark:border-zinc-700"
                            >
                              De equipos
                            </Button>
                            <Button
                              type="default"
                              size="tiny"
                              onClick={() => setShowPresupuestoDialog(true)}
                              icon={<FileText className="text-purple-600" />}
                              className="border-zinc-200 dark:border-zinc-700"
                            >
                              General
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <AnimatePresence mode="popLayout">
                          {presupuestos.map((pres, index) => {
                            const presAny = pres as any;
                            return (
                              <motion.div
                                key={pres.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                                className={cn(
                                  "p-4 rounded-xl border transition-all hover:shadow-md",
                                  pres.estado === 'aceptado'
                                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                                    : pres.estado === 'rechazado'
                                    ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20"
                                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-purple-300 dark:hover:border-purple-700"
                                )}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="font-semibold">{pres.numero}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {pres.fecha_emision && fmtFecha(pres.fecha_emision, 'd MMM yyyy')}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg">{formatCurrency(pres.total || 0)}</p>
                                    <Badge
                                      variant={
                                        pres.estado === 'aceptado' ? 'success' :
                                        pres.estado === 'rechazado' ? 'destructive' :
                                        pres.estado === 'enviado' || pres.estado === 'visto' ? 'info' : 'secondary'
                                      }
                                    >
                                      {pres.estado === 'visto' ? 'Visto' : pres.estado}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Info de firma cuando está aceptado */}
                                {pres.estado === 'aceptado' && (
                                  <div className="mb-3 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span className="font-medium text-sm">Firmado digitalmente</span>
                                    </div>
                                    {presAny.firma_nombre && (
                                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                                        Por: {presAny.firma_nombre}
                                      </p>
                                    )}
                                    {presAny.fecha_firma && (
                                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                                        {fmtFecha(presAny.fecha_firma, "d MMM yyyy 'a las' HH:mm")}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Info cuando fue visto */}
                                {pres.estado === 'visto' && presAny.fecha_visto && (
                                  <div className="mb-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Visto el {fmtFecha(presAny.fecha_visto, "d MMM 'a las' HH:mm")}</span>
                                  </div>
                                )}

                                {/* Info de rechazo */}
                                {pres.estado === 'rechazado' && (
                                  <div className="mb-3 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                                      <XCircle className="h-4 w-4" />
                                      <span className="font-medium text-sm">Rechazado</span>
                                    </div>
                                    {pres.motivo_rechazo && (
                                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        {pres.motivo_rechazo}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Botones de acción */}
                                <div className="flex gap-2">
                                  {/* Ver presupuesto: abre el detail sheet inline sin cambiar de URL.
                                      Para presupuestos generales (sin sheet inline aún) cae al link. */}
                                  <Button
                                    type="outline"
                                    size="tiny"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPresupuestoInline(pres as { id: string; _source?: 'general' | 'equipos' });
                                    }}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                    Ver presupuesto
                                  </Button>

                                  {/* Ver documento de firma: link público que se manda al cliente */}
                                  {presAny.token_firma && (
                                    <Button
                                      type="outline"
                                      size="tiny"
                                      className="flex-1"
                                      onClick={() => openInternalLink(`/p/${presAny.token_firma}`)}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                      Doc. firma
                                    </Button>
                                  )}

                                  {/* Botón Enviar - solo para borrador, enviado o visto */}
                                  {(pres.estado === 'borrador' || pres.estado === 'enviado' || pres.estado === 'visto') && (
                                    <Button
                                      type="outline"
                                      size="tiny"
                                      className="flex-1 text-purple-600 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950/30"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEnviarPresupuesto(pres);
                                      }}
                                    >
                                      <Send className="h-3.5 w-3.5 mr-1.5" />
                                      {pres.estado === 'borrador' ? 'Enviar' : 'Reenviar'}
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Timeline ahora vive en el chatter panel de la derecha */}
                      </motion.div>
                    </TabsContent>

                    {/* Tab Actividades */}
                    <TabsContent value="actividades" className="space-y-3 mt-0 p-4">
                      {/* Quick Add Buttons - Estilo Odoo. flex-wrap → se acomodan en
                          varias líneas en vez de un scroll horizontal infinito. */}
                      <div className="flex flex-wrap items-center gap-1.5 pb-1">
                        {visibleTipos.map((tipoConfig) => {
                          const TipoIcon = tipoConfig.icon;
                          const isSelected = selectedActTipo === tipoConfig.id;
                          return (
                            <button
                              key={tipoConfig.id}
                              onClick={() => setSelectedActTipo(isSelected ? null : tipoConfig.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
                                isSelected ? tipoConfig.bgActive : tipoConfig.bgInactive
                              )}
                            >
                              <TipoIcon className="h-4 w-4" />
                              {tipoConfig.label}
                            </button>
                          );
                        })}
                        {/* La creación de tipos se administra en Configuración → CRM */}
                        <Link
                          href="/dashboard/configuracion/crm"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 border border-dashed border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Settings className="h-4 w-4" />
                          Administrar
                        </Link>
                      </div>

                      {/* Panel Inline para crear actividad */}
                      {selectedActTipo && (() => {
                        const tipoConfig = mergedTipos.find(t => t.id === selectedActTipo)!;
                        return (
                          <div className={cn(
                            "rounded-xl border p-4 space-y-3 animate-in slide-in-from-top-2 duration-200",
                            tipoConfig.panelBg
                          )}>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs">Fecha límite</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
                                    >
                                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className={actForm.fecha_limite ? '' : 'text-muted-foreground'}>
                                        {actForm.fecha_limite
                                          ? fmtFecha(actForm.fecha_limite, 'dd/MM/yyyy')
                                          : 'DD/MM/YYYY'}
                                      </span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={actForm.fecha_limite ? parseISO(actForm.fecha_limite) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          const yyyy = date.getFullYear();
                                          const mm = String(date.getMonth() + 1).padStart(2, '0');
                                          const dd = String(date.getDate()).padStart(2, '0');
                                          setActForm({ ...actForm, fecha_limite: `${yyyy}-${mm}-${dd}` });
                                        }
                                      }}
                                      locale={es}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <Label className="text-xs">Hora</Label>
                                <Input
                                  type="time"
                                  value={actForm.hora}
                                  onChange={(e) => setActForm({ ...actForm, hora: e.target.value })}
                                  className="mt-1 h-9"
                                  placeholder="--:--"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Asignado</Label>
                                <select
                                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  value={actForm.asignado_id}
                                  onChange={(e) => setActForm({ ...actForm, asignado_id: e.target.value })}
                                >
                                  <option value="">Sin asignar</option>
                                  {(teamMembers || []).map(m => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Prioridad</Label>
                                <select
                                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                  value={actForm.prioridad}
                                  onChange={(e) => setActForm({ ...actForm, prioridad: e.target.value as any })}
                                >
                                  <option value="baja">Baja</option>
                                  <option value="normal">Normal</option>
                                  <option value="alta">Alta</option>
                                  <option value="urgente">Urgente</option>
                                </select>
                              </div>
                            </div>
                            <Textarea
                              value={actForm.nota}
                              onChange={(e) => setActForm({ ...actForm, nota: e.target.value })}
                              placeholder="Nota opcional..."
                              rows={2}
                              className="resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button type="text" size="tiny" onClick={() => setSelectedActTipo(null)}>
                                Cancelar
                              </Button>
                              <Button
                                type="primary"
                                size="tiny"
                                onClick={handleCrearActProgramada}
                                disabled={saving || !actForm.fecha_limite}
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                Programar
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Lista de actividades pendientes */}
                      {!actividadesProgramadas || actividadesProgramadas.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No hay actividades programadas</p>
                          <p className="text-sm mt-1">Selecciona un tipo arriba para programar una</p>
                        </div>
                      ) : (() => {
                        const pendientes = actividadesProgramadas.filter(a => a.estado === 'pendiente');
                        const completadas = actividadesProgramadas.filter(a => a.estado === 'completada');
                        return (
                        <div className="space-y-4">
                        {pendientes.length > 0 && (
                        <div className="space-y-2">
                          {pendientes.map((act) => {
                            const tipoConfig = mergedTipos.find(t => t.id === act.tipo);
                            const ActIcon = tipoConfig?.icon || Clock;
                            // Parser defensivo: fecha_limite puede venir como
                            // 'YYYY-MM-DD' (legacy) o ISO timestamp completo.
                            // Si es null/undefined o no parseable, dejamos fechaLimiteDate en null.
                            const fechaLimiteDate = (() => {
                              if (!act.fecha_limite) return null;
                              const s = String(act.fecha_limite);
                              const d = new Date(s.length === 10 ? s + 'T12:00:00' : s);
                              return isNaN(d.getTime()) ? null : d;
                            })();
                            const todayYmd = new Date().toISOString().split('T')[0];
                            const actYmd = fechaLimiteDate ? fechaLimiteDate.toISOString().split('T')[0] : null;
                            const isOverdue = !!fechaLimiteDate && fechaLimiteDate < new Date(new Date().toDateString());
                            const isToday = !!actYmd && actYmd === todayYmd;
                            const prioConfig = PRIORIDAD_CONFIG[act.prioridad];

                            return (
                              <div
                                key={act.id}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                                  isOverdue && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
                                  isToday && !isOverdue && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
                                  !isOverdue && !isToday && "border-gray-200 dark:border-gray-800"
                                )}
                              >
                                {/* Complete button → abre dialog para comentario de finalización */}
                                <button
                                  onClick={() => { setCompleteAct(act); setCompleteActOpen(true); }}
                                  disabled={completandoId === act.id}
                                  className={cn(
                                    "mt-0.5 p-1.5 rounded-full border-2 shrink-0 transition-colors",
                                    "hover:bg-emerald-100 hover:border-emerald-400 dark:hover:bg-emerald-900/30",
                                    isOverdue ? "border-red-300 dark:border-red-700" : "border-gray-300 dark:border-gray-600"
                                  )}
                                >
                                  {completandoId === act.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                  ) : (
                                    <CheckSquare className="h-4 w-4 text-gray-400 hover:text-emerald-500" />
                                  )}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <ActIcon className={cn("h-4 w-4 shrink-0", tipoConfig?.color)} />
                                      <span className="font-medium text-sm">
                                        {act.titulo || tipoConfig?.label}
                                      </span>
                                      {act.prioridad !== 'normal' && (
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", prioConfig.bg, prioConfig.color)}>
                                          {prioConfig.label}
                                        </span>
                                      )}
                                    </div>
                                    <span className={cn(
                                      "text-xs whitespace-nowrap shrink-0",
                                      isOverdue ? "text-red-600 font-medium dark:text-red-400" :
                                      isToday ? "text-amber-600 font-medium dark:text-amber-400" :
                                      "text-muted-foreground"
                                    )}>
                                      {isOverdue ? 'Vencida' : isToday ? 'Hoy' : fechaLimiteDate ? format(fechaLimiteDate, "d MMM", { locale: es }) : '—'}
                                    </span>
                                  </div>
                                  {act.nota && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{act.nota}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                    {act.asignado_nombre && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {act.asignado_nombre}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => { setEditAct(act); setEditActOpen(true); }}
                                      className="hover:text-purple-600 transition-colors"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleCancelarAct(act.id)}
                                      className="hover:text-red-500 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        )}

                        {completadas.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
                            Completadas ({completadas.length})
                          </p>
                          {completadas.map((act) => {
                            const tipoConfig = mergedTipos.find(t => t.id === act.tipo);
                            const ActIcon = tipoConfig?.icon || Clock;
                            const completadaDate = act.completada_at ? new Date(act.completada_at) : null;
                            return (
                              <div
                                key={act.id}
                                className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40"
                              >
                                <div className="mt-0.5 p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                                  <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <ActIcon className={cn("h-4 w-4 shrink-0 opacity-60", tipoConfig?.color)} />
                                    <span className="font-medium text-sm line-through text-muted-foreground">
                                      {act.titulo || tipoConfig?.label}
                                    </span>
                                  </div>
                                  {act.resultado && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 whitespace-pre-wrap">
                                      {act.resultado}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                    {completadaDate && (
                                      <span>Completada {fmtFecha(act.completada_at, "d MMM", "")}</span>
                                    )}
                                    {act.completada_por_nombre && <span>· {act.completada_por_nombre}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        )}
                        </div>
                        );
                      })()}
                    </TabsContent>

                    {/* Tab Equipos */}
                    <TabsContent value="equipos" className="space-y-4 mt-0 p-4">
                      {/* Sección: Equipos Cotizados (en presupuesto, sin unidad aún) */}
                      {equiposCotizados.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-semibold">Equipos Cotizados</span>
                            <Badge variant="secondary" className="h-5 text-[10px]">
                              {equiposCotizados.length}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              · en presupuesto, sin unidad reservada
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {equiposCotizados.map((it: any) => {
                              const conflictos = (it.conflictos_otras_oportunidades || []) as Array<{
                                oportunidad_id: string;
                                oportunidad_nombre: string;
                                estado_item: string;
                              }>;
                              return (
                                <div
                                  key={it.id}
                                  className={cn(
                                    "p-4 rounded-xl border",
                                    conflictos.length > 0
                                      ? "border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20"
                                      : "border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                        {[it.equipo_marca, it.equipo_modelo].filter(Boolean).join(' ') || it.descripcion || 'Equipo'}
                                      </p>
                                      {it.equipo_tipo && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{it.equipo_tipo}</p>
                                      )}
                                      {it.unidad_numero_serie && (
                                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                          S/N: {it.unidad_numero_serie}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="shrink-0">Cotizado</Badge>
                                  </div>
                                  {conflictos.length > 0 && (
                                    <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                                      <span className="text-amber-600 dark:text-amber-400 shrink-0">⚠</span>
                                      <div className="text-xs text-amber-800 dark:text-amber-300 min-w-0">
                                        <p className="font-medium">
                                          También {conflictos.length === 1 ? 'está' : 'está'} en {conflictos.length === 1 ? 'otra oportunidad' : `${conflictos.length} oportunidades`}:
                                        </p>
                                        <ul className="mt-0.5 space-y-0.5">
                                          {conflictos.map((c) => (
                                            <li key={c.oportunidad_id} className="truncate">
                                              · <span className="font-medium">{c.oportunidad_nombre}</span>{' '}
                                              <span className="opacity-70">({c.estado_item})</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-3 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      Cantidad: <span className="font-medium text-foreground">{it.cantidad || 1}</span>
                                    </span>
                                    {it.precio_unitario && (
                                      <span className="font-mono font-semibold text-purple-700 dark:text-purple-300">
                                        {formatCurrency(Number(it.precio_unitario) * Number(it.cantidad || 1), it.equipo_moneda || 'ARS')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sección: Equipos Reservados */}
                      {equiposReservados && equiposReservados.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Lock className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-semibold">Equipos Reservados</span>
                            <Badge variant="success" className="h-5 text-[10px]">
                              {equiposReservados.length}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {equiposReservados.map((eq: any) => (
                              <div
                                key={eq.id}
                                className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                      {[eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nombre || 'Sin nombre'}
                                    </p>
                                    <p className="text-sm text-muted-foreground font-mono mt-0.5">
                                      S/N: {eq.numero_serie || '-'}
                                    </p>
                                  </div>
                                  <Badge variant="success" className="shrink-0">Reservado</Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {eq.tipo && (
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                      {eq.tipo}
                                    </span>
                                  )}
                                  {eq.condicion && (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full border",
                                      eq.condicion === 'reacondicionado' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800' :
                                      eq.condicion === 'usado' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800' :
                                      eq.condicion === 'demo' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' :
                                      eq.condicion === 'outlet' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' :
                                      'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                                    )}>
                                      {eq.condicion === 'reacondicionado' ? 'Reacondicionado' : eq.condicion.charAt(0).toUpperCase() + eq.condicion.slice(1)}
                                    </span>
                                  )}
                                  {eq.precio_lista && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                      {formatCurrency(eq.precio_lista, eq.precio_lista_moneda || 'ARS')}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    {eq.fecha_reserva && `Reservado ${fmtRel(eq.fecha_reserva)}`}
                                  </span>
                                  <Button
                                    type="text"
                                    size="tiny"
                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    onClick={() => handleLiberarReserva(eq.id)}
                                    disabled={saving}
                                  >
                                    <Unlock className="h-3.5 w-3.5 mr-1" />
                                    Liberar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sección: Pedidos de Compra */}
                      {pedidosEquipos && pedidosEquipos.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ShoppingCart className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-semibold">Pedidos de Compra</span>
                            <Badge variant="warning" className="h-5 text-[10px]">
                              {pedidosEquipos.length}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pedidosEquipos.map((ped: any) => {
                              const estadoColors: Record<string, string> = {
                                pendiente: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
                                solicitado: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
                                en_transito: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20',
                                recibido: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
                                cancelado: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60',
                              };
                              const estadoBadge: Record<string, 'warning' | 'info' | 'secondary' | 'success' | 'destructive'> = {
                                pendiente: 'warning',
                                solicitado: 'info',
                                en_transito: 'info',
                                recibido: 'success',
                                cancelado: 'secondary',
                              };

                              return (
                                <div
                                  key={ped.id}
                                  className={cn(
                                    "p-4 rounded-xl border transition-colors",
                                    estadoColors[ped.estado] || estadoColors.pendiente
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                        {ped.equipo_nombre || ped.marca || 'Equipo'}
                                        {ped.modelo && ` ${ped.modelo}`}
                                      </p>
                                      <p className="text-sm text-muted-foreground mt-0.5">
                                        Cantidad: {ped.cantidad || 1}
                                      </p>
                                    </div>
                                    <Badge variant={estadoBadge[ped.estado] || 'secondary'} className="shrink-0">
                                      {ped.estado === 'en_transito' && <Truck className="h-3 w-3 mr-1" />}
                                      {ped.estado?.replace('_', ' ')}
                                    </Badge>
                                  </div>

                                  {ped.especificaciones && (
                                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                      {ped.especificaciones}
                                    </p>
                                  )}

                                  <div className="mt-3 flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      {ped.fecha_estimada_llegada && (
                                        <p>Llegada est.: {fmtFecha(ped.fecha_estimada_llegada, 'd MMM yyyy')}</p>
                                      )}
                                      {ped.created_at && (
                                        <p>Creado {fmtRel(ped.created_at)}</p>
                                      )}
                                    </div>
                                    {ped.estado === 'pendiente' && (
                                      <Button
                                        type="text"
                                        size="tiny"
                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        onClick={() => handleCancelarPedido(ped.id)}
                                        disabled={saving}
                                      >
                                        <XCircle className="h-3.5 w-3.5 mr-1" />
                                        Cancelar
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sección: Buscar y Reservar */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-semibold">Equipos</span>
                        </div>
                        <button
                          onClick={() => {
                            setShowBuscadorEquipos(!showBuscadorEquipos);
                            if (!showBuscadorEquipos && equiposDisponibles.length === 0) {
                              handleBuscarEquiposDisponibles();
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all text-sm font-medium",
                            showBuscadorEquipos
                              ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300"
                              : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-purple-300 hover:text-purple-600 dark:hover:border-purple-700 dark:hover:text-purple-400"
                          )}
                        >
                          <Search className="h-4 w-4" />
                          {showBuscadorEquipos ? 'Ocultar buscador' : 'Buscar equipos en stock o catálogo'}
                        </button>

                        {showBuscadorEquipos && (
                          <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                value={searchEquipo}
                                onChange={(e) => setSearchEquipo(e.target.value)}
                                placeholder="Filtrar por marca, modelo, serie..."
                                className="pl-9"
                              />
                            </div>

                            {buscandoEquipos ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {/* Unidades en stock (listado plano). Solo al navegar
                                    SIN buscar: con término de búsqueda usamos la vista
                                    AGRUPADA por modelo (stock_count + click para elegir
                                    unidad), más abajo. */}
                                {(() => {
                                  if (searchEquipo && searchEquipo.trim().length >= 2) return null;
                                  const filteredStock = equiposDisponibles.filter((eq: any) => {
                                    if (!searchEquipo) return true;
                                    const term = searchEquipo.toLowerCase();
                                    return (
                                      eq.marca?.toLowerCase().includes(term) ||
                                      eq.modelo?.toLowerCase().includes(term) ||
                                      eq.numero_serie?.toLowerCase().includes(term) ||
                                      eq.tipo?.toLowerCase().includes(term)
                                    );
                                  });
                                  return filteredStock.length > 0 ? (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Package className="h-3.5 w-3.5 text-emerald-600" />
                                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                          En stock ({filteredStock.length})
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {filteredStock.map((eq: any, idx: number) => (
                                          <button
                                            key={`stock-${eq.equipo_unidad_id || eq.id || idx}`}
                                            onClick={() => handleReservarEquipo(eq.equipo_unidad_id || eq.id)}
                                            disabled={saving}
                                            className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left group"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                                                  {[eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nombre || 'Sin nombre'}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                                  S/N: {eq.numero_serie || '-'}
                                                </p>
                                              </div>
                                              <Lock className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                              {eq.tipo && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                                                  {eq.tipo}
                                                </span>
                                              )}
                                              {eq.condicion && (
                                                <span className={cn(
                                                  "text-[10px] px-1.5 py-0.5 rounded border",
                                                  eq.condicion === 'reacondicionado' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800' :
                                                  eq.condicion === 'usado' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800' :
                                                  eq.condicion === 'demo' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' :
                                                  eq.condicion === 'outlet' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' :
                                                  'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                                                )}>
                                                  {eq.condicion === 'reacondicionado' ? 'Reacondicionado' : eq.condicion.charAt(0).toUpperCase() + eq.condicion.slice(1)}
                                                </span>
                                              )}
                                              {eq.precio_lista && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                                  {formatCurrency(eq.precio_lista, eq.precio_lista_moneda || 'ARS')}
                                                </span>
                                              )}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}

                                {/* Catálogo (sin stock) */}
                                {(() => {
                                  if (!searchEquipo || searchEquipo.length < 2) {
                                    return equiposDisponibles.length === 0 && !searchEquipo ? (
                                      <div className="text-center py-6 text-muted-foreground">
                                        <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No hay equipos en stock</p>
                                        <p className="text-xs mt-1">Escribí para buscar en el catálogo</p>
                                      </div>
                                    ) : null;
                                  }
                                  const term = searchEquipo.toLowerCase();
                                  const filteredCatalogo = equiposCatalogo.filter((eq: any) =>
                                    eq.marca?.toLowerCase().includes(term) ||
                                    eq.modelo?.toLowerCase().includes(term) ||
                                    eq.tipo?.toLowerCase().includes(term) ||
                                    eq.categoria?.toLowerCase().includes(term)
                                  ).slice(0, 30);
                                  if (filteredCatalogo.length === 0) return null;

                                  // Catálogo con stock real (estado_general='stock') vs todos (para faltante)
                                  const catalogoConStock = filteredCatalogo.filter((eq: any) => Number(eq.stock_count) > 0);
                                  const catalogoSinStock = filteredCatalogo;

                                  return (
                                    <>
                                      {catalogoConStock.length > 0 && (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <Package className="h-3.5 w-3.5 text-emerald-600" />
                                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                              En stock — modelos con unidades disponibles ({catalogoConStock.length})
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {catalogoConStock.map((eq: any) => (
                                              <button
                                                key={`cat-stock-${eq.id}`}
                                                onClick={() => handleExpandirUnidadesEquipo(eq.id, [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nombre || 'Equipo')}
                                                disabled={saving}
                                                className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-left group"
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate text-emerald-700 dark:text-emerald-300">
                                                      {[eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nombre || 'Sin nombre'}
                                                    </p>
                                                    {eq.categoria && (
                                                      <p className="text-xs text-muted-foreground mt-0.5">{eq.categoria}</p>
                                                    )}
                                                  </div>
                                                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                                    {eq.stock_count} en stock
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-2 group-hover:underline">
                                                  Click para ver y reservar una unidad →
                                                </p>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {catalogoSinStock.length > 0 && (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />
                                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                              Marcar como faltante (pedir nuevo) — ({catalogoSinStock.length})
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {catalogoSinStock.map((eq: any) => (
                                              <button
                                                key={`cat-${eq.id}`}
                                                onClick={() => handleCrearPedidoEquipo(eq.id, [eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nombre || 'Equipo')}
                                                disabled={saving}
                                                className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left group"
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                                      {[eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.nombre || 'Sin nombre'}
                                                    </p>
                                                    {eq.categoria && (
                                                      <p className="text-xs text-muted-foreground mt-0.5">{eq.categoria}</p>
                                                    )}
                                                  </div>
                                                  <ShoppingCart className="h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                  {eq.tipo && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                                                      {eq.tipo}
                                                    </span>
                                                  )}
                                                  {eq.precio_lista && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                                                      {formatCurrency(eq.precio_lista, eq.precio_lista_moneda || 'ARS')}
                                                    </span>
                                                  )}
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                                                    Marcar como faltante
                                                  </span>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sección: Productos / Insumos */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold">Productos / Insumos</span>
                          {productosItems.length > 0 && (
                            <Badge variant="secondary" className="h-5 text-[10px]">
                              {productosItems.length}
                            </Badge>
                          )}
                        </div>

                        {/* Lista de productos agregados */}
                        {productosItems.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {productosItems.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 group"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {item.producto_nombre || item.descripcion || 'Producto'}
                                  </p>
                                  {item.producto_codigo && (
                                    <p className="text-xs text-muted-foreground font-mono">{item.producto_codigo}</p>
                                  )}
                                </div>

                                {/* Cantidad - editable */}
                                <div className="shrink-0">
                                  {editingItemId === item.id && editingItemField === 'cantidad' ? (
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs text-center"
                                      value={editingItemValue}
                                      onChange={(e) => setEditingItemValue(e.target.value)}
                                      onBlur={() => {
                                        const val = parseInt(editingItemValue);
                                        if (val > 0 && val !== item.cantidad) {
                                          handleUpdateItem(item.id, 'cantidad', val);
                                        } else {
                                          setEditingItemId(null);
                                          setEditingItemField(null);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                        if (e.key === 'Escape') { setEditingItemId(null); setEditingItemField(null); }
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      className="px-2 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                      onClick={() => { setEditingItemId(item.id); setEditingItemField('cantidad'); setEditingItemValue(String(item.cantidad || 1)); }}
                                    >
                                      x{item.cantidad || 1}
                                    </button>
                                  )}
                                </div>

                                {/* Precio - editable */}
                                <div className="shrink-0">
                                  {editingItemId === item.id && editingItemField === 'precio_unitario' ? (
                                    <Input
                                      type="number"
                                      className="w-24 h-7 text-xs text-right"
                                      value={editingItemValue}
                                      onChange={(e) => setEditingItemValue(e.target.value)}
                                      onBlur={() => {
                                        const val = parseFloat(editingItemValue);
                                        if (val >= 0 && val !== item.precio_unitario) {
                                          handleUpdateItem(item.id, 'precio_unitario', val);
                                        } else {
                                          setEditingItemId(null);
                                          setEditingItemField(null);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                        if (e.key === 'Escape') { setEditingItemId(null); setEditingItemField(null); }
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      className="px-2 py-0.5 rounded text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                      onClick={() => { setEditingItemId(item.id); setEditingItemField('precio_unitario'); setEditingItemValue(String(item.precio_unitario || 0)); }}
                                    >
                                      {formatCurrency(item.precio_unitario || 0)}
                                    </button>
                                  )}
                                </div>

                                {/* Subtotal */}
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0 w-20 text-right">
                                  {formatCurrency((item.precio_unitario || 0) * (item.cantidad || 1))}
                                </span>

                                {/* Eliminar */}
                                <button
                                  className="shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => handleEliminarItem(item.id)}
                                  disabled={saving}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Buscador de productos */}
                        <button
                          onClick={() => setShowBuscadorProductos(!showBuscadorProductos)}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all text-sm font-medium",
                            showBuscadorProductos
                              ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                              : "border-gray-300 dark:border-gray-600 text-muted-foreground hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400"
                          )}
                        >
                          <Plus className="h-4 w-4" />
                          {showBuscadorProductos ? 'Ocultar buscador' : 'Agregar producto o insumo'}
                        </button>

                        {showBuscadorProductos && (
                          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                value={searchProducto}
                                onChange={(e) => handleBuscarProductos(e.target.value)}
                                placeholder="Buscar por nombre, código..."
                                className="pl-9"
                              />
                            </div>
                            {buscandoProductos && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            )}
                            {!buscandoProductos && productosResultados.length > 0 && (
                              <div className="max-h-[250px] overflow-y-auto space-y-1">
                                {productosResultados.map((prod: any) => (
                                  <button
                                    key={prod.id}
                                    onClick={() => handleAgregarProducto(prod)}
                                    disabled={saving}
                                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-left group"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate group-hover:text-blue-700 dark:group-hover:text-blue-300">
                                        {prod.nombre}
                                      </p>
                                      <p className="text-xs text-muted-foreground font-mono">{prod.codigo || ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {(prod.precio_venta || prod.precio) && (
                                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                          {formatCurrency(prod.precio_venta || prod.precio)}
                                        </span>
                                      )}
                                      <Plus className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {!buscandoProductos && searchProducto.length >= 2 && productosResultados.length === 0 && (
                              <p className="text-center text-xs text-muted-foreground py-3">No se encontraron productos</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resumen total de items */}
                      {totalItems > 0 && (
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Total estimado ({equiposItems.length} equipo{equiposItems.length !== 1 ? 's' : ''} + {productosItems.length} producto{productosItems.length !== 1 ? 's' : ''})
                            </span>
                            <span className="text-lg font-bold">{formatCurrency(totalEstimado, totalMoneda)}</span>
                          </div>
                        </div>
                      )}

                      {/* Empty state cuando no hay nada */}
                      {(!equiposReservados || equiposReservados.length === 0) &&
                       (!pedidosEquipos || pedidosEquipos.length === 0) &&
                       equiposCotizados.length === 0 &&
                       productosItems.length === 0 &&
                       !showBuscadorEquipos &&
                       !showBuscadorProductos && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>Sin items asociados a esta oportunidad</p>
                          <p className="text-sm mt-1">Agregá equipos o productos para armar el presupuesto</p>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              )}

          </div>
          </div>

          {/* Chatter panel — wrapper único con transición de ancho.
              Ambos contenidos quedan siempre montados (absolute) y hacen
              cross-fade. El chatter conserva ancho fijo de 340px detrás del
              overflow-hidden del wrapper así no se reflowea durante la
              animación. Mantener montado evita re-fetch del historial al
              expandir. */}
          <div
            className={cn(
              'shrink-0 h-full overflow-hidden relative transition-[width] duration-300 ease-in-out',
              chatterOpen ? 'w-[340px]' : 'w-14'
            )}
          >
            <div
              className={cn(
                'absolute inset-y-0 left-0 w-[340px] h-full transition-opacity duration-200',
                chatterOpen ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'
              )}
              aria-hidden={!chatterOpen}
            >
              <OportunidadChatter
                oportunidadId={oportunidad.id}
                onCollapse={() => setChatterOpen(false)}
              />
            </div>

            <div
              className={cn(
                'absolute inset-y-0 right-0 w-14 border-l border-gray-200 dark:border-gray-800 flex flex-col items-center pt-14 pb-3 bg-gray-50/50 dark:bg-gray-900/50 transition-opacity duration-200',
                chatterOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-100'
              )}
              aria-hidden={chatterOpen}
            >
              <button
                onClick={() => setChatterOpen(true)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Mostrar historial"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog />

      {/* Picker de unidades de un equipo específico */}
      <Dialog open={pickerEquipoOpen} onOpenChange={setPickerEquipoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Unidades disponibles — {pickerEquipoNombre}</DialogTitle>
            <DialogDescription>
              Elegí qué unidad querés reservar para esta oportunidad. Cada unidad tiene su propio número de serie.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {pickerLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pickerUnidades.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No hay unidades disponibles. Pueden estar todas reservadas o vendidas.
              </div>
            ) : (
              pickerUnidades.map((u: any, i: number) => (
                <button
                  key={u.equipo_unidad_id || u.id || i}
                  onClick={async () => {
                    await handleReservarEquipo(u.equipo_unidad_id || u.id);
                    setPickerEquipoOpen(false);
                  }}
                  disabled={saving}
                  className="w-full p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {[u.marca, u.modelo].filter(Boolean).join(' ') || u.equipo_nombre || u.nombre || pickerEquipoNombre}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        S/N: {u.numero_serie || '-'}
                      </p>
                    </div>
                    {u.precio_lista && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(u.precio_lista)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.condicion && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                        {u.condicion}
                      </span>
                    )}
                    {u.tipo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-muted-foreground">
                        {u.tipo}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs de llamada y nota eliminados - ahora son inline */}

      {/* Dialog Eliminar oportunidad */}
      <Dialog open={showEliminarDialog} onOpenChange={setShowEliminarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar oportunidad
            </DialogTitle>
            <DialogDescription>
              Esta acción es permanente. Se eliminará la oportunidad <strong>{oportunidad?.nombre}</strong>,
              sus items, actividades y asignados.
              Los presupuestos generados (si los hay) <strong>no</strong> se borran, pero pierden el vínculo con esta oportunidad.
              Si hay pedidos vinculados la eliminación se bloquea.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="default" onClick={() => setShowEliminarDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="primary"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEliminar}
              disabled={saving}
            >
              {saving ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Pérdida */}
      <Dialog open={showPerdidaDialog} onOpenChange={setShowPerdidaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Marcar como Perdida
            </DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual se perdió esta oportunidad
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Motivo de pérdida <span className="text-red-500">*</span></Label>
              <Select
                value={perdidaForm.motivo || undefined}
                onValueChange={(value) => setPerdidaForm({ ...perdidaForm, motivo: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Seleccionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_PERDIDA.map((motivo) => (
                    <SelectItem key={motivo.value} value={motivo.value}>
                      {motivo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción breve (opcional)</Label>
              <Input
                value={perdidaForm.descripcion}
                onChange={(e) => setPerdidaForm({ ...perdidaForm, descripcion: e.target.value })}
                placeholder="Detalle adicional..."
                maxLength={200}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Competidor (opcional)</Label>
              <Input
                value={perdidaForm.competidor}
                onChange={(e) => setPerdidaForm({ ...perdidaForm, competidor: e.target.value })}
                placeholder="¿Quién ganó la cuenta?"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="outline" onClick={() => setShowPerdidaDialog(false)}>
              Cancelar
            </Button>
            <Button
              type="danger"
              onClick={handleMarcarPerdida}
              disabled={saving || !perdidaForm.motivo.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar Pérdida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Presupuesto */}
      <PresupuestoFormDialog
        open={showPresupuestoDialog}
        onOpenChange={setShowPresupuestoDialog}
        defaultClienteId={oportunidad.cliente_id}
        defaultPersonaId={personaIdForPresupuesto || (oportunidad as any).persona_id}
        defaultOportunidadId={oportunidad.id}
        onSuccess={handlePresupuestoCreated}
      />

      {/* Dialog Presupuesto de Equipos */}
      <PresupuestoEquipoFormDialog
        open={showPresupuestoEquipoDialog}
        onOpenChange={setShowPresupuestoEquipoDialog}
        defaultClienteId={oportunidad.cliente_id}
        defaultPersonaId={personaIdForPresupuesto || (oportunidad as any).persona_id}
        defaultOportunidadId={oportunidad.id}
        onSuccess={() => {
          setShowPresupuestoEquipoDialog(false);
          mutatePresupuestos();
          mutateItems();
        }}
      />

      {/* Ver Presupuesto Equipo inline (sheet apilado dentro del CRM) */}
      <PresupuestoEquipoDetailSheet
        open={viewPresupuestoSheetOpen}
        onOpenChange={(o) => {
          setViewPresupuestoSheetOpen(o);
          if (!o) setViewingPresupuestoEquipo(null);
        }}
        presupuesto={viewingPresupuestoEquipo}
        onRefresh={mutatePresupuestos}
        onEdit={(p) => {
          setEditingPresupuestoEquipo(p);
          setEditPresupuestoEquipoOpen(true);
        }}
      />

      {/* Ver presupuesto GENERAL inline (sheet apilado dentro del CRM) */}
      <PresupuestoDetailSheet
        open={viewPresupuestoGeneralOpen}
        onOpenChange={(o) => {
          setViewPresupuestoGeneralOpen(o);
          if (!o) setViewingPresupuestoGeneral(null);
        }}
        presupuesto={viewingPresupuestoGeneral}
        onRefresh={mutatePresupuestos}
        onEdit={(p) => {
          setEditingPresupuestoGeneral(p);
          setEditPresupuestoGeneralOpen(true);
        }}
      />

      {/* Editar presupuesto general (desde la ficha apilada) */}
      <PresupuestoFormDialog
        open={editPresupuestoGeneralOpen}
        onOpenChange={(o) => {
          setEditPresupuestoGeneralOpen(o);
          if (!o) setEditingPresupuestoGeneral(null);
        }}
        presupuesto={editingPresupuestoGeneral}
        defaultClienteId={oportunidad.cliente_id}
        defaultPersonaId={personaIdForPresupuesto || (oportunidad as any).persona_id}
        defaultOportunidadId={oportunidad.id}
        onSuccess={() => {
          setEditPresupuestoGeneralOpen(false);
          setEditingPresupuestoGeneral(null);
          mutatePresupuestos();
          mutateItems();
        }}
      />

      {/* Editar presupuesto de equipo (desde la ficha apilada) */}
      <PresupuestoEquipoFormDialog
        open={editPresupuestoEquipoOpen}
        onOpenChange={(o) => {
          setEditPresupuestoEquipoOpen(o);
          if (!o) setEditingPresupuestoEquipo(null);
        }}
        presupuesto={editingPresupuestoEquipo}
        defaultClienteId={oportunidad.cliente_id}
        defaultPersonaId={personaIdForPresupuesto || (oportunidad as any).persona_id}
        defaultOportunidadId={oportunidad.id}
        onSuccess={() => {
          setEditPresupuestoEquipoOpen(false);
          setEditingPresupuestoEquipo(null);
          mutatePresupuestos();
          mutateItems();
        }}
      />

      {/* Ver ficha del cliente (mismo detail sheet que en la lista de clientes) */}
      <ClienteDetailSheet
        cliente={oportunidad?.cliente_id ? ({
          id: oportunidad.cliente_id,
          nombre: oportunidad.cliente?.nombre || oportunidad.cliente_nombre || '',
          cuit: oportunidad.cliente?.cuit || null,
        } as any) : null}
        open={clienteDetailOpen}
        onOpenChange={setClienteDetailOpen}
      />

      {/* Editar / completar actividad CRM */}
      <EditarActividadDialog
        open={editActOpen}
        onOpenChange={(o) => { setEditActOpen(o); if (!o) setEditAct(null); }}
        actividad={editAct}
        onSaved={() => { mutateActProgramadas(); mutateActividades(); }}
      />
      <CompletarActividadDialog
        open={completeActOpen}
        onOpenChange={(o) => { setCompleteActOpen(o); if (!o) setCompleteAct(null); }}
        actividad={completeAct}
        onConfirm={async (comentario) => {
          if (completeAct) await handleCompletarAct(completeAct.id, comentario);
        }}
      />

      {/* Dialog Enviar Presupuesto para Firma */}
      <Dialog open={showEnviarPresupuestoDialog} onOpenChange={setShowEnviarPresupuestoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-600" />
              Enviar Presupuesto para Firma
            </DialogTitle>
            <DialogDescription>
              El cliente recibirá un email con un enlace para ver y firmar digitalmente el presupuesto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {presupuestoToSend && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-purple-700 dark:text-purple-300">
                      {presupuestoToSend.numero}
                    </p>
                    <p className="text-sm text-purple-600/70 dark:text-purple-400/70">
                      {presupuestoToSend.fecha_emision && fmtFecha(presupuestoToSend.fecha_emision, 'd MMM yyyy')}
                    </p>
                  </div>
                  <p className="font-bold text-lg text-purple-700 dark:text-purple-300">
                    {formatCurrency(presupuestoToSend.total || 0)}
                  </p>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email_destino">Email del cliente *</Label>
              <Input
                id="email_destino"
                type="email"
                value={enviarEmailDestino}
                onChange={(e) => setEnviarEmailDestino(e.target.value)}
                placeholder="cliente@email.com"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El cliente podrá aceptar o rechazar el presupuesto desde el enlace.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="outline"
              onClick={() => setShowEnviarPresupuestoDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleEnviarPresupuesto}
              disabled={saving || !enviarEmailDestino.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GanadoGateDialog
        open={showGanadoGate}
        onOpenChange={setShowGanadoGate}
        oportunidad={oportunidad}
        targetEtapa={gateEtapa}
        targetLabel={gateEtapa === 'logistica' ? 'Logística' : 'ganada'}
        onComplete={() => {
          setShowGanadoGate(false);
          onRefresh();
        }}
        onCancel={() => setShowGanadoGate(false)}
      />

      {oportunidad && ['ganado', 'finalizado'].includes(oportunidad.estado) && !oportunidad.pedido_id && (
        <CrearPedidoDialog
          open={showCrearPedido}
          onOpenChange={setShowCrearPedido}
          oportunidad={oportunidad}
          onSuccess={() => {
            setShowCrearPedido(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
