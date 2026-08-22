"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cliente, ClienteNota, ClienteArchivo } from "@/lib/types";
import { TagBadges } from "@/components/core-ui/TagSelector";
import {
  Briefcase, Mail, Phone, MapPin, Calendar, Edit, Trash2, DollarSign,
  StickyNote, FileText, Plus, X, Loader2, AlertCircle, Star,
  FileUp, Download, ExternalLink, File, Image, FileSpreadsheet,
  TrendingUp, RefreshCw, Award, Gauge, Send, Eye, MousePointerClick,
  CheckCircle2, XCircle, Building2, Box, Wrench, User, Users, FlaskConical,
  AlertTriangle, Clock, Heart, Truck, Link, Unlink, Search, Receipt, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { ClienteInsumosPreferidosDialog } from "./ClienteInsumosPreferidosDialog";
import { AsociarLaboratorioDialog } from "./AsociarLaboratorioDialog";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { es } from "date-fns/locale";
import { safeFormat, safeRelative } from "@/lib/safe-date";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";

interface ClienteDetailSheetProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (cliente: Cliente) => void;
  onDelete?: (cliente: Cliente) => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
};

const tipoNotaColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  importante: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  seguimiento: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  recordatorio: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const categoriaArchivoIcons: Record<string, React.ReactNode> = {
  documento: <FileText className="h-4 w-4" />,
  contrato: <FileSpreadsheet className="h-4 w-4" />,
  factura: <FileText className="h-4 w-4" />,
  imagen: <Image className="h-4 w-4" />,
  otro: <File className="h-4 w-4" />,
};

