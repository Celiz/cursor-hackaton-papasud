"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Plus,
  CreditCard,
  Receipt,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
  Clock,
  Building2,
  Wallet,
  FileSpreadsheet,
  ChevronDown,
  FileDown,
  Mail,
  Link as LinkIcon,
} from "lucide-react";
import { CuentaCorrienteIvr, MovimientoIvr, Factura, Pago, Cliente } from "@/lib/types";
import { ClienteDetailSheet } from "@/components/core-ui/ClienteDetailSheet";
import { toast } from "sonner";
import { sheetClasses } from "@/lib/design-system";
import { cn, formatIvrNumber } from "@/lib/utils";
import useSWR from "swr";
import * as XLSX from "xlsx";
import { generateCuentaCorrienteIvrPDF } from "@/lib/pdf-generator";
import { useSession } from "@/lib/hooks/use-session";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Import dialogs
import { IvrFormDialog } from "@/components/core-ui/IvrFormDialog";
import { CobroIvrDialog } from "@/components/core-ui/CobroIvrDialog";
import { IvrDetailSheet } from "@/components/core-ui/IvrDetailSheet";
import { ImputarSaldoFavorDialog } from "@/components/core-ui/ImputarSaldoFavorDialog";
import { EmailCuentaIvrMenu } from "@/components/core-ui/EmailCuentaIvrMenu";
import { SendEmailDialog } from "@/components/core-ui/SendEmailDialog";
import { formatCurrency } from "@/lib/format-currency";

interface CuentaCorrienteIvrDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: CuentaCorrienteIvr;
  onRefresh?: () => void;
}

// fecha_emision / fecha_pago / mov.fecha son columnas DATE: el driver las
// serializa como medianoche UTC, así que hay que formatearlas en UTC para no
// correrlas un día hacia atrás en husos negativos (Argentina, UTC-3).
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

const formatDateLong = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Formato dd/mm/yyyy para exportación Excel
const formatDateExcel = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Resumen inline en cada row del listado de IVRs: descripcion de items + ultimo
// comentario, para evitar tener que abrir el detalle por cada uno.
function IvrRowSummary({ ivr }: { ivr: Factura }) {
  const itemsRaw = (ivr as any).facturas_items;
  const items: Array<{ descripcion?: string; cantidad?: number }> = Array.isArray(itemsRaw)
    ? itemsRaw
    : Array.isArray((ivr as any).detalles?.insumos)
      ? (ivr as any).detalles.insumos
      : [];

  const descripciones = items
    .map((i) => i.descripcion || (i as any).nombre || '')
    .filter(Boolean);

  const itemsLabel = descripciones.length === 0
    ? null
    : descripciones.length === 1
      ? descripciones[0]
      : `${descripciones.length} ítems: ${descripciones.slice(0, 3).join(', ')}${descripciones.length > 3 ? '…' : ''}`;

  const comentariosArr: any[] = Array.isArray((ivr as any).comentarios) ? (ivr as any).comentarios : [];
  const ultimoComentario = comentariosArr.length > 0
    ? (() => {
        const c = comentariosArr[comentariosArr.length - 1];
        return typeof c === 'string' ? c : (c?.texto || '');
      })()
    : '';

  if (!itemsLabel && !ultimoComentario) return null;

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-800 space-y-1">
      {itemsLabel && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
          <span className="font-medium text-gray-500">Detalle:</span> {itemsLabel}
        </p>
      )}
      {ultimoComentario && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300 line-clamp-2 italic">
          <span className="font-medium not-italic">Nota:</span> “{ultimoComentario}”
        </p>
      )}
    </div>
  );
}

