'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Badge } from '@/components/ui/badge';
import { OportunidadVenta } from '@/lib/types';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { useCrmFuentes } from "@/lib/hooks/use-crm-fuentes";
import {
  Loader2,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
  Target,
  Sparkles,
  CheckCircle2,
  Plus,
  UserPlus,
  FlaskConical,
  Package,
  Trash2,
  Search,
  FileText,
  CreditCard,
  Percent,
  Landmark,
  RefreshCw,
} from 'lucide-react';
import { searchPersonas } from '@/hooks/use-persona-search';
import { EquipoLineasEditor } from './EquipoLineasEditor';
import { type EquipoLinea, cardSubtotal } from '@/lib/precios/equipo-lineas';
import { probabilidadDeEtapa } from '@/lib/crm/probabilidad-etapa';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Error al cargar');
  return r.json();
});

const ALICUOTAS_IVA = [
  { value: 0, label: 'Exento (0%)' },
  { value: 2.5, label: '2.5%' },
  { value: 5, label: '5%' },
  { value: 10.5, label: '10.5%' },
  { value: 21, label: '21%' },
  { value: 27, label: '27%' },
];

interface OportunidadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidad?: OportunidadVenta | null;
  onSuccess?: () => void;
  /** Default etapa when creating a new oportunidad from a specific column */
  defaultEtapa?: string | null;
}

const ETAPAS = [
  { value: 'nuevo', label: 'Nuevo', icon: Sparkles, bgColor: 'bg-slate-200 dark:bg-slate-700', iconColor: 'text-slate-600 dark:text-slate-300' },
  { value: 'propuesta', label: 'Propuesta', icon: DollarSign, bgColor: 'bg-purple-200 dark:bg-purple-800', iconColor: 'text-purple-600 dark:text-purple-300' },
  { value: 'logistica', label: 'Logística', icon: CheckCircle2, bgColor: 'bg-blue-200 dark:bg-blue-800', iconColor: 'text-blue-600 dark:text-blue-300' },
  { value: 'interesados a futuro', label: 'Interesados a futuro', icon: Phone, bgColor: 'bg-cyan-200 dark:bg-cyan-800', iconColor: 'text-cyan-600 dark:text-cyan-300' },
];


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

