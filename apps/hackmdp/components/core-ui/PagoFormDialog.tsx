"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Info, AlertTriangle, Wallet, Users, X, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Pago, Factura, Cliente } from "@/lib/types";
import useSWR from "swr";
import { toast } from "sonner";
import { dialogClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-currency";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

interface PagoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago?: Pago | null;
  facturaId?: string; // Para pre-seleccionar factura
  clienteId?: string; // Para depósitos a cuenta sin factura
  clienteNombre?: string; // Nombre del cliente para mostrar
  filterByClienteId?: string; // Para filtrar facturas por cliente sin modo depósito
  esContextoIvr?: boolean; // Para indicar que viene de cuenta corriente IVR
  onSuccess: () => void;
  /** Solo IVR: callback con el cobro recién creado (full row del backend),
   * si el usuario clickeó "Registrar y enviar". El parent abre el
   * SendEmailDialog usando el cobro para precalcular destinatarios/asunto/PDF. */
  onCobroCreated?: (cobro: any) => void;
}

interface PaginatedFacturasResponse {
  data: Factura[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PagoFormDialog({
  open,
  onOpenChange,
  pago,
  facturaId,
  clienteId: clienteIdProp,
  clienteNombre,
  filterByClienteId,
  esContextoIvr = false,
  onSuccess,
  onCobroCreated,
}: PagoFormDialogProps) {
  // Solo IVR alta nueva: cuando el usuario clickea "Registrar y enviar",
  // disparamos el callback al parent después del POST exitoso.
  const enviarTrasGuardarRef = useRef(false);
  // Estado para modo depósito dinámico (cuando el usuario elige "Depósito a cuenta" del selector)
  const [modoDepositoManual, setModoDepositoManual] = useState(false);

  // Selector de cliente cuando se entra "en frío" desde /dashboard/pagos
  // (sin facturaId, sin clienteIdProp, sin filterByClienteId, sin pago en edición).
  // Sin esto, el dropdown de Factura cargaba TODAS las facturas pendientes (cientos
  // o miles) y no había forma de registrar un depósito a cuenta para un cliente
  // con saldo en 0.
  const [clienteIdLocal, setClienteIdLocal] = useState<string>("");
  const modoSelectorGlobal = !facturaId && !pago && !clienteIdProp && !filterByClienteId;
  const clienteFiltro = filterByClienteId || clienteIdLocal;

  // Modo depósito: cuando hay clienteId pero no facturaId, O cuando el usuario eligió deposito del selector
  const modoDeposito = (!!clienteIdProp && !facturaId) || modoDepositoManual;

  // Modo IVR multi: pago contra varios IVRs del mismo cliente.
  // Cliente real cobra montos genéricos (ej $100k contra 3 remitos), no
  // exactos por factura. El backend /api/cobros-ivr ya soporta aplicaciones[].
  // Activamos cuando estamos en contexto IVR sin factura preseleccionada ni
  // edición ni modo depósito.
  const modoIvrMulti = esContextoIvr && !pago && !modoDeposito && !facturaId;

  // IVRs seleccionados en modo multi, con monto a aplicar editable por cada uno.
  const [ivrsSeleccionados, setIvrsSeleccionados] = useState<Array<{
    factura_id: string;
    nro_factura: string;
    total: number;
    saldo_pendiente: number;
    monto_aplicar: number;
  }>>([]);

  // Traer facturas pendientes para el selector (incluye IVRs)
  // Si hay un cliente seleccionado (por prop o local), filtrar solo las de ese cliente.
  // En modo selector global sin cliente elegido todavía, no traemos nada.
  const facturasUrl = !modoDeposito
    ? clienteFiltro
      ? `/api/facturas?pageSize=500&estado=pendiente&include_ivr=true&cliente_id=${clienteFiltro}`
      : modoSelectorGlobal
        ? null
        : '/api/facturas?pageSize=500&estado=pendiente&include_ivr=true'
    : null;
  const { data: facturasResponse } = useSWR<PaginatedFacturasResponse>(
    facturasUrl,
    fetcher
  );
  const facturas = facturasResponse?.data || [];

  // IVRs del cliente para el flujo de cobro multi. Fuente: /api/ivr (NO
  // /api/facturas), porque:
  //  - /api/facturas?estado=pendiente EXCLUYE los IVR en estado 'parcial'
  //    (saldados a medias) → no se podían cobrar desde acá.
  //  - /api/facturas calcula el saldo desde la tabla `pagos`; los cobros IVR
  //    viven en `cobros`/`total_pagado`, así que daría el total y no el saldo
  //    real. /api/ivr ya devuelve saldo_pendiente cobros-aware (FIFO).
  const ivrListUrl = !modoDeposito && clienteFiltro
    ? `/api/ivr?cliente_id=${clienteFiltro}`
    : null;
  const { data: ivrListData } = useSWR<any[]>(ivrListUrl, fetcher);
  // Mostramos IVRs con saldo pendiente (incluye 'parcial', no solo 'pendiente').
  const facturasIvr = (Array.isArray(ivrListData) ? ivrListData : []).filter(
    (f: any) =>
      (f.estado === 'pendiente' || f.estado === 'parcial') &&
      (Number(f.saldo_pendiente ?? f.total) || 0) > 0
  );

  // Si tenemos un facturaId específico (ej: un IVR), buscar sus datos directamente
  const { data: facturaEspecifica } = useSWR<Factura>(
    facturaId && open ? `/api/ivr/${facturaId}` : null,
    fetcher
  );

  const [loading, setLoading] = useState(false);
  const [usarSaldoFavor, setUsarSaldoFavor] = useState(false);
  const [pagoTerceroNombre, setPagoTerceroNombre] = useState("");
  // chequeSeleccionadoId: cuando el método de pago es "cheque", el usuario
  // puede elegir un cheque existente en cartera. Al guardar el pago, el
  // backend vincula el cheque (cheques.pago_id) y el cheque queda trazable
  // para su ciclo de vida. Se muestra sólo cuando metodo_pago === "cheque".
  const [chequeSeleccionadoId, setChequeSeleccionadoId] = useState<string>("");
  // avanzarChequeA: qué estado tiene el cheque después de vincularlo al pago.
  // 'depositado' (default) — el pago se registró pero el cheque aún no se
  //   acreditó. El usuario marca 'cobrado' manualmente cuando el banco lo pasa.
  // 'cobrado' — el pago ya llegó acreditado (poco común pero válido).
  const [avanzarChequeA, setAvanzarChequeA] = useState<"depositado" | "cobrado">("depositado");
  const [formData, setFormData] = useState({
    factura_id: "",
    monto: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    metodo_pago: "transferencia",
    comentarios: "",
  });

  // Información de la factura seleccionada
  // Si tenemos factura específica (IVR), usarla; sino buscar en la lista
  const facturaSeleccionada = facturaEspecifica || facturas?.find(f => f.id === formData.factura_id);
  const saldoPendiente = facturaSeleccionada?.saldo_pendiente ?? facturaSeleccionada?.total ?? 0;

  // Determinar si la factura es IVR (usa tabla cobros) o legal (usa tabla pagos)
  const esIvr = facturaSeleccionada?.tipo_factura === 'IVR';

  // Obtener cliente_id de la factura seleccionada o del prop directo o del filtro/local
  const clienteId = clienteIdProp || facturaSeleccionada?.cliente_id || clienteFiltro;

  // Fetch del cliente para obtener saldo_a_favor
  const { data: clienteData } = useSWR<Cliente>(
    clienteId && open ? `/api/clientes/${clienteId}` : null,
    fetcher
  );

  /**
   * Cheques en cartera disponibles para aplicar a este pago.
   * Sólo carga cuando:
   *   - El método de pago es "cheque"
   *   - Hay un cliente resuelto (para filtrar por cliente_id)
   *   - El dialog está abierto
   *
   * Filtra del lado servidor por tipo=tercero + estado=en_cartera + cliente_id.
   * Si el cliente no tiene cheques propios vinculados, mostramos fallback con
   * todos los cheques en cartera para permitir asociar uno que no tenga
   * cliente_id seteado aún (caso común: cheque histórico sin cliente).
   */
  const { data: chequesCartera } = useSWR<Array<{
    id: string;
    numero: string;
    monto: number | string;
    banco: string | null;
    nombre_librador: string | null;
    cuit_librador: string | null;
    fecha_pago: string | null;
    cliente_nombre: string | null;
  }>>(
    open && formData.metodo_pago === "cheque" && clienteId
      ? `/api/cheques?estado=en_cartera&tipo=tercero&cliente_id=${clienteId}`
      : null,
    fetcher
  );

  // Fallback: cheques en cartera SIN cliente asignado (para cuando el cliente
  // no tiene ninguno propio, permitir vincular uno histórico).
  const { data: chequesCarteraSinCliente } = useSWR<typeof chequesCartera>(
    open && formData.metodo_pago === "cheque" && clienteId && chequesCartera && chequesCartera.length === 0
      ? `/api/cheques?estado=en_cartera&tipo=tercero`
      : null,
    fetcher
  );

  const chequesDisponibles = (chequesCartera && chequesCartera.length > 0)
    ? chequesCartera
    : (chequesCarteraSinCliente || []).filter((ch) => !ch.cliente_nombre).slice(0, 50);

  // Saldo a favor disponible del cliente (usa campo diferente según tipo de factura)
  const saldoFavorDisponible = esIvr
    ? (clienteData?.saldo_a_favor_ivr || 0)
    : (clienteData?.saldo_a_favor || 0);

  // Calcular cuánto saldo a favor se puede aplicar
  const saldoFavorAplicable = usarSaldoFavor ? Math.min(saldoFavorDisponible, saldoPendiente) : 0;

  // Saldo pendiente después de aplicar saldo a favor
  const saldoPendienteDespuesSaldoFavor = Math.max(0, saldoPendiente - saldoFavorAplicable);

  // Calcular si hay saldo a favor (cuando paga de más)
  const montoPago = parseFloat(formData.monto) || 0;
  const montoTotalPago = montoPago + saldoFavorAplicable;
  const saldoAFavor = montoTotalPago > saldoPendiente ? montoTotalPago - saldoPendiente : 0;
  const excedeSaldo = montoTotalPago > saldoPendiente;

  useEffect(() => {
    setUsarSaldoFavor(false);
    setPagoTerceroNombre("");
    setModoDepositoManual(false);
    setChequeSeleccionadoId("");
    setAvanzarChequeA("depositado");
    setClienteIdLocal("");
    setIvrsSeleccionados([]);
    if (pago) {
      setFormData({
        factura_id: pago.factura_id || "",
        monto: pago.monto?.toString() || "",
        fecha_pago: pago.fecha_pago || new Date().toISOString().split("T")[0],
        metodo_pago: pago.metodo_pago || "transferencia",
        comentarios: "",
      });
    } else if (facturaId) {
      setFormData({
        factura_id: facturaId,
        monto: "",
        fecha_pago: new Date().toISOString().split("T")[0],
        metodo_pago: "transferencia",
        comentarios: "",
      });
    } else {
      setFormData({
        factura_id: "",
        monto: "",
        fecha_pago: new Date().toISOString().split("T")[0],
        metodo_pago: "transferencia",
        comentarios: "",
      });
    }
  }, [pago, facturaId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de campos requeridos
    // En modo selector global, primero exigir cliente
    if (modoSelectorGlobal && !clienteIdLocal) {
      toast.error("Por favor seleccione un cliente");
      return;
    }

    // En modo IVR multi: el monto aplicado no puede exceder el recibido.
    // Se permiten 0 IVRs seleccionados → el monto completo queda como saldo a
    // favor (adelanto / cobro a cuenta).
    if (modoIvrMulti) {
      if (saldoSinAplicarMulti < -0.01) {
        toast.error("Lo aplicado a los IVRs excede el monto recibido");
        return;
      }
    } else if (!modoDeposito && !formData.factura_id) {
      // Modo single (no depósito): exigir factura
      toast.error("Por favor seleccione una factura");
      return;
    }

    // El monto en efectivo es opcional cuando se cubre con saldo a favor; la
    // regla "al menos monto o saldo a favor" se valida abajo (línea ~315).
    if (parseFloat(formData.monto) < 0) {
      toast.error("El monto no puede ser negativo");
      return;
    }

    if (!formData.fecha_pago) {
      toast.error("Por favor seleccione una fecha de pago");
      return;
    }

    // Validar que al menos se pague algo (monto o saldo a favor)
    // En modo depósito solo validamos monto
    if (!modoDeposito && montoPago <= 0 && saldoFavorAplicable <= 0) {
      toast.error("Debe ingresar un monto o aplicar saldo a favor");
      return;
    }

    setLoading(true);

    try {
      const body = {
        ...formData,
        monto: parseFloat(formData.monto) || 0,
        comentarios: formData.comentarios
          ? [{ texto: formData.comentarios, fecha: new Date().toISOString() }]
          : [],
        // Información de saldo a favor
        aplicar_saldo_favor: usarSaldoFavor && saldoFavorAplicable > 0,
        monto_saldo_favor: saldoFavorAplicable,
        cliente_id: clienteId,
        // Modo depósito a cuenta (sin factura)
        es_deposito_cuenta: modoDeposito,
        // Cheque vinculado (solo si método = cheque y se eligió uno).
        // El backend de /api/pagos lo procesa atómicamente: vincula
        // cheques.pago_id y avanza el estado del cheque a `avanzar_cheque_a`
        // (por default 'depositado'). Ver /api/pagos/route.ts migración lógica.
        cheque_id: formData.metodo_pago === "cheque" ? chequeSeleccionadoId || null : null,
        avanzar_cheque_a: formData.metodo_pago === "cheque" && chequeSeleccionadoId ? avanzarChequeA : undefined,
      };

      // En modo depósito, no enviamos factura_id
      if (modoDeposito) {
        delete (body as any).factura_id;
      }

      // === Modo IVR multi ===
      // En modo multi mandamos aplicaciones[] a /api/cobros-ivr. El backend
      // crea un cobro y N filas en cobros_aplicaciones, capeando lo aplicado
      // al saldo real de cada factura y mandando el excedente a saldo_a_favor_ivr.
      if (modoIvrMulti) {
        delete (body as any).factura_id;
        const resMulti = await fetch("/api/cobros-ivr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monto: montoRecibido,
            fecha_pago: formData.fecha_pago,
            metodo_pago: formData.metodo_pago,
            referencia_pago: null,
            notas: formData.comentarios || null,
            cliente_id: clienteId,
            aplicaciones: ivrsSeleccionados.map((i) => ({
              factura_id: i.factura_id,
              monto_aplicado: i.monto_aplicar,
            })),
          }),
        });
        if (!resMulti.ok) {
          const data = await resMulti.json();
          throw new Error(data.error || "Error al registrar cobro");
        }
        const createdMulti = await resMulti.json().catch(() => null);
        const msgSaldo = saldoSinAplicarMulti > 0.01
          ? ` · ${formatCurrency(saldoSinAplicarMulti)} a saldo a favor`
          : "";
        toast.success(
          `Cobro de ${formatCurrency(montoRecibido)} aplicado a ${ivrsSeleccionados.length} IVR${ivrsSeleccionados.length > 1 ? "s" : ""}${msgSaldo}`
        );
        onSuccess();
        onOpenChange(false);
        // "Registrar y enviar" en modo multi: pasar el cobro recién creado al
        // parent para que abra el SendEmailDialog (mismo flujo que el alta de un
        // solo IVR). Antes este branch retornaba antes y nunca enviaba el recibo.
        if (createdMulti?.id && enviarTrasGuardarRef.current && onCobroCreated) {
          onCobroCreated(createdMulti);
        }
        enviarTrasGuardarRef.current = false;
        return;
      }

      // Usar la API correcta según el tipo de factura o contexto
      // IVR usa /api/cobros, facturas legales usan /api/pagos
      // En modo depósito, usar el contexto para determinar la API
      const usarApiCobros = esIvr || (modoDeposito && esContextoIvr);
      const url = usarApiCobros ? '/api/cobros' : '/api/pagos';
      const method = pago ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pago ? { ...body, id: pago.id } : body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar pago");
      }

      const created = await res.json().catch(() => null);
      const nuevoCobro = !pago && created?.id ? created : null;

      const message = modoDeposito
        ? `Depósito de ${formatCurrency(parseFloat(formData.monto))} registrado como saldo a favor`
        : usarSaldoFavor && saldoFavorAplicable > 0
        ? `Pago registrado. Se aplicó ${formatCurrency(saldoFavorAplicable)} del saldo a favor.`
        : pago ? "Pago actualizado exitosamente" : "Pago registrado exitosamente";
      toast.success(message);
      onSuccess();
      onOpenChange(false);

      // Si el usuario apretó "Registrar y enviar", pasarle el cobro completo al parent
      if (nuevoCobro && enviarTrasGuardarRef.current && esContextoIvr && onCobroCreated) {
        onCobroCreated(nuevoCobro);
      }
      // Reset por si el dialog se vuelve a abrir
      enviarTrasGuardarRef.current = false;
    } catch (error: any) {
      toast.error(error.message || "Error al guardar pago");
    } finally {
      setLoading(false);
    }
  };

  // === Modo IVR multi: helpers de selección y aplicación ===
  // Toggle agrega/saca un IVR del set de seleccionados. Al agregar, pre-llena
  // monto_aplicar con el saldo pendiente (lo más común). El usuario puede editar.
  const toggleIvrSeleccion = (ivr: any) => {
    setIvrsSeleccionados((prev) => {
      const existe = prev.find((i) => i.factura_id === ivr.id);
      if (existe) return prev.filter((i) => i.factura_id !== ivr.id);
      return [
        ...prev,
        {
          factura_id: ivr.id,
          nro_factura: ivr.nro_factura || ivr.numero || "",
          total: Number(ivr.total) || 0,
          saldo_pendiente: Number(ivr.saldo_pendiente ?? ivr.total) || 0,
          monto_aplicar: Number(ivr.saldo_pendiente ?? ivr.total) || 0,
        },
      ];
    });
  };
  const updateMontoAplicar = (facturaId: string, monto: number) => {
    setIvrsSeleccionados((prev) =>
      prev.map((i) => (i.factura_id === facturaId ? { ...i, monto_aplicar: monto } : i))
    );
  };
  // Total aplicado a las facturas seleccionadas
  const totalAplicadoMulti = ivrsSeleccionados.reduce(
    (sum, i) => sum + (Number(i.monto_aplicar) || 0),
    0
  );
  // Monto que el cliente entregó (input arriba)
  const montoRecibido = parseFloat(formData.monto) || 0;
  // Saldo sin aplicar: positivo → va a saldo a favor del cliente.
  // Negativo → la suma a aplicar excede el monto recibido (no permitido).
  const saldoSinAplicarMulti = montoRecibido - totalAplicadoMulti;

  // Con un solo IVR seleccionado, el monto a aplicar es directo: lo recibido,
  // capeado al saldo del IVR (el excedente queda a favor). Evita el desglose
  // editable redundante (se mostraba el mismo monto dos veces).
  useEffect(() => {
    if (ivrsSeleccionados.length !== 1) return;
    const i = ivrsSeleccionados[0];
    const target = Math.min(montoRecibido, i.saldo_pendiente);
    if (Math.abs((i.monto_aplicar || 0) - target) > 0.001) {
      setIvrsSeleccionados([{ ...i, monto_aplicar: target }]);
    }
  }, [montoRecibido, ivrsSeleccionados]);

  // Auto-distribuir el monto recibido entre los IVRs seleccionados (en orden):
  // llena el saldo pendiente de cada uno hasta agotar el monto.
  const autoDistribuir = () => {
    let restante = montoRecibido;
    setIvrsSeleccionados((prev) =>
      prev.map((i) => {
        const aplicar = Math.min(i.saldo_pendiente, Math.max(0, restante));
        restante -= aplicar;
        return { ...i, monto_aplicar: aplicar };
      })
    );
  };

  // Búsqueda de clientes para el combobox del modo selector global.
  // Mostramos: label = fantasia o nombre, secondaryLabel = nombre real (si
  // fantasia ≠ nombre) + ID legacy + CUIT. El UUID short se sacó porque no
  // significa nada para el usuario humano.
  const searchClientes = async (term: string) => {
    if (!term || term.trim().length < 2) return [];
    try {
      const res = await fetch(`/api/clientes?search=${encodeURIComponent(term.trim())}&limit=20`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((c: any) => {
        const display = c.nombre_fantasia || c.nombre || "Sin nombre";
        const altName =
          c.nombre_fantasia && c.nombre && c.nombre_fantasia !== c.nombre
            ? c.nombre
            : "";
        const legacyId = c.identificador_unico ? `ID ${c.identificador_unico}` : "";
        const cuit = c.cuit ? `CUIT ${c.cuit}` : "";
        const secondary = [altName, legacyId, cuit].filter(Boolean).join(" · ");
        return {
          value: c.id,
          label: display,
          secondaryLabel: secondary || undefined,
        };
      });
    } catch {
      return [];
    }
  };

  const pagarSaldoCompleto = () => {
    // Si hay saldo a favor aplicado, pagar solo el restante
    const montoAPagar = usarSaldoFavor ? saldoPendienteDespuesSaldoFavor : saldoPendiente;
    if (montoAPagar > 0) {
      setFormData({ ...formData, monto: montoAPagar.toString() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogClasses.content, "sm:max-w-[800px] max-h-[90vh] flex flex-col p-0")}>
        <DialogHeader className={cn(dialogClasses.header, "px-6 pt-6 pb-4 border-b flex-shrink-0")}>
          <DialogTitle className={dialogClasses.title}>
            {pago ? "Editar Pago" : modoDeposito ? "Registrar Depósito a Cuenta" : "Registrar Pago"}
          </DialogTitle>
          <DialogDescription className={dialogClasses.description}>
            {pago
              ? "Modifica los datos del pago"
              : modoDeposito
              ? `Registra un depósito para ${clienteNombre || 'el cliente'}. El monto se agregará como saldo a favor.`
              : "Registra un nuevo pago recibido"}
          </DialogDescription>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 flex-1"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* Modo depósito - Info del cliente */}
              {modoDeposito && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-4 bg-emerald-50/50 dark:bg-emerald-950/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Depósito a cuenta {clienteNombre ? `para: ${clienteNombre}` : ''}
                        </span>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Este monto se agregará al saldo a favor del cliente y podrá aplicarse a futuros remitos.
                        </p>
                      </div>
                    </div>
                    {/* Botón para volver a elegir factura - solo si fue selección manual */}
                    {modoDepositoManual && (
                      <button
                        type="button"
                        onClick={() => setModoDepositoManual(false)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 underline"
                      >
                        Elegir factura
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Header de cliente — cuando el cliente ya viene resuelto por
                  contexto (filterByClienteId), mostrar arriba quién es. Antes
                  el dialog abría completamente vacío y no se sabía de quién
                  era el pago hasta elegir factura. */}
              {!modoDeposito && filterByClienteId && clienteNombre && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border text-sm">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{clienteNombre}</span>
                </div>
              )}

              {/* === MODO IVR MULTI ===
                  Monto recibido arriba + lista de IVRs pendientes con checkbox +
                  los seleccionados con monto editable + resumen. */}
              {modoIvrMulti && (
                <>
                  {/* Selector de cliente cuando se entra en frío desde la lista
                      global /dashboard/cobros-ivr (sin filterByClienteId). */}
                  {modoSelectorGlobal && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Cliente *</Label>
                      <SearchableCombobox
                        value={clienteIdLocal}
                        onValueChange={(id) => {
                          setClienteIdLocal(id);
                          setIvrsSeleccionados([]);
                        }}
                        searchFn={searchClientes}
                        placeholder="Buscar cliente por nombre o CUIT..."
                        emptyMessage="No se encontraron clientes"
                      />
                    </div>
                  )}

                  {/* Monto total recibido — input primario en este flow */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monto recibido del cliente *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.monto}
                      onChange={(e) =>
                        setFormData({ ...formData, monto: e.target.value })
                      }
                      className="h-11 text-base font-semibold"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cargá el monto que entregó el cliente. Después lo aplicás a uno o varios IVRs;
                      lo que sobre queda como saldo a favor.
                    </p>
                  </div>

                  {/* Lista de IVRs pendientes del cliente */}
                  {clienteFiltro && facturasIvr.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          IVRs pendientes ({facturasIvr.length})
                        </Label>
                        {ivrsSeleccionados.length > 0 && montoRecibido > 0 && (
                          <button
                            type="button"
                            onClick={autoDistribuir}
                            className="text-xs text-purple-600 hover:text-purple-700 underline"
                          >
                            Auto-distribuir
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {facturasIvr.map((ivr: any) => {
                          const yaSel = ivrsSeleccionados.some(
                            (s) => s.factura_id === ivr.id
                          );
                          return (
                            <button
                              key={ivr.id}
                              type="button"
                              onClick={() => toggleIvrSeleccion(ivr)}
                              className={cn(
                                "px-3 py-1.5 text-xs rounded-md border transition-colors",
                                yaSel
                                  ? "bg-purple-600 text-white border-purple-600"
                                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              )}
                            >
                              <span className="font-medium">
                                {ivr.nro_factura || ivr.numero || "IVR"}
                              </span>
                              <span className="ml-1.5 opacity-80">
                                {formatCurrency(ivr.saldo_pendiente ?? ivr.total)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {clienteFiltro && facturasIvr.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Este cliente no tiene IVRs pendientes. El cobro va a quedar como saldo a favor.
                    </p>
                  )}

                  {/* Desglose editable: solo con 2+ IVRs (donde hay que repartir).
                      Con uno solo, el monto recibido se aplica directo (capeado al
                      saldo) — el desglose duplicaba el mismo monto. */}
                  {ivrsSeleccionados.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Aplicar a estos IVRs ({ivrsSeleccionados.length})
                      </Label>
                      <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                        {ivrsSeleccionados.map((ivr) => (
                          <div
                            key={ivr.factura_id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{ivr.nro_factura}</p>
                              <p className="text-xs text-muted-foreground">
                                Saldo pendiente: {formatCurrency(ivr.saldo_pendiente)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={ivr.monto_aplicar}
                                onChange={(e) =>
                                  updateMontoAplicar(
                                    ivr.factura_id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-32 text-right text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  toggleIvrSeleccion({ id: ivr.factura_id })
                                }
                                className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                aria-label="Quitar"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resumen */}
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg text-sm">
                        <span>Total aplicado:</span>
                        <span className="font-semibold">{formatCurrency(totalAplicadoMulti)}</span>
                      </div>
                      {saldoSinAplicarMulti > 0.01 && (
                        <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Sobrante → saldo a favor:
                          </span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {formatCurrency(saldoSinAplicarMulti)}
                          </span>
                        </div>
                      )}
                      {saldoSinAplicarMulti < -0.01 && (
                        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Excede el monto recibido por:
                          </span>
                          <span className="font-semibold text-red-700 dark:text-red-400">
                            {formatCurrency(Math.abs(saldoSinAplicarMulti))}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Selector de cliente — solo en modo selector global single (entrada
                  desde la lista /dashboard/pagos, sin contexto previo).
                  En modoIvrMulti el selector ya se muestra arriba (no duplicar).
                  Hasta que el usuario elija un cliente, no cargamos facturas. */}
              {modoSelectorGlobal && !modoDeposito && !modoIvrMulti && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cliente *</Label>
                  <SearchableCombobox
                    value={clienteIdLocal}
                    onValueChange={(id) => {
                      setClienteIdLocal(id);
                      // Si había una factura seleccionada de otro cliente, limpiar.
                      setFormData((prev) => ({ ...prev, factura_id: "" }));
                    }}
                    searchFn={searchClientes}
                    placeholder="Buscar cliente por nombre o CUIT..."
                    emptyMessage="No se encontraron clientes"
                  />
                  <p className="text-xs text-muted-foreground">
                    Elegí el cliente para ver sus facturas pendientes, o usar &quot;Depósito a cuenta&quot; si tiene saldo en 0.
                  </p>
                </div>
              )}

              {/* Factura selector simple - solo en modo single (no multi, no depósito).
                  En modo selector global, mostrar recién cuando hay cliente elegido. */}
              {!modoDeposito && !modoIvrMulti && (!modoSelectorGlobal || clienteIdLocal) && (
                <div className="space-y-2">
                  <Label htmlFor="factura_id" className="text-sm font-medium">Factura *</Label>
                  <Select
                    value={formData.factura_id}
                    onValueChange={(value) => {
                      if (value === '__deposito_cuenta__') {
                        setModoDepositoManual(true);
                        setFormData({ ...formData, factura_id: '' });
                      } else {
                        setFormData({ ...formData, factura_id: value });
                      }
                    }}
                    disabled={!!facturaId || !!pago}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Seleccionar factura" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Opción de depósito a cuenta - cuando hay un cliente
                          resuelto (prop o seleccionado en el combobox local). */}
                      {clienteFiltro && (
                        <SelectItem value="__deposito_cuenta__" className="text-sm text-emerald-600 font-medium">
                          <span className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Depósito a cuenta (saldo a favor)
                          </span>
                        </SelectItem>
                      )}
                      {facturas.map((factura) => (
                        <SelectItem key={factura.id} value={factura.id} className="text-sm">
                          {factura.clientes?.nombre_fantasia || factura.clientes?.nombre}
                          {' - '}
                          {factura.tipo_factura}
                          {' - '}
                          {formatCurrency(factura.saldo_pendiente ?? factura.total)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Info de factura seleccionada (no en modo multi: ahí ya hay UI propia) */}
              {facturaSeleccionada && !modoIvrMulti && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Información de la Factura</span>
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-2 pl-6 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(facturaSeleccionada.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Saldo pendiente:</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {formatCurrency(saldoPendiente)}
                      </span>
                    </div>
                    {facturaSeleccionada.total_pagado !== undefined && facturaSeleccionada.total_pagado > 0 && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">Ya pagado:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(facturaSeleccionada.total_pagado)}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Saldo a favor del cliente */}
              {facturaSeleccionada && saldoFavorDisponible > 0 && !pago && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-green-200 dark:border-green-800/50 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Saldo a favor disponible: {formatCurrency(saldoFavorDisponible)}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 pl-6 mt-1">
                    Este cliente tiene saldo de pagos anteriores que puede aplicar
                  </p>

                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="usar-saldo-favor"
                        checked={usarSaldoFavor}
                        onCheckedChange={(checked) => {
                          const on = checked === true;
                          setUsarSaldoFavor(on);
                          // Al aplicar saldo a favor, el monto en efectivo pasa a ser
                          // lo que FALTA después del crédito (0 si ya cubre todo). Así
                          // no se suma el saldo a favor + el monto total y se duplica.
                          if (on) {
                            const aplicable = Math.min(saldoFavorDisponible, saldoPendiente);
                            const restante = Math.max(0, saldoPendiente - aplicable);
                            setFormData((prev) => ({ ...prev, monto: restante > 0 ? String(restante) : '' }));
                          }
                        }}
                      />
                      <label
                        htmlFor="usar-saldo-favor"
                        className="text-sm font-medium text-green-700 dark:text-green-300 cursor-pointer"
                      >
                        Aplicar saldo a favor a este cobro
                      </label>
                    </div>

                    {usarSaldoFavor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-2 rounded bg-green-100 dark:bg-green-900/40"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700 dark:text-green-300">Saldo pendiente:</span>
                          <span className="font-medium">{formatCurrency(saldoPendiente)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700 dark:text-green-300">Saldo a favor aplicado:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(saldoFavorAplicable)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-green-200 dark:border-green-700">
                          <span className="text-green-800 dark:text-green-200">Restante a pagar:</span>
                          <span>{formatCurrency(saldoPendienteDespuesSaldoFavor)}</span>
                        </div>
                        {saldoFavorDisponible > saldoFavorAplicable && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Saldo que quedará después: {formatCurrency(saldoFavorDisponible - saldoFavorAplicable)}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Monto (oculto en modo IVR multi — ahí el input vive arriba) */}
              {!modoIvrMulti && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="monto" className="text-sm font-medium">Monto *</Label>
                  {saldoPendiente > 0 && !pago && (
                    <button
                      type="button"
                      onClick={pagarSaldoCompleto}
                      className="h-8 px-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Pagar saldo completo</span>
                    </button>
                  )}
                </div>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.monto}
                  onChange={(e) => {
                    // Firefox deja escribir letras en type=number; sanitizamos a
                    // solo dígitos + un punto decimal.
                    const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                    setFormData({ ...formData, monto: v })
                  }}
                  required
                  className="h-10 text-sm"
                />
                {/* Solo mostrar advertencia de excedente si hay factura seleccionada (no en modo depósito) */}
                {!modoDeposito && excedeSaldo && saldoAFavor > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          El pago excede el saldo pendiente
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Se generará un <strong>saldo a favor</strong> de {formatCurrency(saldoAFavor)} para este cliente.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              )}

              {/* Fecha y Método - 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_pago" className="text-sm font-medium">Fecha de Pago *</Label>
                  <Input
                    id="fecha_pago"
                    type="date"
                    value={formData.fecha_pago}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_pago: e.target.value })
                    }
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metodo_pago" className="text-sm font-medium">Método de Pago</Label>
                  <Select
                    value={formData.metodo_pago}
                    onValueChange={(value) =>
                      setFormData({ ...formData, metodo_pago: value })
                    }
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo" className="text-sm">Efectivo</SelectItem>
                      <SelectItem value="transferencia" className="text-sm">Transferencia</SelectItem>
                      <SelectItem value="cheque" className="text-sm">Cheque</SelectItem>
                      <SelectItem value="debito" className="text-sm">Débito</SelectItem>
                      <SelectItem value="credito" className="text-sm">Crédito</SelectItem>
                      <SelectItem value="mercadopago_joaquin" className="text-sm">MercadoPago - Joaquín</SelectItem>
                      <SelectItem value="mercadopago_karen" className="text-sm">MercadoPago - Karen</SelectItem>
                      <SelectItem value="brubank_nahuel" className="text-sm">Brubank - Nahuel</SelectItem>
                      <SelectItem value="tercero" className="text-sm">A tercero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selector de cheque en cartera — aparece cuando método es "cheque".
                  Permite vincular un cheque existente al pago. El backend pone
                  cheques.pago_id y opcionalmente avanza el estado del cheque. */}
              <AnimatePresence>
                {formData.metodo_pago === "cheque" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Wallet className="h-4 w-4" />
                        Cheque en cartera (opcional)
                      </Label>
                      {chequesDisponibles.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          No hay cheques en cartera vinculables. Se puede crear el pago
                          sin asociar cheque, o ir a{" "}
                          <a href="/dashboard/cheques" className="text-blue-600 underline">
                            Cheques
                          </a>{" "}
                          y registrarlo primero.
                        </p>
                      ) : (
                        <>
                          <Select
                            value={chequeSeleccionadoId || "none"}
                            onValueChange={(v) => {
                              setChequeSeleccionadoId(v === "none" ? "" : v);
                              // Auto-llenar el monto del pago con el del cheque si el
                              // usuario no tipeó nada.
                              if (v !== "none" && !formData.monto) {
                                const ch = chequesDisponibles.find((c) => c.id === v);
                                if (ch) {
                                  setFormData((f) => ({ ...f, monto: String(ch.monto) }));
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Sin asociar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-sm">
                                Sin asociar
                              </SelectItem>
                              {chequesDisponibles.map((ch) => {
                                const monto = Number(ch.monto);
                                const montoStr = new Intl.NumberFormat("es-AR").format(monto);
                                return (
                                  <SelectItem key={ch.id} value={ch.id} className="text-sm">
                                    #{ch.numero} · ${montoStr}
                                    {ch.banco ? ` · ${ch.banco}` : ""}
                                    {ch.fecha_pago ? ` · ${ch.fecha_pago.slice(0, 10)}` : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground">
                            Al guardar, el cheque queda vinculado al pago y avanza
                            automáticamente a &quot;depositado&quot; (o lo que elijas abajo).
                          </p>

                          {chequeSeleccionadoId && (
                            <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                              <Label className="text-xs text-muted-foreground shrink-0">
                                Avanzar a:
                              </Label>
                              <Select
                                value={avanzarChequeA}
                                onValueChange={(v) =>
                                  setAvanzarChequeA(v as "depositado" | "cobrado")
                                }
                              >
                                <SelectTrigger className="h-8 text-xs flex-1 max-w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="depositado" className="text-xs">
                                    Depositado (pendiente de acreditar)
                                  </SelectItem>
                                  <SelectItem value="cobrado" className="text-xs">
                                    Cobrado (ya acreditado)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pago Tercero - aparece cuando método es "otro" */}
              <AnimatePresence>
                {formData.metodo_pago === "tercero" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="pago_tercero" className="text-sm font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Pago de tercero
                      </Label>
                      <Input
                        id="pago_tercero"
                        type="text"
                        placeholder="Nombre de quien pagó (opcional, solo referencia)"
                        value={pagoTerceroNombre}
                        onChange={(e) => setPagoTerceroNombre(e.target.value)}
                        className="h-10 text-sm"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Solo para referencia, no se guarda en el sistema
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comentarios */}
              <div className="space-y-2">
                <Label htmlFor="comentarios" className="text-sm font-medium">Comentarios</Label>
                <Textarea
                  id="comentarios"
                  placeholder="Agregar comentarios (opcional)"
                  value={formData.comentarios}
                  onChange={(e) =>
                    setFormData({ ...formData, comentarios: e.target.value })
                  }
                  rows={3}
                  className="text-sm resize-none min-h-[100px]"
                />
              </div>

            </div>
          </div>

          <DialogFooter className={cn(dialogClasses.footer, "px-6 py-4 border-t flex-shrink-0")}>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                htmlType="button"
                type="default"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 sm:flex-initial h-10"
              >
                Cancelar
              </Button>
              <Button
                htmlType="submit"
                type="primary"
                disabled={loading}
                loading={loading}
                onClick={() => { enviarTrasGuardarRef.current = false; }}
                className="flex-1 sm:flex-initial h-10"
              >
                {pago ? "Guardar Cambios" : modoDeposito ? "Registrar Depósito" : "Registrar Pago"}
              </Button>
              {/* Botón adicional: Registrar y enviar — solo IVR, alta nueva */}
              {esContextoIvr && !pago && !modoDeposito && (
                <Button
                  htmlType="submit"
                  type="primary"
                  disabled={loading}
                  loading={loading}
                  onClick={() => { enviarTrasGuardarRef.current = true; }}
                  className="flex-1 sm:flex-initial h-10 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 gap-2"
                  icon={<Send className="h-4 w-4" />}
                >
                  Registrar y enviar
                </Button>
              )}
            </div>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
