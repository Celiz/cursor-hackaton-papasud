"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { searchClientes } from "@/hooks/use-client-search";
import { searchPersonas } from "@/hooks/use-persona-search";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, DollarSign, Percent,
  FileText, User, Eye,
  CreditCard, RefreshCw,
  Wrench, GraduationCap, Box,
  Image, FileImage, BookOpen, X,
  ChevronDown, Star, Send, Plus, Copy
} from "lucide-react";
import { PresupuestoEquipo, Cliente, BibliotecaRecurso } from "@/lib/types";
import { EquipoSelector, CondicionBadge, type Equipo } from './EquipoSelector';
import { EspecificacionesEditor } from "@/components/core-ui/EspecificacionesEditor";
import { EquipoLineasEditor } from './EquipoLineasEditor';
import type { EquipoLinea } from '@/lib/precios/equipo-lineas';
import { useSession } from "@/lib/hooks/use-session";
import { AplicarCatalogoDialog } from "@/components/core-ui/AplicarCatalogoDialog";
import { BibliotecaPickerDialog } from "@/components/core-ui/BibliotecaPickerDialog";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format-currency";
import { NumberInput } from "@/components/ui/number-input";
import {
  agruparTotalesPorMoneda,
  monedaDominante,
  normalizarMoneda,
} from "@/lib/presupuesto-equipo-totales";

interface PresupuestoEquipoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuesto?: PresupuestoEquipo | null;
  defaultEquipo?: Equipo | null;
  defaultClienteId?: string;
  defaultPersonaId?: string;
  defaultOportunidadId?: string;
  onSuccess: () => void;
}

// Card editable para presupuestos multi-equipo (desde oportunidad con N>=2 equipos)
interface EquipoCotizado {
  equipo_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  // Alícuota de IVA de esta línea en % (default desde equipo.iva, editable).
  iva_porcentaje: number;
  // Costo de la línea (interno) en la moneda del presupuesto, editable. Base de la
  // ganancia %. `ganancia` es el buffer de texto del input de ganancia (para tipear).
  precio_costo: number;
  ganancia: string;
  equipo: Equipo;
  // Moneda ACTUAL de la línea (en la que están precio_unitario/precio_costo). Arranca
  // en la del catálogo (equipo.precio_lista_moneda) y, al cambiar la moneda del
  // presupuesto en un presupuesto de moneda única, se re-cotiza y se actualiza acá.
  moneda?: 'ARS' | 'USD';
  // Ficha técnica de este item del presupuesto. Si especificaciones_personalizada
  // es true, override del catálogo; si false/undefined, el PDF muestra el catálogo.
  especificaciones?: Record<string, unknown> | string[] | null;
  especificaciones_personalizada?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
};

const fetcherArray = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return Array.isArray(data) ? data : [];
};

// Buscador combinado: clientes Y contactos (personas) en un solo campo. Los
// contactos se marcan con badge "Contacto" y `data.tipo` para distinguirlos al
// seleccionar (un presupuesto puede ir a un contacto que aún no es cliente).
async function searchClienteOContacto(query: string): Promise<ComboboxOption[]> {
  const [clientes, personas] = await Promise.all([
    searchClientes(query),
    searchPersonas(query),
  ]);
  return [
    ...clientes.map((o) => ({ ...o, data: { ...(o.data as any), tipo: 'cliente' as const } })),
    ...personas.map((o) => ({
      ...o,
      badge: 'Contacto',
      data: { ...(o.data as any), tipo: 'contacto' as const },
    })),
  ];
}

// Alícuotas de IVA estándar (Argentina). El equipo guarda su default en equipos.iva.
const IVA_ALICUOTAS = [0, 10.5, 21, 27];
// Ajusta un valor a la alícuota estándar más cercana (para que el dropdown matchee
// aunque venga un valor derivado de iva/subtotal de un presupuesto viejo).
const snapAlicuota = (n: number): number => {
  if (!isFinite(n)) return 10.5;
  return IVA_ALICUOTAS.reduce((best, a) => (Math.abs(a - n) < Math.abs(best - n) ? a : best), 10.5);
};
// Formatea una alícuota para mostrar (10.5 → "10,5").
const fmtPct = (n: number): string => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });

// ============================================
// COMPONENTE: Vista Previa del Presupuesto Equipo
// ============================================
function PreviewPanel({
  cliente,
  equipo,
  total,
  subtotal,
  iva,
  ivaLabel,
  previewItems = [],
  formData,
  cotizacionUsd,
  materialComercial,
  documentosBiblioteca = [],
  extraEquiposCount = 0,
  totalesPorMoneda = [],
  presupuestoMixto = false,
}: {
  cliente: Cliente | null;
  equipo: Equipo | null;
  total: number;
  subtotal: number;
  iva: number;
  ivaLabel: string;
  previewItems?: Array<{ id: string; nombre: string; tipo?: string; cantidad: number; condicion?: string; imagen_url?: string; monto: number; moneda?: string }>;
  formData: any;
  cotizacionUsd: number;
  documentosBiblioteca?: BibliotecaRecurso[];
  materialComercial: {
    incluirFolleto: boolean;
    incluirFichaTecnica: boolean;
    incluirImagenes: boolean;
  };
  extraEquiposCount?: number;
  totalesPorMoneda?: Array<{ moneda: string; subtotal: number; iva: number; total: number }>;
  presupuestoMixto?: boolean;
}) {
  const division = (cliente as any)?.division || 'humanos';
  const isVeterinaria = division === 'veterinaria';

  const accentColor = isVeterinaria ? 'text-violet-700' : 'text-red-700';
  const accentBg = isVeterinaria ? 'bg-violet-700' : 'bg-red-700';

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-950 overflow-hidden">
      {/* Header del panel */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-shrink-0">
        <Eye className={cn("w-4 h-4", isVeterinaria ? "text-violet-500" : "text-red-500")} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vista Previa</span>
      </div>

      {/* Contenido del preview */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="bg-white rounded-lg shadow-lg mx-auto overflow-hidden" style={{ maxWidth: '380px' }}>

            {/* Encabezado */}
            <div className={cn("px-3 py-2 flex justify-between items-center", accentBg)}>
              <span className="text-white text-xs font-bold">PRESUPUESTO EQUIPO</span>
              <span className="text-white/80 text-xs">N° {formData.numero || 'NUEVO'}</span>
            </div>

            {/* Cliente */}
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <p className="text-[9px] font-semibold text-gray-400 uppercase">Cliente</p>
              {cliente ? (
                <p className="text-xs font-medium text-gray-900 truncate">{cliente.nombre_fantasia || cliente.nombre}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">Sin cliente</p>
              )}
            </div>

            {/* Equipo(s) */}
            <div className="px-3 py-3 border-b border-gray-200">
              {previewItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Sin equipo seleccionado</p>
              ) : previewItems.length === 1 ? (
                <div className="flex gap-3">
                  {previewItems[0].imagen_url ? (
                    <img
                      src={previewItems[0].imagen_url}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Box className="w-6 h-6 text-violet-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{previewItems[0].nombre}</p>
                      <CondicionBadge condicion={previewItems[0].condicion} />
                    </div>
                    {previewItems[0].tipo && <p className="text-[10px] text-gray-500">{previewItems[0].tipo}</p>}
                    {formData.descripcion_comercial && (
                      <p className="text-[9px] text-gray-600 mt-1 line-clamp-2">{formData.descripcion_comercial}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {previewItems.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Box className="w-3 h-3 text-violet-500 flex-shrink-0" />
                        <span className="text-[10px] text-gray-700 truncate">
                          {it.nombre}{it.cantidad > 1 ? ` ×${it.cantidad}` : ''}
                        </span>
                      </span>
                      <span className="text-[10px] font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(it.monto, it.moneda || formData.moneda)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Material comercial incluido */}
            {(materialComercial.incluirFolleto || materialComercial.incluirFichaTecnica || materialComercial.incluirImagenes) && (
              <div className="px-3 py-2 border-b border-gray-200 bg-blue-50/50">
                <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Material adjunto</p>
                <div className="flex flex-wrap gap-1">
                  {materialComercial.incluirFolleto && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-0.5">
                      <BookOpen className="w-2.5 h-2.5" /> Folleto
                    </span>
                  )}
                  {materialComercial.incluirFichaTecnica && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" /> Ficha Técnica
                    </span>
                  )}
                  {materialComercial.incluirImagenes && (
                    <span className="text-[8px] px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded flex items-center gap-0.5">
                      <Image className="w-2.5 h-2.5" /> Galería
                    </span>
                  )}
                </div>
              </div>
            )}

            {documentosBiblioteca.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-200 bg-emerald-50/50">
                <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">
                  Documentación adicional ({documentosBiblioteca.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {documentosBiblioteca.map((d) => (
                    <span
                      key={d.id}
                      className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex items-center gap-0.5"
                      title={d.descripcion || d.titulo}
                    >
                      <FileText className="w-2.5 h-2.5" />
                      {d.titulo.length > 28 ? d.titulo.slice(0, 28) + '…' : d.titulo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Servicios incluidos */}
            <div className="px-3 py-2 border-b border-gray-200 space-y-1">
              <p className="text-[9px] font-semibold text-gray-400 uppercase">Incluye</p>
              <div className="flex flex-wrap gap-1">
                {formData.incluye_instalacion && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Instalación</span>
                )}
                {formData.incluye_capacitacion && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Capacitación</span>
                )}
                {formData.garantia && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                    {formData.garantia.toLowerCase().startsWith('sin') ? formData.garantia : `Garantía ${formData.garantia}`}
                  </span>
                )}
              </div>
            </div>

            {/* Precio */}
            <div className="px-3 py-3">
              {presupuestoMixto && totalesPorMoneda.length > 1 ? (
                // Monedas mezcladas: un bloque por moneda (no se suman entre sí).
                totalesPorMoneda.map((t) => (
                  <div key={t.moneda} className="mb-2 last:mb-0">
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatCurrency(t.subtotal, t.moneda)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>IVA</span>
                      <span className="tabular-nums">{formatCurrency(t.iva, t.moneda)}</span>
                    </div>
                    <div className={cn("flex justify-between text-sm font-bold pt-1 border-t border-gray-200", accentColor)}>
                      <span>TOTAL {t.moneda}</span>
                      <span className="tabular-nums">{formatCurrency(t.total, t.moneda)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Precio Base</span>
                    <span>{formatCurrency(formData.precio_base || 0, formData.moneda)}</span>
                  </div>
                  {formData.descuento_porcentaje > 0 && (
                    <div className="flex justify-between text-[10px] text-red-500">
                      <span>Descuento ({formData.descuento_porcentaje}%)</span>
                      <span>-{formatCurrency((formData.precio_base * formData.descuento_porcentaje / 100) || 0, formData.moneda)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Subtotal</span>
                    <span className="select-all tabular-nums">{formatCurrency(subtotal, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>{ivaLabel}</span>
                    <span className="select-all tabular-nums">{formatCurrency(iva, formData.moneda)}</span>
                  </div>
                  <div className={cn("flex justify-between text-sm font-bold mt-2 pt-2 border-t border-gray-200", accentColor)}>
                    <span>TOTAL</span>
                    <span className="select-all tabular-nums">{formatCurrency(total, formData.moneda)}</span>
                  </div>
                  {formData.moneda === 'USD' && cotizacionUsd > 0 && (
                    <div className="text-[8px] text-gray-400 text-right">
                      ≈ {formatCurrency(total * cotizacionUsd, 'ARS')} (cotiz: ${cotizacionUsd})
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Condiciones */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 space-y-1">
              {formData.forma_pago && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-400">Forma de pago</span>
                  <span className="text-gray-600">{formData.forma_pago}</span>
                </div>
              )}
              {formData.tiempo_entrega && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-400">Entrega</span>
                  <span className="text-gray-600">{formData.tiempo_entrega}</span>
                </div>
              )}
              <div className="flex justify-between text-[9px]">
                <span className="text-gray-400">Validez</span>
                <span className="text-gray-600">{formData.validez_dias} días</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[8px] text-gray-400 text-center">
                Header y firma se mostrarán en el PDF final
              </p>
            </div>

          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function PresupuestoEquipoFormDialog({
  open,
  onOpenChange,
  presupuesto,
  defaultEquipo,
  defaultClienteId,
  defaultPersonaId,
  defaultOportunidadId,
  onSuccess,
}: PresupuestoEquipoFormDialogProps) {
  const isEditing = !!presupuesto;
  // Id del presupuesto recién creado (para no duplicar borradores al guardar/enviar
  // prueba varias veces con el diálogo abierto).
  const [savedId, setSavedId] = useState<string | null>(null);

  // Data fetching
  const { data: equipos = [] } = useSWR<Equipo[]>(open ? '/api/equipos' : null, fetcherArray);
  const { data: cotizacion, mutate: mutateCotizacion } = useSWR(
    open ? '/api/cotizaciones' : null, // endpoint correcto (plural); /api/cotizacion no existe
    fetcher
  );
  const { data: nextNumberData } = useSWR<{ numero: string }>(
    open && !isEditing ? '/api/presupuestos-equipos/next-number' : null,
    fetcher
  );

  // Form state
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [formData, setFormData] = useState({
    numero: "",
    cliente_id: defaultClienteId || "",
    equipo_id: defaultEquipo?.id || "",
    fecha_emision: new Date().toISOString().split("T")[0],
    validez_dias: 30,
    precio_base: defaultEquipo?.precio_lista || 0,
    descuento_porcentaje: 0,
    iva_porcentaje: Number((defaultEquipo as any)?.iva) || 10.5,
    moneda: (defaultEquipo?.precio_lista_moneda || "USD") as "ARS" | "USD",
    cotizacion_usd: 0,
    tipo_cotizacion: "oficial",
    mostrar_en_usd: true,
    forma_pago: "contado", // 'contado' | 'financiado'
    financiacion_cuotas: "1",
    interes_porcentaje: "0",
    tiempo_entrega: "",
    garantia: "12 meses",
    incluye_instalacion: true,
    incluye_capacitacion: true,
    descripcion_comercial: defaultEquipo?.descripcion_comercial || defaultEquipo?.descripcion || "",
    observaciones: "",
    especificaciones: (defaultEquipo?.especificaciones || {}) as Record<string, unknown> | string[],
    especificaciones_personalizada: false,
  });

  // Material comercial state
  const [materialComercial, setMaterialComercial] = useState({
    incluirFolleto: true,
    incluirFichaTecnica: true,
    incluirImagenes: true,
  });

  // Documentos extra adjuntados desde la biblioteca (aparte del folleto/ficha
  // estándar del equipo). Casos: cliente pide normativa, planos, ofertas
  // especiales, etc. Se persisten via biblioteca_vinculos.
  const [documentosBiblioteca, setDocumentosBiblioteca] = useState<BibliotecaRecurso[]>([]);
  const [pickerBibliotecaOpen, setPickerBibliotecaOpen] = useState(false);

  // Estado multi-equipo: cards de equipos cotizados desde la oportunidad.
  // Se activa cuando la oportunidad trae >=2 equipos. Una vez activado, se mantiene
  // mientras quede al menos 1 card (para que el usuario pueda agregar/quitar sin
  // que la UI "salte" entre modos).
  const [equiposCotizados, setEquiposCotizados] = useState<EquipoCotizado[]>([]);
  const isMultiMode = equiposCotizados.length >= 1;

  // La precarga del equipo desde la oportunidad debe correr UNA sola vez por apertura.
  // Sin este guard, al quitar el equipo (equipo_id → "") el effect de precarga se vuelve
  // a disparar y lo re-selecciona, impidiendo borrarlo o elegir otro equipo.
  const preloadOportunidadDoneRef = useRef(false);
  // IDs de equipos con la ficha técnica expandida en el modal multi.
  const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set());
  // Mostrar el selector para agregar más equipos al presupuesto (multi manual).
  const [mostrarAgregarEquipo, setMostrarAgregarEquipo] = useState(false);

  // Fetch cliente seleccionado
  const { data: clienteSeleccionado } = useSWR<Cliente>(
    formData.cliente_id ? `/api/clientes/${formData.cliente_id}` : null,
    fetcher
  );

  // Contacto (persona) destinatario: elegido a mano en el buscador o por
  // defaultPersonaId (cuando se abre desde el CRM). Reemplaza al cliente cuando el
  // presupuesto va a un contacto que todavía no es cliente.
  const [personaId, setPersonaId] = useState<string>(defaultPersonaId || "");

  // Fetch persona (contacto) elegido si no hay cliente (para mostrar datos / email).
  const { data: personaSeleccionada } = useSWR<any>(
    open && !formData.cliente_id && personaId
      ? `/api/personas/${personaId}`
      : null,
    fetcher
  );

  // Opción para que el combobox muestre el contacto elegido (label + email) aunque
  // no esté entre los primeros resultados de la búsqueda combinada.
  const contactoOption: ComboboxOption | null = personaId && personaSeleccionada
    ? {
        value: personaId,
        label:
          personaSeleccionada.nombre_completo ||
          `${personaSeleccionada.nombre || ''} ${personaSeleccionada.apellido || ''}`.trim() ||
          'Contacto',
        badge: 'Contacto',
        secondaryLabel:
          (Array.isArray(personaSeleccionada.email)
            ? personaSeleccionada.email[0]
            : personaSeleccionada.email) || undefined,
      }
    : null;

  // Get equipo seleccionado
  // En modo multi, cae al primero de la lista (para que el preview muestre algo y submit tenga referencia).
  const equipoSeleccionado = useMemo(() => {
    if (equiposCotizados.length >= 1) return equiposCotizados[0]?.equipo ?? null;
    if (defaultEquipo && formData.equipo_id === defaultEquipo.id) return defaultEquipo;
    return equipos.find(e => e.id === formData.equipo_id) || null;
  }, [equipos, formData.equipo_id, defaultEquipo, equiposCotizados]);

  // La moneda del presupuesto SIEMPRE sigue a la de los equipos (no se convierte):
  // un presupuesto de equipos USD va en USD. `monedaEquipos` es la moneda única de
  // los equipos cargados (null si todavía no hay equipo o si mezclan monedas).
  const monedaEquipos = useMemo<'ARS' | 'USD' | null>(() => {
    const fuentes = equiposCotizados.length >= 1
      ? equiposCotizados.map((c) => c.moneda ?? (c.equipo as any)?.precio_lista_moneda)
      : [(equipoSeleccionado as any)?.precio_lista_moneda];
    const uniq = Array.from(new Set(fuentes.filter(Boolean)));
    return uniq.length === 1 ? (uniq[0] as 'ARS' | 'USD') : null;
  }, [equiposCotizados, equipoSeleccionado]);

  // Default la moneda del presupuesto a la de los equipos cuando ÉSTA cambia (al
  // elegir/cargar equipos), pero sin re-forzarla en cada render: así el usuario puede
  // cotizar en otra moneda (p. ej. un equipo USD facturado en ARS) sin que se la pisemos.
  const monedaAplicadaRef = useRef<'ARS' | 'USD' | null>(null);
  useEffect(() => {
    if (monedaEquipos && monedaAplicadaRef.current !== monedaEquipos) {
      monedaAplicadaRef.current = monedaEquipos;
      if (monedaEquipos !== formData.moneda) {
        setFormData((f) => ({ ...f, moneda: monedaEquipos }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monedaEquipos]);

  // Costo del equipo: base para la ganancia editable SOLO en este presupuesto
  // (no modifica el equipo de catálogo).
  // Costo del equipo, convertido a la moneda del presupuesto (el costo del catálogo
  // está en la moneda del equipo). Así la ganancia % queda bien aunque cambies a ARS.
  const equipoCosto = (() => {
    const raw = Number((equipoSeleccionado as any)?.precio_costo) || 0;
    if (raw <= 0) return 0;
    // El costo está en moneda_compra (puede diferir de la de venta: compra USD / venta ARS).
    const equipoMoneda = ((equipoSeleccionado as any)?.moneda_compra
      || (equipoSeleccionado as any)?.precio_lista_moneda || 'USD') as 'USD' | 'ARS';
    const cot = formData.cotizacion_usd;
    if (equipoMoneda === formData.moneda || !cot || cot <= 0) return raw;
    return formData.moneda === 'ARS' ? raw * cot : raw / cot;
  })();
  const [gananciaInput, setGananciaInput] = useState<string>('');

  // Al cambiar de equipo (selección o carga en edición) derivamos la ganancia
  // desde el precio_base actual y el costo del equipo.
  useEffect(() => {
    if (equipoCosto > 0 && formData.precio_base > 0) {
      setGananciaInput((((formData.precio_base / equipoCosto) - 1) * 100).toFixed(2));
    } else {
      setGananciaInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoSeleccionado?.id]);

  // Ganancia % -> recalcula precio_base (solo este presupuesto)
  const handleGananciaPresupChange = (val: string) => {
    setGananciaInput(val);
    const g = parseFloat(val);
    if (equipoCosto > 0 && !isNaN(g)) {
      setFormData(prev => ({ ...prev, precio_base: Number((equipoCosto * (1 + g / 100)).toFixed(2)) }));
    }
  };
  // Editar el precio base recalcula la ganancia mostrada
  const handlePrecioBasePresupChange = (val: string) => {
    const p = parseFloat(val) || 0;
    setFormData(prev => ({ ...prev, precio_base: p }));
    if (equipoCosto > 0 && p > 0) {
      setGananciaInput((((p / equipoCosto) - 1) * 100).toFixed(2));
    }
  };

  // Disponibilidad del material comercial del equipo seleccionado:
  //  - Folleto: recurso de biblioteca vinculado (folleto_recurso) o, por compat, folleto_url.
  //  - Ficha técnica: las especificaciones del equipo (se renderizan en el PDF).
  const folletoDisponible = !!(equipoSeleccionado?.folleto_recurso?.archivo_url || equipoSeleccionado?.folleto_url);
  const fichaTecnicaDisponible = (() => {
    const e = equipoSeleccionado?.especificaciones;
    if (Array.isArray(e)) return e.length > 0;
    return !!e && typeof e === 'object' && Object.keys(e).length > 0;
  })();

  // Update cotizacion_usd when cotizacion changes
  useEffect(() => {
    if (cotizacion?.valor_venta && formData.cotizacion_usd === 0) {
      setFormData(prev => ({ ...prev, cotizacion_usd: cotizacion.valor_venta }));
    }
  }, [cotizacion, formData.cotizacion_usd]);

  // Autofill next number when opening in create mode
  useEffect(() => {
    if (open && !isEditing && nextNumberData?.numero && !formData.numero) {
      setFormData(prev => ({ ...prev, numero: nextNumberData.numero }));
    }
  }, [open, isEditing, nextNumberData, formData.numero]);

  // Preload equipo(s) desde items de la oportunidad cuando no viene defaultEquipo.
  // Si la oportunidad tiene N>=2 equipos, activa modo multi (equiposCotizados).
  // Si tiene 0-1, modo single (preselecciona el equipo en formData).
  useEffect(() => {
    // Al cerrar el diálogo reseteamos el guard: la próxima apertura vuelve a precargar.
    if (!open) { preloadOportunidadDoneRef.current = false; return; }
    if (isEditing || defaultEquipo || !defaultOportunidadId) return;
    if (preloadOportunidadDoneRef.current) return; // ya se resolvió en esta apertura
    if (formData.equipo_id || equiposCotizados.length > 0) return;
    if (equipos.length === 0) return; // esperar a que carguen los equipos
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/oportunidades-items?oportunidad_id=${defaultOportunidadId}`);
        if (!res.ok) return;
        const items: any[] = await res.json();
        const conEquipo = items.filter((it) => it.equipo_id);
        if (cancelled || conEquipo.length === 0) return;
        // Marcar la precarga como consumida ANTES de aplicar: así el cambio de
        // equipo_id / equiposCotizados que dispara este effect no la vuelve a ejecutar.
        preloadOportunidadDoneRef.current = true;

        // Una línea por equipo de la oportunidad (1 o más): el form siempre usa el
        // editor de líneas compartido. La ficha técnica arranca con copia del catálogo,
        // marcada como NO personalizada para que un cambio en el catálogo se siga
        // reflejando hasta que el usuario edite a mano.
        const cards: EquipoCotizado[] = conEquipo
          .map((it) => {
            const eq = equipos.find((e) => e.id === it.equipo_id);
            if (!eq) return null;
            // Precio del CATÁLOGO del equipo (actual). El precio_unitario del item
            // de la oportunidad puede ser viejo/placeholder, así que solo lo usamos
            // como fallback si el equipo no tiene precio de lista.
            const precio = Number(eq.precio_lista) || Number(it.precio_unitario) || 0;
            const costo = costoCatalogoEnMoneda(eq);
            return {
              equipo_id: eq.id,
              cantidad: Number(it.cantidad) || 1,
              precio_unitario: precio,
              descuento_porcentaje: 0,
              iva_porcentaje: Number((eq as any).iva) || 10.5,
              precio_costo: costo,
              ganancia: deriveGanancia(precio, costo),
              equipo: eq,
              especificaciones: ((eq as any).especificaciones || {}) as Record<string, unknown> | string[],
              especificaciones_personalizada: false,
            };
          })
          .filter(Boolean) as EquipoCotizado[];
        if (cards.length === 0) return;
        setEquiposCotizados(cards);
        setFormData((prev) => ({
          ...prev,
          equipo_id: "",
          precio_base: 0,
          descuento_porcentaje: 0,
          descripcion_comercial: "",
          moneda: ((cards[0].equipo as any).precio_lista_moneda || prev.moneda) as "ARS" | "USD",
        }));
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [open, isEditing, defaultEquipo, defaultOportunidadId, equipos, formData.equipo_id, equiposCotizados.length]);

  // Equipo predefinido (defaultEquipo, p. ej. "presupuestar este equipo"): sembrar
  // 1 línea en el editor compartido. Guardado con el mismo ref de precarga para no
  // re-sembrar si el usuario quita la línea.
  useEffect(() => {
    if (!open || isEditing || !defaultEquipo) return;
    if (equiposCotizados.length > 0 || preloadOportunidadDoneRef.current) return;
    preloadOportunidadDoneRef.current = true;
    const precio = Number(defaultEquipo.precio_lista) || 0;
    const costo = costoCatalogoEnMoneda(defaultEquipo);
    setEquiposCotizados([{
      equipo_id: defaultEquipo.id,
      cantidad: 1,
      precio_unitario: precio,
      descuento_porcentaje: 0,
      iva_porcentaje: Number((defaultEquipo as any).iva) || 10.5,
      precio_costo: costo,
      ganancia: deriveGanancia(precio, costo),
      equipo: defaultEquipo,
      especificaciones: ((defaultEquipo as any).especificaciones || {}) as Record<string, unknown> | string[],
      especificaciones_personalizada: false,
    }]);
  }, [open, isEditing, defaultEquipo, equiposCotizados.length]);

  // Carga de items para edición de presupuestos existentes (detecta multi-equipo)
  const { data: presupuestoConItems } = useSWR<any>(
    open && isEditing && presupuesto?.id
      ? `/api/presupuestos-equipos?id=${presupuesto.id}`
      : null,
    fetcher
  );

  useEffect(() => {
    if (!isEditing || !presupuestoConItems || equipos.length === 0) return;
    if (equiposCotizados.length > 0) return;
    const items: any[] = presupuestoConItems.items || [];
    const equipoItems = items.filter((it) => it.equipo_id && it.tipo === 'equipo');
    // Sembrar el editor de líneas: multi (ítems, header sin equipo_id) o single
    // (equipo_id en el header → 1 línea). Así editar usa siempre el editor compartido.
    if (!presupuestoConItems.equipo_id && equipoItems.length >= 1) {
      const cards: EquipoCotizado[] = equipoItems
        .map((it) => {
          const eq = equipos.find((e) => e.id === it.equipo_id);
          if (!eq) return null;
          const itemSpecs = it.especificaciones;
          const personalizada = !!it.especificaciones_personalizada;
          const precio = Number(it.precio_unitario) || 0;
          // Costo guardado por línea; si no hay (presupuesto viejo), cae al catálogo.
          const costo = it.precio_costo != null && Number(it.precio_costo) > 0
            ? Number(it.precio_costo)
            : costoCatalogoEnMoneda(eq);
          return {
            equipo_id: eq.id,
            cantidad: Number(it.cantidad) || 1,
            precio_unitario: precio,
            descuento_porcentaje: Number(it.descuento_porcentaje) || 0,
            iva_porcentaje: it.iva_porcentaje != null ? Number(it.iva_porcentaje) : (Number((eq as any).iva) || 10.5),
            precio_costo: costo,
            ganancia: deriveGanancia(precio, costo),
            equipo: eq,
            // Los montos guardados están en la moneda del presupuesto.
            moneda: normalizarMoneda(presupuestoConItems.moneda),
            // Si el item tiene specs guardadas, usar esas. Si no, cae al catálogo.
            especificaciones: (itemSpecs && (Array.isArray(itemSpecs) || Object.keys(itemSpecs).length > 0))
              ? itemSpecs
              : (((eq as any).especificaciones || {}) as Record<string, unknown> | string[]),
            especificaciones_personalizada: personalizada,
          };
        })
        .filter(Boolean) as EquipoCotizado[];
      if (cards.length > 0) setEquiposCotizados(cards);
    } else if (presupuestoConItems.equipo_id) {
      // Single guardado en el header → reconstruir 1 línea.
      const eq = equipos.find((e) => e.id === presupuestoConItems.equipo_id);
      if (eq) {
        const precio = Number(presupuestoConItems.precio_base) || Number(eq.precio_lista) || 0;
        const costo = costoCatalogoEnMoneda(eq);
        const sub = Number(presupuestoConItems.subtotal) || 0;
        const ivaPct = snapAlicuota(
          sub > 0 ? (Number(presupuestoConItems.iva) / sub) * 100 : (Number((eq as any).iva) || 10.5),
        );
        const specs = presupuestoConItems.especificaciones;
        setEquiposCotizados([{
          equipo_id: eq.id,
          cantidad: 1,
          precio_unitario: precio,
          descuento_porcentaje: Number(presupuestoConItems.descuento_porcentaje) || 0,
          iva_porcentaje: ivaPct,
          precio_costo: costo,
          ganancia: deriveGanancia(precio, costo),
          equipo: eq,
          // Los montos guardados están en la moneda del presupuesto.
          moneda: normalizarMoneda(presupuestoConItems.moneda),
          especificaciones: (specs && (Array.isArray(specs) || Object.keys(specs).length > 0))
            ? specs
            : (((eq as any).especificaciones || {}) as Record<string, unknown> | string[]),
          especificaciones_personalizada: !!presupuestoConItems.especificaciones_personalizada,
        }]);
      }
    }
    // Cargar documentos adjuntos persistidos
    const docsAdjuntos = Array.isArray(presupuestoConItems.documentos_adicionales)
      ? presupuestoConItems.documentos_adicionales
      : [];
    if (docsAdjuntos.length > 0 && documentosBiblioteca.length === 0) {
      setDocumentosBiblioteca(docsAdjuntos);
    }
  }, [isEditing, presupuestoConItems, equipos, equiposCotizados.length, documentosBiblioteca.length]);

  // Update form when equipo changes
  const handleEquipoSelect = (equipo: Equipo) => {
    // Cualquier acción manual (elegir o quitar) tiene prioridad sobre la precarga
    // automática de la oportunidad: a partir de acá no se vuelve a precargar.
    preloadOportunidadDoneRef.current = true;
    if (!equipo.id) {
      // Clear selection
      setFormData(prev => ({
        ...prev,
        equipo_id: "",
        precio_base: 0,
        descripcion_comercial: "",
        especificaciones: {},
        especificaciones_personalizada: false,
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      equipo_id: equipo.id,
      precio_base: equipo.precio_lista || prev.precio_base,
      iva_porcentaje: Number((equipo as any).iva) || 10.5,
      moneda: (equipo.precio_lista_moneda || prev.moneda) as "ARS" | "USD",
      descripcion_comercial: equipo.descripcion_comercial || equipo.descripcion || prev.descripcion_comercial,
      especificaciones: (equipo.especificaciones || {}) as Record<string, unknown> | string[],
      especificaciones_personalizada: false,
    }));
  };

  // Costo del catálogo de un equipo, convertido a la moneda del presupuesto.
  // (el costo del catálogo está en moneda_compra, que puede diferir de la de venta).
  const costoCatalogoEnMoneda = (equipo: Equipo): number => {
    const raw = Number((equipo as any)?.precio_costo) || 0;
    if (raw <= 0) return 0;
    const equipoMoneda = ((equipo as any)?.moneda_compra
      || (equipo as any)?.precio_lista_moneda || 'USD') as 'USD' | 'ARS';
    const cot = formData.cotizacion_usd;
    if (equipoMoneda === formData.moneda || !cot || cot <= 0) return Number(raw.toFixed(2));
    return Number((formData.moneda === 'ARS' ? raw * cot : raw / cot).toFixed(2));
  };
  // Ganancia % derivada del precio de venta y el costo (string, para el input).
  const deriveGanancia = (precio: number, costo: number): string =>
    costo > 0 && precio > 0 ? (((precio / costo) - 1) * 100).toFixed(2) : '';

  // Pasar del modo single al multi: el equipo ya elegido se vuelve la primera card.
  const pasarAMulti = () => {
    if (!equipoSeleccionado) return;
    const precioPrimera = formData.precio_base || Number(equipoSeleccionado.precio_lista) || 0;
    const costoPrimera = costoCatalogoEnMoneda(equipoSeleccionado);
    const primera: EquipoCotizado = {
      equipo_id: equipoSeleccionado.id,
      cantidad: 1,
      precio_unitario: precioPrimera,
      descuento_porcentaje: formData.descuento_porcentaje || 0,
      iva_porcentaje: formData.iva_porcentaje || Number((equipoSeleccionado as any).iva) || 10.5,
      precio_costo: costoPrimera,
      ganancia: deriveGanancia(precioPrimera, costoPrimera),
      equipo: equipoSeleccionado,
      especificaciones: (formData.especificaciones || {}) as Record<string, unknown> | string[],
      especificaciones_personalizada: formData.especificaciones_personalizada || false,
    };
    setEquiposCotizados([primera]);
    // Al pasar a multi, la descripción comercial pasa a ser general del presupuesto:
    // arranca vacía en vez de arrastrar la ficha del primer equipo.
    setFormData((prev) => ({ ...prev, equipo_id: '', precio_base: 0, descuento_porcentaje: 0, descripcion_comercial: '' }));
    setMostrarAgregarEquipo(true);
  };

  // Helper: subtotal de una card multi
  const cardSubtotal = (c: EquipoCotizado) =>
    c.cantidad * c.precio_unitario * (1 - (c.descuento_porcentaje || 0) / 100);

  // Moneda nativa de una card (la del equipo). Un presupuesto puede mezclar equipos
  // en USD y ARS: cada card cotiza en SU moneda y NO se convierte.
  const cardMoneda = (c: EquipoCotizado): "ARS" | "USD" =>
    c.moneda ?? normalizarMoneda((c.equipo as any)?.precio_lista_moneda);

  // Cambiar la moneda del presupuesto: re-cotiza TODAS las líneas a la moneda nueva
  // (precio y costo × cotización) y las deja marcadas en esa moneda. El selector solo
  // aparece cuando el presupuesto es de una sola moneda, así que el precio queda EN la
  // moneda elegida (lo que pidió el usuario). Sin cotización no se puede convertir.
  const cambiarMonedaPresupuesto = (m: "ARS" | "USD") => {
    const cot = formData.cotizacion_usd || (cotizacion as any)?.valor_venta || 0;
    const necesitaConvertir = equiposCotizados.some(
      (c) => (c.moneda ?? normalizarMoneda((c.equipo as any)?.precio_lista_moneda)) !== m,
    );
    if (necesitaConvertir && (!cot || cot <= 0)) {
      toast.error(`Cargá la cotización para convertir a ${m}`);
      return;
    }
    setEquiposCotizados((prev) =>
      prev.map((c) => {
        const desde = c.moneda ?? normalizarMoneda((c.equipo as any)?.precio_lista_moneda);
        if (desde === m) return { ...c, moneda: m };
        const factor = m === "ARS" ? cot : 1 / cot;
        const precio = Number((c.precio_unitario * factor).toFixed(2));
        const costo = Number(((c.precio_costo || 0) * factor).toFixed(2));
        return { ...c, moneda: m, precio_unitario: precio, precio_costo: costo, ganancia: deriveGanancia(precio, costo) };
      }),
    );
    setFormData((p) => ({ ...p, moneda: m }));
  };

  // Totales por moneda (uno por cada moneda presente). Con monedas mezcladas se
  // muestran por separado en vez de sumarse en un número sin sentido.
  const totalesPorMoneda = useMemo(
    () =>
      agruparTotalesPorMoneda(
        equiposCotizados.map((c) => ({
          subtotal: cardSubtotal(c),
          ivaPorcentaje: c.iva_porcentaje ?? 10.5,
          moneda: cardMoneda(c),
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equiposCotizados],
  );
  // Presupuesto con monedas mezcladas (≥2 monedas entre las líneas).
  const presupuestoMixto = totalesPorMoneda.length > 1;

  // Copiar un monto al portapapeles (para pegar "por las dudas").
  const copyMonto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  // Calculations
  const descuentoMonto = useMemo(() => {
    if (isMultiMode) return 0;
    return (formData.precio_base * formData.descuento_porcentaje) / 100;
  }, [formData.precio_base, formData.descuento_porcentaje, isMultiMode]);

  const subtotal = useMemo(() => {
    if (isMultiMode) return equiposCotizados.reduce((s, c) => s + cardSubtotal(c), 0);
    return formData.precio_base - descuentoMonto;
  }, [formData.precio_base, descuentoMonto, isMultiMode, equiposCotizados]);

  // IVA: en multi se calcula por línea (cada equipo con su alícuota) y se suma;
  // en single, alícuota única del presupuesto sobre el subtotal.
  const iva = useMemo(() => {
    if (isMultiMode) {
      return equiposCotizados.reduce((s, c) => s + cardSubtotal(c) * ((c.iva_porcentaje ?? 10.5) / 100), 0);
    }
    return subtotal * ((formData.iva_porcentaje ?? 10.5) / 100);
  }, [subtotal, isMultiMode, equiposCotizados, formData.iva_porcentaje]);

  // Etiqueta del IVA: muestra el % cuando es uniforme; en multi con alícuotas
  // mezcladas cae a "IVA" sin porcentaje.
  const ivaLabel = useMemo(() => {
    if (isMultiMode) {
      const rates = Array.from(new Set(equiposCotizados.map((c) => c.iva_porcentaje ?? 10.5)));
      return rates.length === 1 ? `IVA (${fmtPct(rates[0])}%)` : 'IVA';
    }
    return `IVA (${fmtPct(formData.iva_porcentaje ?? 10.5)}%)`;
  }, [isMultiMode, equiposCotizados, formData.iva_porcentaje]);

  const total = useMemo(() => {
    return subtotal + iva;
  }, [subtotal, iva]);

  // Líneas para la vista previa: en multi, una por equipo cotizado con su monto;
  // en single, el equipo seleccionado con el subtotal. Así la preview lista TODOS
  // los equipos (antes solo mostraba el primero).
  const previewItems = useMemo(() => {
    if (isMultiMode) {
      return equiposCotizados.map((c) => ({
        id: c.equipo_id,
        nombre: `${c.equipo?.marca ?? ''} ${c.equipo?.modelo ?? ''}`.trim() || 'Equipo',
        tipo: c.equipo?.tipo,
        cantidad: c.cantidad,
        condicion: c.equipo?.condicion,
        imagen_url: c.equipo?.imagen_url,
        monto: cardSubtotal(c),
        moneda: cardMoneda(c),
      }));
    }
    if (equipoSeleccionado) {
      return [{
        id: equipoSeleccionado.id,
        nombre: `${equipoSeleccionado.marca ?? ''} ${equipoSeleccionado.modelo ?? ''}`.trim() || 'Equipo',
        tipo: equipoSeleccionado.tipo,
        cantidad: 1,
        condicion: equipoSeleccionado.condicion,
        imagen_url: equipoSeleccionado.imagen_url,
        monto: subtotal,
      }];
    }
    return [];
  }, [isMultiMode, equiposCotizados, equipoSeleccionado, subtotal]);

  // Financiación: interés % TOTAL sobre el monto. valorCuota = total×(1+int%)/cuotas.
  const financiacionCalc = useMemo(() => {
    const cuotas = Math.max(1, parseInt(formData.financiacion_cuotas) || 1);
    const interes = parseFloat(formData.interes_porcentaje) || 0;
    const totalConInteres = total * (1 + interes / 100);
    return { cuotas, interes, totalConInteres, valorCuota: totalConInteres / cuotas };
  }, [formData.financiacion_cuotas, formData.interes_porcentaje, total]);

  // Initialize from presupuesto when editing
  useEffect(() => {
    if (presupuesto && open) {
      // Si el presupuesto editado va a un contacto (sin cliente), restaurarlo.
      setPersonaId(!presupuesto.cliente_id ? ((presupuesto as any).persona_id || "") : "");
      setFormData({
        numero: presupuesto.numero,
        cliente_id: presupuesto.cliente_id || "",
        equipo_id: presupuesto.equipo_id || "",
        fecha_emision: presupuesto.fecha_emision ? String(presupuesto.fecha_emision).slice(0, 10) : new Date().toISOString().split("T")[0],
        validez_dias: presupuesto.validez_dias,
        precio_base: presupuesto.precio_base,
        descuento_porcentaje: presupuesto.descuento_porcentaje || 0,
        // Recuperamos la alícuota desde el monto guardado (iva/subtotal). Así un
        // presupuesto viejo al 21% reabre en 21% y uno nuevo al 10,5% en 10,5%.
        iva_porcentaje: snapAlicuota(
          Number(presupuesto.subtotal) > 0
            ? (Number(presupuesto.iva) / Number(presupuesto.subtotal)) * 100
            : 10.5
        ),
        moneda: presupuesto.moneda as "ARS" | "USD",
        cotizacion_usd: presupuesto.cotizacion_usd || 0,
        tipo_cotizacion: presupuesto.tipo_cotizacion || "oficial",
        mostrar_en_usd: presupuesto.mostrar_en_usd,
        forma_pago: presupuesto.forma_pago === 'financiado' ? 'financiado' : 'contado',
        financiacion_cuotas: presupuesto.financiacion_cuotas != null ? String(presupuesto.financiacion_cuotas) : "1",
        interes_porcentaje: presupuesto.interes_porcentaje != null ? String(presupuesto.interes_porcentaje) : "0",
        tiempo_entrega: presupuesto.tiempo_entrega || "",
        garantia: presupuesto.garantia || "",
        incluye_instalacion: presupuesto.incluye_instalacion,
        incluye_capacitacion: presupuesto.incluye_capacitacion,
        descripcion_comercial: presupuesto.descripcion_comercial || "",
        observaciones: presupuesto.observaciones || "",
        especificaciones: (presupuesto.especificaciones || {}) as Record<string, unknown> | string[],
        especificaciones_personalizada: presupuesto.especificaciones_personalizada ?? false,
      });
      // Set material comercial from presupuesto
      setMaterialComercial({
        incluirFolleto: !!presupuesto.folleto_url,
        incluirFichaTecnica: !!presupuesto.ficha_tecnica_url || (() => {
          const e = (presupuesto as any).especificaciones;
          return Array.isArray(e) ? e.length > 0 : (!!e && typeof e === 'object' && Object.keys(e).length > 0);
        })(),
        incluirImagenes: (presupuesto.imagenes_adicionales?.length || 0) > 0 || !!presupuesto.imagen_principal_url,
      });
    }
  }, [presupuesto, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        numero: "",
        cliente_id: defaultClienteId || "",
        equipo_id: defaultEquipo?.id || "",
        fecha_emision: new Date().toISOString().split("T")[0],
        validez_dias: 30,
        precio_base: defaultEquipo?.precio_lista || 0,
        descuento_porcentaje: 0,
        iva_porcentaje: Number((defaultEquipo as any)?.iva) || 10.5,
        moneda: (defaultEquipo?.precio_lista_moneda || "USD") as "ARS" | "USD",
        cotizacion_usd: 0,
        tipo_cotizacion: "oficial",
        mostrar_en_usd: true,
        forma_pago: "contado",
        financiacion_cuotas: "1",
        interes_porcentaje: "0",
        tiempo_entrega: "",
        garantia: "12 meses",
        incluye_instalacion: true,
        incluye_capacitacion: true,
        descripcion_comercial: defaultEquipo?.descripcion_comercial || defaultEquipo?.descripcion || "",
        observaciones: "",
        especificaciones: (defaultEquipo?.especificaciones || {}) as Record<string, unknown> | string[],
        especificaciones_personalizada: false,
      });
      setMaterialComercial({
        incluirFolleto: true,
        incluirFichaTecnica: true,
        incluirImagenes: true,
      });
      setEquiposCotizados([]);
      setExpandedSpecs(new Set());
      setMostrarAgregarEquipo(false);
      setDocumentosBiblioteca([]);
      setSavedId(null);
      setPersonaId(defaultPersonaId || "");
      monedaAplicadaRef.current = null;
    }
  }, [open, defaultEquipo, defaultClienteId, defaultPersonaId]);

  const updateCotizacion = async () => {
    try {
      const res = await fetch('/api/cotizaciones/actualizar');
      if (!res.ok) throw new Error('Error al actualizar');
      const fresca = await mutateCotizacion();
      const nuevoValor = Number((fresca as any)?.valor_venta) || 0;
      // Reflejar la nueva cotización en el form (antes solo se revalidaba
      // el SWR y el input seguía mostrando el valor viejo).
      if (nuevoValor > 0) {
        setFormData((prev) => ({ ...prev, cotizacion_usd: nuevoValor }));
      }
      toast.success(
        nuevoValor > 0
          ? `Cotización actualizada: $${nuevoValor.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
          : 'Cotización actualizada'
      );
    } catch {
      toast.error('Error al actualizar cotización');
    }
  };

  // Estado para el email de destino (override manual, ej. para testear)
  const [emailDestino, setEmailDestino] = useState<string>('');
  // Email para "Enviarme prueba" — cada usuario escribe el suyo; se recuerda por
  // navegador (localStorage) y arranca con el email de la sesión.
  const { data: sessionData } = useSession();
  const [testEmail, setTestEmail] = useState<string>('');
  useEffect(() => {
    if (!open) return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('presupuesto_test_email') : null;
    setTestEmail(saved || sessionData?.user?.email || '');
  }, [open, sessionData]);
  const [showAplicarCatalogo, setShowAplicarCatalogo] = useState(false);

  // Submit handler. action: 'draft' | 'send' | 'test'
  //  - test: guarda y manda una prueba a un email fijo configurable; NO cierra el
  //    diálogo (para revisar y después mandar el real al cliente).
  const submitPresupuesto = async (action: 'draft' | 'send' | 'test') => {
    if (equiposCotizados.length === 0) {
      toast.error("Agregá al menos un equipo");
      return;
    }
    if (!formData.cliente_id && !personaId) {
      toast.error("Seleccione un cliente o contacto");
      return;
    }
    if (action === 'send' && !emailDestino.trim() && !personaSeleccionada?.email && !clienteSeleccionado?.email) {
      toast.error('Indicá un email de destino');
      return;
    }

    setLoading(true);

    try {
      const equipo = equipoSeleccionado;
      // En modo multi: equipo_id=NULL en header, todos los equipos van como items tipo='equipo'.
      // Subtotal/iva/total se computan sobre la suma de cards. Material comercial se omite
      // (el PDF muestra imágenes de catálogo de cada equipo igual).
      //
      // Header con monedas mezcladas: el `total/moneda` del header es un solo número y no
      // puede representar dos monedas. Guardamos los de la moneda DOMINANTE (mayor total)
      // para retrocompat; la verdad por-moneda vive en los items (cada uno con su moneda
      // nativa) y el PDF/lista la reconstruyen. En presupuesto de una sola moneda, el header
      // coincide con esos totales.
      // Persistencia: 1 línea con cantidad 1 → formato single (header equipo_id), para
      // mantener idéntico el PDF/edición de los presupuestos de un equipo. Con 2+ líneas
      // (o cantidad>1) → formato multi (items). La UI es siempre el editor de líneas.
      const lineaUnica = equiposCotizados[0];
      const esMultiPersist = equiposCotizados.length >= 2 || (lineaUnica?.cantidad ?? 1) > 1;
      const monedaHeader = esMultiPersist
        ? (monedaDominante(totalesPorMoneda) ?? formData.moneda)
        : formData.moneda;
      const totalDominante = esMultiPersist
        ? totalesPorMoneda.find((t) => t.moneda === monedaHeader)
        : undefined;
      const payload = {
        ...formData,
        persona_id: !formData.cliente_id ? personaId || null : null,
        oportunidad_id: defaultOportunidadId || null,
        moneda: monedaHeader,
        subtotal: totalDominante ? totalDominante.subtotal : subtotal,
        iva: totalDominante ? totalDominante.iva : iva,
        total: totalDominante ? totalDominante.total : total,
        descuento_monto: esMultiPersist
          ? 0
          : (lineaUnica ? lineaUnica.precio_unitario * ((lineaUnica.descuento_porcentaje || 0) / 100) : 0),
        financiacion_cuotas: formData.forma_pago === 'financiado' ? financiacionCalc.cuotas : null,
        interes_porcentaje: formData.forma_pago === 'financiado' ? financiacionCalc.interes : null,
        documentos_biblioteca_ids: documentosBiblioteca.map((d) => d.id),
        ...(esMultiPersist
          ? {
              equipo_id: null,
              precio_base: 0,
              descuento_porcentaje: 0,
              folleto_url: null,
              ficha_tecnica_url: null,
              imagen_principal_url: null,
              imagenes_adicionales: null,
              especificaciones: null,
              especificaciones_personalizada: false,
              items: equiposCotizados.map((c) => ({
                equipo_id: c.equipo_id,
                tipo: 'equipo',
                descripcion: `${c.equipo.marca ?? ''} ${c.equipo.modelo ?? ''}`.trim() || 'Equipo',
                cantidad: c.cantidad,
                moneda: cardMoneda(c),
                precio_unitario: c.precio_unitario,
                descuento_porcentaje: c.descuento_porcentaje,
                iva_porcentaje: c.iva_porcentaje ?? 10.5,
                precio_costo: c.precio_costo ?? 0,
                subtotal: cardSubtotal(c),
                es_opcional: false,
                incluido_en_precio: false,
                imagen_url: c.equipo.imagen_url ?? null,
                especificaciones: c.especificaciones_personalizada ? (c.especificaciones ?? null) : null,
                especificaciones_personalizada: !!c.especificaciones_personalizada,
              })),
            }
          : {
              // Single: el equipo va en el header. Los campos ricos salen de la única
              // línea del editor (no de formData, que ya no se edita en este modo).
              equipo_id: lineaUnica?.equipo_id ?? null,
              precio_base: lineaUnica?.precio_unitario ?? 0,
              descuento_porcentaje: lineaUnica?.descuento_porcentaje ?? 0,
              iva_porcentaje: lineaUnica?.iva_porcentaje ?? 10.5,
              especificaciones: lineaUnica?.especificaciones_personalizada
                ? (lineaUnica?.especificaciones ?? null)
                : ((lineaUnica?.equipo as any)?.especificaciones ?? null),
              especificaciones_personalizada: !!lineaUnica?.especificaciones_personalizada,
              folleto_url: materialComercial.incluirFolleto ? (equipo?.folleto_recurso?.archivo_url || equipo?.folleto_url || null) : null,
              ficha_tecnica_url: materialComercial.incluirFichaTecnica ? equipo?.ficha_tecnica_url : null,
              imagen_principal_url: materialComercial.incluirImagenes ? equipo?.imagen_url : null,
              imagenes_adicionales: materialComercial.incluirImagenes ? equipo?.imagenes_adicionales : null,
              // Limpiar ítems por si venía de un presupuesto multi que se bajó a 1 equipo.
              items: [],
            }),
      };

      // Reutilizar el id ya creado (presupuesto en edición o guardado en esta sesión)
      // para PATCH en vez de POST → no duplica borradores en pruebas sucesivas.
      const efectivoId = presupuesto?.id || savedId;
      const url = efectivoId
        ? `/api/presupuestos-equipos?id=${efectivoId}`
        : '/api/presupuestos-equipos';

      const response = await fetch(url, {
        method: efectivoId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Error al guardar');
      }
      const saved = await response.json();
      if (!efectivoId && saved?.id) setSavedId(saved.id);
      const idParaEnviar = efectivoId || saved.id;

      if (action === 'test') {
        // Envío de PRUEBA al email que escribió el usuario. NO cierra el diálogo.
        const destinoPrueba = testEmail.trim();
        if (typeof window !== 'undefined' && destinoPrueba) {
          localStorage.setItem('presupuesto_test_email', destinoPrueba);
        }
        const sendRes = await fetch('/api/presupuestos-equipos/enviar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presupuesto_id: idParaEnviar, test: true, email_destino: destinoPrueba || undefined }),
        });
        if (!sendRes.ok) {
          const err = await sendRes.json().catch(() => ({}));
          toast.error(err.error || 'Falló el envío de prueba');
        } else {
          toast.success(destinoPrueba ? `Prueba enviada a ${destinoPrueba}` : 'Prueba enviada');
        }
        setLoading(false);
        return; // mantener el diálogo abierto
      }

      if (action === 'send') {
        const sendRes = await fetch('/api/presupuestos-equipos/enviar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presupuesto_id: idParaEnviar,
            email_destino: emailDestino.trim() || undefined,
          }),
        });
        if (!sendRes.ok) {
          const err = await sendRes.json().catch(() => ({}));
          toast.error(err.error || 'Presupuesto guardado pero falló el envío');
        } else {
          toast.success('Presupuesto enviado por email');
        }
      } else {
        toast.success(isEditing ? 'Presupuesto actualizado' : 'Presupuesto guardado como borrador');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPresupuesto('draft');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-0 gap-0",
        "sm:max-w-[1400px] w-[95vw] h-[90vh] flex flex-col overflow-hidden"
      )}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isEditing ? "Editar Presupuesto de Equipo" : "Nuevo Presupuesto de Equipo"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {isEditing
                    ? `Modificando presupuesto ${presupuesto?.numero}`
                    : "Crea un presupuesto comercial profesional para equipos de laboratorio"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "h-9 gap-2",
                  showPreview && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                )}
              >
                <Eye className="w-4 h-4" />
                Vista Previa
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Formulario */}
          <div className={cn(
            "flex-1 min-h-0 flex flex-col overflow-hidden",
            showPreview ? "border-r border-gray-200 dark:border-gray-800" : ""
          )}>
            <ScrollArea className="flex-1 min-h-0">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Destinatario: persona (contacto) cuando viene desde CRM sin cliente */}
                {!formData.cliente_id && personaSeleccionada && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Destinatario (contacto)
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {personaSeleccionada.nombre_completo ||
                        `${personaSeleccionada.nombre || ''} ${personaSeleccionada.apellido || ''}`.trim() ||
                        'Contacto sin nombre'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {personaSeleccionada.email && <span>{personaSeleccionada.email}</span>}
                      {personaSeleccionada.telefono && <span>{personaSeleccionada.telefono}</span>}
                      {personaSeleccionada.documento_nro && (
                        <span>{personaSeleccionada.documento_tipo || 'Doc'} {personaSeleccionada.documento_nro}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                      Este presupuesto queda asociado al contacto. Podés convertirlo a cliente cuando se formalice.
                    </p>
                  </div>
                )}

                {/* Cliente o contacto: busca en ambos (un presupuesto puede ir a un
                    contacto que todavía no es cliente). */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Cliente o contacto
                    {!formData.cliente_id && !personaId && <span className="text-red-500">*</span>}
                  </Label>
                  <SearchableCombobox
                    value={formData.cliente_id || personaId}
                    searchFn={searchClienteOContacto}
                    defaultSelectedOption={contactoOption}
                    onValueChange={(value, option) => {
                      if (!value) {
                        setFormData((f) => ({ ...f, cliente_id: "" }));
                        setPersonaId("");
                      } else if ((option?.data as any)?.tipo === "contacto") {
                        setPersonaId(value);
                        setFormData((f) => ({ ...f, cliente_id: "" }));
                      } else {
                        setFormData((f) => ({ ...f, cliente_id: value }));
                        setPersonaId("");
                      }
                    }}
                    placeholder="Buscar cliente o contacto por nombre o CUIT..."
                    emptyMessage="No se encontraron clientes ni contactos"
                  />
                  {clienteSeleccionado && clienteSeleccionado.cuit && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {clienteSeleccionado.cuit}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Equipos del presupuesto: editor de líneas compartido. Una sola UI para
                    todos los casos (single = 1 línea, multi = N). El editor maneja el
                    picker, las líneas, la moneda/cotización y los totales. */}
                <EquipoLineasEditor
                  value={equiposCotizados.map((c) => ({
                    ...c,
                    id: c.equipo_id,
                    moneda: c.moneda ?? normalizarMoneda((c.equipo as any)?.precio_lista_moneda),
                    producto_id: null,
                  })) as unknown as EquipoLinea[]}
                  onChange={(lineas) => setEquiposCotizados(lineas.map((l) => ({
                    equipo_id: l.equipo_id!,
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario,
                    descuento_porcentaje: l.descuento_porcentaje,
                    iva_porcentaje: l.iva_porcentaje,
                    precio_costo: l.precio_costo,
                    ganancia: l.ganancia,
                    equipo: l.equipo,
                    moneda: l.moneda,
                    especificaciones: l.especificaciones,
                    especificaciones_personalizada: l.especificaciones_personalizada,
                  })) as any)}
                  moneda={formData.moneda}
                  onMonedaChange={(m) => cambiarMonedaPresupuesto(m)}
                  cotizacion={{ tipo_cotizacion: formData.tipo_cotizacion as 'oficial' | 'blue' | 'mep', cotizacion_usd: formData.cotizacion_usd }}
                  onCotizacionChange={(c) => setFormData((p) => ({ ...p, ...c }))}
                />

                {/* Material Comercial: solo con 1 equipo (se guarda en el header, como
                    single). Con varios equipos se difiere a fase 2. */}
                {equiposCotizados.length === 1 && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <FileImage className="w-4 h-4" />
                    Material Comercial a Incluir
                  </div>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 -mt-2">
                    Selecciona qué documentos adjuntar al presupuesto para hacerlo más profesional
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <label className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      materialComercial.incluirFolleto
                        ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    )}>
                      <Checkbox
                        checked={materialComercial.incluirFolleto}
                        onCheckedChange={(checked) =>
                          setMaterialComercial({ ...materialComercial, incluirFolleto: !!checked })
                        }
                        disabled={!folletoDisponible}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">Folleto</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {folletoDisponible ? 'Disponible' : 'No disponible'}
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      materialComercial.incluirFichaTecnica
                        ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-purple-300"
                    )}>
                      <Checkbox
                        checked={materialComercial.incluirFichaTecnica}
                        onCheckedChange={(checked) =>
                          setMaterialComercial({ ...materialComercial, incluirFichaTecnica: !!checked })
                        }
                        disabled={!fichaTecnicaDisponible}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">Ficha Técnica</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {fichaTecnicaDisponible ? 'Especificaciones' : 'No disponible'}
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      materialComercial.incluirImagenes
                        ? "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-pink-300"
                    )}>
                      <Checkbox
                        checked={materialComercial.incluirImagenes}
                        onCheckedChange={(checked) =>
                          setMaterialComercial({ ...materialComercial, incluirImagenes: !!checked })
                        }
                        disabled={!equipoSeleccionado?.imagen_url && !equipoSeleccionado?.imagenes_adicionales?.length}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <Image className="w-4 h-4 text-pink-600" />
                          <span className="text-sm font-medium">Imágenes</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {(equipoSeleccionado?.imagen_url || equipoSeleccionado?.imagenes_adicionales?.length)
                            ? `${(equipoSeleccionado?.imagenes_adicionales?.length || 0) + (equipoSeleccionado?.imagen_url ? 1 : 0)} imagen(es)`
                            : 'No disponible'}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
                )}

                {/* Documentos adicionales desde la biblioteca — disponible en
                    single y multi. Sirve para cuando el cliente pide algo
                    aparte (normativas, planos, ofertas especiales) que no es
                    el folleto/ficha estándar del equipo. */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <FileText className="w-4 h-4" />
                      Documentos adicionales
                      {documentosBiblioteca.length > 0 && (
                        <Badge variant="outline" className="ml-1 border-emerald-300 text-emerald-700 text-[10px]">
                          {documentosBiblioteca.length}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickerBibliotecaOpen(true)}
                      className="h-8 gap-1.5 border-emerald-300 hover:bg-emerald-100/50"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Agregar de biblioteca
                    </Button>
                  </div>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    Adjunta documentos extra desde la biblioteca (normativas, planos, ofertas especiales). El folleto y ficha técnica del equipo se manejan arriba.
                  </p>
                  {documentosBiblioteca.length > 0 && (
                    <div className="space-y-1.5">
                      {documentosBiblioteca.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/30"
                        >
                          {d.archivo_url ? (
                            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : (
                            <LinkIcon className="h-4 w-4 text-purple-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{d.titulo}</p>
                            {(d.categoria_nombre || d.tipo) && (
                              <p className="text-[10px] text-muted-foreground">
                                {[d.categoria_nombre, d.tipo].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDocumentosBiblioteca((prev) => prev.filter((x) => x.id !== d.id))
                            }
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                            title="Quitar documento"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fechas */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <DollarSign className="w-4 h-4" />
                    Fechas
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fecha de emisión</Label>
                      <Input
                        type="date"
                        value={formData.fecha_emision}
                        onChange={(e) =>
                          setFormData({ ...formData, fecha_emision: e.target.value })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Validez de la oferta</Label>
                      <Select
                        value={formData.validez_dias.toString()}
                        onValueChange={(value) =>
                          setFormData({ ...formData, validez_dias: parseInt(value) })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 días</SelectItem>
                          <SelectItem value="15">15 días</SelectItem>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="60">60 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Condiciones de Pago */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FileText className="w-4 h-4" />
                    Condiciones de Pago
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Forma de Pago */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de Pago</Label>
                      <div className="flex rounded-md border border-input p-0.5 h-9 gap-0.5">
                        {(['contado', 'financiado'] as const).map((fp) => (
                          <button
                            key={fp}
                            type="button"
                            onClick={() => setFormData({ ...formData, forma_pago: fp })}
                            className={cn(
                              "flex-1 text-xs font-medium rounded transition-colors",
                              formData.forma_pago === fp
                                ? "bg-emerald-600 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {fp === 'contado' ? 'Contado' : 'Financiado'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tiempo de Entrega */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tiempo Entrega</Label>
                      <Select
                        value={formData.tiempo_entrega || "sin_especificar"}
                        onValueChange={(value) => setFormData({ ...formData, tiempo_entrega: value === "sin_especificar" ? "" : value })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Sin especificar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin_especificar">Sin especificar</SelectItem>
                          <SelectItem value="inmediato">Inmediato</SelectItem>
                          <SelectItem value="7_dias">7 días</SelectItem>
                          <SelectItem value="15_dias">15 días</SelectItem>
                          <SelectItem value="30_dias">30 días</SelectItem>
                          <SelectItem value="45_dias">45 días</SelectItem>
                          <SelectItem value="a_confirmar">A confirmar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Garantía */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Garantía</Label>
                      <Select
                        value={formData.garantia}
                        onValueChange={(value) => setFormData({ ...formData, garantia: value })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sin garantía">Sin garantía</SelectItem>
                          <SelectItem value="6 meses">6 meses</SelectItem>
                          <SelectItem value="12 meses">12 meses</SelectItem>
                          <SelectItem value="24 meses">24 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Instalación */}
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Instalación
                      </Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={formData.incluye_instalacion}
                          onCheckedChange={(checked) => setFormData({ ...formData, incluye_instalacion: checked })}
                        />
                        <span className="text-xs text-gray-500">{formData.incluye_instalacion ? 'Incluida' : 'No incluida'}</span>
                      </div>
                    </div>

                    {/* Capacitación */}
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> Capacitación
                      </Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          checked={formData.incluye_capacitacion}
                          onCheckedChange={(checked) => setFormData({ ...formData, incluye_capacitacion: checked })}
                        />
                        <span className="text-xs text-gray-500">{formData.incluye_capacitacion ? 'Incluida' : 'No incluida'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financiación: cuotas + interés (% total) con cálculo automático */}
                  {formData.forma_pago === 'financiado' && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3 max-w-md">
                        <div>
                          <Label className="text-xs">Financiación (cuotas)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.financiacion_cuotas}
                            onChange={(e) => setFormData({ ...formData, financiacion_cuotas: e.target.value })}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Interés (% total)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.interes_porcentaje}
                            onChange={(e) => setFormData({ ...formData, interes_porcentaje: e.target.value })}
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">
                          {financiacionCalc.cuotas} {financiacionCalc.cuotas === 1 ? 'cuota' : 'cuotas'} de{' '}
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(financiacionCalc.valorCuota, formData.moneda)}
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Total con interés: {formatCurrency(financiacionCalc.totalConInteres, formData.moneda)}
                          {financiacionCalc.interes > 0 ? ` (+${financiacionCalc.interes}%)` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>


                {/* Notas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      {isMultiMode ? 'Descripción general del presupuesto (opcional)' : 'Descripción Comercial'}
                    </Label>
                    <Textarea
                      value={formData.descripcion_comercial}
                      onChange={(e) => setFormData({ ...formData, descripcion_comercial: e.target.value })}
                      placeholder={isMultiMode
                        ? 'Texto introductorio para todo el presupuesto (opcional). Cada equipo lleva su propia descripción en su hoja.'
                        : 'Descripción del equipo para el cliente...'}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notas adicionales para el cliente...</Label>
                    <Textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      placeholder="Notas adicionales..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>

              </form>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 space-y-3">
              {/* Input email destino */}
              <div className="space-y-1.5">
                <Label className="text-xs">Email destinatario (sobrescribe al del contacto/cliente)</Label>
                <Input
                  type="email"
                  value={emailDestino}
                  onChange={(e) => setEmailDestino(e.target.value)}
                  placeholder={
                    (Array.isArray(clienteSeleccionado?.email)
                      ? clienteSeleccionado?.email?.[0]
                      : clienteSeleccionado?.email) ||
                    personaSeleccionada?.email ||
                    'correo@ejemplo.com'
                  }
                  className="h-9 text-sm"
                />
              </div>

              {/* Email para "Enviarme prueba" — cada usuario el suyo (se recuerda). */}
              <div className="space-y-1.5">
                <Label className="text-xs">Email de prueba (para "Enviarme prueba")</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => submitPresupuesto('draft')}
                    disabled={loading || (!formData.cliente_id && !personaId) || (!formData.equipo_id && !isMultiMode) || (isMultiMode && equiposCotizados.length === 0)}
                    className="gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Guardar borrador
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => submitPresupuesto('test')}
                    disabled={loading || (!formData.equipo_id && !isMultiMode) || (isMultiMode && equiposCotizados.length === 0)}
                    className="gap-2"
                    title="Guarda y manda una prueba a tu email de prueba (no cierra)"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviarme prueba
                  </Button>
                  <Button
                    type="button"
                    onClick={() => submitPresupuesto('send')}
                    disabled={loading || (!formData.cliente_id && !personaId) || (!formData.equipo_id && !isMultiMode) || (isMultiMode && equiposCotizados.length === 0)}
                    className="gap-2 min-w-[200px] bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando…
                      </>
                    ) : (!formData.cliente_id && !personaId) || (!formData.equipo_id && !isMultiMode) || (isMultiMode && equiposCotizados.length === 0) ? (
                      'Completa los campos'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Guardar y enviar por email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-[380px] flex-shrink-0 hidden lg:block">
              <PreviewPanel
                cliente={clienteSeleccionado || null}
                equipo={equipoSeleccionado}
                total={total}
                subtotal={subtotal}
                iva={iva}
                ivaLabel={ivaLabel}
                previewItems={previewItems}
                formData={formData}
                cotizacionUsd={formData.cotizacion_usd}
                materialComercial={materialComercial}
                documentosBiblioteca={documentosBiblioteca}
                extraEquiposCount={isMultiMode ? Math.max(0, equiposCotizados.length - 1) : 0}
                totalesPorMoneda={totalesPorMoneda}
                presupuestoMixto={presupuestoMixto}
              />
            </div>
          )}
        </div>
      </DialogContent>
      {formData.equipo_id && (
        <AplicarCatalogoDialog
          open={showAplicarCatalogo}
          onOpenChange={setShowAplicarCatalogo}
          equipoId={formData.equipo_id}
          especificaciones={formData.especificaciones}
          catalogo={equipoSeleccionado?.especificaciones ?? null}
          onApplied={() => {
            // El catálogo ya quedó actualizado; el presupuesto mantiene su copia.
          }}
        />
      )}
      <BibliotecaPickerDialog
        open={pickerBibliotecaOpen}
        onOpenChange={setPickerBibliotecaOpen}
        selectedIds={documentosBiblioteca.map((d) => d.id)}
        onConfirm={(recursos) => setDocumentosBiblioteca(recursos)}
      />
    </Dialog>
  );
}
