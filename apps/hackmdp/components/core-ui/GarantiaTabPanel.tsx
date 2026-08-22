"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Phone,
  Package as PackageIcon,
  Truck,
  CheckCircle2,
  StickyNote,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TipoEvento =
  | "contacto"
  | "repuesto_solicitado"
  | "repuesto_enviado"
  | "repuesto_recibido"
  | "nota";

const TIPO_LABEL: Record<TipoEvento, string> = {
  contacto: "Contacto con fábrica",
  repuesto_solicitado: "Repuesto solicitado",
  repuesto_enviado: "Repuesto enviado",
  repuesto_recibido: "Repuesto recibido",
  nota: "Nota",
};

const TIPO_ICON: Record<TipoEvento, React.ComponentType<{ className?: string }>> = {
  contacto: Phone,
  repuesto_solicitado: PackageIcon,
  repuesto_enviado: Truck,
  repuesto_recibido: CheckCircle2,
  nota: StickyNote,
};

const TIPO_COLOR: Record<TipoEvento, string> = {
  contacto: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/20 dark:border-blue-800",
  repuesto_solicitado: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800",
  repuesto_enviado: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-900/20 dark:border-purple-800",
  repuesto_recibido: "text-green-600 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800",
  nota: "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-900/20 dark:border-gray-800",
};

interface Evento {
  id: string;
  tipo: TipoEvento;
  fecha: string;
  descripcion?: string | null;
  contacto_canal?: string | null;
  contacto_persona?: string | null;
  repuesto_descripcion?: string | null;
  repuesto_codigo?: string | null;
  repuesto_cantidad?: number | null;
  tracking_codigo?: string | null;
  tracking_courier?: string | null;
  tracking_url?: string | null;
  created_by_nombre?: string | null;
  created_at: string;
}

export interface Caso {
  id: string;
  resumen?: string | null;
  proveedor?: string | null;
  numero_caso_fabrica?: string | null;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  cerrado: boolean;
  eventos_count?: number;
}