export function ClienteDetailSheet({
  cliente,
  open,
  onOpenChange,
  onEdit,
  onDelete
}: ClienteDetailSheetProps) {
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const [showAllEquipos, setShowAllEquipos] = useState(false);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [notaContenido, setNotaContenido] = useState("");
  const [notaTipo, setNotaTipo] = useState<string>("general");
  const [savingNota, setSavingNota] = useState(false);

  const [showArchivoForm, setShowArchivoForm] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [archivoUrl, setArchivoUrl] = useState("");
  const [archivoCategoria, setArchivoCategoria] = useState<string>("documento");
  const [archivoDescripcion, setArchivoDescripcion] = useState("");
  const [savingArchivo, setSavingArchivo] = useState(false);
  const [showInsumosDialog, setShowInsumosDialog] = useState(false);
  const [showAsociarLaboratorioDialog, setShowAsociarLaboratorioDialog] = useState(false);

  // Org vinculada state
  const [orgSearch, setOrgSearch] = useState("");
  const [orgResults, setOrgResults] = useState<{ id: string; nombre: string; slug: string; tipo: string }[]>([]);
  const [searchingOrgs, setSearchingOrgs] = useState(false);
  const [savingOrgVinculada, setSavingOrgVinculada] = useState(false);
  const [showOrgSearch, setShowOrgSearch] = useState(false);

  // Fetch full client data (includes org_vinculada_id for legacy clients)
  const { data: clienteDetail, mutate: mutateCliente } = useSWR(
    open && cliente ? `/api/clientes/${cliente.id}` : null,
    fetcher
  );

  const handleSearchOrgs = async (q: string) => {
    setOrgSearch(q);
    if (q.length < 2) { setOrgResults([]); return; }
    setSearchingOrgs(true);
    try {
      const res = await fetch(`/api/organizations/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setOrgResults(await res.json());
    } catch { /* ignore */ }
    finally { setSearchingOrgs(false); }
  };

  const handleLinkOrg = async (orgId: string) => {
    if (!cliente) return;
    setSavingOrgVinculada(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_vinculada_id: orgId }),
      });
      if (res.ok) {
        toast.success("Organización vinculada");
        mutateCliente();
        setShowOrgSearch(false);
        setOrgSearch("");
        setOrgResults([]);
      } else {
        toast.error("Error al vincular organización");
      }
    } catch { toast.error("Error al vincular"); }
    finally { setSavingOrgVinculada(false); }
  };

  const handleUnlinkOrg = async () => {
    if (!cliente) return;
    setSavingOrgVinculada(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_vinculada_id: null }),
      });
      if (res.ok) {
        toast.success("Organización desvinculada");
        mutateCliente();
      } else {
        toast.error("Error al desvincular");
      }
    } catch { toast.error("Error al desvincular"); }
    finally { setSavingOrgVinculada(false); }
  };

  const { data: notas, isLoading: loadingNotas } = useSWR<ClienteNota[]>(
    open && cliente ? `/api/clientes/${cliente.id}/notas` : null,
    fetcher
  );

  const { data: archivos, isLoading: loadingArchivos } = useSWR<ClienteArchivo[]>(
    open && cliente ? `/api/clientes/${cliente.id}/archivos` : null,
    fetcher
  );

  // Historial de emails del cliente
  const { data: emailsData, isLoading: loadingEmails } = useSWR(
    open && cliente ? `/api/clientes/${cliente.id}/emails?limit=20` : null,
    fetcher
  );

  // Score del cliente
  const { data: scoreData, isLoading: loadingScore, mutate: mutateScore } = useSWR(
    open && cliente ? `/api/clientes/${cliente.id}/score` : null,
    fetcher
  );

  // Equipos del cliente
  const { data: equiposData, isLoading: loadingEquipos } = useSWR(
    open && cliente ? `/api/equipos-unidades?cliente_id=${cliente.id}&include_stats=true` : null,
    fetcher
  );

  // Laboratorios del cliente (con razones sociales hermanas via M:N)
  const { data: laboratoriosData, isLoading: loadingLaboratorios, mutate: mutateLaboratorios } = useSWR(
    open && cliente ? `/api/laboratorios?razon_social_id=${cliente.id}&completos=true` : null,
    fetcher
  );

  // Razones sociales hermanas (todos los clientes que comparten al menos 1 lab con el actual)
  const razonesSocialesGrupo = React.useMemo(() => {
    if (!Array.isArray(laboratoriosData) || !cliente) return [];
    const map = new Map<string, { cliente_id: string; nombre: string; cuit: string | null; es_principal: boolean; labs: string[] }>();
    for (const lab of laboratoriosData) {
      const rsArray = (lab as any).razones_sociales;
      if (!Array.isArray(rsArray)) continue;
      for (const rs of rsArray) {
        const existing = map.get(rs.cliente_id);
        if (existing) {
          existing.labs.push(lab.nombre);
          if (rs.es_principal) existing.es_principal = true;
        } else {
          map.set(rs.cliente_id, {
            cliente_id: rs.cliente_id,
            nombre: rs.nombre,
            cuit: rs.cuit,
            es_principal: !!rs.es_principal,
            labs: [lab.nombre],
          });
        }
      }
    }
    // Devolver todos los del grupo (incluido el actual, para marcarlo)
    return Array.from(map.values()).sort((a, b) => {
      if (a.cliente_id === cliente.id) return -1;
      if (b.cliente_id === cliente.id) return 1;
      if (a.es_principal !== b.es_principal) return a.es_principal ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [laboratoriosData, cliente]);

  // Personas/Contactos del cliente
  const { data: personasData, isLoading: loadingPersonas } = useSWR(
    open && cliente ? `/api/personas?razon_social_id=${cliente.id}` : null,
    fetcher
  );

  // Servicios recientes del cliente
  const { data: serviciosData, isLoading: loadingServicios } = useSWR(
    open && cliente ? `/api/equipos-servicios-tecnicos?cliente_id=${cliente.id}&limit=5` : null,
    fetcher
  );

  const [refreshingScore, setRefreshingScore] = useState(false);

  const handleRefreshScore = async () => {
    if (!cliente) return;
    setRefreshingScore(true);
    try {
      await mutateScore();
      toast.success("Score actualizado");
    } catch (err) {
      toast.error("Error al actualizar score");
    } finally {
      setRefreshingScore(false);
    }
  };

  // Reset forms when sheet closes
  useEffect(() => {
    if (!open) {
      setShowNotaForm(false);
      setNotaContenido("");
      setNotaTipo("general");
      setShowArchivoForm(false);
      setArchivoNombre("");
      setArchivoUrl("");
      setArchivoCategoria("documento");
      setArchivoDescripcion("");
    }
  }, [open]);

  if (!cliente) return null;

  const saldoAFavor = cliente.saldo_a_favor || 0;

  const handleSaveNota = async () => {
    if (!notaContenido.trim()) {
      toast.error("El contenido es requerido");
      return;
    }

    setSavingNota(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contenido: notaContenido,
          tipo: notaTipo,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      toast.success("Nota guardada");
      mutate(`/api/clientes/${cliente.id}/notas`);
      setNotaContenido("");
      setNotaTipo("general");
      setShowNotaForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setSavingNota(false);
    }
  };

  const handleDeleteNota = async (notaId: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;

    try {
      const res = await fetch(`/api/clientes/${cliente.id}/notas?notaId=${notaId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast.success("Nota eliminada");
      mutate(`/api/clientes/${cliente.id}/notas`);
    } catch {
      toast.error("Error al eliminar nota");
    }
  };

  const handleSaveArchivo = async () => {
    if (!archivoNombre.trim() || !archivoUrl.trim()) {
      toast.error("Nombre y URL son requeridos");
      return;
    }

    setSavingArchivo(true);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/archivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: archivoNombre,
          url: archivoUrl,
          categoria: archivoCategoria,
          descripcion: archivoDescripcion || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      toast.success("Archivo guardado");
      mutate(`/api/clientes/${cliente.id}/archivos`);
      setArchivoNombre("");
      setArchivoUrl("");
      setArchivoCategoria("documento");
      setArchivoDescripcion("");
      setShowArchivoForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setSavingArchivo(false);
    }
  };

  const handleDeleteArchivo = async (archivoId: string) => {
    if (!confirm("¿Eliminar este archivo?")) return;

    try {
      const res = await fetch(`/api/clientes/${cliente.id}/archivos?archivoId=${archivoId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast.success("Archivo eliminado");
      mutate(`/api/clientes/${cliente.id}/archivos`);
    } catch {
      toast.error("Error al eliminar archivo");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-blue-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-blue-950/10"
        side="bottom"
      >
        {/* Header compacto */}
        <SheetHeader className="px-6 pt-4 pb-3 pr-14 border-b border-blue-200/50 dark:border-blue-800/30 shrink-0 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-950/10 dark:to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 rounded-2xl border border-blue-200/30 dark:border-blue-800/30 shadow-sm shadow-blue-500/10">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl bg-gradient-to-r from-blue-900 to-blue-700 dark:from-blue-100 dark:to-blue-300 bg-clip-text text-transparent">{cliente.nombre}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                  {cliente.cuit && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(cliente.cuit!);
                        toast.success("CUIT copiado");
                      }}
                      title="Copiar CUIT"
                      className="text-xs font-medium inline-flex items-center gap-1 rounded px-1 -mx-1 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                    >
                      CUIT: {cliente.cuit}
                      <Copy className="h-3 w-3 opacity-60" />
                    </button>
                  )}
                  <Badge
                    variant={cliente.estado === 'Activo' ? 'default' : 'secondary'}
                    className="h-5 text-xs"
                  >
                    {cliente.estado}
                  </Badge>
                  {saldoAFavor > 0 && (
                    <Badge className="h-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {formatCurrency(saldoAFavor)}
                    </Badge>
                  )}
                </SheetDescription>
                {cliente.tags && cliente.tags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tags</p>
                    <TagBadges tags={cliente.tags} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              <ShareToInternalChatButton
                entity={{
                  type: 'cliente',
                  id: cliente.id,
                  label: cliente.nombre,
                  number: cliente.cuit || undefined,
                  link: `/dashboard/clientes?id=${cliente.id}`,
                }}
                variant="icon"
              />
              {onEdit && (
                <Button
                  size="sm"
                  type="outline"
                  onClick={() => onEdit(cliente)}
                  className="h-7 w-7 p-0"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  type="text"
                  onClick={() => onDelete(cliente)}
                  className="h-7 w-7 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 h-[calc(90vh-100px)]">
          <div className="space-y-4 px-6 pb-6 pt-4">
            {/* Información de Contacto */}
            <section className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-gradient-to-br from-white to-blue-50/20 dark:from-gray-900 dark:to-blue-950/10 shadow-sm">
              <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/30 pb-2 text-blue-900 dark:text-blue-100">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Información de Contacto
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cliente.email && cliente.email.length > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 flex-shrink-0">
                      <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Email</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cliente.email.map((email, index) => (
                          <a
                            key={index}
                            href={`mailto:${email}`}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {email}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {cliente.telefono && cliente.telefono.length > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Teléfono</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cliente.telefono.map((tel, index) => (
                          <a
                            key={index}
                            href={`tel:${tel}`}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {tel}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {cliente.direccion && (
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-md bg-orange-500/10 dark:bg-orange-500/20 flex-shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Dirección</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{cliente.direccion}</p>
                    </div>
                  </div>
                )}

                {cliente.transporte && (
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded-md bg-violet-500/10 dark:bg-violet-500/20 flex-shrink-0">
                      <Truck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Transporte</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-1">
                        {cliente.transporte.nombre}
                      </p>
                      {cliente.transporte.telefono && (
                        <a
                          href={`tel:${cliente.transporte.telefono}`}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          {cliente.transporte.telefono}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Equipos del Cliente */}
            <section className="space-y-3 p-4 border border-teal-200/40 dark:border-teal-800/30 rounded-xl bg-gradient-to-br from-white to-teal-50/20 dark:from-gray-900 dark:to-teal-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-teal-200/50 dark:border-teal-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-teal-900 dark:text-teal-100">
                  <Box className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  Equipos ({Array.isArray(equiposData) ? equiposData.length : 0})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="outline"
                    size="tiny"
                    onClick={() => setShowInsumosDialog(true)}
                    className="gap-1 text-pink-600 hover:text-pink-700 border-pink-200 hover:border-pink-300 hover:bg-pink-50"
                  >
                    <Heart className="h-3 w-3" />
                    Insumos
                  </Button>
                  <Button
                    type="outline"
                    size="tiny"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => router.push(`/dashboard/equipos-unidades?cliente_id=${cliente.id}`), 300);
                    }}
                  >
                    Ver todos
                  </Button>
                </div>
              </div>

              {loadingEquipos ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : Array.isArray(equiposData) && equiposData.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {(showAllEquipos ? equiposData : equiposData.slice(0, 5)).map((equipo: any) => (
                    <div
                      key={equipo.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        setTimeout(() => router.push(`/dashboard/equipos-unidades?id=${equipo.id}`), 300);
                      }}
                    >
                      <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        <Box className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {equipo.equipos?.marca} {equipo.equipos?.modelo}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">{equipo.numero_serie || equipo.codigo}</span>
                          {equipo.laboratorios?.nombre && (
                            <>
                              <span>•</span>
                              <span>{equipo.laboratorios.nombre}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={equipo.estado_general === 'Operativo' ? 'default' : equipo.estado_general === 'En reparación' ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {equipo.estado_general || 'Sin estado'}
                      </Badge>
                      {equipo.servicios_count > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          {equipo.servicios_count}
                        </span>
                      )}
                    </div>
                  ))}
                  {equiposData.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllEquipos((v) => !v)}
                      className="w-full text-xs text-center text-teal-600 dark:text-teal-400 hover:underline pt-2"
                    >
                      {showAllEquipos ? 'Ver menos' : `+${equiposData.length - 5} equipos más`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Box className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-muted-foreground">No hay equipos asignados</p>
                  <Button
                    type="outline"
                    size="tiny"
                    className="mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => router.push(`/dashboard/equipos-unidades?action=new&cliente_id=${cliente.id}`), 300);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Asignar equipo
                  </Button>
                </div>
              )}
            </section>

            {/* Laboratorios del Cliente */}
            <section className="space-y-3 p-4 border border-violet-200/40 dark:border-violet-800/30 rounded-xl bg-gradient-to-br from-white to-violet-50/20 dark:from-gray-900 dark:to-violet-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-violet-200/50 dark:border-violet-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-violet-900 dark:text-violet-100">
                  <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Laboratorios ({Array.isArray(laboratoriosData) ? laboratoriosData.length : 0})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="outline"
                    size="tiny"
                    onClick={() => setShowAsociarLaboratorioDialog(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="outline"
                    size="tiny"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => router.push(`/dashboard/laboratorios?razon_social_id=${cliente.id}`), 300);
                    }}
                  >
                    Ver todos
                  </Button>
                </div>
              </div>

              {loadingLaboratorios ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : Array.isArray(laboratoriosData) && laboratoriosData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {laboratoriosData.slice(0, 4).map((lab: any) => (
                    <div
                      key={lab.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        setTimeout(() => router.push(`/dashboard/laboratorios?id=${lab.id}`), 300);
                      }}
                    >
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lab.nombre}</p>
                        {lab.direccion && (
                          <p className="text-[10px] text-muted-foreground truncate">{lab.direccion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FlaskConical className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-muted-foreground">No hay laboratorios registrados</p>
                  <Button
                    type="outline"
                    size="tiny"
                    className="mt-2"
                    onClick={() => setShowAsociarLaboratorioDialog(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar laboratorio
                  </Button>
                </div>
              )}
            </section>

            {/* Razones sociales / CUITs asociados */}
            {razonesSocialesGrupo.length > 0 && (
              <section className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-gradient-to-br from-white to-amber-50/20 dark:from-gray-900 dark:to-amber-950/10 shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/30 pb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-100">
                    <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    {razonesSocialesGrupo.length > 1
                      ? `Razones sociales del grupo (${razonesSocialesGrupo.length})`
                      : "Razón social"
                    }
                  </h3>
                  {razonesSocialesGrupo.length > 1 && (
                    <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                      Comparten laboratorio
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {razonesSocialesGrupo.map((rs) => {
                    const isCurrent = rs.cliente_id === cliente.id;
                    return (
                      <div
                        key={rs.cliente_id}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors",
                          isCurrent
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer"
                        )}
                        onClick={() => {
                          if (isCurrent) return;
                          onOpenChange(false);
                          setTimeout(() => router.push(`/dashboard/empresas?id=${rs.cliente_id}`), 300);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{rs.nombre}</span>
                            {rs.es_principal && (
                              <Badge className="h-4 px-1.5 text-[9px] bg-amber-500 text-white border-0">
                                PRINCIPAL
                              </Badge>
                            )}
                            {isCurrent && razonesSocialesGrupo.length > 1 && (
                              <Badge className="h-4 px-1.5 text-[9px] bg-blue-500 text-white border-0">
                                ACTUAL
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {rs.cuit && (
                              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                CUIT {rs.cuit}
                              </span>
                            )}
                            <span className="truncate">en {rs.labs.length} lab{rs.labs.length > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        {!isCurrent && razonesSocialesGrupo.length > 1 && (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                {razonesSocialesGrupo.length > 1 && (
                  <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 italic leading-relaxed">
                    Al facturar, podés elegir cualquiera de estas razones sociales. La <strong>PRINCIPAL</strong> se selecciona por defecto.
                  </p>
                )}
              </section>
            )}

            {/* Contactos del Cliente */}
            <section className="space-y-3 p-4 border border-rose-200/40 dark:border-rose-800/30 rounded-xl bg-gradient-to-br from-white to-rose-50/20 dark:from-gray-900 dark:to-rose-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-rose-200/50 dark:border-rose-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-rose-900 dark:text-rose-100">
                  <Users className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Contactos ({Array.isArray(personasData) ? personasData.length : 0})
                </h3>
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => router.push(`/dashboard/personas?razon_social_id=${cliente.id}`), 300);
                  }}
                >
                  Ver todos
                </Button>
              </div>

              {loadingPersonas ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : Array.isArray(personasData) && personasData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {personasData.slice(0, 4).map((persona: any) => (
                    <div
                      key={persona.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{persona.nombre_completo}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {persona.cargo && <span>{persona.cargo}</span>}
                          {persona.email && (
                            <a href={`mailto:${persona.email}`} className="text-blue-500 hover:underline truncate">
                              {persona.email}
                            </a>
                          )}
                        </div>
                      </div>
                      {persona.categoria?.color && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: persona.categoria.color }}
                          title={persona.categoria.nombre}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-muted-foreground">No hay contactos registrados</p>
                  <Button
                    type="outline"
                    size="tiny"
                    className="mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => router.push(`/dashboard/personas?action=new&razon_social_id=${cliente.id}`), 300);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar contacto
                  </Button>
                </div>
              )}
            </section>

            {/* Servicios Recientes */}
            <section className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-gradient-to-br from-white to-amber-50/20 dark:from-gray-900 dark:to-amber-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Servicios Recientes
                </h3>
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => router.push(`/dashboard/servicios?cliente_id=${cliente.id}`), 300);
                  }}
                >
                  Ver todos
                </Button>
              </div>

              {loadingServicios ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : Array.isArray(serviciosData) && serviciosData.length > 0 ? (
                <div className="space-y-2">
                  {serviciosData.slice(0, 5).map((servicio: any) => (
                    <div
                      key={servicio.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        setTimeout(() => router.push(`/dashboard/servicios?id=${servicio.id}`), 300);
                      }}
                    >
                      <div className={`p-2 rounded-lg ${
                        servicio.estado === 'completado' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        servicio.estado === 'en_progreso' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        servicio.estado === 'pendiente' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {servicio.tipo === 'reparacion' ? 'Reparación' :
                           servicio.tipo === 'mantenimiento' ? 'Mantenimiento' :
                           servicio.tipo === 'instalacion' ? 'Instalación' :
                           servicio.tipo}
                          {servicio.equipo_unidad?.equipo && (
                            <span className="font-normal text-muted-foreground">
                              {' - '}{servicio.equipo_unidad.equipo.marca} {servicio.equipo_unidad.equipo.modelo}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {servicio.fecha_programada && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {safeFormat(servicio.fecha_programada, "dd/MM/yyyy")}
                            </span>
                          )}
                          {servicio.nro_orden && (
                            <span className="font-mono">#{servicio.nro_orden}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          servicio.estado === 'completado' ? 'default' :
                          servicio.estado === 'en_progreso' ? 'secondary' :
                          'outline'
                        }
                        className="text-[10px]"
                      >
                        {servicio.estado === 'completado' ? 'Completado' :
                         servicio.estado === 'en_progreso' ? 'En progreso' :
                         servicio.estado === 'pendiente' ? 'Pendiente' :
                         servicio.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Wrench className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-muted-foreground">No hay servicios registrados</p>
                  <Button
                    type="outline"
                    size="tiny"
                    className="mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => router.push(`/dashboard/servicios?action=new&cliente_id=${cliente.id}`), 300);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nueva orden de servicio
                  </Button>
                </div>
              )}
            </section>

            {/* Score del Cliente */}
            <section className="space-y-3 p-4 border border-indigo-200/40 dark:border-indigo-800/30 rounded-xl bg-gradient-to-br from-white to-indigo-50/20 dark:from-gray-900 dark:to-indigo-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                  <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Score
                </h3>
                <Button
                  type="text"
                  size="tiny"
                  onClick={handleRefreshScore}
                  disabled={refreshingScore || loadingScore}
                  className="h-6 px-2"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshingScore ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>

              {loadingScore ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                </div>
              ) : scoreData && scoreData.score === null ? (
                <div className="text-center py-6">
                  <Gauge className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Sin datos suficientes</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Este cliente no tiene facturas vinculadas ni encuestas, así que no se puede calcular un score real.
                  </p>
                </div>
              ) : scoreData ? (
                <div className="space-y-4">
                  {/* Score circular y categoría */}
                  <div className="flex items-center gap-6">
                    {/* Círculo de score */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(scoreData.score / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                          className={
                            scoreData.score >= 80 ? "text-emerald-500" :
                            scoreData.score >= 60 ? "text-blue-500" :
                            scoreData.score >= 40 ? "text-amber-500" :
                            scoreData.score >= 20 ? "text-orange-500" :
                            "text-red-500"
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {scoreData.score}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/100</span>
                      </div>
                    </div>

                    {/* Info categoría */}
                    <div className="flex-1">
                      <Badge
                        className={`mb-2 ${
                          scoreData.categoria === 'Premium' ? 'bg-emerald-600 hover:bg-emerald-700' :
                          scoreData.categoria === 'Excelente' ? 'bg-blue-600 hover:bg-blue-700' :
                          scoreData.categoria === 'Bueno' ? 'bg-amber-600 hover:bg-amber-700' :
                          scoreData.categoria === 'Regular' ? 'bg-orange-600 hover:bg-orange-700' :
                          scoreData.categoria === 'En riesgo' ? 'bg-red-600 hover:bg-red-700' :
                          'bg-gray-600 hover:bg-gray-700'
                        } text-white`}
                      >
                        {scoreData.categoria === 'Premium' && <Star className="h-3 w-3 mr-1" />}
                        {scoreData.categoria}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {scoreData.categoria === 'Premium' ? 'Cliente de alto valor con excelente historial' :
                         scoreData.categoria === 'Excelente' ? 'Cliente muy confiable con buen historial' :
                         scoreData.categoria === 'Bueno' ? 'Cliente estable con historial positivo' :
                         scoreData.categoria === 'Regular' ? 'Cliente con oportunidades de mejora' :
                         scoreData.categoria === 'En riesgo' ? 'Requiere atención especial' :
                         'Cliente nuevo, sin historial suficiente'}
                      </p>
                      {typeof scoreData.completitud === 'number' && scoreData.completitud < 100 && (
                        <p className="text-[10px] text-amber-600 mt-1">
                          Completitud {scoreData.completitud}% — calculado solo con los factores que tienen datos
                        </p>
                      )}
                      {scoreData.updated_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Actualizado {safeRelative(scoreData.updated_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Desglose de factores */}
                  {scoreData.detalle && (
                    <div className="space-y-2 pt-2 border-t border-indigo-200/30 dark:border-indigo-800/20">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Desglose de puntuación</p>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Volumen */}
                        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Volumen compras</p>
                            {scoreData.detalle.volumen?.disponible === false ? (
                              <p className="text-[10px] text-amber-600">Falta: {scoreData.detalle.volumen?.falta || 'sin datos'}</p>
                            ) : (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${((scoreData.detalle.volumen?.score ?? 0) / 30) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-8 text-right">{scoreData.detalle.volumen?.score ?? 0}/30</span>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* Frecuencia */}
                        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Frecuencia</p>
                            {scoreData.detalle.frecuencia?.disponible === false ? (
                              <p className="text-[10px] text-amber-600">Falta: {scoreData.detalle.frecuencia?.falta || 'sin datos'}</p>
                            ) : (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${((scoreData.detalle.frecuencia?.score ?? 0) / 20) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-8 text-right">{scoreData.detalle.frecuencia?.score ?? 0}/20</span>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* Puntualidad */}
                        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Puntualidad pago</p>
                            {scoreData.detalle.puntualidad?.disponible === false ? (
                              <p className="text-[10px] text-amber-600">Falta: {scoreData.detalle.puntualidad?.falta || 'sin datos'}</p>
                            ) : (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${((scoreData.detalle.puntualidad?.score ?? 0) / 25) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-8 text-right">{scoreData.detalle.puntualidad?.score ?? 0}/25</span>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* Antigüedad */}
                        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <Gauge className="h-3.5 w-3.5 text-purple-500" />
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Antigüedad</p>
                            {scoreData.detalle.antiguedad?.disponible === false ? (
                              <p className="text-[10px] text-amber-600">Falta: {scoreData.detalle.antiguedad?.falta || 'sin datos'}</p>
                            ) : (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{ width: `${((scoreData.detalle.antiguedad?.score ?? 0) / 15) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-8 text-right">{scoreData.detalle.antiguedad?.score ?? 0}/15</span>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* Satisfacción */}
                        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg col-span-2">
                          <Star className="h-3.5 w-3.5 text-rose-500" />
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Satisfacción (NPS)</p>
                            {scoreData.detalle.satisfaccion?.disponible === false ? (
                              <p className="text-[10px] text-amber-600">Falta: {scoreData.detalle.satisfaccion?.falta || 'sin datos'}</p>
                            ) : (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full"
                                  style={{ width: `${((scoreData.detalle.satisfaccion?.score ?? 0) / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-8 text-right">{scoreData.detalle.satisfaccion?.score ?? 0}/10</span>
                            </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Gauge className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">No se pudo calcular el score</p>
                  <Button
                    type="outline"
                    size="tiny"
                    className="mt-2"
                    onClick={handleRefreshScore}
                  >
                    Reintentar
                  </Button>
                </div>
              )}
            </section>

            {/* Notas del Cliente */}
            <section className="space-y-3 p-4 border border-yellow-200/40 dark:border-yellow-800/30 rounded-xl bg-gradient-to-br from-white to-yellow-50/20 dark:from-gray-900 dark:to-yellow-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-yellow-200/50 dark:border-yellow-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                  <StickyNote className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  Notas ({notas?.length || 0})
                </h3>
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => setShowNotaForm(!showNotaForm)}
                >
                  {showNotaForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Form nueva nota */}
              {showNotaForm && (
                <div className="space-y-3 p-3 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={notaTipo} onValueChange={setNotaTipo}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="importante">Importante</SelectItem>
                        <SelectItem value="seguimiento">Seguimiento</SelectItem>
                        <SelectItem value="recordatorio">Recordatorio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Contenido</Label>
                    <Textarea
                      value={notaContenido}
                      onChange={(e) => setNotaContenido(e.target.value)}
                      placeholder="Escribe una nota..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="outline" size="tiny" onClick={() => setShowNotaForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="primary" size="tiny" onClick={handleSaveNota} disabled={savingNota}>
                      {savingNota && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de notas */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {loadingNotas ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : notas && notas.length > 0 ? (
                  notas.map((nota) => (
                    <div
                      key={nota.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-[10px] px-1.5 py-0 ${tipoNotaColors[nota.tipo]}`}>
                              {nota.tipo === "importante" && <Star className="h-2.5 w-2.5 mr-0.5" />}
                              {nota.tipo}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {safeRelative(nota.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {nota.contenido}
                          </p>
                        </div>
                        <Button
                          type="text"
                          size="tiny"
                          onClick={() => handleDeleteNota(nota.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sin notas
                  </p>
                )}
              </div>
            </section>

            {/* Archivos del Cliente */}
            <section className="space-y-3 p-4 border border-green-200/40 dark:border-green-800/30 rounded-xl bg-gradient-to-br from-white to-green-50/20 dark:from-gray-900 dark:to-green-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-green-200/50 dark:border-green-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-green-900 dark:text-green-100">
                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Archivos ({archivos?.length || 0})
                </h3>
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => setShowArchivoForm(!showArchivoForm)}
                >
                  {showArchivoForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Form nuevo archivo */}
              {showArchivoForm && (
                <div className="space-y-3 p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-800/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Nombre *</Label>
                      <Input
                        value={archivoNombre}
                        onChange={(e) => setArchivoNombre(e.target.value)}
                        placeholder="Nombre del archivo"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Categoría</Label>
                      <Select value={archivoCategoria} onValueChange={setArchivoCategoria}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="documento">Documento</SelectItem>
                          <SelectItem value="contrato">Contrato</SelectItem>
                          <SelectItem value="factura">Factura</SelectItem>
                          <SelectItem value="imagen">Imagen</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">URL del archivo *</Label>
                    <Input
                      value={archivoUrl}
                      onChange={(e) => setArchivoUrl(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Descripción (opcional)</Label>
                    <Input
                      value={archivoDescripcion}
                      onChange={(e) => setArchivoDescripcion(e.target.value)}
                      placeholder="Descripción breve"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="outline" size="tiny" onClick={() => setShowArchivoForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="primary" size="tiny" onClick={handleSaveArchivo} disabled={savingArchivo}>
                      {savingArchivo && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de archivos */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {loadingArchivos ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : archivos && archivos.length > 0 ? (
                  archivos.map((archivo) => (
                    <div
                      key={archivo.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
                    >
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        {categoriaArchivoIcons[archivo.categoria] || <File className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{archivo.nombre}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {archivo.categoria}
                          </Badge>
                          {archivo.tamaño && <span>{formatFileSize(archivo.tamaño)}</span>}
                          <span>
                            {safeRelative(archivo.created_at)}
                          </span>
                        </div>
                        {archivo.descripcion && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {archivo.descripcion}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="text"
                          size="tiny"
                          onClick={() => window.open(archivo.url, "_blank")}
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          type="text"
                          size="tiny"
                          onClick={() => handleDeleteArchivo(archivo.id)}
                          className="h-6 w-6 p-0 text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sin archivos
                  </p>
                )}
              </div>
            </section>

            {/* Historial de Emails */}
            <section className="space-y-3 p-4 border border-cyan-200/40 dark:border-cyan-800/30 rounded-xl bg-gradient-to-br from-white to-cyan-50/20 dark:from-gray-900 dark:to-cyan-950/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-cyan-200/50 dark:border-cyan-800/30 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-cyan-900 dark:text-cyan-100">
                  <Send className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  Historial de Emails ({emailsData?.estadisticas?.total_enviados || 0})
                </h3>
              </div>

              {/* Estadísticas de emails */}
              {emailsData?.estadisticas && emailsData.estadisticas.total_enviados > 0 && (
                <div className="grid grid-cols-4 gap-2 p-2 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-cyan-600 dark:text-cyan-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="text-sm font-bold">{emailsData.estadisticas.enviados_exitosos}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Enviados</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Eye className="h-3 w-3" />
                      <span className="text-sm font-bold">{emailsData.estadisticas.abiertos}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Abiertos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                      <MousePointerClick className="h-3 w-3" />
                      <span className="text-sm font-bold">{emailsData.estadisticas.total_clicks}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Clicks</p>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-violet-600 dark:text-violet-400">
                      {emailsData.estadisticas.tasa_apertura}%
                    </div>
                    <p className="text-[10px] text-muted-foreground">Tasa apertura</p>
                  </div>
                </div>
              )}

              {/* Lista de emails */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {loadingEmails ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : emailsData?.emails && emailsData.emails.length > 0 ? (
                  emailsData.emails.map((email: any) => (
                    <div
                      key={email.id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {email.estado === 'enviado' ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <p className="text-sm font-medium truncate">{email.asunto}</p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>
                              {email.enviado_at
                                ? safeRelative(email.enviado_at)
                                : safeRelative(email.created_at)}
                            </span>
                            {email.cuenta_remitente?.email && (
                              <>
                                <span>•</span>
                                <span>desde {email.cuenta_remitente.email}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {email.abierto && (
                              <Badge className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <Eye className="h-2.5 w-2.5 mr-0.5" />
                                Abierto
                              </Badge>
                            )}
                            {email.clicks > 0 && (
                              <Badge className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                <MousePointerClick className="h-2.5 w-2.5 mr-0.5" />
                                {email.clicks} clicks
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">
                            Para: {Array.isArray(email.para) ? email.para.join(', ') : email.para}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Send className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No hay emails enviados a esta empresa
                    </p>
                    {cliente.email && cliente.email.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Emails registrados: {cliente.email.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Info de emails registrados */}
              {emailsData?.cliente_emails && emailsData.cliente_emails.length > 0 && emailsData.emails?.length > 0 && (
                <div className="text-[10px] text-muted-foreground border-t pt-2">
                  Emails monitoreados: {emailsData.cliente_emails.join(', ')}
                </div>
              )}
            </section>

            {/* Información Adicional */}
            <section className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm">
              <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-purple-200/50 dark:border-purple-800/30 pb-2 text-purple-900 dark:text-purple-100">
                <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Información Adicional
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 flex-shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Fecha de Registro</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {safeFormat(cliente.created_at, "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-md bg-gray-500/10 dark:bg-gray-500/20 flex-shrink-0">
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400">ID</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">ID del Sistema</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono truncate">
                      {cliente.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Organización Aeterna vinculada */}
              <div className="pt-2 border-t border-purple-200/30 dark:border-purple-800/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Link className="h-3.5 w-3.5 text-purple-500" />
                    Organización Aeterna vinculada
                  </p>
                  {!clienteDetail?.org_vinculada_id && !showOrgSearch && (
                    <Button
                      type="outline"
                      size="tiny"
                      onClick={() => setShowOrgSearch(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Vincular
                    </Button>
                  )}
                </div>

                {clienteDetail?.org_vinculada_id ? (
                  <div className="flex items-center gap-2 p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                    <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300 flex-1">
                      {clienteDetail.org_vinculada_nombre || clienteDetail.org_vinculada_id}
                    </span>
                    <Button
                      type="text"
                      size="tiny"
                      onClick={handleUnlinkOrg}
                      disabled={savingOrgVinculada}
                      className="text-red-500 hover:text-red-600 h-6 px-2"
                    >
                      {savingOrgVinculada ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                    </Button>
                  </div>
                ) : showOrgSearch ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        value={orgSearch}
                        onChange={(e) => handleSearchOrgs(e.target.value)}
                        placeholder="Buscar organización..."
                        className="h-8 text-xs pl-8"
                        autoFocus
                      />
                      <Button
                        type="text"
                        size="tiny"
                        onClick={() => { setShowOrgSearch(false); setOrgSearch(""); setOrgResults([]); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {searchingOrgs && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {orgResults.length > 0 && (
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {orgResults.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => handleLinkOrg(org.id)}
                            disabled={savingOrgVinculada}
                            className="w-full flex items-center gap-2 p-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                          >
                            <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span className="text-xs font-medium truncate">{org.nombre}</span>
                            {org.tipo && (
                              <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{org.tipo}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {orgSearch.length >= 2 && !searchingOrgs && orgResults.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-1">
                        Sin resultados
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Sin organización vinculada
                  </p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>

      {/* Diálogo de Insumos Preferidos */}
      {cliente && (
        <ClienteInsumosPreferidosDialog
          open={showInsumosDialog}
          onOpenChange={setShowInsumosDialog}
          clienteId={cliente.id}
          clienteNombre={cliente.nombre}
        />
      )}

      {/* Diálogo de Asociar Laboratorio */}
      {cliente && (
        <AsociarLaboratorioDialog
          open={showAsociarLaboratorioDialog}
          onOpenChange={setShowAsociarLaboratorioDialog}
          clienteId={cliente.id}
          clienteNombre={cliente.nombre}
          laboratoriosExistentes={Array.isArray(laboratoriosData) ? laboratoriosData.map((l: any) => l.id) : []}
          onLaboratorioAsociado={() => mutateLaboratorios()}
        />
      )}
    </Sheet>
  );
}
