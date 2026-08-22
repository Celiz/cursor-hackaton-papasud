"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Building2,
  Users,
  Star,
  Briefcase,
  Plus,
  Loader2,
  Sparkles,
  Link2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchClientes } from "@/hooks/use-client-search";

export const TIPO_RELACION_LABELS: Record<string, string> = {
  contacto_principal: "Contacto principal",
  contacto_ventas: "Ventas",
  contacto_administrativo: "Administrativo",
  contacto_tecnico: "Técnico",
  responsable_compras: "Responsable de compras",
  responsable_pagos: "Responsable de pagos",
  otro: "Otro",
};

const TIPOS_ORDER = [
  "contacto_principal",
  "contacto_ventas",
  "contacto_administrativo",
  "contacto_tecnico",
  "responsable_compras",
  "responsable_pagos",
  "otro",
];

interface Contexto {
  contacto: {
    id: string;
    email: string;
    nombre: string | null;
    apellido: string | null;
    empresa: string | null;
    telefono: string | null;
    persona_id: string | null;
    cliente_id: string | null;
    es_potencial: boolean;
  };
  cliente: {
    id: string;
    nombre: string;
    nombre_fantasia: string | null;
    cuit: string | null;
    localidad: string | null;
    provincia: string | null;
    sector: string | null;
  } | null;
  personas_en_cliente: Array<{
    prs_id: string;
    persona_id: string;
    tipo_relacion: string;
    es_contacto_principal: boolean;
    activo: boolean;
    recibe_facturas: boolean;
    recibe_presupuestos: boolean;
    recibe_notificaciones: boolean;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    nombre_completo: string;
    persona_email: string | null;
    persona_telefono: string | null;
  }>;
  persona: {
    id: string;
    nombre_completo: string;
  } | null;
  vinculos_persona: Array<{
    prs_id: string;
    razon_social_id: string;
    tipo_relacion: string;
    es_contacto_principal: boolean;
    activo: boolean;
    cliente_nombre: string;
    cliente_fantasia: string | null;
  }>;
  otras_listas: Array<{
    lista_id: string;
    lista_nombre: string;
  }>;
}

interface ContactoGestionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactoId: string | null;
  onChange?: () => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar");
  return data;
};

