"use client";

import useSWR from "swr";
import {
  Mail,
  Users,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Calendar,
  Tag,
  Search,
  Download,
  Settings2,
  Sparkles,
  Link2,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchClientes, type ClienteComboboxOption } from "@/hooks/use-client-search";
import { toast } from "sonner";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetStatCard,
  DetailSheetEmptyState,
  DetailSheetLoading,
} from "./DetailSheetComponents";
import { ContactoGestionSheet } from "./ContactoGestionSheet";
import type { EmailLista } from "@/app/dashboard/email-marketing/listas/columns";

interface EmailListaContacto {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  empresa: string | null;
  telefono: string | null;
  tags: string[] | null;
  estado: "activo" | "inactivo" | "bounced" | "unsubscribed";
  origen?: "manual" | "auto" | "excluido_manual" | "incluido_manual";
  created_at: string;
  persona_id: string | null;
  cliente_id: string | null;
  es_potencial: boolean;
  cliente_nombre: string | null;
  cliente_fantasia: string | null;
}

const origenLabels: Record<string, { label: string; className: string }> = {
  manual: { label: "Manual", className: "bg-blue-50 text-blue-700 border-blue-200" },
  auto: { label: "Auto", className: "bg-purple-50 text-purple-700 border-purple-200" },
  incluido_manual: { label: "Incluido +", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  excluido_manual: { label: "Excluido −", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

interface EmailListaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lista: EmailLista | null;
  onEdit?: (lista: EmailLista) => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar");
  return data;
};

const estadoLabels: Record<string, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-green-50 text-green-700 border-green-200" },
  inactivo: { label: "Inactivo", className: "bg-gray-50 text-gray-700 border-gray-200" },
  bounced: { label: "Bounced", className: "bg-red-50 text-red-700 border-red-200" },
  unsubscribed: { label: "Desuscripto", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function EmailListaDetailSheet({
  open,
  onOpenChange,
  lista,
  onEdit,
}: EmailListaDetailSheetProps) {
  const [search, setSearch] = useState("");
  const [gestionOpen, setGestionOpen] = useState(false);
  const [gestionContactoId, setGestionContactoId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addNombre, setAddNombre] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<'cliente' | 'manual'>('cliente');
  const [resyncing, setResyncing] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ contactos: EmailListaContacto[]; total: number }>(
    lista && open ? `/api/email/listas/${lista.id}/contactos` : null,
    fetcher
  );

  const addContactoToList = useCallback(async (email: string, nombre: string, empresa?: string) => {
    if (!email.trim() || !lista) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/email/lists/${lista.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nombre: nombre.trim() || "",
          empresa: empresa || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al agregar");
      toast.success(`${email} agregado a la lista`);
      setAddEmail("");
      setAddNombre("");
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Error al agregar contacto");
    } finally {
      setAdding(false);
    }
  }, [lista, mutate]);

  const handleSelectCliente = useCallback(async (_value: string, option?: ClienteComboboxOption) => {
    if (!option?.data?.email?.length) {
      toast.error("Este cliente no tiene email registrado");
      return;
    }
    const email = option.data.email[0];
    const nombre = option.data.nombre_fantasia || option.data.nombre || "";
    const empresa = option.data.nombre_fantasia ? option.data.nombre || "" : "";
    await addContactoToList(email, nombre, empresa);
  }, [addContactoToList]);

  if (!lista) return null;

  const contactos = data?.contactos || [];
  const filtered = search
    ? contactos.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.email.toLowerCase().includes(q) ||
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.empresa || "").toLowerCase().includes(q)
        );
      })
    : contactos;

  const activos = contactos.filter((c) => c.estado === "activo").length;
  const bounced = contactos.filter((c) => c.estado === "bounced").length;
  const unsubs = contactos.filter((c) => c.estado === "unsubscribed").length;

  const handleDownloadCsv = () => {
    if (contactos.length === 0) return;
    const headers = ["email", "nombre", "apellido", "empresa", "telefono", "estado", "tags", "created_at"];
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = contactos.map((c) =>
      [
        c.email,
        c.nombre || "",
        c.apellido || "",
        c.empresa || "",
        c.telefono || "",
        c.estado,
        (c.tags || []).join("|"),
        c.created_at,
      ]
        .map(escape)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = lista.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.href = url;
    a.download = `${slug || "lista"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddContacto = () => addContactoToList(addEmail, addNombre);

  const handleRemoveContacto = async (contactoId: string) => {
    if (!confirm("¿Quitar este contacto de la lista?")) return;
    setRemoving(contactoId);
    try {
      const res = await fetch(`/api/email/contacts/${contactoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al quitar");
      }
      toast.success("Contacto quitado de la lista");
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Error al quitar contacto");
    } finally {
      setRemoving(null);
    }
  };

  const isManual = lista.tipo === "manual";
  const isHibrida = lista.tipo === "hibrida";
  const isDinamica = lista.tipo === "dinamica";
  const permiteManualOverrides = isManual || isHibrida;
  const criterios = lista.criterios;
  const hasCriteriosLegacy = !!criterios && (
    (criterios.tipos_equipo?.length || 0) > 0 ||
    (criterios.modelos_equipo?.length || 0) > 0 ||
    (criterios.provincias?.length || 0) > 0
  );
  const hasCriteriosCrm = !!criterios && (
    (criterios.tags_any?.length || 0) > 0 ||
    (criterios.tags_all?.length || 0) > 0 ||
    (criterios.tipo_persona?.length || 0) > 0 ||
    (criterios.cliente_ids?.length || 0) > 0 ||
    criterios.email_valido === true ||
    criterios.estado_activo === true
  );
  const hasCriterios = hasCriteriosLegacy || hasCriteriosCrm;

  const handleResync = async () => {
    setResyncing(true);
    try {
      const res = await fetch(`/api/email/listas/${lista.id}/resync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al resincronizar");
      toast.success(
        `Sincronizado: +${data.agregados} / -${data.quitados} (manuales preservados: ${data.preservados?.manual ?? 0})`,
      );
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Error al resincronizar");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="indigo">
      <DetailSheetHeader
        icon={Mail}
        title={lista.nombre}
        subtitle={lista.descripcion || (isManual ? "Lista manual" : "Lista dinámica")}
        theme="indigo"
        onEdit={onEdit ? () => onEdit(lista) : undefined}
        actions={
          <div className="flex items-center gap-2">
            {!isManual && (
              <Button
                size="sm"
                type="outline"
                className="h-7 gap-1"
                onClick={handleResync}
                disabled={resyncing}
                title="Regenera los miembros automáticos según los criterios"
              >
                {resyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Resync
              </Button>
            )}
            <Button
              size="sm"
              type="outline"
              className="h-7 gap-1"
              onClick={handleDownloadCsv}
              disabled={isLoading || contactos.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        }
        badges={
          <>
            <Badge
              variant="outline"
              className={
                isManual
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : isHibrida
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }
            >
              {isManual ? "Manual" : isHibrida ? "Híbrida" : "Dinámica"}
            </Badge>
            {lista.sync_stale && !isManual && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Sync pendiente
              </Badge>
            )}
            <Badge
              variant="outline"
              className={
                lista.activa
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }
            >
              {lista.activa ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Activa
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" /> Inactiva
                </>
              )}
            </Badge>
          </>
        }
      />

      <DetailSheetContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DetailSheetStatCard
            value={contactos.length}
            label="Contactos"
            icon={Users}
            theme="blue"
          />
          <DetailSheetStatCard
            value={activos}
            label="Activos"
            icon={CheckCircle2}
            theme="green"
          />
          <DetailSheetStatCard
            value={unsubs}
            label="Desuscriptos"
            icon={XCircle}
            theme="amber"
          />
          <DetailSheetStatCard
            value={bounced}
            label="Bounced"
            icon={XCircle}
            theme="red"
          />
        </div>

        {!isManual && hasCriterios && (
          <DetailSheetSection icon={Filter} title="Criterios" theme="purple">
            <div className="space-y-2 text-xs">
              {criterios?.tipos_equipo && criterios.tipos_equipo.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Tipos de equipo:</span>
                  {criterios.tipos_equipo.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {criterios?.modelos_equipo && criterios.modelos_equipo.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Modelos:</span>
                  {criterios.modelos_equipo.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {criterios?.provincias && criterios.provincias.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Provincias:</span>
                  {criterios.provincias.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {criterios?.tags_any && criterios.tags_any.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Tags (cualquiera):</span>
                  <Badge variant="outline" className="text-xs">{criterios.tags_any.length}</Badge>
                </div>
              )}
              {criterios?.tags_all && criterios.tags_all.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Tags (todos):</span>
                  <Badge variant="outline" className="text-xs">{criterios.tags_all.length}</Badge>
                </div>
              )}
              {criterios?.tipo_persona && criterios.tipo_persona.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Tipo:</span>
                  {criterios.tipo_persona.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
              {criterios?.cliente_ids && criterios.cliente_ids.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="font-medium">Clientes vinculados:</span>
                  <Badge variant="outline" className="text-xs">{criterios.cliente_ids.length}</Badge>
                </div>
              )}
              {(criterios?.email_valido || criterios?.estado_activo) && (
                <div className="flex flex-wrap gap-1">
                  {criterios.email_valido && <Badge variant="outline" className="text-xs">Email válido</Badge>}
                  {criterios.estado_activo && <Badge variant="outline" className="text-xs">Activo</Badge>}
                </div>
              )}
              {lista.last_synced_at && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Último sync: {new Date(lista.last_synced_at).toLocaleString()}
                </p>
              )}
            </div>
          </DetailSheetSection>
        )}

        <DetailSheetSection
          icon={Users}
          title="Contactos"
          count={filtered.length}
          theme="indigo"
          action={
            <div className="flex items-center gap-2">
              {permiteManualOverrides && (
                <Button
                  size="sm"
                  type="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </Button>
              )}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 pl-7 text-xs w-48"
                />
              </div>
            </div>
          }
        >
          {showAddForm && permiteManualOverrides && (
            <div className="mb-3 p-3 rounded-lg border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
              {/* Mode toggle */}
              <div className="flex items-center gap-1 mb-1">
                <Button
                  size="sm"
                  type={addMode === 'cliente' ? 'default' : 'outline'}
                  className="h-6 text-[11px] px-2"
                  onClick={() => setAddMode('cliente')}
                >
                  Buscar cliente
                </Button>
                <Button
                  size="sm"
                  type={addMode === 'manual' ? 'default' : 'outline'}
                  className="h-6 text-[11px] px-2"
                  onClick={() => setAddMode('manual')}
                >
                  Email manual
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  type="outline"
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddEmail("");
                    setAddNombre("");
                  }}
                >
                  Cancelar
                </Button>
              </div>

              {addMode === 'cliente' ? (
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <SearchableCombobox
                      placeholder="Buscar cliente por nombre, CUIT, email..."
                      emptyMessage="No se encontraron clientes"
                      searchFn={searchClientes}
                      onSelect={handleSelectCliente}
                      className="h-8 text-xs"
                    />
                  </div>
                  {adding && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="h-8 text-xs flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleAddContacto()}
                    />
                    <Input
                      placeholder="Nombre (opcional)"
                      value={addNombre}
                      onChange={(e) => setAddNombre(e.target.value)}
                      className="h-8 text-xs w-40"
                      onKeyDown={(e) => e.key === "Enter" && handleAddContacto()}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-7 w-full"
                    disabled={!addEmail.trim() || adding}
                    onClick={handleAddContacto}
                  >
                    {adding ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar contacto
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {isLoading ? (
            <DetailSheetLoading />
          ) : filtered.length === 0 ? (
            <DetailSheetEmptyState
              icon={Users}
              message={
                contactos.length === 0
                  ? "Esta lista no tiene contactos todavía"
                  : "Ningún contacto coincide con la búsqueda"
              }
            />
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {filtered.map((c) => {
                const estado = estadoLabels[c.estado] || estadoLabels.activo;
                const origen = c.origen ? origenLabels[c.origen] : null;
                const displayName =
                  [c.nombre, c.apellido].filter(Boolean).join(" ") || null;
                const clienteDisplay =
                  c.cliente_fantasia || c.cliente_nombre || c.empresa;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {c.email}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${estado.className}`}>
                          {estado.label}
                        </Badge>
                        {origen && (
                          <Badge variant="outline" className={`text-[10px] ${origen.className}`}>
                            {origen.label}
                          </Badge>
                        )}
                        {c.es_potencial ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            Potencial
                          </Badge>
                        ) : c.cliente_id ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            <Link2 className="h-2.5 w-2.5 mr-0.5" />
                            Cliente
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        {displayName && (
                          <span className="truncate">{displayName}</span>
                        )}
                        {clienteDisplay && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3" />
                            {clienteDisplay}
                          </span>
                        )}
                        {c.telefono && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="h-3 w-3" />
                            {c.telefono}
                          </span>
                        )}
                        {c.tags && c.tags.length > 0 && (
                          <span className="flex items-center gap-1 truncate">
                            <Tag className="h-3 w-3" />
                            {c.tags.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        type="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setGestionContactoId(c.id);
                          setGestionOpen(true);
                        }}
                        title="Gestionar contacto"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                      {permiteManualOverrides && (
                        <Button
                          size="sm"
                          type="outline"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveContacto(c.id)}
                          disabled={removing === c.id}
                          title={isHibrida ? "Excluir manualmente de la lista" : "Quitar de la lista"}
                        >
                          {removing === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DetailSheetSection>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
          <Calendar className="h-3 w-3" />
          Creada {new Date(lista.created_at).toLocaleDateString()}
          {lista.updated_at && (
            <>· Actualizada {new Date(lista.updated_at).toLocaleDateString()}</>
          )}
        </div>
      </DetailSheetContent>

      <ContactoGestionSheet
        open={gestionOpen}
        onOpenChange={setGestionOpen}
        contactoId={gestionContactoId}
        onChange={() => mutate()}
      />
    </DetailSheetContainer>
  );
}