const ESTADOS_OPORTUNIDAD = [
  { value: 'abierto', label: 'Abierto', color: 'bg-blue-500' },
  { value: 'ganado', label: 'Ganado', color: 'bg-green-500' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500' },
];

export function OportunidadFormDialog({
  open,
  onOpenChange,
  oportunidad,
  onSuccess,
  defaultEtapa,
}: OportunidadFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [contactos, setContactos] = useState<any[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [contactoManual, setContactoManual] = useState(false);
  const personasSearchRef = useRef<Array<{ value: string; label: string; data?: any }>>([]);
  const [laboratorios, setLaboratorios] = useState<any[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [equipos, setEquipos] = useState<EquipoLinea[]>([]);
  const [conflictosPorLinea, setConflictosPorLinea] = useState<Record<string, { mismoEquipo: any[]; mismaCategoria: any[]; categoria: string | null }>>({});
  // Cotización del día: el MONTO de la oportunidad se guarda en pesos (CRM peso-céntrico),
  // convirtiendo los equipos USD al dólar de hoy. El presupuesto puede seguir en USD.
  const { data: cotizacionData, mutate: mutateCotizacion } = useSWR<{ valor_venta?: number }>(
    open ? '/api/cotizaciones' : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { dedupingInterval: 2 * 60 * 1000 }
  );
  const cotDia = Number(cotizacionData?.valor_venta) || 0;
  // Control de cotización editable (réplica del presupuesto de equipo): el usuario
  // ve/edita/refresca el dólar, elige tipo de cambio y si se muestra el equivalente en
  // el PDF del presupuesto. Si no toca nada, cae a la cotización del día (cotDia).
  const [cotizacionForm, setCotizacionForm] = useState({
    tipo_cotizacion: 'oficial',
    cotizacion_usd: 0,
    mostrar_en_usd: true,
  });
  // Lo que el usuario fija manda; si está en 0, usamos la del día.
  const cotEfectiva = cotizacionForm.cotizacion_usd > 0 ? cotizacionForm.cotizacion_usd : cotDia;
  // Convierte el precio de un equipo a ARS (si está en USD usa la cotización efectiva).
  const aPesos = (monto: number, moneda?: 'ARS' | 'USD') =>
    moneda === 'USD' && cotEfectiva > 0 ? monto * cotEfectiva : monto;

  // Moneda natural de los ítems: si todos comparten una, esa; si hay mezcla (raro), ARS.
  const monedaItems: 'ARS' | 'USD' = (() => {
    const usadas = Array.from(new Set(
      equipos.filter((e) => (e.precio_unitario || 0) > 0).map((e) => e.moneda || 'ARS')
    ));
    return usadas.length === 1 ? usadas[0] : 'ARS';
  })();
  // Switch de moneda del PRESUPUESTO (USD ↔ ARS). Arranca en la moneda natural de los
  // equipos; cuando el usuario lo toca, manda su elección. El monto de la oportunidad
  // sigue siempre en pesos (peso-céntrico); esto sólo cambia el presupuesto.
  const [monedaElegida, setMonedaElegida] = useState<'ARS' | 'USD'>('USD');
  const [monedaTocada, setMonedaTocada] = useState(false);
  const monedaPresupuesto: 'ARS' | 'USD' = monedaTocada ? monedaElegida : monedaItems;
  // ¿Hay líneas en una moneda distinta a la elegida? Entonces hace falta la cotización.
  // Convierte un monto entre monedas usando la cotización efectiva.
  const convertir = (monto: number, from: 'ARS' | 'USD', to: 'ARS' | 'USD') => {
    if (from === to || !cotEfectiva || cotEfectiva <= 0) return monto;
    return from === 'USD' ? monto * cotEfectiva : monto / cotEfectiva;
  };
  const [createClienteOpen, setCreateClienteOpen] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    nombre_fantasia: '',
    identificador_unico: '',
    email: '',
    telefono: '',
  });

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    cliente_id: '',
    laboratorio_id: '',
    persona_id: '',
    contacto_nombre: '',
    contacto_telefono: '',
    contacto_email: '',
    monto_estimado: '',
    etapa: 'nuevo',
    fecha_estimada_cierre: '',
    fuente: '',
    estado: 'abierto',
    motivo_perdida: '',
    perdida_descripcion: '',
    competidor: '',
  });

  // Presupuesto auto-creation state — solo se usa al crear nueva oportunidad.
  const [presupuestoData, setPresupuestoData] = useState({
    crear: true,
    lista_precios_id: '',
    margen_extra_porcentaje: '0',
    incluye_iva: true,
    alicuota_iva: 21,
    forma_pago: 'contado', // 'contado' | 'financiado'
    financiacion_cuotas: '1',
    interes_porcentaje: '0',
    validez_dias: '30',
  });

  const { fuentesSelector } = useCrmFuentes(open);

  const totalesPresupuesto = useMemo(() => {
    const margenExtra = parseFloat(presupuestoData.margen_extra_porcentaje) || 0;
    const factorExtra = 1 + margenExtra / 100;
    const alic = presupuestoData.alicuota_iva || 0;
    // Cada línea se convierte a la moneda elegida para el presupuesto antes de sumar.
    const subtotal = equipos.reduce(
      (sum, eq) => sum + convertir((eq.cantidad || 0) * (eq.precio_unitario || 0), eq.moneda || 'ARS', monedaPresupuesto) * factorExtra,
      0,
    );
    // El switch decide si el presupuesto LLEVA IVA: ON suma el IVA al subtotal,
    // OFF no lo suma (el total = subtotal). Los precios cargados son el subtotal.
    const iva = presupuestoData.incluye_iva ? subtotal * (alic / 100) : 0;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [equipos, presupuestoData.margen_extra_porcentaje, presupuestoData.incluye_iva, presupuestoData.alicuota_iva, monedaPresupuesto, cotEfectiva]);

  // Financiación: interés % TOTAL sobre el monto. valorCuota = total×(1+int%)/cuotas.
  const financiacionCalc = useMemo(() => {
    const cuotas = Math.max(1, parseInt(presupuestoData.financiacion_cuotas) || 1);
    const interes = parseFloat(presupuestoData.interes_porcentaje) || 0;
    const totalConInteres = totalesPresupuesto.total * (1 + interes / 100);
    return { cuotas, interes, totalConInteres, valorCuota: totalConInteres / cuotas };
  }, [presupuestoData.financiacion_cuotas, presupuestoData.interes_porcentaje, totalesPresupuesto.total]);

  // Cargar clientes al abrir
  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  // Cargar contactos y laboratorios cuando cambia el cliente
  useEffect(() => {
    if (formData.cliente_id) {
      setLoadingContactos(true);
      fetch(`/api/personas?razon_social_id=${formData.cliente_id}`)
        .then(res => res.json())
        .then(data => {
          setContactos(Array.isArray(data) ? data : []);
          setLoadingContactos(false);
        })
        .catch(() => {
          setContactos([]);
          setLoadingContactos(false);
        });

      setLoadingLabs(true);
      fetch(`/api/laboratorios?razon_social_id=${formData.cliente_id}`)
        .then(res => res.json())
        .then(data => {
          setLaboratorios(Array.isArray(data) ? data : []);
          setLoadingLabs(false);
        })
        .catch(() => {
          setLaboratorios([]);
          setLoadingLabs(false);
        });
    } else {
      setContactos([]);
      setLaboratorios([]);
    }
  }, [formData.cliente_id]);

  // Cargar datos de oportunidad si es edición
  // Usar oportunidad?.id como dependencia estable en lugar del objeto completo
  const oportunidadId = oportunidad?.id ?? null;
  const etapaDefault = defaultEtapa ?? null;
  useEffect(() => {
    if (oportunidad && open) {
      setFormData({
        nombre: oportunidad.nombre || '',
        descripcion: oportunidad.descripcion || '',
        cliente_id: oportunidad.cliente_id || '',
        laboratorio_id: (oportunidad as any).laboratorio_id || '',
        persona_id: (oportunidad as any).persona_id || '',
        contacto_nombre: oportunidad.contacto_nombre || '',
        contacto_telefono: oportunidad.contacto_telefono || '',
        contacto_email: oportunidad.contacto_email || '',
        monto_estimado: oportunidad.monto_estimado?.toString() || '',
        etapa: oportunidad.etapa || 'nuevo',
        fecha_estimada_cierre: oportunidad.fecha_estimada_cierre || '',
        fuente: oportunidad.fuente || '',
        estado: oportunidad.estado || 'abierto',
        motivo_perdida: oportunidad.motivo_perdida || '',
        perdida_descripcion: oportunidad.perdida_descripcion || '',
        competidor: oportunidad.competidor || '',
      });
      // Si tiene persona_id pero no contactos cargados, no forzar modo manual
      if (oportunidad.contacto_nombre && !(oportunidad as any).persona_id) {
        setContactoManual(true);
      } else {
        setContactoManual(false);
      }
    } else if (!oportunidad && open) {
      // Reset form para nueva oportunidad
      const etapaInicial = etapaDefault || 'nuevo';
      setContactoManual(false);

      setEquipos([]);
      setCotizacionForm({ tipo_cotizacion: 'oficial', cotizacion_usd: 0, mostrar_en_usd: true });
      setMonedaElegida('USD');
      setMonedaTocada(false);
      setFormData({
        nombre: '',
        descripcion: '',
        cliente_id: '',
        laboratorio_id: '',
        persona_id: '',
        contacto_nombre: '',
        contacto_telefono: '',
        contacto_email: '',
        monto_estimado: '',
        etapa: etapaInicial,
        fecha_estimada_cierre: '',
        fuente: '',
        estado: 'abierto',
        motivo_perdida: '',
        perdida_descripcion: '',
        competidor: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oportunidadId, open, etapaDefault]);

  const loadClientes = async () => {
    setLoadingClientes(true);
    try {
      const res = await fetch('/api/clientes?view=principal');
      const data = await res.json();
      if (Array.isArray(data)) {
        setClientes(data);
      }
    } catch (error) {
      console.error('Error loading clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  // Refrescar la cotización del día desde el proveedor y reflejarla en el control.
  const updateCotizacion = async () => {
    try {
      const res = await fetch('/api/cotizaciones/actualizar');
      if (!res.ok) throw new Error('Error al actualizar');
      const fresca = await mutateCotizacion();
      const nuevoValor = Number((fresca as any)?.valor_venta) || 0;
      if (nuevoValor > 0) {
        setCotizacionForm((prev) => ({ ...prev, cotizacion_usd: nuevoValor }));
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

  // Al abrir, precargar la cotización del día en el control editable (una sola vez).
  useEffect(() => {
    if (open && cotDia > 0 && cotizacionForm.cotizacion_usd === 0) {
      setCotizacionForm((prev) => ({ ...prev, cotizacion_usd: cotDia }));
    }
  }, [open, cotDia, cotizacionForm.cotizacion_usd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        toast.error('El nombre es requerido');
        setLoading(false);
        return;
      }

      // cliente_id es opcional - se puede tener una oportunidad sin cliente
      // (por ejemplo, un lead que aún no está registrado en el sistema)

      const body = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        cliente_id: formData.cliente_id || null,
        laboratorio_id: formData.laboratorio_id || null,
        persona_id: formData.persona_id || null,
        contacto_nombre: formData.contacto_nombre || null,
        contacto_telefono: formData.contacto_telefono || null,
        contacto_email: formData.contacto_email || null,
        monto_estimado: formData.monto_estimado ? parseFloat(formData.monto_estimado) : null,
        // El monto de la oportunidad SIEMPRE va en pesos (los equipos USD ya se convirtieron
        // al dólar del día en montoEquipos). El pipeline/proyección queda sumable en una moneda.
        moneda: 'ARS',
        etapa: formData.etapa,
        fecha_estimada_cierre: formData.fecha_estimada_cierre || null,
        fuente: formData.fuente || null,
        estado: formData.estado,
        motivo_perdida: formData.estado === 'perdido' ? formData.motivo_perdida : null,
        perdida_descripcion: formData.estado === 'perdido' ? formData.perdida_descripcion : null,
        competidor: formData.estado === 'perdido' ? formData.competidor : null,
      };

      // Append equipos info to descripcion if any
      if (equipos.length > 0) {
        const equiposText = equipos
          .filter(eq => eq.descripcion)
          .map(eq => `• ${eq.cantidad}x ${eq.descripcion} — ${formatCurrency(eq.cantidad * eq.precio_unitario, eq.moneda || 'ARS')}`)
          .join('\n');
        if (equiposText) {
          body.descripcion = [body.descripcion, '\n--- Equipos ---', equiposText].filter(Boolean).join('\n');
        }
      }

      const url = oportunidad
        ? `/api/oportunidades?id=${oportunidad.id}`
        : '/api/oportunidades';

      const res = await fetch(url, {
        method: oportunidad ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.details
          ? `${data.error || 'Error'}: ${data.details}`
          : data.error || 'Error al guardar oportunidad';
        throw new Error(msg);
      }

      const savedOportunidad = await res.json().catch(() => null);
      const oportunidadId = oportunidad?.id || savedOportunidad?.id || savedOportunidad?.oportunidad?.id;

      // Persistir items (equipos + productos/insumos) en oportunidades_items
      // Solo al CREAR (cuando no hay oportunidad previa) para no duplicar al editar.
      if (oportunidadId && !oportunidad && equipos.length > 0) {
        const itemsAPersistir = equipos.filter(e => e.equipo_id || e.producto_id);
        for (const it of itemsAPersistir) {
          try {
            await fetch('/api/oportunidades-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                oportunidad_id: oportunidadId,
                equipo_id: it.equipo_id || null,
                equipo_unidad_id: it.equipo_unidad_id || null,
                producto_id: it.producto_id || null,
                descripcion: it.descripcion || (it.equipo ? `${it.equipo.marca ?? ''} ${it.equipo.modelo ?? ''}`.trim() : null) || null,
                cantidad: it.cantidad || 1,
                precio_unitario: it.precio_unitario || 0,
              }),
            });
          } catch (err) {
            console.error('No se pudo agregar item a la oportunidad:', err);
          }
        }
      }

      // Crear presupuesto borrador automaticamente al crear nueva oportunidad
      // si el operador no lo deshabilito y hay equipos cargados.
      let presupuestoCreado: any = null;
      if (oportunidadId && !oportunidad && equipos.length > 0 && presupuestoData.crear) {
        try {
          const margenExtra = parseFloat(presupuestoData.margen_extra_porcentaje) || 0;
          const factorExtra = 1 + margenExtra / 100;
          const lineas = equipos
            .filter(eq => eq.equipo_id || eq.producto_id || eq.precio_unitario > 0)
            .map(eq => {
              // Convertir el precio del equipo a la moneda elegida para el presupuesto.
              const precioBase = convertir(eq.precio_unitario || 0, eq.moneda || 'ARS', monedaPresupuesto);
              const precioUnitario = precioBase * factorExtra;
              const subtotal = (eq.cantidad || 1) * precioUnitario;
              const costoCrudo = convertir(eq.precio_costo || 0, eq.moneda || 'ARS', monedaPresupuesto);
              const gananciaNum = parseFloat(eq.ganancia);
              return {
                producto_id: eq.producto_id || null,
                descripcion: eq.descripcion || `${eq.equipo?.marca ?? ''} ${eq.equipo?.modelo ?? ''}`.trim(),
                cantidad: eq.cantidad || 1,
                precio_unitario: precioUnitario,
                subtotal,
                precio_costo: costoCrudo > 0 ? costoCrudo : null,
                moneda_original: eq.moneda || 'ARS',
                imagen_url: eq.equipo?.imagen_url ?? null,
                margen_aplicado: gananciaNum > 0 ? gananciaNum : (margenExtra || null),
              };
            });

          const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
          const alic = presupuestoData.alicuota_iva || 0;
          // incluye_iva = el presupuesto lleva IVA → se suma al subtotal.
          const iva = presupuestoData.incluye_iva ? subtotal * (alic / 100) : 0;
          const total = subtotal + iva;

          const presupuestoBody = {
            cliente_id: formData.cliente_id || null,
            persona_id: formData.persona_id || null,
            oportunidad_id: oportunidadId,
            estado: 'borrador',
            fecha_emision: new Date().toISOString().slice(0, 10),
            validez_dias: parseInt(presupuestoData.validez_dias) || 30,
            moneda: monedaPresupuesto,
            // Guardamos la cotización usada para convertir (y mostrar el equivalente en el PDF).
            cotizacion_usd: cotEfectiva || null,
            tipo_cotizacion: cotizacionForm.tipo_cotizacion,
            mostrar_en_usd: monedaPresupuesto === 'USD' ? cotizacionForm.mostrar_en_usd : false,
            subtotal,
            iva,
            total,
            descuento: 0,
            forma_pago: presupuestoData.forma_pago || null,
            financiacion_cuotas: presupuestoData.forma_pago === 'financiado' ? financiacionCalc.cuotas : null,
            interes_porcentaje: presupuestoData.forma_pago === 'financiado' ? financiacionCalc.interes : null,
            condiciones_pago: presupuestoData.forma_pago === 'financiado'
              ? `${financiacionCalc.cuotas} ${financiacionCalc.cuotas === 1 ? 'cuota' : 'cuotas'} de ${formatCurrency(financiacionCalc.valorCuota)}${financiacionCalc.interes > 0 ? ` (interés ${financiacionCalc.interes}%)` : ''}`
              : 'Contado',
            lista_precios_id: presupuestoData.lista_precios_id || null,
            incluye_iva: presupuestoData.incluye_iva,
            margen_extra_porcentaje: margenExtra || null,
            lineas,
          };

          const presupRes = await fetch('/api/presupuestos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presupuestoBody),
          });
          if (presupRes.ok) {
            presupuestoCreado = await presupRes.json().catch(() => null);
          } else {
            const err = await presupRes.json().catch(() => ({}));
            console.error('No se pudo crear el presupuesto:', err);
            toast.error('Oportunidad creada, pero falló el presupuesto: ' + (err.error || 'error desconocido'));
          }
        } catch (err) {
          console.error('Error creando presupuesto borrador:', err);
        }
      }

      if (oportunidad) {
        toast.success('Oportunidad actualizada');
      } else if (presupuestoCreado) {
        toast.success('Oportunidad y presupuesto creados — listo para enviar');
      } else {
        toast.success('Oportunidad creada');
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar oportunidad');
    } finally {
      setLoading(false);
    }
  };

  const clientesOptions = clientes.map(c => {
    const partes: string[] = [];
    if (c.nombre_fantasia && c.nombre_fantasia !== c.nombre) {
      partes.push(c.nombre_fantasia);
    }
    if (c.cuit) {
      partes.push(`CUIT ${c.cuit}`);
    } else if (c.documento_nro) {
      partes.push(`DNI ${c.documento_nro}`);
    }
    if (c.localidad) {
      partes.push(c.localidad);
    }
    // aliases viene del API como string concatenado de razones sociales hermanas + labs
    if (c.aliases && typeof c.aliases === 'string' && c.aliases.trim()) {
      const aliasTrim = c.aliases.length > 80 ? c.aliases.slice(0, 80).trim() + '…' : c.aliases;
      partes.push(`alias: ${aliasTrim}`);
    }
    const idDisplay = c.identificador_unico || c.identificador_legacy
      ? `#${c.identificador_unico || c.identificador_legacy}`
      : c.numero_cliente
        ? `#${c.numero_cliente}`
        : undefined;
    return {
      value: c.id,
      label: c.nombre || c.identificador_unico || 'Sin nombre',
      badge: idDisplay,
      secondaryLabel: partes.join(' • ') || undefined,
      subtitle: partes.join(' • ') || undefined,
      data: {
        nombre: c.nombre,
        nombre_fantasia: c.nombre_fantasia,
        identificador_unico: c.identificador_unico,
        cuit: c.cuit,
        email: c.email,
        telefono: c.telefono,
      },
    };
  });

  // Función para crear cliente rápido
  const handleCreateCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    setSavingCliente(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoCliente.nombre,
          nombre_fantasia: nuevoCliente.nombre_fantasia || null,
          identificador_unico: nuevoCliente.identificador_unico || null,
          email: nuevoCliente.email || null,
          telefono: nuevoCliente.telefono || null,
          tipo: 'persona', // Default tipo
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear cliente');
      }

      const newCliente = await res.json();

      // Agregar el cliente a la lista y seleccionarlo
      setClientes(prev => [newCliente, ...prev]);
      setFormData(prev => ({ ...prev, cliente_id: newCliente.id }));

      // Resetear form y cerrar
      setNuevoCliente({
        nombre: '',
        nombre_fantasia: '',
        identificador_unico: '',
        email: '',
        telefono: '',
      });
      setCreateClienteOpen(false);

      toast.success('Cliente creado y seleccionado');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear cliente');
    } finally {
      setSavingCliente(false);
    }
  };

  // Auto-calcular monto desde equipos si hay. El MONTO de la oportunidad va en PESOS:
  // los equipos en USD se convierten al dólar del día (CRM peso-céntrico → pipeline sumable).
  const montoEquipos = equipos.reduce((sum, l) => sum + aPesos(cardSubtotal(l), l.moneda), 0);
  useEffect(() => {
    if (equipos.length > 0 && montoEquipos > 0) {
      setFormData(prev => ({ ...prev, monto_estimado: montoEquipos.toFixed(2) }));
    }
  }, [montoEquipos, equipos.length]);

  // Detectar conflictos: equipo ya en otra oportunidad. Se ejecuta cuando cambia la lista de equipo_ids.
  const equipoIdsDep = equipos.map(e => e.equipo_id || '').join(',');
  useEffect(() => {
    const equipoIds = equipos.map(e => e.equipo_id).filter((id): id is string => !!id);
    if (equipoIds.length === 0) {
      setConflictosPorLinea({});
      return;
    }
    const excludeParam = oportunidad ? `&exclude_oportunidad_id=${oportunidad.id}` : '';
    Promise.all(
      equipoIds.map(equipoId =>
        fetch(`/api/oportunidades-equipos/conflictos?equipo_id=${equipoId}${excludeParam}`)
          .then(res => res.ok ? res.json() : null)
          .then((data: { mismoEquipo: any[]; mismaCategoria: any[]; categoria: string | null } | null) =>
            data ? { equipoId, data } : null)
          .catch(() => null)
      )
    ).then(results => {
      const newConflictos: Record<string, { mismoEquipo: any[]; mismaCategoria: any[]; categoria: string | null }> = {};
      for (const r of results) {
        if (r) newConflictos[r.equipoId] = r.data;
      }
      setConflictosPorLinea(newConflictos);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoIdsDep, oportunidad?.id]);

  const probActual = probabilidadDeEtapa(formData.etapa);

  // Calcular valor ponderado
  const valorPonderado = formData.monto_estimado
    ? parseFloat(formData.monto_estimado) * (probActual / 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            {oportunidad ? 'Editar Oportunidad' : 'Nueva Oportunidad de Venta'}
          </DialogTitle>
          <DialogDescription>
            {oportunidad
              ? 'Actualiza los datos de la oportunidad comercial'
              : 'Registra una nueva oportunidad en el pipeline de ventas'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Building className="h-4 w-4" />
              Información Básica
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="nombre">
                  Nombre de la Oportunidad <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Venta de equipos médicos - Hospital Central"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <Label htmlFor="cliente">Cliente</Label>
                  <div className="mt-1 flex gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <SearchableCombobox
                        preloadedOptions={clientesOptions}
                        value={formData.cliente_id}
                        onValueChange={(value) => setFormData({ ...formData, cliente_id: value, laboratorio_id: '', persona_id: '' })}
                        placeholder="Buscar cliente..."
                        emptyMessage="No se encontraron clientes"
                        disabled={loadingClientes}
                      />
                    </div>
                    <Button
                      htmlType="button"
                      type="outline"
                      size="tiny"
                      className="shrink-0 h-10 px-3"
                      onClick={() => setCreateClienteOpen(true)}
                      title="Crear cliente nuevo"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Opcional. Si todavía no es cliente, dejalo vacío y completá solo "Persona de Contacto" abajo.
                  </p>
                </div>

                <div>
                  <Label htmlFor="fuente">Fuente del Lead</Label>
                  <Select
                    value={formData.fuente || "none"}
                    onValueChange={(value) => setFormData({ ...formData, fuente: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="¿Cómo nos conoció?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {fuentesSelector.map((fuente) => {
                        const Icon = fuente.icon;
                        return (
                          <SelectItem key={fuente.id} value={fuente.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {fuente.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Laboratorio (solo si el cliente tiene labs) */}
              {formData.cliente_id && laboratorios.length > 0 && (
                <div>
                  <Label>
                    <FlaskConical className="h-3.5 w-3.5 inline mr-1" />
                    Laboratorio / Sede
                  </Label>
                  <div className="mt-1">
                    <SearchableCombobox
                      preloadedOptions={laboratorios.map((l: any) => ({
                        value: l.id,
                        label: l.nombre,
                        secondaryLabel: [l.localidad, l.provincia].filter(Boolean).join(', ') || undefined,
                      }))}
                      value={formData.laboratorio_id}
                      onValueChange={(value) => setFormData({ ...formData, laboratorio_id: value })}
                      placeholder={loadingLabs ? 'Cargando...' : 'Seleccionar laboratorio...'}
                      emptyMessage="Sin laboratorios"
                      disabled={loadingLabs}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles adicionales sobre la oportunidad, requisitos del cliente, etc..."
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Datos de Contacto */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <User className="h-4 w-4" />
                Persona de Contacto
              </div>
              {formData.cliente_id && (
                <button
                  type="button"
                  onClick={() => {
                    setContactoManual(!contactoManual);
                    if (!contactoManual) {
                      setFormData({ ...formData, persona_id: '' });
                    }
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline"
                >
                  {contactoManual ? 'Elegir del sistema' : 'Ingresar manualmente'}
                </button>
              )}
            </div>

            {!contactoManual && formData.cliente_id ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Contacto</Label>
                  <div className="mt-1">
                    <SearchableCombobox
                      preloadedOptions={contactos.map(c => ({
                        value: c.id,
                        label: c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim(),
                        secondaryLabel: [
                          c.cargo,
                          c.email?.[0],
                        ].filter(Boolean).join(' · ') || undefined,
                      }))}
                      value={formData.persona_id}
                      onValueChange={(value) => {
                        const persona = contactos.find(c => c.id === value);
                        setFormData({
                          ...formData,
                          persona_id: value,
                          contacto_nombre: persona?.nombre_completo || `${persona?.nombre || ''} ${persona?.apellido || ''}`.trim() || '',
                          contacto_telefono: persona?.telefono?.[0] || '',
                          contacto_email: persona?.email?.[0] || '',
                        });
                      }}
                      placeholder={loadingContactos ? 'Cargando contactos...' : contactos.length === 0 ? 'Sin contactos — ingresá manualmente' : 'Seleccionar contacto...'}
                      emptyMessage="No hay contactos para este cliente"
                      disabled={loadingContactos}
                    />
                  </div>
                </div>
                {formData.persona_id && (
                  <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50 border text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Nombre</span>
                      <p className="font-medium">{formData.contacto_nombre || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Teléfono</span>
                      <p className="font-medium">{formData.contacto_telefono || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Email</span>
                      <p className="font-medium">{formData.contacto_email || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Buscar contacto existente (persona global de la org) */}
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    Buscar contacto existente
                    <span className="text-xs font-normal text-muted-foreground">— o completá manualmente abajo</span>
                  </Label>
                  <div className="mt-1">
                    <SearchableCombobox
                      value={formData.persona_id || ''}
                      onValueChange={(value) => {
                        if (!value) {
                          setFormData({ ...formData, persona_id: '' });
                          return;
                        }
                        const found = personasSearchRef.current.find((p) => p.value === value);
                        const data: any = found?.data || {};
                        const emailStr = Array.isArray(data.email) ? data.email[0] : data.email;
                        const telStr = Array.isArray(data.telefono) ? data.telefono[0] : data.telefono;
                        const nombre =
                          data.nombre_completo ||
                          `${data.nombre || ''} ${data.apellido || ''}`.trim() ||
                          found?.label ||
                          '';
                        setFormData({
                          ...formData,
                          persona_id: value,
                          contacto_nombre: nombre,
                          contacto_email: emailStr || '',
                          contacto_telefono: telStr || '',
                        });
                      }}
                      searchFn={async (q) => {
                        const results = await searchPersonas(q);
                        personasSearchRef.current = results;
                        return results;
                      }}
                      placeholder="Escribí nombre, email o teléfono..."
                      emptyMessage="No se encontraron contactos"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contacto_nombre">Nombre</Label>
                  <Input
                    id="contacto_nombre"
                    value={formData.contacto_nombre}
                    onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value, persona_id: '' })}
                    placeholder="Juan Pérez"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="contacto_telefono">Teléfono</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contacto_telefono"
                      value={formData.contacto_telefono}
                      onChange={(e) => setFormData({ ...formData, contacto_telefono: e.target.value })}
                      placeholder="+54 9 11 1234-5678"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contacto_email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contacto_email"
                      type="email"
                      value={formData.contacto_email}
                      onChange={(e) => setFormData({ ...formData, contacto_email: e.target.value })}
                      placeholder="contacto@empresa.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

                {formData.persona_id && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    ✓ Contacto existente vinculado — al guardar se asociará a esta persona
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Equipos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Package className="h-4 w-4" />
              Equipos
            </div>

            {/* Resumen de conflictos: equipos ya en otras oportunidades */}
            {(() => {
              const conflictingEntries = Object.entries(conflictosPorLinea).filter(
                ([, c]) => (c.mismoEquipo?.length ?? 0) > 0 || (c.mismaCategoria?.length ?? 0) > 0
              );
              if (conflictingEntries.length === 0) return null;
              return (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-xs space-y-2">
                  <p className="font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    ⚠ Posibles conflictos con otras oportunidades
                  </p>
                  {conflictingEntries.map(([equipoId, c]) => {
                    const linea = equipos.find(e => e.equipo_id === equipoId);
                    const nombre = linea?.equipo
                      ? `${linea.equipo.marca ?? ''} ${linea.equipo.modelo ?? ''}`.trim()
                      : equipoId.slice(0, 8);
                    return (
                      <div key={equipoId} className="text-amber-800 dark:text-amber-300">
                        <p className="font-semibold">{nombre}:</p>
                        {(c.mismoEquipo?.length ?? 0) > 0 && (
                          <ul className="list-disc list-inside ml-2">
                            {c.mismoEquipo.slice(0, 3).map((o: any) => (
                              <li key={o.oportunidad_id}>
                                {o.oportunidad_nombre} ({o.estado_pedido}{o.vendedor_nombre ? ` — ${o.vendedor_nombre}` : ''})
                              </li>
                            ))}
                          </ul>
                        )}
                        {(c.mismaCategoria?.length ?? 0) > 0 && (
                          <p className="ml-2">
                            Misma categoría ({c.categoria}): {c.mismaCategoria.length} oportunidad{c.mismaCategoria.length === 1 ? '' : 'es'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <EquipoLineasEditor
              value={equipos}
              onChange={setEquipos}
              moneda={monedaPresupuesto}
              onMonedaChange={(m) => { setMonedaElegida(m); setMonedaTocada(true); }}
              cotizacion={{ tipo_cotizacion: cotizacionForm.tipo_cotizacion as 'oficial' | 'blue' | 'mep', cotizacion_usd: cotizacionForm.cotizacion_usd }}
              onCotizacionChange={(c) => setCotizacionForm((p) => ({ ...p, ...c }))}
            />
          </div>


          {/* Presupuesto auto-creado (solo al crear nueva oportunidad) */}
          {!oportunidad && (
            <div className="space-y-4 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/40 to-white dark:from-purple-950/20 dark:to-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-900 dark:text-purple-200">
                  <FileText className="h-4 w-4" />
                  Presupuesto
                  {presupuestoData.crear && equipos.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Se crea como borrador listo para enviar
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="crear-presupuesto" className="text-xs text-muted-foreground cursor-pointer">
                    Crear presupuesto
                  </Label>
                  <Switch
                    id="crear-presupuesto"
                    checked={presupuestoData.crear}
                    onCheckedChange={(v) => setPresupuestoData({ ...presupuestoData, crear: v })}
                  />
                </div>
              </div>

              {presupuestoData.crear && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1.5">
                        <Percent className="h-3 w-3" /> Margen extra (%)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="-100"
                        max="500"
                        placeholder="0"
                        value={presupuestoData.margen_extra_porcentaje}
                        onChange={(e) => setPresupuestoData({ ...presupuestoData, margen_extra_porcentaje: e.target.value })}
                        className="mt-1 h-9"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Suma o resta sobre el precio del equipo (ej. 10% → +10%, -5% → descuento del 5%).
                      </p>
                    </div>
                  </div>

                  {equipos.length > 0 && (() => {
                    const margenExtra = parseFloat(presupuestoData.margen_extra_porcentaje) || 0;
                    const factor = 1 + margenExtra / 100;
                    return (
                      <div className="rounded-lg border bg-white/60 dark:bg-gray-900/40">
                        <div className="px-3 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          Vista previa por item con margen aplicado
                        </div>
                        <table className="w-full text-xs">
                          <thead className="bg-muted/30">
                            <tr>
                              <th className="text-left p-2 font-medium">Producto</th>
                              <th className="text-right p-2 font-medium w-20">Cant.</th>
                              <th className="text-right p-2 font-medium w-32">Precio base</th>
                              <th className="text-right p-2 font-medium w-32">Con margen</th>
                              <th className="text-right p-2 font-medium w-32">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {equipos.map((eq) => {
                              const base = convertir(eq.precio_unitario || 0, eq.moneda || 'ARS', monedaPresupuesto);
                              const conMargen = base * factor;
                              const sub = (eq.cantidad || 1) * conMargen;
                              return (
                                <tr key={eq.id} className="border-t border-gray-100 dark:border-gray-800">
                                  <td className="p-2 truncate max-w-[280px]" title={eq.descripcion}>
                                    {eq.descripcion || <span className="text-muted-foreground italic">sin nombre</span>}
                                  </td>
                                  <td className="p-2 text-right text-muted-foreground">{eq.cantidad || 1}</td>
                                  <td className="p-2 text-right text-muted-foreground">{formatCurrency(base, monedaPresupuesto)}</td>
                                  <td className="p-2 text-right font-medium">
                                    {formatCurrency(conMargen, monedaPresupuesto)}
                                    {margenExtra > 0 && (
                                      <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                        +{margenExtra}%
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-right font-semibold">{formatCurrency(sub, monedaPresupuesto)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1.5">
                        <Percent className="h-3 w-3" /> Alícuota IVA
                      </Label>
                      <Select
                        value={String(presupuestoData.alicuota_iva)}
                        onValueChange={(v) => setPresupuestoData({ ...presupuestoData, alicuota_iva: parseFloat(v) })}
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALICUOTAS_IVA.map(a => (
                            <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Presupuesto con IVA</p>
                        <p className="text-[11px] text-muted-foreground">
                          {presupuestoData.incluye_iva
                            ? `Se suma el ${presupuestoData.alicuota_iva}% (Subtotal + IVA = Total).`
                            : 'Sin IVA — el total es el subtotal.'}
                        </p>
                      </div>
                      <Switch
                        checked={presupuestoData.incluye_iva}
                        onCheckedChange={(v) => setPresupuestoData({ ...presupuestoData, incluye_iva: v })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" /> Forma de pago
                      </Label>
                      <div className="mt-1 flex rounded-md border border-input p-0.5 h-9 gap-0.5">
                        {(['contado', 'financiado'] as const).map((fp) => (
                          <button
                            key={fp}
                            type="button"
                            onClick={() => setPresupuestoData({ ...presupuestoData, forma_pago: fp })}
                            className={cn(
                              "flex-1 text-xs font-medium rounded transition-colors",
                              presupuestoData.forma_pago === fp
                                ? "bg-purple-600 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {fp === 'contado' ? 'Contado' : 'Financiado'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Validez (días)
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={presupuestoData.validez_dias}
                        onChange={(e) => setPresupuestoData({ ...presupuestoData, validez_dias: e.target.value })}
                        className="mt-1 h-9"
                      />
                    </div>
                  </div>

                  {/* Financiación: cuotas + interés (% total) con cálculo automático */}
                  {presupuestoData.forma_pago === 'financiado' && (
                    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Financiación (cuotas)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={presupuestoData.financiacion_cuotas}
                            onChange={(e) => setPresupuestoData({ ...presupuestoData, financiacion_cuotas: e.target.value })}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Interés (% total)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={presupuestoData.interes_porcentaje}
                            onChange={(e) => setPresupuestoData({ ...presupuestoData, interes_porcentaje: e.target.value })}
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded-md px-3 py-2 border">
                        <span className="text-muted-foreground">
                          {financiacionCalc.cuotas} {financiacionCalc.cuotas === 1 ? 'cuota' : 'cuotas'} de
                        </span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {formatCurrency(financiacionCalc.valorCuota)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-right">
                        Total con interés: {formatCurrency(financiacionCalc.totalConInteres)}
                        {financiacionCalc.interes > 0 ? ` (+${financiacionCalc.interes}%)` : ''}
                      </p>
                    </div>
                  )}

                  {equipos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-200/50 dark:border-purple-900/30 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="font-semibold">{formatCurrency(totalesPresupuesto.subtotal, monedaPresupuesto)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          IVA {presupuestoData.alicuota_iva}% {presupuestoData.incluye_iva ? '(incluido)' : ''}
                        </p>
                        <p className="font-semibold text-muted-foreground">{formatCurrency(totalesPresupuesto.iva, monedaPresupuesto)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(totalesPresupuesto.total, monedaPresupuesto)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Información Comercial */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Información Comercial
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="monto_estimado">Monto Estimado ($)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monto_estimado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto_estimado}
                    onChange={(e) => setFormData({ ...formData, monto_estimado: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
                {equipos.some((e) => e.moneda === 'USD') && cotEfectiva > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    En pesos a la cotización elegida (${cotEfectiva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}). El presupuesto puede ir en USD.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="fecha_estimada_cierre">Fecha Est. de Cierre</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fecha_estimada_cierre"
                    type="date"
                    value={formData.fecha_estimada_cierre}
                    onChange={(e) => setFormData({ ...formData, fecha_estimada_cierre: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Preview del Valor Ponderado en la misma fila */}
              <div className="flex flex-col justify-center">
                <Label className="text-muted-foreground">Valor Ponderado</Label>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {formData.monto_estimado ? formatCurrency(valorPonderado) : '-'}
                </p>
              </div>
            </div>

            {/* Probabilidad (derivada de etapa) */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Label className="text-sm text-muted-foreground">Probabilidad de cierre</Label>
              <span className="text-lg font-bold text-purple-600">{probActual}%</span>
              <span className="text-xs text-muted-foreground">(estimado por etapa)</span>
            </div>

          </div>

          {/* Estado del Pipeline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Target className="h-4 w-4" />
              Etapa del Pipeline
            </div>

            <div className="grid grid-cols-5 gap-2">
              {ETAPAS.map((etapa) => {
                const Icon = etapa.icon;
                const isSelected = formData.etapa === etapa.value;

                // Colores específicos para cada etapa cuando está seleccionada
                const selectedStyles: Record<string, string> = {
                  lead: 'border-slate-500 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-300 dark:ring-slate-600 shadow-md',
                  contactado: 'border-blue-500 bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-300 dark:ring-blue-600 shadow-md',
                  presupuestado: 'border-purple-500 bg-purple-100 dark:bg-purple-900 ring-2 ring-purple-300 dark:ring-purple-600 shadow-md',
                  aprobado: 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 ring-2 ring-emerald-300 dark:ring-emerald-600 shadow-md',
                };

                const textColors: Record<string, string> = {
                  lead: 'text-slate-700 dark:text-slate-200',
                  contactado: 'text-blue-700 dark:text-blue-200',
                  presupuestado: 'text-purple-700 dark:text-purple-200',
                  aprobado: 'text-emerald-700 dark:text-emerald-200',
                };

                return (
                  <button
                    key={etapa.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, etapa: etapa.value })}
                    className={cn(
                      "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all cursor-pointer",
                      isSelected
                        ? selectedStyles[etapa.value]
                        : "border-border bg-muted/30 hover:bg-muted hover:border-muted-foreground/30 hover:shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-transform",
                      etapa.bgColor,
                      isSelected && "scale-110"
                    )}>
                      <Icon className={cn("h-5 w-5", etapa.iconColor)} />
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      isSelected ? textColors[etapa.value] : "text-muted-foreground"
                    )}>
                      {etapa.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estado de la Oportunidad (solo en edición) */}
          {oportunidad && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Estado de la Oportunidad
              </div>

              <div className="grid grid-cols-4 gap-2">
                {ESTADOS_OPORTUNIDAD.map((estado) => {
                  const isSelected = formData.estado === estado.value;
                  return (
                    <button
                      key={estado.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, estado: estado.value })}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer",
                        isSelected
                          ? estado.value === 'ganado'
                            ? "border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-300"
                            : estado.value === 'perdido'
                            ? "border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-300"
                            : estado.value === 'cancelado'
                            ? "border-gray-500 bg-gray-50 dark:bg-gray-900/30 ring-2 ring-gray-300"
                            : "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300"
                          : "border-border bg-muted/30 hover:bg-muted"
                      )}
                    >
                      <div className={cn("w-3 h-3 rounded-full", estado.color)} />
                      <span className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {estado.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Campos de Motivo de Pérdida (solo si estado es 'perdido') */}
              {formData.estado === 'perdido' && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                    <Target className="h-4 w-4" />
                    Información de la Pérdida
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="motivo_perdida">Motivo de la Pérdida</Label>
                      <Select
                        value={formData.motivo_perdida || "none"}
                        onValueChange={(value) => setFormData({ ...formData, motivo_perdida: value === "none" ? "" : value })}
                      >
                        <SelectTrigger className="mt-1 bg-white dark:bg-background">
                          <SelectValue placeholder="Seleccionar motivo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin especificar</SelectItem>
                          {MOTIVOS_PERDIDA.map((motivo) => (
                            <SelectItem key={motivo.value} value={motivo.value}>
                              {motivo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="competidor">Competidor (si aplica)</Label>
                      <Input
                        id="competidor"
                        value={formData.competidor}
                        onChange={(e) => setFormData({ ...formData, competidor: e.target.value })}
                        placeholder="Nombre del competidor..."
                        className="mt-1 bg-white dark:bg-background"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="perdida_descripcion">Descripción breve (opcional)</Label>
                    <Input
                      id="perdida_descripcion"
                      value={formData.perdida_descripcion}
                      onChange={(e) => setFormData({ ...formData, perdida_descripcion: e.target.value })}
                      placeholder="Detalle adicional sobre la pérdida..."
                      maxLength={200}
                      className="mt-1 bg-white dark:bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              htmlType="button"
              type="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button htmlType="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : oportunidad ? (
                'Actualizar Oportunidad'
              ) : (
                'Crear Oportunidad'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Dialog para crear cliente rápido */}
      <Dialog open={createClienteOpen} onOpenChange={setCreateClienteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-600" />
              Crear Cliente Rápido
            </DialogTitle>
            <DialogDescription>
              Registra un nuevo cliente para asociar a esta oportunidad
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nuevo_cliente_nombre">
                Nombre / Razón Social <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nuevo_cliente_nombre"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                placeholder="Ej: Hospital Central S.A."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nuevo_cliente_fantasia">Nombre Fantasía</Label>
              <Input
                id="nuevo_cliente_fantasia"
                value={nuevoCliente.nombre_fantasia}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre_fantasia: e.target.value })}
                placeholder="Ej: Hospital Central"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="nuevo_cliente_cuit">CUIT / DNI</Label>
              <Input
                id="nuevo_cliente_cuit"
                value={nuevoCliente.identificador_unico}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, identificador_unico: e.target.value })}
                placeholder="Ej: 30-12345678-9"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nuevo_cliente_email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nuevo_cliente_email"
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="email@empresa.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="nuevo_cliente_telefono">Teléfono</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nuevo_cliente_telefono"
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="+54 9 11..."
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              htmlType="button"
              type="outline"
              onClick={() => setCreateClienteOpen(false)}
              disabled={savingCliente}
            >
              Cancelar
            </Button>
            <Button
              htmlType="button"
              type="primary"
              className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
              onClick={handleCreateCliente}
              disabled={savingCliente || !nuevoCliente.nombre.trim()}
            >
              {savingCliente ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear y Seleccionar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