export function ContactoGestionSheet({
  open,
  onOpenChange,
  contactoId,
  onChange,
}: ContactoGestionSheetProps) {
  const { data, isLoading, mutate } = useSWR<Contexto>(
    contactoId && open ? `/api/email/contacts/${contactoId}/contexto` : null,
    fetcher
  );

  const [agregarVinculoOpen, setAgregarVinculoOpen] = useState(false);
  const [clienteDestinoId, setClienteDestinoId] = useState("");
  const [rolNuevo, setRolNuevo] = useState("otro");
  const [guardandoVinculo, setGuardandoVinculo] = useState(false);

  const [vincularPotencialOpen, setVincularPotencialOpen] = useState(false);
  const [clienteVincularId, setClienteVincularId] = useState("");
  const [vinculandoPotencial, setVinculandoPotencial] = useState(false);

  const refresh = async () => {
    await mutate();
    onChange?.();
  };

  const handlePatchPrs = async (prsId: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/personas-razones-sociales/${prsId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar vínculo");
    }
  };

  const handleDeletePrs = async (prsId: string) => {
    if (!confirm("¿Eliminar este vínculo? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/personas-razones-sociales/${prsId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Vínculo eliminado");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar vínculo");
    }
  };

  const handleAgregarVinculo = async () => {
    if (!contactoId || !clienteDestinoId) return;
    setGuardandoVinculo(true);
    try {
      const res = await fetch(`/api/email/contacts/${contactoId}/vinculos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razon_social_id: clienteDestinoId,
          tipo_relacion: rolNuevo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      if (data._existed) {
        toast.info("La persona ya estaba vinculada a ese cliente");
      } else {
        toast.success("Vínculo agregado");
      }
      setAgregarVinculoOpen(false);
      setClienteDestinoId("");
      setRolNuevo("otro");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Error al agregar vínculo");
    } finally {
      setGuardandoVinculo(false);
    }
  };

  const handleVincularPotencial = async () => {
    if (!contactoId || !clienteVincularId) return;
    setVinculandoPotencial(true);
    try {
      const res = await fetch(`/api/email/contacts/${contactoId}/vincular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteVincularId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Contacto vinculado al cliente");
      setVincularPotencialOpen(false);
      setClienteVincularId("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Error al vincular");
    } finally {
      setVinculandoPotencial(false);
    }
  };

  const contacto = data?.contacto;
  const cliente = data?.cliente;
  const personas = data?.personas_en_cliente || [];
  const otrasEmpresas = (data?.vinculos_persona || []).filter(
    (v) => v.razon_social_id !== cliente?.id
  );
  const otrasListas = data?.otras_listas || [];

  const displayName =
    contacto?.nombre || contacto?.apellido
      ? [contacto?.nombre, contacto?.apellido].filter(Boolean).join(" ")
      : contacto?.email || "Contacto";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-gradient-to-br from-white via-white to-indigo-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/30"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-indigo-200/60 dark:border-indigo-800/40 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-800/40">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{displayName}</SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-xs">{contacto?.email}</span>
                {contacto?.es_potencial ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Contacto potencial
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    <Link2 className="h-3 w-3 mr-1" />
                    Vinculado a CRM
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && contacto?.es_potencial && !cliente && (
              <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Este contacto todavía no es cliente
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Podés vincularlo a un cliente existente del CRM para manejarlo como contacto de una empresa.
                    </p>
                    {!vincularPotencialOpen ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setVincularPotencialOpen(true)}
                        className="h-8"
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Vincular a cliente
                      </Button>
                    ) : (
                      <div className="space-y-2 bg-white dark:bg-gray-900 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        <SearchableCombobox
                          value={clienteVincularId}
                          onValueChange={setClienteVincularId}
                          searchFn={searchClientes}
                          placeholder="Buscar cliente..."
                          emptyMessage="Sin resultados"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 flex-1"
                            disabled={!clienteVincularId || vinculandoPotencial}
                            onClick={handleVincularPotencial}
                          >
                            {vinculandoPotencial ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Vincular
                          </Button>
                          <Button
                            size="sm"
                            type="outline"
                            className="h-7"
                            onClick={() => {
                              setVincularPotencialOpen(false);
                              setClienteVincularId("");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {cliente && (
              <section className="p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                      Cliente
                    </p>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {cliente.nombre_fantasia || cliente.nombre}
                    </p>
                    {cliente.nombre_fantasia && (
                      <p className="text-xs text-muted-foreground truncate">
                        {cliente.nombre}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                      {cliente.cuit && <span>CUIT {cliente.cuit}</span>}
                      {cliente.localidad && <span>· {cliente.localidad}</span>}
                      {cliente.provincia && <span>· {cliente.provincia}</span>}
                      {cliente.sector && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {cliente.sector}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {cliente && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Personas en esta empresa
                    <Badge variant="outline" className="text-[10px]">
                      {personas.length}
                    </Badge>
                  </h3>
                  <Button
                    size="sm"
                    type="outline"
                    className="h-7 text-xs"
                    onClick={() => setAgregarVinculoOpen(!agregarVinculoOpen)}
                    disabled={!contacto?.persona_id}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    A otro cliente
                  </Button>
                </div>

                {agregarVinculoOpen && (
                  <div className="mb-3 p-3 rounded-lg border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      La persona se agrega a otro cliente sin perder el vínculo actual
                      (puede trabajar en varias empresas).
                    </p>
                    <SearchableCombobox
                      value={clienteDestinoId}
                      onValueChange={setClienteDestinoId}
                      searchFn={searchClientes}
                      placeholder="Buscar cliente destino..."
                      emptyMessage="Sin resultados"
                    />
                    <Select value={rolNuevo} onValueChange={setRolNuevo}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_ORDER.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TIPO_RELACION_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 flex-1"
                        disabled={!clienteDestinoId || guardandoVinculo}
                        onClick={handleAgregarVinculo}
                      >
                        {guardandoVinculo ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Agregar
                      </Button>
                      <Button
                        size="sm"
                        type="outline"
                        className="h-7"
                        onClick={() => {
                          setAgregarVinculoOpen(false);
                          setClienteDestinoId("");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {personas.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No hay personas cargadas en este cliente todavía.
                    </p>
                  )}
                  {personas.map((p) => {
                    const isEste = p.persona_id === contacto?.persona_id;
                    return (
                      <div
                        key={p.prs_id}
                        className={cn(
                          "p-3 rounded-lg border bg-white dark:bg-gray-800 space-y-2",
                          isEste
                            ? "border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-200 dark:ring-indigo-800"
                            : "border-gray-200 dark:border-gray-700",
                          !p.activo && "opacity-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {p.nombre_completo}
                              </span>
                              {p.es_contacto_principal && (
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              )}
                              {isEste && (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] h-4">
                                  este contacto
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                              {p.persona_email && <span className="truncate">{p.persona_email}</span>}
                              {p.persona_telefono && <span>· {p.persona_telefono}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={p.activo}
                              onCheckedChange={(v) => handlePatchPrs(p.prs_id, { activo: v })}
                              className="scale-75"
                            />
                            <Button
                              size="sm"
                              type="text"
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeletePrs(p.prs_id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Select
                          value={p.tipo_relacion}
                          onValueChange={(v) => handlePatchPrs(p.prs_id, { tipo_relacion: v })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_ORDER.map((t) => (
                              <SelectItem key={t} value={t}>
                                {TIPO_RELACION_LABELS[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {otrasEmpresas.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  Otras empresas donde trabaja
                  <Badge variant="outline" className="text-[10px]">
                    {otrasEmpresas.length}
                  </Badge>
                </h3>
                <div className="space-y-1.5">
                  {otrasEmpresas.map((v) => (
                    <div
                      key={v.prs_id}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border bg-white dark:bg-gray-800",
                        v.activo
                          ? "border-gray-200 dark:border-gray-700"
                          : "border-gray-200 dark:border-gray-700 opacity-50"
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {v.cliente_fantasia || v.cliente_nombre}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {TIPO_RELACION_LABELS[v.tipo_relacion] || v.tipo_relacion}
                        </p>
                      </div>
                      {v.es_contacto_principal && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                      <Switch
                        checked={v.activo}
                        onCheckedChange={(val) => handlePatchPrs(v.prs_id, { activo: val })}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {otrasListas.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  También aparece en
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {otrasListas.map((l) => (
                    <Badge key={l.lista_id} variant="outline" className="text-xs">
                      {l.lista_nombre}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