export function CuentaCorrienteIvrDetailSheet({
  open,
  onOpenChange,
  cuenta,
  onRefresh,
}: CuentaCorrienteIvrDetailSheetProps) {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [movimientos, setMovimientos] = useState<MovimientoIvr[]>([]);
  const [ivrs, setIvrs] = useState<Factura[]>([]);
  const [cobrosSueltos, setCobrosSueltos] = useState<any[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingIvrs, setLoadingIvrs] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string>("all");

  // Dialog states
  const [ivrFormOpen, setIvrFormOpen] = useState(false);
  // Diálogo unificado de cobro IVR (flujo nuevo). Preselección opcional de remito.
  const [cobroIvrOpen, setCobroIvrOpen] = useState(false);
  const [cobroIvrPreselect, setCobroIvrPreselect] = useState<string | undefined>(undefined);
  const [cobroIvrPresetSaldo, setCobroIvrPresetSaldo] = useState(false);
  // Editar un cobro existente (abre el mismo diálogo en modo PATCH).
  const [editCobroOpen, setEditCobroOpen] = useState(false);
  const [editingCobro, setEditingCobro] = useState<any | null>(null);
  // Enviar cobro por email — abre dialog con destinatario / subject / body editables
  const [sendCobroOpen, setSendCobroOpen] = useState(false);
  const [cobroAEnviar, setCobroAEnviar] = useState<Pago | null>(null);

  const handleEnviarCobro = (cobro: Pago) => {
    setCobroAEnviar(cobro);
    setSendCobroOpen(true);
  };

  // IVR Detail Sheet state
  const [ivrDetailOpen, setIvrDetailOpen] = useState(false);
  const [selectedIvrForDetail, setSelectedIvrForDetail] = useState<Factura | null>(null);
  const [ivrDetailDefaultTab, setIvrDetailDefaultTab] = useState<string | undefined>(undefined);

  // IVR Edit state
  const [editingIvr, setEditingIvr] = useState<Factura | null>(null);
  const [ivrEditFormOpen, setIvrEditFormOpen] = useState(false);

  // Imputar saldo a favor state
  const [imputarDialogOpen, setImputarDialogOpen] = useState(false);
  const [showImputarFifoConfirm, setShowImputarFifoConfirm] = useState(false);
  const [autoImputarLoading, setAutoImputarLoading] = useState(false);

  // Fetch cliente para obtener saldo_a_favor
  const { data: clienteData, mutate: mutateCliente } = useSWR<Cliente>(
    open && cuenta?.cliente_id ? `/api/clientes/${cuenta.cliente_id}` : null,
    fetcher
  );
  // Abrir la ficha del cliente inline (al tocar el nombre en el header).
  const [clienteSheetOpen, setClienteSheetOpen] = useState(false);

  // Saldo a favor del cliente (para IVR usa saldo_a_favor_ivr)
  const saldoFavorCliente = clienteData?.saldo_a_favor_ivr || 0;

  // Fetch movimientos IVR
  useEffect(() => {
    if (open && cuenta) {
      setLoadingMovimientos(true);
      fetch(`/api/cuentas-corrientes-ivr/movimientos?cliente_id=${cuenta.cliente_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMovimientos(data);
          }
        })
        .catch((err) => console.error("Error loading movimientos IVR:", err))
        .finally(() => setLoadingMovimientos(false));
    }
  }, [open, cuenta]);

  // Fetch IVRs del cliente
  useEffect(() => {
    if (open && cuenta) {
      setLoadingIvrs(true);
      fetch(`/api/ivr?cliente_id=${cuenta.cliente_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setIvrs(data);
          }
        })
        .catch((err) => console.error("Error loading IVRs:", err))
        .finally(() => setLoadingIvrs(false));

      // Fetch cobros sueltos (sin IVR asociado)
      fetch(`/api/cobros-ivr/sueltos?cliente_id=${cuenta.cliente_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCobrosSueltos(data);
        })
        .catch(() => setCobrosSueltos([]));
    }
  }, [open, cuenta]);

  // Refetch data
  const refetchData = async () => {
    if (cuenta) {
      // Refetch movimientos
      const movRes = await fetch(`/api/cuentas-corrientes-ivr/movimientos?cliente_id=${cuenta.cliente_id}`);
      const movData = await movRes.json();
      if (Array.isArray(movData)) setMovimientos(movData);

      // Refetch IVRs
      const ivrRes = await fetch(`/api/ivr?cliente_id=${cuenta.cliente_id}`);
      const ivrData = await ivrRes.json();
      if (Array.isArray(ivrData)) {
        setIvrs(ivrData);
        // Actualizar el IVR seleccionado si está abierto el detail sheet
        if (selectedIvrForDetail) {
          const updatedIvr = ivrData.find((ivr: Factura) => ivr.id === selectedIvrForDetail.id);
          if (updatedIvr) {
            setSelectedIvrForDetail(updatedIvr);
          }
        }
      }

      // Refetch cobros sueltos
      const sueltosRes = await fetch(`/api/cobros-ivr/sueltos?cliente_id=${cuenta.cliente_id}`);
      const sueltosData = await sueltosRes.json();
      if (Array.isArray(sueltosData)) setCobrosSueltos(sueltosData);

      // Notify parent
      if (onRefresh) onRefresh();
    }
  };

  // IVRs pendientes, neteando el crédito del cliente (notas de crédito + saldo
  // a favor) FIFO contra las facturas más viejas primero — igual que la vista
  // vista_cuentas_corrientes_ivr (migración 1007). Sin esto, la lista mostraba
  // facturas en bruto mientras la card "Remitos Pendientes" ya las neteaba.
  const ivrsPendientes = useMemo(() => {
    const credito =
      (Number(cuenta?.saldo_a_favor_ivr) || 0) +
      (Number(cuenta?.total_notas_credito) || 0);

    const pendientesRaw = ivrs
      .filter(f => f.estado === 'pendiente' || f.estado === 'parcial')
      .slice()
      .sort((a, b) => {
        const va = String((a as any).fecha_vencimiento || a.fecha_emision || '');
        const vb = String((b as any).fecha_vencimiento || b.fecha_emision || '');
        return va.localeCompare(vb);
      });

    if (credito <= 0) return pendientesRaw;

    let restante = credito;
    const result: Factura[] = [];
    for (const f of pendientesRaw) {
      const saldo = Number(f.saldo_pendiente ?? f.total) || 0;
      const consumido = Math.min(restante, saldo);
      restante -= consumido;
      const saldoEfectivo = saldo - consumido;
      if (saldoEfectivo > 0.005) {
        result.push({ ...f, saldo_pendiente: saldoEfectivo });
      }
    }
    return result;
  }, [ivrs, cuenta?.saldo_a_favor_ivr, cuenta?.total_notas_credito]);

  // Pendientes BRUTOS (por estado, sin netear el crédito flotante). Se usa para
  // habilitar la imputación de saldo a favor: si el crédito netea visualmente el
  // pendiente, `ivrsPendientes` queda vacío y escondía el botón de imputar, dejando
  // el cobro "sin asociar" para siempre. La imputación debe verse mientras haya un
  // IVR pendiente real + saldo a favor.
  const ivrsPendientesBrutos = useMemo(
    () => ivrs.filter(
      f => (f.estado === 'pendiente' || f.estado === 'parcial') &&
           (Number(f.saldo_pendiente ?? f.total) || 0) > 0
    ),
    [ivrs]
  );

  // Pendiente NETO por IVR (id -> saldo tras netear saldo a favor + NC, FIFO).
  // `ivrsPendientes` ya hace ese cálculo; lo indexamos para mostrar el pendiente
  // real (no el bruto) en la lista "Remitos del Cliente", que itera `ivrs` crudo.
  const netoPendientePorIvr = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of ivrsPendientes) m.set(f.id, Number(f.saldo_pendiente) || 0);
    return m;
  }, [ivrsPendientes]);

  // Números de las notas de crédito (desde los movimientos ya cargados), para
  // mostrarlos en la card de NC del resumen. La descripción ya viene "NC-XXXX".
  const numerosNC = useMemo(
    () =>
      movimientos
        .filter((m) => m.tipo_movimiento === 'nota_credito')
        .map((m) => m.descripcion)
        .filter(Boolean),
    [movimientos]
  );

  // Get all cobros from IVRs + sueltos
  const todosCobros = useMemo(() => {
    const cobros: Array<Pago & { ivr?: Factura }> = [];
    ivrs.forEach(ivr => {
      // API returns 'cobros', not 'pagos'
      const ivrCobros = (ivr as any).cobros || ivr.pagos || [];
      if (Array.isArray(ivrCobros)) {
        ivrCobros.forEach((p: any) => cobros.push({ ...p, ivr }));
      }
    });
    // Add cobros sueltos (without IVR)
    cobrosSueltos.forEach((c: any) => cobros.push({ ...c, ivr: undefined }));
    return cobros.sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
  }, [ivrs, cobrosSueltos]);

  const sendCobroDefaults = useMemo(() => {
    if (!cobroAEnviar) return { to: [] as string[], subject: '', body: '', filename: '' };
    const rawEmail = clienteData?.email;
    const emails = Array.isArray(rawEmail)
      ? rawEmail.filter((e): e is string => Boolean(e))
      : (typeof rawEmail === 'string' && rawEmail ? [rawEmail] : []);
    const nombre = cuenta?.nombre_fantasia || cuenta?.nombre || '';
    const numero = (cobroAEnviar as any).nro_pago || cobroAEnviar.id?.slice(0, 8) || '';
    const monto = formatCurrency(cobroAEnviar.monto || 0);
    return {
      to: emails,
      subject: `Comprobante de cobro ${numero} — Uno Electromedicina`,
      body: `Estimado/a ${nombre},\n\nAdjuntamos el comprobante de cobro por ${monto}.\n\nMuchas gracias.\n\n— Uno Electromedicina`,
      filename: `cobro-${numero}.pdf`,
    };
  }, [cobroAEnviar, clienteData?.email, cuenta?.nombre_fantasia, cuenta?.nombre]);

  if (!cuenta) return null;

  const clienteNombre = cuenta.nombre_fantasia || cuenta.nombre;

  // Obtener emails del cliente
  const clienteEmails: string[] = useMemo(() => {
    const email = clienteData?.email;
    if (!email) return [];
    if (Array.isArray(email)) return email.filter(Boolean);
    return [email].filter(Boolean);
  }, [clienteData?.email]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "ivr":
        return <ArrowUpCircle className="h-4 w-4 text-gray-600" />;
      case "cobro":
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case "nota_credito":
        return <ArrowDownCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "ivr":
        return "secondary";
      case "cobro":
        return "default";
      case "nota_credito":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "ivr":
        return "Remito";
      case "cobro":
        return "Cobro";
      case "nota_credito":
        return "Nota de Crédito";
      default:
        return tipo;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case "pagada":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Cobrado</Badge>;
      case "pendiente":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const handlePrint = async () => {
    try {
      let movimientosFiltrados = movimientos;
      let dias: number | undefined;

      if (selectedDays !== "all") {
        dias = parseInt(selectedDays);
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - dias);
        movimientosFiltrados = movimientos.filter(
          (mov) => new Date(mov.fecha) >= fechaLimite
        );
      }

      const doc = await generateCuentaCorrienteIvrPDF(cuenta, movimientosFiltrados, dias, orgId);
      doc.save(
        `cuenta-corriente-ivr-${cuenta.identificador_unico || cuenta.cliente_id.slice(0, 8)}.pdf`
      );
      toast.success("PDF generado exitosamente");
      setPrintDialogOpen(false);
    } catch (error) {
      toast.error("Error al generar PDF");
      console.error(error);
    }
  };

  const handleExportFullStatementExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const resumenData = [
        ["Cliente", cuenta.nombre_fantasia || cuenta.nombre],
        ["ID", cuenta.identificador_unico || "-"],
        ["CUIT", cuenta.cuit || "-"],
        ["Total Remitido", cuenta.total_remitido],
        ["Total Cobrado", cuenta.total_cobrado],
        ["Saldo Actual", cuenta.saldo_actual],
        ["Cant. Remitos", cuenta.cantidad_ivr],
        ["Cant. Cobros", cuenta.cantidad_cobros],
        ["Generado", new Date().toLocaleString("es-AR")],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet([["Concepto", "Valor"], ...resumenData]);
      wsResumen["!cols"] = [{ wch: 25 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const movData = movimientos.map((mov) => ({
        Fecha: formatDateExcel(mov.fecha),
        Tipo: mov.tipo_movimiento === "ivr" ? "Remito" : "Cobro",
        Descripción: mov.descripcion,
        Débito: mov.debito > 0 ? mov.debito : "",
        Crédito: mov.credito > 0 ? mov.credito : "",
        "Saldo Acumulado": mov.saldo_acumulado,
        Estado: mov.estado || "",
      }));
      const wsMov = XLSX.utils.json_to_sheet(movData);
      wsMov["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMov, "Movimientos");

      const filename = `CuentaCorriente_IVR_${(cuenta.nombre_fantasia || cuenta.nombre).replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Excel exportado correctamente");
    } catch (error) {
      toast.error("Error al exportar Excel");
      console.error(error);
    }
  };

  const handleDeleteCobro = async (cobroId: string) => {
    if (!confirm('¿Eliminar este cobro?')) return;
    try {
      const res = await fetch(`/api/cobros?id=${cobroId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al eliminar');
      }
      toast.success('Cobro eliminado');
      refetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar cobro');
    }
  };

  const handleAutoImputarFifo = async () => {
    setShowImputarFifoConfirm(false);
    setAutoImputarLoading(true);
    try {
      const res = await fetch('/api/cobros/auto-imputar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cuenta.cliente_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al auto-imputar');
      toast.success(
        `Imputado ${formatCurrency(data.total_imputado)} a ${data.cobros_creados} remito(s)${data.saldo_restante > 0 ? ` — Saldo restante: ${formatCurrency(data.saldo_restante)}` : ''}`
      );
      refetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al auto-imputar');
    } finally {
      setAutoImputarLoading(false);
    }
  };

  const handleExportMovimientosExcel = () => {
    if (movimientos.length === 0) {
      toast.info('No hay movimientos para exportar');
      return;
    }

    // Formato tipo cuenta corriente: Fecha, Descripción, Debe, Haber, Saldo (con fórmula)
    // Orden invertido: más antiguo primero
    const movimientosOrdenados = [...movimientos].reverse();

    // Crear workbook y worksheet manualmente para mejor control
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {};

    // Header row
    ws['A1'] = { t: 's', v: 'Fecha' };
    ws['B1'] = { t: 's', v: 'Descripción' };
    ws['C1'] = { t: 's', v: 'Debe' };
    ws['D1'] = { t: 's', v: 'Haber' };
    ws['E1'] = { t: 's', v: 'Saldo' };

    // Data rows con fórmulas para saldo
    movimientosOrdenados.forEach((mov, index) => {
      const rowNum = index + 2; // +2 porque fila 1 es header
      // Convertir explícitamente a número
      const debe = parseFloat(String(mov.debito)) || 0;
      const haber = parseFloat(String(mov.credito)) || 0;

      // Fecha
      ws[`A${rowNum}`] = { t: 's', v: formatDateExcel(mov.fecha) };
      // Descripción
      ws[`B${rowNum}`] = { t: 's', v: mov.descripcion };
      // Debe - siempre número
      ws[`C${rowNum}`] = { t: 'n', v: debe, z: '"$"#,##0.00' };
      // Haber - siempre número
      ws[`D${rowNum}`] = { t: 'n', v: haber, z: '"$"#,##0.00' };
      // Saldo con fórmula
      const saldoFormula = rowNum === 2
        ? `C${rowNum}-D${rowNum}`
        : `E${rowNum - 1}+C${rowNum}-D${rowNum}`;
      ws[`E${rowNum}`] = { t: 'n', f: saldoFormula, z: '"$"#,##0.00' };
    });

    // Fila vacía separadora
    const separadorRow = movimientosOrdenados.length + 2;
    ws[`A${separadorRow}`] = { t: 's', v: '' };

    // Fila de totales
    const totalesRow = separadorRow + 1;
    ws[`A${totalesRow}`] = { t: 's', v: '' };
    ws[`B${totalesRow}`] = { t: 's', v: 'TOTALES' };
    ws[`C${totalesRow}`] = { t: 'n', f: `SUM(C2:C${movimientosOrdenados.length + 1})`, z: '"$"#,##0.00' };
    ws[`D${totalesRow}`] = { t: 'n', f: `SUM(D2:D${movimientosOrdenados.length + 1})`, z: '"$"#,##0.00' };
    ws[`E${totalesRow}`] = { t: 's', v: '' };

    // Fila de saldo al día (fecha actual)
    const saldoRow = totalesRow + 1;
    const fechaHoy = new Date();
    const fechaFormateada = `${fechaHoy.getDate().toString().padStart(2, '0')}/${(fechaHoy.getMonth() + 1).toString().padStart(2, '0')}/${fechaHoy.getFullYear()}`;
    ws[`A${saldoRow}`] = { t: 's', v: fechaFormateada };
    ws[`B${saldoRow}`] = { t: 's', v: 'SALDO AL DÍA' };
    ws[`C${saldoRow}`] = { t: 's', v: '' };
    ws[`D${saldoRow}`] = { t: 's', v: '' };
    // Saldo final = último saldo calculado
    ws[`E${saldoRow}`] = { t: 'n', f: `E${movimientosOrdenados.length + 1}`, z: '"$"#,##0.00' };

    // Establecer el rango del worksheet
    const lastRow = saldoRow;
    ws['!ref'] = `A1:E${lastRow}`;

    // Formato de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 40 },  // Descripción
      { wch: 15 },  // Debe
      { wch: 15 },  // Haber
      { wch: 15 },  // Saldo
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Cuenta Corriente');

    const filename = `Cuenta_Corriente_IVR_${clienteNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Cuenta corriente exportada');
  };

  const handleExportRemitosExcel = () => {
    if (ivrs.length === 0) {
      toast.info('No hay remitos para exportar');
      return;
    }

    // Orden invertido: más antiguo primero
    const data = [...ivrs].reverse().map(ivr => ({
      'Fecha': formatDateExcel(ivr.fecha_emision),
      'Nro': formatIvrNumber(ivr.nro_factura),
      'Total': formatCurrency(ivr.total),
      'Pagado': formatCurrency((ivr.total || 0) - (ivr.saldo_pendiente || 0)),
      'Pendiente': formatCurrency(ivr.saldo_pendiente || 0),
      'Estado': ivr.estado,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Remitos');

    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    ];

    const filename = `Remitos_IVR_${clienteNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Remitos exportados correctamente');
  };

  const handleExportCobrosExcel = () => {
    if (todosCobros.length === 0) {
      toast.info('No hay cobros para exportar');
      return;
    }

    // Orden invertido: más antiguo primero
    const data = [...todosCobros].reverse().map(cobro => ({
      'Fecha': formatDateExcel(cobro.fecha_pago),
      'Monto': formatCurrency(cobro.monto),
      'Método': cobro.metodo_pago || 'Sin especificar',
      'Comentarios': cobro.comentarios?.[0]?.texto || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobros');

    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 40 },
    ];

    const filename = `Cobros_IVR_${clienteNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Cobros exportados correctamente');
  };

  // Estado para menú de exportar Excel
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  // Click outside handler para Excel menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setExcelMenuOpen(false);
      }
    };

    if (excelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [excelMenuOpen]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] max-h-[100dvh] overflow-hidden p-0 flex flex-col bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-violet-950/20"
        side="bottom"
      >
        {/* Header compacto - responsive para pantallas pequeñas */}
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 sm:pr-14 border-b border-gray-200/50 dark:border-gray-800/30 shrink-0 bg-gradient-to-r from-gray-50/30 to-transparent dark:from-gray-950/10 dark:to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center sm:items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Icon con acento - más pequeño en mobile */}
              <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200/30 dark:border-gray-800/30 shadow-sm shadow-gray-500/10 shrink-0">
                <Building2 className="h-5 w-5 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle
                  onClick={() => setClienteSheetOpen(true)}
                  title="Ver ficha del cliente"
                  className="text-base sm:text-2xl bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate cursor-pointer hover:underline decoration-dotted underline-offset-4"
                >
                  {cuenta.nombre || cuenta.nombre_fantasia}
                </SheetTitle>
                {cuenta.nombre_fantasia && cuenta.nombre && cuenta.nombre_fantasia !== cuenta.nombre && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    {cuenta.nombre_fantasia}
                  </p>
                )}
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] sm:text-xs text-gray-500 border-gray-300 px-1 sm:px-2">
                    <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    IVR - Interno
                  </Badge>
                  {(cuenta.identificador_unico || cuenta.identificador_legacy) && (
                    <span className="text-[10px] sm:text-xs font-mono text-gray-600 dark:text-gray-400">
                      #{cuenta.identificador_unico}
                      {cuenta.identificador_legacy && (
                        <span className="text-muted-foreground ml-1 hidden sm:inline">({cuenta.identificador_legacy})</span>
                      )}
                    </span>
                  )}
                  <Badge
                    variant={cuenta.saldo_actual > 0 ? "destructive" : cuenta.saldo_actual < 0 ? "default" : "outline"}
                    className={cn(
                      "text-[10px] sm:text-xs px-1 sm:px-2",
                      cuenta.saldo_actual > 0 && "bg-orange-100 text-orange-700 border-orange-200",
                      cuenta.saldo_actual < 0 && "bg-green-100 text-green-700 border-green-200",
                      cuenta.saldo_actual === 0 && "bg-gray-100 text-gray-700"
                    )}
                  >
                    {cuenta.saldo_actual > 0 ? "Pendiente" : cuenta.saldo_actual < 0 ? "A Favor" : "Al Día"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Botones de acción compactos - scroll horizontal en mobile */}
            <div className="flex gap-1 sm:gap-2 flex-shrink-0 overflow-x-auto overflow-y-visible pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
              <Button
                type="primary"
                size="tiny"
                onClick={() => setIvrFormOpen(true)}
                icon={<Plus />}
                className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
              >
                Remito
              </Button>
              <Button
                type="default"
                size="tiny"
                onClick={() => setCobroIvrOpen(true)}
                icon={<CreditCard className="text-green-600" />}
                className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {ivrsPendientesBrutos.length > 0 ? 'Cobro' : 'Depósito'}
              </Button>
              {/* Imputar saldo a favor a remitos pendientes. Solo el FIFO automático:
                  usa /api/cobros/auto-imputar, que es el endpoint correcto para IVR
                  (crea cobros + cobros_aplicaciones y descuenta saldo_a_favor_ivr).
                  El "Imputar" manual se quitó de la hoja IVR porque posteaba a
                  /api/pagos/imputar-saldo (cuenta corriente LEGAL: tabla pagos +
                  saldo_a_favor), incorrecto para IVR. Se gatea sobre los pendientes
                  BRUTOS (por estado) para que aparezca aunque el crédito los netee. */}
              {saldoFavorCliente > 0 && ivrsPendientesBrutos.length > 0 && (
                <Button
                  type="default"
                  size="tiny"
                  onClick={() => setShowImputarFifoConfirm(true)}
                  loading={autoImputarLoading}
                  disabled={autoImputarLoading}
                  icon={<Wallet className="text-blue-600" />}
                  className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  Imputar saldo a favor
                </Button>
              )}
              <EmailCuentaIvrMenu
                emails={clienteEmails}
                clienteId={cuenta.cliente_id}
                clienteNombre={clienteNombre}
                cantidadPendientes={cuenta.cantidad_pendientes}
                totalPendiente={cuenta.total_pendiente}
              />
              {/* Excel Menu - usando DropdownMenu con Portal */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={loadingMovimientos && loadingIvrs}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
                      "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                    title="Exportar a Excel"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Exportar a Excel:
                    </span>
                  </div>
                  <DropdownMenuItem
                    onClick={handleExportMovimientosExcel}
                    disabled={movimientos.length === 0}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                      <Receipt className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cuenta Corriente</p>
                      <p className="text-xs text-zinc-500">Debe / Haber / Saldo</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportRemitosExcel}
                    disabled={ivrs.length === 0}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <FileText className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Remitos</p>
                      <p className="text-xs text-zinc-500">{ivrs.length} remitos</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportCobrosExcel}
                    disabled={todosCobros.length === 0}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40">
                      <CreditCard className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cobros</p>
                      <p className="text-xs text-zinc-500">{todosCobros.length} cobros</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="default"
                size="tiny"
                onClick={handleExportFullStatementExcel}
                icon={<FileSpreadsheet />}
                title="Exportar Estado de Cuenta a Excel"
              />
              <Button
                type="default"
                size="tiny"
                onClick={() => setPrintDialogOpen(true)}
                icon={<Printer />}
                title="Imprimir Estado de Cuenta"
              />
            </div>
          </div>
        </SheetHeader>

        {/* Content con tabs - scroll nativo para mejor compatibilidad en mobile */}
        <div className="flex-1 overflow-y-auto mt-2 sm:mt-4 px-4 sm:px-6 pb-6">
            <Tabs defaultValue="resumen" className="w-full">
              <TabsList className={cn(sheetClasses.tabsList, "grid-cols-4 h-auto")}>
                <TabsTrigger value="resumen" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm">Resumen</span>
                </TabsTrigger>
                <TabsTrigger value="ivrs" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm">Remitos</span>
                </TabsTrigger>
                <TabsTrigger value="cobros" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm">Cobros</span>
                </TabsTrigger>
                <TabsTrigger value="movimientos" className={cn(sheetClasses.tabsTrigger, "gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 px-1 sm:px-3 flex-col sm:flex-row")}>
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-sm hidden xs:inline">Mov.</span>
                  <span className="text-[10px] sm:text-sm xs:hidden">Mov</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Resumen */}
              <TabsContent value="resumen" className="space-y-4 mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Resumen financiero */}
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-gradient-to-br from-white to-gray-50/20 dark:from-gray-900 dark:to-gray-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-900 dark:text-gray-100">
                      <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      Resumen IVR
                    </h3>

                    <div className={cn(
                      "grid grid-cols-2 gap-3",
                      (cuenta.total_notas_credito || 0) > 0 ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-5"
                    )}>
                      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-950/20">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Remitido</p>
                        <p className="text-sm sm:text-xl font-bold break-words text-gray-600 dark:text-gray-400 mt-1">
                          {formatCurrency(cuenta.total_remitido)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cuenta.cantidad_ivr} remito{cuenta.cantidad_ivr !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Cobrado</p>
                        <p className="text-sm sm:text-xl font-bold break-words text-green-600 dark:text-green-400 mt-1">
                          {formatCurrency(cuenta.total_cobrado)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cuenta.cantidad_cobros} cobro{cuenta.cantidad_cobros !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Notas de crédito: aparece solo si hay. Explica por qué
                          Remitido ≠ Cobrado sin meter la NC dentro de "cobrado". */}
                      {(cuenta.total_notas_credito || 0) > 0 && (
                        <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50 dark:bg-purple-950/20">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Notas de Crédito</p>
                          <p className="text-sm sm:text-xl font-bold break-words text-purple-600 dark:text-purple-400 mt-1">
                            {formatCurrency(cuenta.total_notas_credito || 0)}
                          </p>
                          <p
                            className="text-xs text-gray-500 mt-0.5 truncate"
                            title={numerosNC.join(', ')}
                          >
                            {(cuenta.cantidad_notas_credito ?? numerosNC.length)} NC
                            {(cuenta.cantidad_notas_credito ?? numerosNC.length) !== 1 ? 's' : ''}
                            {numerosNC.length > 0 ? ` · ${numerosNC.join(', ')}` : ''}
                          </p>
                        </div>
                      )}

                      <div className={cn(
                        "border rounded-lg p-3",
                        cuenta.saldo_actual > 0
                          ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                          : cuenta.saldo_actual < 0
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                          : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20"
                      )}>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Saldo Actual</p>
                        <div className={cn(
                          "flex items-center gap-2 mt-1 min-w-0",
                          cuenta.saldo_actual > 0 ? "text-orange-600" : cuenta.saldo_actual < 0 ? "text-green-600" : "text-gray-600"
                        )}>
                          {cuenta.saldo_actual > 0 ? (
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                          ) : cuenta.saldo_actual < 0 ? (
                            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                          ) : null}
                          <p className="text-sm sm:text-xl font-bold break-words">
                            {formatCurrency(Math.abs(cuenta.saldo_actual))}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cuenta.saldo_actual > 0 ? "Pendiente" : cuenta.saldo_actual < 0 ? "A favor" : "Saldado"}
                        </p>
                      </div>

                      <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Remitos Pendientes</p>
                        <p className="text-sm sm:text-xl font-bold break-words text-yellow-600 dark:text-yellow-400 mt-1">
                          {cuenta.cantidad_pendientes}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatCurrency(cuenta.total_pendiente)}
                        </p>
                      </div>

                      <div className={cn(
                        "border rounded-lg p-3",
                        (cuenta.saldo_a_favor_ivr || 0) > 0
                          ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20"
                          : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20"
                      )}>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Saldo a Favor</p>
                        <p className={cn(
                          "text-sm sm:text-xl font-bold break-words mt-1",
                          (cuenta.saldo_a_favor_ivr || 0) > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500"
                        )}>
                          {formatCurrency(cuenta.saldo_a_favor_ivr || 0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(cuenta.saldo_a_favor_ivr || 0) > 0 ? "Crédito sin imputar" : "Todo imputado"}
                        </p>
                      </div>
                    </div>

                    {/* Saldo a favor IVR del cliente */}
                    {saldoFavorCliente > 0 && (
                      <div className="mt-3 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-emerald-600" />
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Saldo a Favor Disponible</p>
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(saldoFavorCliente)}
                              </p>
                            </div>
                          </div>
                          {ivrsPendientes.length > 0 && (
                            <Button
                              type="default"
                              size="tiny"
                              onClick={() => setImputarDialogOpen(true)}
                              icon={<ArrowDownCircle className="text-emerald-600" />}
                              className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                            >
                              Imputar a IVRs
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-emerald-600/70 mt-1">
                          Crédito disponible para aplicar a remitos pendientes
                        </p>
                      </div>
                    )}
                  </section>

                  {/* IVRs pendientes rápidos */}
                  {ivrsPendientes.length > 0 && (
                    <section className="space-y-3 p-4 border border-yellow-200/40 dark:border-yellow-800/30 rounded-xl bg-gradient-to-br from-white to-yellow-50/20 dark:from-gray-900 dark:to-yellow-950/10 shadow-sm">
                      <div className="flex items-center justify-between border-b border-yellow-200/50 dark:border-yellow-800/30 pb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          Remitos Pendientes ({ivrsPendientes.length})
                        </h3>
                        <Button
                          type="default"
                          size="tiny"
                          onClick={() => setCobroIvrOpen(true)}
                          icon={<CreditCard className="text-green-600" />}
                          className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          Registrar Cobro
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {ivrsPendientes.slice(0, 5).map((ivr, index) => (
                          <motion.div
                            key={ivr.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                            onClick={() => {
                              setSelectedIvrForDetail(ivr);
                              setIvrDetailOpen(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium">IVR</p>
                                <p className="text-xs text-gray-500">{formatDate(ivr.fecha_emision)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{formatCurrency(ivr.total)}</p>
                              <p className="text-xs text-orange-600">
                                Pendiente: {formatCurrency(ivr.saldo_pendiente ?? ivr.total)}
                              </p>
                              {getEstadoBadge(ivr.estado)}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Última actividad */}
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-gradient-to-br from-white to-gray-50/20 dark:from-gray-900 dark:to-gray-950/10 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-800/30 pb-2 text-gray-700 dark:text-gray-300">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      Información
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Última Actividad</p>
                        <p className="text-sm font-medium">{formatDateLong(cuenta.ultima_actividad)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Estado</p>
                        <p className="text-sm font-medium">{cuenta.estado || 'Activo'}</p>
                      </div>
                    </div>
                  </section>
                </motion.div>
              </TabsContent>

              {/* Tab IVRs */}
              <TabsContent value="ivrs" className="flex-1 overflow-hidden mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Remitos del Cliente ({ivrs.length})
                    </h3>
                    <Button
                      type="primary"
                      size="tiny"
                      onClick={() => setIvrFormOpen(true)}
                      icon={<Plus />}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Nuevo IVR
                    </Button>
                  </div>

                  {loadingIvrs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : ivrs.length > 0 ? (
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                      <div className="space-y-2 pb-4">
                        <AnimatePresence mode="popLayout">
                          {ivrs.map((ivr, index) => (
                          <motion.div
                            key={ivr.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedIvrForDetail(ivr);
                              setIvrDetailDefaultTab(undefined);
                              setIvrDetailOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  ivr.estado === 'pagada' ? "bg-green-100 dark:bg-green-900/30" :
                                  "bg-yellow-100 dark:bg-yellow-900/30"
                                )}>
                                  <FileText className={cn(
                                    "h-4 w-4",
                                    ivr.estado === 'pagada' ? "text-green-600" :
                                    "text-yellow-600"
                                  )} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold">{formatIvrNumber(ivr.nro_factura)}</p>
                                    {getEstadoBadge(ivr.estado)}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(ivr.fecha_emision)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-bold">{formatCurrency(ivr.total)}</p>
                                  {(netoPendientePorIvr.get(ivr.id) ?? 0) > 0.005 && (
                                    <p className="text-xs text-orange-600">
                                      Pendiente: {formatCurrency(netoPendientePorIvr.get(ivr.id) ?? 0)}
                                    </p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button type="default" size="tiny" icon={<MoreVertical />} className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()} />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedIvrForDetail(ivr);
                                      setIvrDetailDefaultTab(undefined);
                                      setIvrDetailOpen(true);
                                    }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalle
                                    </DropdownMenuItem>
                                    {ivr.estado !== 'pagada' && (
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setCobroIvrPreselect(ivr.id);
                                        setCobroIvrOpen(true);
                                      }}>
                                        <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                                        Registrar Cobro
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <IvrRowSummary ivr={ivr} />
                          </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay remitos registrados</p>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => setIvrFormOpen(true)}
                        className="mt-4 bg-gray-600 hover:bg-gray-700 text-white"
                        icon={<Plus />}
                      >
                        Crear Primer Remito
                      </Button>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Tab Cobros */}
              <TabsContent value="cobros" className="flex-1 overflow-hidden mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Historial de Cobros ({todosCobros.length})
                    </h3>
                    <Button
                      type="default"
                      size="tiny"
                      onClick={() => setCobroIvrOpen(true)}
                      icon={<Plus className="text-green-600" />}
                      className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      Nuevo Cobro
                    </Button>
                  </div>

                  {todosCobros.length > 0 ? (
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                      <div className="space-y-2 pb-4">
                        <AnimatePresence mode="popLayout">
                          {todosCobros.map((cobro, index) => {
                          // Resolver el IVR destino: link directo (cobro.ivr) o, para cobros
                          // aplicados a cuenta (amber), el IVR de su 1ra aplicación (match por nro_factura).
                          const aplicNro = (cobro as any).aplicaciones?.[0]?.nro_factura;
                          const targetIvr = cobro.ivr
                            || (aplicNro ? ivrs.find((f) => String(f.nro_factura) === String(aplicNro)) : undefined);
                          return (
                          <motion.div
                            key={cobro.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className={cn(
                              "border rounded-lg p-3 transition-shadow",
                              cobro.ivr
                                ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                                : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-400",
                              targetIvr && "cursor-pointer hover:shadow-md"
                            )}
                            title={
                              !cobro.ivr && (cobro as any).aplicaciones?.length > 0
                                ? (targetIvr
                                    ? `Cobro aplicado a cuenta — imputado a ${aplicNro}. Clic para ver el remito.`
                                    : `Cobro aplicado a cuenta (${aplicNro})`)
                                : undefined
                            }
                            onClick={() => {
                              if (targetIvr) {
                                setSelectedIvrForDetail(targetIvr);
                                setIvrDetailDefaultTab("pagos");
                                setIvrDetailOpen(true);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  cobro.ivr
                                    ? "bg-green-100 dark:bg-green-900/30"
                                    : "bg-amber-100 dark:bg-amber-900/30"
                                )}>
                                  <CreditCard className={cn("h-4 w-4", cobro.ivr ? "text-green-600" : "text-amber-600")} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-green-600">
                                    {formatCurrency(cobro.monto)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(cobro.fecha_pago)} • {cobro.metodo_pago || 'Sin especificar'}
                                  </p>
                                  <p className="text-xs mt-0.5 flex items-center gap-2">
                                    {cobro.ivr ? (
                                      <span className="text-blue-600 dark:text-blue-400">
                                        {String(cobro.ivr.nro_factura).startsWith('IVR') ? '' : 'IVR '}#{cobro.ivr.nro_factura}
                                      </span>
                                    ) : (cobro as any).aplicaciones?.length > 0 ? (
                                      <span className="text-blue-600 dark:text-blue-400">
                                        Aplicado a {(cobro as any).aplicaciones.map((a: any) => `#${a.nro_factura}`).join(', ')}
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                                        Sin asociar
                                      </span>
                                    )}
                                    {(cobro as any).ultimo_envio_at && (
                                      <span
                                        className={cn(
                                          'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full',
                                          (cobro as any).ultimo_envio_estado === 'enviado'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        )}
                                        title={`${(cobro as any).ultimo_envio_estado === 'enviado' ? 'Enviado' : 'Fallido'} el ${formatDate(String((cobro as any).ultimo_envio_at).slice(0,10))}\nA: ${(Array.isArray((cobro as any).ultimo_envio_destinatarios) ? (cobro as any).ultimo_envio_destinatarios.join(', ') : '')}`}
                                      >
                                        <Mail className="h-3 w-3" />
                                        {(cobro as any).ultimo_envio_estado === 'enviado' ? 'Enviado' : 'Falló'}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="default" size="tiny" icon={<MoreVertical />} className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()} />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 text-sm">
                                  {/* Asociar/cambiar IVR (siempre disponible — abre el form con selector de IVR) */}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const asociado = !!cobro.factura_id || ((cobro as any).aplicaciones?.length > 0);
                                      if (asociado) {
                                        // Cambiar la imputación de un cobro ya asociado = revertir +
                                        // reaplicar (delicado). El camino seguro hoy: eliminar y registrar
                                        // de nuevo (el DELETE revierte estados y saldo a favor).
                                        toast.info("Para cambiar la imputación, eliminá el cobro y registralo de nuevo.");
                                        return;
                                      }
                                      // Cobro sin asociar = saldo a favor → aplicarlo a un remito vía el flujo unificado.
                                      setCobroIvrPresetSaldo(true);
                                      setCobroIvrOpen(true);
                                    }}
                                    className="font-medium"
                                  >
                                    <LinkIcon className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                                    {cobro.factura_id || (cobro as any).aplicaciones?.length > 0 ? 'Cambiar IVR asociada' : 'Asociar a IVR'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/api/cobros-ivr/pdf?id=${cobro.id}`, '_blank');
                                  }}>
                                    <FileDown className="h-4 w-4 mr-2 text-gray-500" />
                                    Descargar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleEnviarCobro(cobro);
                                  }}>
                                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                                    Enviar por email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCobro(cobro);
                                    setEditCobroOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                                    Editar cobro
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCobro(cobro.id); }}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar cobro
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </motion.div>
                          );
                          })}
                      </AnimatePresence>

                        {/* Total cobrado */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border border-green-200 dark:border-green-900/50 rounded-lg p-3 bg-green-50 dark:bg-green-950/20 mt-4"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Total Cobrado:
                            </span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(cuenta.total_cobrado)}
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay cobros registrados</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* Tab Movimientos */}
              <TabsContent value="movimientos" className="flex-1 overflow-hidden mt-0 p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Historial de Movimientos ({movimientos.length})
                    </h3>
                  </div>

                  {loadingMovimientos ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : movimientos.length > 0 ? (
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                      <div className="space-y-2 pb-4">
                        <AnimatePresence mode="popLayout">
                          {movimientos.map((mov, index) => (
                          <motion.div
                            key={mov.movimiento_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getTipoIcon(mov.tipo_movimiento)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getTipoBadgeVariant(mov.tipo_movimiento)} className="text-xs">
                                      {getTipoLabel(mov.tipo_movimiento)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(mov.fecha)}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{mov.descripcion}</p>
                                  {mov.estado && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Estado: {mov.estado}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right space-y-1 ml-4">
                                {mov.debito > 0 && (
                                  <div className="font-semibold text-gray-600 text-sm">
                                    +{formatCurrency(mov.debito)}
                                  </div>
                                )}
                                {mov.credito > 0 && (
                                  <div className="font-semibold text-green-600 text-sm">
                                    -{formatCurrency(mov.credito)}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  Saldo: {formatCurrency(mov.saldo_acumulado)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                      <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay movimientos registrados</p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
        </div>
      </SheetContent>

      {/* Dialog para imprimir */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir Estado de Cuenta IVR</DialogTitle>
            <DialogDescription>
              Selecciona el período de movimientos que deseas incluir en el reporte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="days-filter">Filtro por días</Label>
              <Select value={selectedDays} onValueChange={setSelectedDays}>
                <SelectTrigger id="days-filter">
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los movimientos</SelectItem>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="15">Últimos 15 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="60">Últimos 60 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-700 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs para crear/editar */}
      <IvrFormDialog
        open={ivrFormOpen}
        onOpenChange={setIvrFormOpen}
        ivr={null}
        defaultClienteId={cuenta.cliente_id}
        onSuccess={() => {
          toast.success('Remito creado correctamente');
          refetchData();
        }}
      />

      <SendEmailDialog
        open={sendCobroOpen}
        onOpenChange={(open) => {
          setSendCobroOpen(open);
          if (!open) setCobroAEnviar(null);
        }}
        defaultTo={sendCobroDefaults.to}
        defaultSubject={sendCobroDefaults.subject}
        defaultBody={sendCobroDefaults.body}
        attachmentName={sendCobroDefaults.filename}
        onSend={async ({ to, subject, body }) => {
          if (!cobroAEnviar) throw new Error('Sin cobro seleccionado');
          const res = await fetch('/api/cobros-ivr/enviar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cobro_id: cobroAEnviar.id, to, subject, body }),
            credentials: 'include',
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
        }}
      />

      <CobroIvrDialog
        open={cobroIvrOpen}
        onOpenChange={(open) => {
          setCobroIvrOpen(open);
          if (!open) {
            setCobroIvrPreselect(undefined);
            setCobroIvrPresetSaldo(false);
          }
        }}
        clienteId={cuenta.cliente_id}
        clienteNombre={clienteNombre}
        preselectIvrId={cobroIvrPreselect}
        presetUsarSaldoFavor={cobroIvrPresetSaldo}
        onSuccess={() => {
          refetchData();
          mutateCliente();
        }}
        onCobroCreated={(cobro) => {
          setTimeout(() => {
            setCobroAEnviar(cobro);
            setSendCobroOpen(true);
          }, 200);
        }}
      />

      {/* Editar cobro existente (PATCH): revierte + re-imputa según el monto. */}
      <CobroIvrDialog
        open={editCobroOpen}
        onOpenChange={(open) => {
          setEditCobroOpen(open);
          if (!open) setEditingCobro(null);
        }}
        clienteId={cuenta.cliente_id}
        clienteNombre={clienteNombre}
        editCobro={editingCobro ? {
          id: editingCobro.id,
          cliente_id: cuenta.cliente_id,
          monto: editingCobro.monto,
          fecha_pago: editingCobro.fecha_pago,
          metodo_pago: editingCobro.metodo_pago,
          notas: editingCobro.notas ?? null,
          // Anticipo puro = sin factura directa y sin aplicaciones (saldo a favor).
          esAnticipo: !editingCobro.factura_id && !(editingCobro.aplicaciones?.length > 0),
        } : null}
        onSuccess={() => {
          setEditCobroOpen(false);
          setEditingCobro(null);
          refetchData();
          mutateCliente();
        }}
      />

      {/* IVR Detail Sheet - se abre cuando se hace click en un IVR */}
      {selectedIvrForDetail && (
        <IvrDetailSheet
          open={ivrDetailOpen}
          onOpenChange={(open) => {
            setIvrDetailOpen(open);
            if (!open) {
              setSelectedIvrForDetail(null);
              setIvrDetailDefaultTab(undefined);
            }
          }}
          ivr={selectedIvrForDetail}
          defaultTab={ivrDetailDefaultTab}
          onRefresh={refetchData}
          onEdit={(ivr) => {
            setEditingIvr(ivr);
            setIvrEditFormOpen(true);
          }}
        />
      )}

      {/* IVR Edit Form Dialog */}
      <IvrFormDialog
        open={ivrEditFormOpen}
        onOpenChange={(open) => {
          setIvrEditFormOpen(open);
          if (!open) {
            setEditingIvr(null);
          }
        }}
        ivr={editingIvr}
        defaultClienteId={cuenta.cliente_id}
        onSuccess={() => {
          toast.success('Remito actualizado correctamente');
          setEditingIvr(null);
          setIvrEditFormOpen(false);
          refetchData();
        }}
      />

      {/* Imputar Saldo a Favor Dialog */}
      <ImputarSaldoFavorDialog
        open={imputarDialogOpen}
        onOpenChange={setImputarDialogOpen}
        clienteId={cuenta?.cliente_id || ''}
        clienteNombre={clienteNombre}
        saldoFavorDisponible={saldoFavorCliente}
        ivrsPendientes={ivrsPendientes}
        onSuccess={() => {
          refetchData();
          mutateCliente();
        }}
      />

      {/* Confirmación de imputación automática FIFO (UI del sistema, no confirm() del navegador) */}
      <AlertDialog open={showImputarFifoConfirm} onOpenChange={setShowImputarFifoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Imputar saldo a favor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Imputar automáticamente {formatCurrency(saldoFavorCliente)} a los remitos
              más antiguos (FIFO)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoImputarFifo}>
              Imputar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ficha del cliente inline (al tocar el nombre en el header) */}
      <ClienteDetailSheet
        cliente={clienteData ?? null}
        open={clienteSheetOpen}
        onOpenChange={setClienteSheetOpen}
      />
    </Sheet>
  );
}