export function GarantiaTabPanel({ servicioId }: { servicioId: string }) {
  const { data, isLoading, mutate } = useSWR<{ data: Caso[] }>(
    `/api/garantias?servicio_id=${servicioId}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const casos = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold">Casos de garantía</h3>
          {casos.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {casos.length}
            </Badge>
          )}
        </div>
        <NewCasoDialog
          open={newCaseOpen}
          onOpenChange={setNewCaseOpen}
          servicioId={servicioId}
          onCreated={() => mutate()}
        />
      </div>

      {casos.length === 0 ? (
        <div className="border border-dashed rounded-md p-8 text-center text-sm text-gray-500">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="mb-3">Este servicio no tiene casos de garantía abiertos.</p>
          <Button size="sm" onClick={() => setNewCaseOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Abrir caso
          </Button>
        </div>
      ) : (
        casos.map((c) => (
          <GarantiaCasoCard key={c.id} caso={c} onChange={() => mutate()} />
        ))
      )}
    </div>
  );
}

function NewCasoDialog({
  open,
  onOpenChange,
  servicioId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicioId: string;
  onCreated: () => void;
}) {
  const [resumen, setResumen] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [numeroCasoFabrica, setNumeroCasoFabrica] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/garantias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicio_id: servicioId,
          resumen: resumen || null,
          proveedor: proveedor || null,
          numero_caso_fabrica: numeroCasoFabrica || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Caso abierto");
      setResumen("");
      setProveedor("");
      setNumeroCasoFabrica("");
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al crear caso");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo caso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir caso de garantía</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="resumen" className="text-xs">Resumen</Label>
            <Textarea
              id="resumen"
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              placeholder="Falla detectada, contexto..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="proveedor" className="text-xs">Proveedor / fábrica</Label>
            <Input
              id="proveedor"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Ej: Mindray Argentina"
            />
          </div>
          <div>
            <Label htmlFor="numero" className="text-xs">N° caso fábrica (opcional)</Label>
            <Input
              id="numero"
              value={numeroCasoFabrica}
              onChange={(e) => setNumeroCasoFabrica(e.target.value)}
              placeholder="Identificador que asigna la fábrica"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Abrir caso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GarantiaCasoCard({ caso, onChange }: { caso: Caso; onChange: () => void }) {
  const { data, mutate } = useSWR<Caso & { eventos: Evento[] }>(
    `/api/garantias/${caso.id}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const [eventOpen, setEventOpen] = useState(false);
  const eventos = data?.eventos || [];

  async function toggleCerrado() {
    try {
      await fetch(`/api/garantias/${caso.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cerrado: !caso.cerrado }),
      });
      onChange();
      mutate();
      toast.success(caso.cerrado ? "Caso reabierto" : "Caso cerrado");
    } catch {
      toast.error("Error");
    }
  }

  async function deleteEvento(id: string) {
    if (!confirm("¿Borrar este evento?")) return;
    try {
      await fetch(`/api/garantias/eventos/${id}`, { method: "DELETE" });
      mutate();
    } catch {
      toast.error("Error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-md overflow-hidden"
    >
      <div className="p-3 bg-gray-50 dark:bg-gray-900/40 border-b flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">
              {caso.proveedor || "Sin proveedor"}
            </span>
            {caso.numero_caso_fabrica && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {caso.numero_caso_fabrica}
              </Badge>
            )}
            {caso.cerrado ? (
              <Badge className="text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-200">
                Cerrado
              </Badge>
            ) : (
              <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">
                Abierto
              </Badge>
            )}
          </div>
          {caso.resumen && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
              {caso.resumen}
            </p>
          )}
          <p className="text-[11px] text-gray-500 mt-1">
            Abierto el {new Date(caso.fecha_apertura).toLocaleDateString("es-AR")}
            {caso.fecha_cierre && ` · cerrado ${new Date(caso.fecha_cierre).toLocaleDateString("es-AR")}`}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <NewEventoDialog
            open={eventOpen}
            onOpenChange={setEventOpen}
            casoId={caso.id}
            onCreated={() => mutate()}
          />
          <Button size="sm" variant="ghost" onClick={toggleCerrado}>
            {caso.cerrado ? (
              <Unlock className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {eventos.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Sin eventos todavía. Agregá uno con +Evento.
          </p>
        ) : (
          eventos.map((ev) => <EventoRow key={ev.id} evento={ev} onDelete={() => deleteEvento(ev.id)} />)
        )}
      </div>
    </motion.div>
  );
}

function EventoRow({ evento, onDelete }: { evento: Evento; onDelete: () => void }) {
  const Icon = TIPO_ICON[evento.tipo] || StickyNote;
  return (
    <div className={`flex gap-2 items-start p-2 rounded-md border ${TIPO_COLOR[evento.tipo]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 text-xs space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{TIPO_LABEL[evento.tipo]}</span>
          <span className="text-[10px] opacity-70">
            {new Date(evento.fecha).toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {evento.tipo === "contacto" && (
          <p className="opacity-90">
            {evento.contacto_canal && <span className="capitalize">{evento.contacto_canal}</span>}
            {evento.contacto_canal && evento.contacto_persona && " · "}
            {evento.contacto_persona}
          </p>
        )}
        {(evento.tipo === "repuesto_solicitado" || evento.tipo === "repuesto_enviado") && (
          <p className="opacity-90">
            {evento.repuesto_cantidad && <span>{evento.repuesto_cantidad}× </span>}
            {evento.repuesto_descripcion || "Sin descripción"}
            {evento.repuesto_codigo && (
              <span className="font-mono ml-1 opacity-70">[{evento.repuesto_codigo}]</span>
            )}
          </p>
        )}
        {evento.tipo === "repuesto_enviado" && (evento.tracking_codigo || evento.tracking_url) && (
          <p className="opacity-90 font-mono text-[10px]">
            {evento.tracking_courier && <span>{evento.tracking_courier} · </span>}
            {evento.tracking_codigo}
            {evento.tracking_url && (
              <a
                href={evento.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>
        )}
        {evento.descripcion && (
          <p className="opacity-90 whitespace-pre-wrap mt-1">{evento.descripcion}</p>
        )}
        {evento.created_by_nombre && (
          <p className="text-[10px] opacity-60 mt-1">por {evento.created_by_nombre}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-40 hover:opacity-100 hover:text-red-600 transition-opacity shrink-0"
        aria-label="Borrar"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function NewEventoDialog({
  open,
  onOpenChange,
  casoId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casoId: string;
  onCreated: () => void;
}) {
  const [tipo, setTipo] = useState<TipoEvento>("contacto");
  const [descripcion, setDescripcion] = useState("");
  // contacto
  const [contactoCanal, setContactoCanal] = useState<string>("");
  const [contactoPersona, setContactoPersona] = useState("");
  // repuesto
  const [repuestoDesc, setRepuestoDesc] = useState("");
  const [repuestoCodigo, setRepuestoCodigo] = useState("");
  const [repuestoCantidad, setRepuestoCantidad] = useState("");
  const [trackingCodigo, setTrackingCodigo] = useState("");
  const [trackingCourier, setTrackingCourier] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTipo("contacto");
    setDescripcion("");
    setContactoCanal("");
    setContactoPersona("");
    setRepuestoDesc("");
    setRepuestoCodigo("");
    setRepuestoCantidad("");
    setTrackingCodigo("");
    setTrackingCourier("");
    setTrackingUrl("");
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const body: Record<string, any> = { tipo, descripcion: descripcion || null };
      if (tipo === "contacto") {
        body.contacto_canal = contactoCanal || null;
        body.contacto_persona = contactoPersona || null;
      }
      if (tipo === "repuesto_solicitado" || tipo === "repuesto_enviado") {
        body.repuesto_descripcion = repuestoDesc || null;
        body.repuesto_codigo = repuestoCodigo || null;
        body.repuesto_cantidad = repuestoCantidad ? parseInt(repuestoCantidad, 10) : null;
      }
      if (tipo === "repuesto_enviado") {
        body.tracking_codigo = trackingCodigo || null;
        body.tracking_courier = trackingCourier || null;
        body.tracking_url = trackingUrl || null;
      }

      const res = await fetch(`/api/garantias/${casoId}/eventos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success("Evento agregado");
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" /> Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEvento)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as TipoEvento[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "contacto" && (
            <>
              <div>
                <Label className="text-xs">Canal</Label>
                <Select value={contactoCanal} onValueChange={setContactoCanal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Email, WhatsApp..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telefono">Teléfono</SelectItem>
                    <SelectItem value="reunion">Reunión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Persona de fábrica</Label>
                <Input
                  value={contactoPersona}
                  onChange={(e) => setContactoPersona(e.target.value)}
                  placeholder="Nombre del contacto"
                />
              </div>
            </>
          )}

          {(tipo === "repuesto_solicitado" || tipo === "repuesto_enviado") && (
            <>
              <div>
                <Label className="text-xs">Repuesto</Label>
                <Input
                  value={repuestoDesc}
                  onChange={(e) => setRepuestoDesc(e.target.value)}
                  placeholder="Descripción del repuesto"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Código / SKU</Label>
                  <Input
                    value={repuestoCodigo}
                    onChange={(e) => setRepuestoCodigo(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={repuestoCantidad}
                    onChange={(e) => setRepuestoCantidad(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
            </>
          )}

          {tipo === "repuesto_enviado" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Courier</Label>
                  <Input
                    value={trackingCourier}
                    onChange={(e) => setTrackingCourier(e.target.value)}
                    placeholder="DHL, FedEx, Andreani..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Tracking</Label>
                  <Input
                    value={trackingCodigo}
                    onChange={(e) => setTrackingCodigo(e.target.value)}
                    placeholder="Nº de envío"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">URL tracking</Label>
                <Input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          <Separator />
          <div>
            <Label className="text-xs">Notas / detalle</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué pasó, qué se acordó..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
