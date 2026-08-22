'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Presupuesto, PresupuestoItem, ComentarioInterno } from '@/lib/types';
import { toast } from 'sonner';
import {
  FileText,
  User,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Printer,
  Mail,
  X,
  Send,
  Eye,
  PenTool,
  Copy,
  ExternalLink,
  Pencil,
  Download,
  ChevronDown,
  PackageCheck,
  AlertTriangle,
  PackageX,
  Truck,
  MessageSquare,
  Plus,
  StickyNote,
  Smartphone,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { searchClientes } from '@/hooks/use-client-search';
import { RefreshCw } from 'lucide-react';
import { useFormatCurrency } from '@/lib/hooks/use-format-currency';

interface PresupuestoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuesto: Presupuesto | null;
  onRefresh?: () => void;
  onEdit?: (presupuesto: Presupuesto) => void;
  /** Si viene true, abre automáticamente el dialog de envío al montar. */
  autoOpenSend?: boolean;
  /** Se llama luego de consumir el autoOpenSend para que el caller limpie su flag. */
  onAutoOpenConsumed?: () => void;
}

export function PresupuestoDetailSheet({
  open,
  onOpenChange,
  presupuesto,
  onRefresh,
  onEdit,
  autoOpenSend,
  onAutoOpenConsumed,
}: PresupuestoDetailSheetProps) {
  // Estado para datos completos (con items enriquecidos)
  const [fullPresupuesto, setFullPresupuesto] = useState<Presupuesto | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  // Estados para acciones
  const [converting, setConverting] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertWarnings, setConvertWarnings] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [emailDestino, setEmailDestino] = useState('');

  // WhatsApp send states
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Estados para selección de items (pedido parcial)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showCrearPedidoDialog, setShowCrearPedidoDialog] = useState(false);
  const [creatingPedido, setCreatingPedido] = useState(false);

  // Estado para cambio manual de estado
  const [changingEstado, setChangingEstado] = useState(false);

  // Estado para generación de OC
  const [generandoOC, setGenerandoOC] = useState(false);

  // Estado para cambio de cliente
  const [changingCliente, setChangingCliente] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);

  // Estados para notas internas
  const [notasInternas, setNotasInternas] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);

  // Cargar datos completos al abrir
  useEffect(() => {
    if (open && presupuesto?.id) {
      setLoadingFull(true);
      setSelectedItemIds(new Set());
      fetch(`/api/presupuestos?id=${presupuesto.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setFullPresupuesto(data);
            setNotasInternas(data.notas_internas || '');
            // Auto-abrir dialog de envío si el caller lo pidió.
            // Se hace acá, no en otro effect, para que tengamos `data` ya
            // cargado y así `handleAbrirEnviarDialog` resuelva el email.
            if (autoOpenSend) {
              const clienteEmail = data?.clientes?.email;
              const email = Array.isArray(clienteEmail)
                ? clienteEmail[0]
                : clienteEmail || '';
              setEmailDestino(email);
              setShowSendDialog(true);
              onAutoOpenConsumed?.();
            }
          }
        })
        .catch(err => {
          console.error('Error loading presupuesto details:', err);
          toast.error('Error al cargar detalles del presupuesto');
        })
        .finally(() => setLoadingFull(false));
    } else {
      setFullPresupuesto(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presupuesto?.id, autoOpenSend]);

  const formatCurrency = useFormatCurrency();

  // Usar datos completos o los básicos
  const data = fullPresupuesto || presupuesto;
  const items = (fullPresupuesto?.presupuestos_items || []) as PresupuestoItem[];

  if (!presupuesto) return null;

  const handleCambiarCliente = async (newClienteId: string) => {
    if (!data?.id || !newClienteId) return;
    setSavingCliente(true);
    try {
      const res = await fetch(`/api/presupuestos?id=${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: newClienteId }),
      });
      if (!res.ok) throw new Error("Error al cambiar cliente");
      toast.success("Cliente actualizado");
      setChangingCliente(false);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar cliente");
    } finally {
      setSavingCliente(false);
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'aceptado':
      case 'aprobado':
        return 'success';
      case 'enviado':
        return 'info';
      case 'visto':
        return 'warning';
      case 'rechazado':
        return 'destructive';
      case 'vencido':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'aceptado':
      case 'aprobado':
        return <CheckCircle className="h-4 w-4" />;
      case 'enviado':
        return <Send className="h-4 w-4" />;
      case 'visto':
        return <Eye className="h-4 w-4" />;
      case 'rechazado':
      case 'vencido':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Helpers de stock
  const getStockStatus = (item: PresupuestoItem) => {
    if (item.pedido_item_id) return 'en_pedido';
    if (!item.producto_id) return 'sin_producto';
    const stock = item.stock_disponible ?? 0;
    const cantidad = item.cantidad;
    if (stock >= cantidad) return 'disponible';
    if (stock > 0) return 'parcial';
    return 'sin_stock';
  };

  const getStockIcon = (status: string) => {
    switch (status) {
      case 'disponible':
        return <PackageCheck className="h-4 w-4 text-green-600" />;
      case 'parcial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'sin_stock':
        return <PackageX className="h-4 w-4 text-red-600" />;
      case 'en_pedido':
        return <Truck className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStockTooltip = (item: PresupuestoItem) => {
    const status = getStockStatus(item);
    const stock = item.stock_disponible ?? 0;
    const enOrden = item.en_orden_compra ?? 0;

    switch (status) {
      case 'disponible':
        return `Stock disponible: ${stock} unidades`;
      case 'parcial':
        return `Stock parcial: ${stock} de ${item.cantidad} necesarios`;
      case 'sin_stock':
        return enOrden > 0
          ? `Sin stock. ${enOrden} unidades en orden de compra`
          : 'Sin stock disponible';
      case 'en_pedido':
        return 'Ya incluido en un pedido';
      default:
        return 'Producto sin seguimiento de stock';
    }
  };

  // Verificar si se puede crear pedido
  const canCreatePedido = data?.estado === 'aceptado' || data?.firmado;

  // Items disponibles para selección (no ya en pedido)
  const selectableItems = items.filter(item => !item.pedido_item_id);

  // Calcular totales de selección
  const selectedItems = items.filter(item => selectedItemIds.has(item.id));
  const selectedSubtotal = selectedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const selectedIva = selectedSubtotal * 0.21;
  const selectedTotal = selectedSubtotal + selectedIva;

  // Handlers de selección
  const toggleItemSelection = (itemId: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItemIds(newSet);
  };

  const selectAllItems = () => {
    setSelectedItemIds(new Set(selectableItems.map(item => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItemIds(new Set());
  };

  // Cambiar estado manualmente
  const handleCambiarEstado = async (nuevoEstado: string) => {
    setChangingEstado(true);
    try {
      const res = await fetch(`/api/presupuestos?id=${presupuesto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || 'Error al cambiar estado');
      }

      const updated = await res.json();
      setFullPresupuesto(updated);
      toast.success(`Estado cambiado a "${nuevoEstado}"`);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    } finally {
      setChangingEstado(false);
    }
  };

  // Generar órdenes de compra desde items de catálogo
  const handleGenerarOC = async () => {
    setGenerandoOC(true);
    try {
      const res = await fetch('/api/presupuestos/generar-oc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto_id: presupuesto.id }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error al generar órdenes de compra');
      }

      toast.success(
        `${responseData.total_ordenes} orden${responseData.total_ordenes !== 1 ? 'es' : ''} de compra generada${responseData.total_ordenes !== 1 ? 's' : ''}`,
        {
          description: `${responseData.total_items} items distribuidos entre ${responseData.total_ordenes} proveedor${responseData.total_ordenes !== 1 ? 'es' : ''}`,
        }
      );
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al generar órdenes de compra');
    } finally {
      setGenerandoOC(false);
    }
  };

  const handleAbrirEnviarDialog = () => {
    const clienteEmail = data?.clientes?.email;
    const email = Array.isArray(clienteEmail) ? clienteEmail[0] : clienteEmail || '';
    setEmailDestino(email);
    setShowSendDialog(true);
  };

  const handleEnviarEmail = async () => {
    if (!emailDestino || !emailDestino.includes('@')) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    setSending(true);
    setShowSendDialog(false);

    const toastId = toast.loading(`Enviando presupuesto a ${emailDestino}...`, {
      description: 'Por favor espere...',
    });

    try {
      const res = await fetch('/api/presupuestos/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto_id: presupuesto.id,
          email_destino: emailDestino
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error al enviar');
      }

      toast.success('Presupuesto enviado correctamente', {
        id: toastId,
        description: `Email enviado a ${emailDestino}`,
      });
      onRefresh?.();
    } catch (error: any) {
      toast.error('Error al enviar presupuesto', {
        id: toastId,
        description: error.message || 'Intente nuevamente',
      });
    } finally {
      setSending(false);
    }
  };

  const handleAbrirWhatsAppDialog = () => {
    const clientePhone = data?.clientes?.telefono || '';
    setWhatsappPhone(typeof clientePhone === 'string' ? clientePhone : '');
    setShowWhatsAppDialog(true);
  };

  const handleEnviarWhatsApp = async () => {
    if (!whatsappPhone) {
      toast.error('Ingresá un número de teléfono');
      return;
    }

    setSendingWhatsApp(true);
    setShowWhatsAppDialog(false);

    const toastId = toast.loading('Enviando PDF por WhatsApp...', {
      description: 'Generando y enviando...',
    });

    try {
      const res = await fetch('/api/wa-bridge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto_id: presupuesto.id,
          phone_override: whatsappPhone,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error al enviar');
      }

      toast.success('PDF enviado por WhatsApp', {
        id: toastId,
        description: responseData.message,
      });
      onRefresh?.();
    } catch (error: any) {
      toast.error('Error al enviar por WhatsApp', {
        id: toastId,
        description: error.message || 'Intente nuevamente',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleCopiarLink = () => {
    if (data?.token_firma) {
      const url = `${window.location.origin}/p/${data.token_firma}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copiado al portapapeles');
    } else {
      toast.error('Este presupuesto no tiene token de firma');
    }
  };

  const handleAbrirLink = () => {
    if (data?.token_firma) {
      window.open(`/p/${data.token_firma}`, '_blank');
    }
  };

  const handleDescargarPDF = async () => {
    const toastId = toast.loading('Generando PDF...');
    try {
      const res = await fetch(`/api/presupuestos/pdf?id=${presupuesto.id}`);
      if (!res.ok) throw new Error('Error al generar PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presupuesto-${data?.numero || presupuesto.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF descargado', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Error al descargar PDF', { id: toastId });
    }
  };

  const handleImprimir = async () => {
    const toastId = toast.loading('Preparando impresión...');
    try {
      const res = await fetch(`/api/presupuestos/pdf?id=${presupuesto.id}`);
      if (!res.ok) throw new Error('Error al generar PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.dismiss(toastId);
    } catch (error: any) {
      toast.error(error.message || 'Error al imprimir', { id: toastId });
    }
  };

  // Crear pedido con items seleccionados
  const handleCrearPedidoParcial = async () => {
    if (selectedItemIds.size === 0) {
      toast.error('Selecciona al menos un item');
      return;
    }

    setCreatingPedido(true);
    try {
      const res = await fetch('/api/presupuestos/crear-pedido-parcial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto_id: presupuesto.id,
          item_ids: Array.from(selectedItemIds),
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error al crear pedido');
      }

      if (responseData.warnings && responseData.warnings.length > 0) {
        toast.warning('Pedido creado con advertencias', {
          description: responseData.warnings.join(', '),
        });
      } else {
        toast.success(`Pedido #${responseData.pedido?.numero || ''} creado correctamente`);
      }

      setShowCrearPedidoDialog(false);
      setSelectedItemIds(new Set());

      // Recargar datos
      const updatedRes = await fetch(`/api/presupuestos?id=${presupuesto.id}`);
      const updatedData = await updatedRes.json();
      if (updatedData && !updatedData.error) {
        setFullPresupuesto(updatedData);
      }

      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear pedido');
    } finally {
      setCreatingPedido(false);
    }
  };

  // Convertir todo el presupuesto a pedido (método legacy)
  const handleConvertirAPedido = async () => {
    setConverting(true);
    try {
      const res = await fetch('/api/presupuestos/convertir-a-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto_id: presupuesto.id }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Error al convertir presupuesto');
      }

      if (responseData.warnings && responseData.warnings.length > 0) {
        setConvertWarnings(responseData.warnings);
        toast.warning('Pedido creado con advertencias de stock', {
          description: 'Revisa las advertencias en el diálogo',
        });
      } else {
        toast.success('Presupuesto convertido a pedido exitosamente');
      }

      setShowConvertDialog(false);
      onRefresh?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al convertir presupuesto');
    } finally {
      setConverting(false);
    }
  };

  // Guardar notas internas
  const handleGuardarNotas = async () => {
    setSavingNotas(true);
    try {
      const res = await fetch(`/api/presupuestos?id=${presupuesto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas_internas: notasInternas }),
      });

      if (!res.ok) throw new Error('Error al guardar notas');

      toast.success('Notas guardadas');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar notas');
    } finally {
      setSavingNotas(false);
    }
  };

  // Agregar comentario rápido
  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) return;

    setSavingNotas(true);
    try {
      const comentarios = fullPresupuesto?.comentarios_internos || [];
      const nuevoComentarioObj: ComentarioInterno = {
        fecha: new Date().toISOString(),
        texto: nuevoComentario.trim(),
      };

      const res = await fetch(`/api/presupuestos?id=${presupuesto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comentarios_internos: [...comentarios, nuevoComentarioObj],
        }),
      });

      if (!res.ok) throw new Error('Error al agregar comentario');

      // Actualizar estado local
      setFullPresupuesto(prev => prev ? {
        ...prev,
        comentarios_internos: [...(prev.comentarios_internos || []), nuevoComentarioObj],
      } : null);

      setNuevoComentario('');
      toast.success('Comentario agregado');
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar comentario');
    } finally {
      setSavingNotas(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full h-[95vh] overflow-hidden p-0 bg-white dark:bg-gray-950"
          side="bottom"
        >
          <div className="h-full flex flex-col">
            <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 sm:pr-14 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-950">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="flex items-center sm:items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-purple-200/30 dark:border-purple-800/30 shadow-sm shadow-purple-500/10 shrink-0">
                    <FileText className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base sm:text-2xl bg-gradient-to-r from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300 bg-clip-text text-transparent truncate">
                      Presupuesto #{data?.numero || presupuesto.id.slice(0, 8)}
                    </SheetTitle>
                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                      <Badge
                        variant={getEstadoBadgeVariant(data?.estado || 'borrador')}
                        className="flex items-center gap-1 text-[10px] sm:text-xs"
                      >
                        {getEstadoIcon(data?.estado || 'borrador')}
                        {data?.estado}
                      </Badge>
                      {data?.convertido_pedido && (
                        <Badge variant="success" className="text-[10px] sm:text-xs">Convertido a Pedido</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-1 sm:gap-2 flex-shrink-0 overflow-x-auto overflow-y-visible pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
                  {(data?.estado === 'borrador' || data?.estado === 'enviado' || data?.estado === 'visto') && (
                    <Button
                      type="primary"
                      size="tiny"
                      onClick={handleAbrirEnviarDialog}
                      icon={<Send />}
                      className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                    >
                      Enviar
                    </Button>
                  )}

                  {/* Cambiar estado manualmente */}
                  {data?.estado && data.estado !== 'convertido' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={changingEstado}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Cambiar estado"
                        >
                          {changingEstado ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-amber-600" />
                          )}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <div className="px-3 py-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cambiar estado</p>
                        </div>
                        <DropdownMenuSeparator />
                        {data.estado !== 'enviado' && (
                          <DropdownMenuItem onClick={() => handleCambiarEstado('enviado')} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                              <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Enviado</p>
                              <p className="text-xs text-zinc-500">Marcar como enviado</p>
                            </div>
                          </DropdownMenuItem>
                        )}
                        {data.estado !== 'visto' && (
                          <DropdownMenuItem onClick={() => handleCambiarEstado('visto')} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                              <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Visto</p>
                              <p className="text-xs text-zinc-500">El cliente lo vio</p>
                            </div>
                          </DropdownMenuItem>
                        )}
                        {data.estado !== 'aceptado' && (
                          <DropdownMenuItem onClick={() => handleCambiarEstado('aceptado')} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40">
                              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Aceptado</p>
                              <p className="text-xs text-zinc-500">Cliente aceptó (tel/WhatsApp)</p>
                            </div>
                          </DropdownMenuItem>
                        )}
                        {data.estado !== 'rechazado' && (
                          <DropdownMenuItem onClick={() => handleCambiarEstado('rechazado')} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                              <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Rechazado</p>
                              <p className="text-xs text-zinc-500">Cliente no aceptó</p>
                            </div>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {data.estado !== 'borrador' && (
                          <DropdownMenuItem onClick={() => handleCambiarEstado('borrador')} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900/40">
                              <FileText className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Volver a Borrador</p>
                              <p className="text-xs text-zinc-500">Revertir a borrador</p>
                            </div>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {canCreatePedido && !data?.convertido_pedido && selectedItemIds.size > 0 && (
                    <Button
                      type="primary"
                      size="tiny"
                      onClick={() => setShowCrearPedidoDialog(true)}
                      icon={<ArrowRight />}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      Crear Pedido ({selectedItemIds.size})
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                        title="Opciones de email"
                      >
                        <Mail className="h-4 w-4 text-purple-600" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={handleAbrirEnviarDialog} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                          <Send className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Enviar por Email</p>
                          <p className="text-xs text-zinc-500">Link para firmar</p>
                        </div>
                      </DropdownMenuItem>
                      {data?.token_firma && (
                        <DropdownMenuItem onClick={handleCopiarLink} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                            <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Copiar Link</p>
                            <p className="text-xs text-zinc-500">Link de firma</p>
                          </div>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleAbrirWhatsAppDialog} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40">
                          <Smartphone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Enviar por WhatsApp</p>
                          <p className="text-xs text-zinc-500">PDF al celular del cliente</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                        title="Descargar / Imprimir"
                      >
                        <Download className="h-4 w-4 text-green-600" />
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={handleDescargarPDF} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                          <FileText className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Descargar PDF</p>
                          <p className="text-xs text-zinc-500">Guardar en tu equipo</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleImprimir} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900/40">
                          <Printer className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Imprimir</p>
                          <p className="text-xs text-zinc-500">Abrir vista de impresión</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Botón Compartir por Chat Interno */}
                  <ShareToInternalChatButton
                    entity={{
                      type: 'presupuesto',
                      id: presupuesto.id,
                      label: presupuesto.clientes?.nombre || 'Sin cliente',
                      number: presupuesto.numero || presupuesto.id.slice(0, 8),
                      amount: presupuesto.total,
                      link: `/dashboard/presupuestos?id=${presupuesto.id}`,
                    }}
                  />

                  {data?.token_firma && (
                    <Button
                      type="default"
                      size="tiny"
                      onClick={handleAbrirLink}
                      icon={<ExternalLink />}
                      title="Ver como cliente"
                    />
                  )}

                  {onEdit && data?.estado === 'borrador' && (
                    <Button
                      type="default"
                      size="tiny"
                      onClick={() => {
                        onEdit(presupuesto);
                        onOpenChange(false);
                      }}
                      icon={<Pencil />}
                      title="Editar presupuesto"
                    />
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="detalle" className="h-full flex flex-col">
                <TabsList className="mx-6 mt-4 w-fit">
                  <TabsTrigger value="detalle" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Detalle
                  </TabsTrigger>
                  <TabsTrigger value="notas" className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Notas Internas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detalle" className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Banners de estado */}
                  {data?.firmado && (
                    <div className="p-4 border border-green-200/40 dark:border-green-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-green-100 to-green-200/50 dark:from-green-900/50 dark:to-green-800/30 rounded-xl border border-green-200/30 dark:border-green-700/30">
                          <PenTool className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-200">
                            Presupuesto Firmado
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Firmado por {data.firmado_por} el{' '}
                            {data.firmado_at && formatDate(data.firmado_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {data?.estado === 'rechazado' && (
                    <div className="p-4 border border-red-200/40 dark:border-red-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-red-100 to-red-200/50 dark:from-red-900/50 dark:to-red-800/30 rounded-xl border border-red-200/30 dark:border-red-700/30">
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-800 dark:text-red-200">
                            Presupuesto Rechazado
                          </p>
                          {data.motivo_rechazo && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Motivo: {data.motivo_rechazo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {data?.estado === 'visto' && (
                    <div className="p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/50 dark:to-amber-800/30 rounded-xl border border-amber-200/30 dark:border-amber-700/30">
                          <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-200">
                            El cliente vio este presupuesto
                          </p>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Visto {data.visto_count || 1} vez(ces)
                            {data.visto_at && ` - Última vez: ${formatDate(data.visto_at)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Información del Cliente */}
                  <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                    <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Cliente
                      </h3>
                      {data?.estado === 'borrador' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setChangingCliente(!changingCliente)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Cambiar
                        </Button>
                      )}
                    </div>
                    {changingCliente && (
                      <div className="space-y-2">
                        <SearchableCombobox
                          value=""
                          onValueChange={(value) => handleCambiarCliente(value)}
                          searchFn={searchClientes}
                          placeholder="Buscar nuevo cliente..."
                          emptyMessage="No se encontraron clientes"
                        />
                        {savingCliente && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Guardando...
                          </p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nombre</Label>
                        <p className="font-medium text-sm mt-1">
                          {data?.clientes?.nombre || '-'}
                        </p>
                      </div>
                      {data?.clientes?.nombre_fantasia && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Nombre Fantasía</Label>
                          <p className="font-medium text-sm mt-1">
                            {data.clientes.nombre_fantasia}
                          </p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">CUIT</Label>
                        <p className="font-medium text-sm mt-1 font-mono">
                          {data?.clientes?.cuit || '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium text-sm mt-1">
                          {data?.clientes?.email?.[0] || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fechas y Condiciones */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-purple-500" />
                        Fecha Emisión
                      </Label>
                      <p className="font-semibold mt-1 text-sm">
                        {data?.fecha_emision && formatDate(data.fecha_emision)}
                      </p>
                    </div>

                    {data?.fecha_vencimiento && (
                      <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-purple-500" />
                          Vencimiento
                        </Label>
                        <p className="font-semibold mt-1 text-sm">
                          {formatDate(data.fecha_vencimiento)}
                        </p>
                      </div>
                    )}

                    {data?.tiempo_entrega && (
                      <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <Label className="text-xs text-muted-foreground">Tiempo Entrega</Label>
                        <p className="font-semibold mt-1 text-sm">{data.tiempo_entrega}</p>
                      </div>
                    )}

                    {data?.forma_pago && (
                      <div className="p-3 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                        <Label className="text-xs text-muted-foreground">Forma de Pago</Label>
                        <p className="font-semibold mt-1 text-sm">{data.forma_pago}</p>
                      </div>
                    )}
                  </div>

                  {/* Banner de Generar OC (solo si aprobado y tiene items de catálogo) */}
                  {data?.estado === 'aprobado' && items.some(i => i.catalogo_item_id) && (
                    <div className="p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/50 dark:to-blue-800/30 rounded-xl border border-blue-200/30 dark:border-blue-700/30">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-blue-800 dark:text-blue-200">
                              {items.filter(i => i.catalogo_item_id).length} item{items.filter(i => i.catalogo_item_id).length !== 1 ? 's' : ''} de proveedores
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              Podés generar órdenes de compra automáticamente
                            </p>
                          </div>
                        </div>
                        <Button
                          type="primary"
                          size="small"
                          onClick={handleGenerarOC}
                          disabled={generandoOC}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shrink-0"
                        >
                          {generandoOC ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generando...
                            </>
                          ) : (
                            'Generar OC'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Items del Presupuesto */}
                  <div className="space-y-3 p-4 border border-purple-200/40 dark:border-purple-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                    <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-800/30 pb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
                        <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        Items del Presupuesto
                        {loadingFull && <Loader2 className="h-4 w-4 animate-spin" />}
                      </h3>

                      {canCreatePedido && selectableItems.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="text"
                            size="tiny"
                            onClick={selectedItemIds.size === selectableItems.length ? deselectAllItems : selectAllItems}
                          >
                            {selectedItemIds.size === selectableItems.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {items.length === 0 && !loadingFull ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No hay items en este presupuesto
                      </p>
                    ) : (
                      <div className="border border-purple-200/30 dark:border-purple-800/20 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-purple-50/50 dark:bg-purple-950/30">
                            <tr>
                              {canCreatePedido && (
                                <th className="w-10 p-3"></th>
                              )}
                              <th className="text-left p-3 text-sm font-semibold text-purple-900 dark:text-purple-100">Descripción</th>
                              <th className="text-center p-3 text-sm font-semibold text-purple-900 dark:text-purple-100 w-20">Cant.</th>
                              <th className="text-right p-3 text-sm font-semibold text-purple-900 dark:text-purple-100 w-28">P. Unit.</th>
                              <th className="text-right p-3 text-sm font-semibold text-purple-900 dark:text-purple-100 w-28">Subtotal</th>
                              <th className="text-center p-3 text-sm font-semibold text-purple-900 dark:text-purple-100 w-24">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const stockStatus = getStockStatus(item);
                              const isSelectable = canCreatePedido && !item.pedido_item_id;
                              const isSelected = selectedItemIds.has(item.id);

                              return (
                                <tr
                                  key={item.id || idx}
                                  className={`border-t border-purple-200/30 dark:border-purple-800/20 transition-colors ${
                                    isSelected ? 'bg-purple-100/50 dark:bg-purple-900/30' : 'hover:bg-purple-50/30 dark:hover:bg-purple-950/20'
                                  }`}
                                >
                                  {canCreatePedido && (
                                    <td className="p-3">
                                      {isSelectable ? (
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleItemSelection(item.id)}
                                        />
                                      ) : item.pedido_item_id ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Badge variant="secondary" className="text-[10px]">
                                                <Truck className="h-3 w-3 mr-1" />
                                                Pedido
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>Ya incluido en un pedido</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : null}
                                    </td>
                                  )}
                                  <td className="p-3">
                                    <div className="text-sm font-medium">{item.descripcion}</div>
                                    {item.producto_codigo && (
                                      <div className="text-xs text-muted-foreground font-mono">
                                        {item.producto_codigo}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-sm text-center font-semibold">
                                    {item.cantidad}
                                  </td>
                                  <td className="p-3 text-sm text-right font-mono">
                                    {formatCurrency(item.precio_unitario, data?.moneda || 'ARS')}
                                  </td>
                                  <td className="p-3 text-sm text-right font-mono font-semibold">
                                    {formatCurrency(item.subtotal, data?.moneda || 'ARS')}
                                  </td>
                                  <td className="p-3 text-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger className="flex items-center justify-center gap-1.5">
                                          {getStockIcon(stockStatus)}
                                          {stockStatus !== 'sin_producto' && stockStatus !== 'en_pedido' && (
                                            <span className={`text-xs font-medium ${
                                              stockStatus === 'disponible' ? 'text-green-600' :
                                              stockStatus === 'parcial' ? 'text-yellow-600' :
                                              'text-red-600'
                                            }`}>
                                              {item.stock_disponible ?? 0}
                                            </span>
                                          )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{getStockTooltip(item)}</p>
                                          {(item.en_orden_compra ?? 0) > 0 && stockStatus !== 'en_pedido' && (
                                            <p className="text-blue-400 mt-1">
                                              📦 {item.en_orden_compra} en orden de compra
                                            </p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Totales */}
                  <div className="p-4 border border-emerald-200/40 dark:border-emerald-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-mono">{formatCurrency(data?.subtotal || 0, data?.moneda || 'ARS')}</span>
                      </div>
                      {(data?.descuento ?? 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento:</span>
                          <span className="font-mono">-{formatCurrency(data?.descuento || 0, data?.moneda || 'ARS')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA (21%):</span>
                        <span className="font-mono">{formatCurrency(data?.iva || 0, data?.moneda || 'ARS')}</span>
                      </div>
                      <Separator className="bg-emerald-200/50 dark:bg-emerald-800/30" />
                      <div className="flex justify-between text-lg font-bold pt-1">
                        <span className="text-emerald-800 dark:text-emerald-200">Total:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(data?.total || 0, data?.moneda || 'ARS')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones y Términos */}
                  {data?.observaciones && (
                    <div className="space-y-2 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <Label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Observaciones</Label>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {data.observaciones}
                      </p>
                    </div>
                  )}

                  {data?.terminos_condiciones && (
                    <div className="space-y-2 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                      <Label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Términos y Condiciones</Label>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {data.terminos_condiciones}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notas" className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Notas internas (textarea) */}
                  <div className="space-y-3 p-4 border border-amber-200/40 dark:border-amber-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-amber-200/50 dark:border-amber-800/30 pb-2 text-amber-900 dark:text-amber-100">
                      <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Notas Internas
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Estas notas son privadas y no se muestran al cliente.
                    </p>
                    <Textarea
                      value={notasInternas}
                      onChange={(e) => setNotasInternas(e.target.value)}
                      placeholder="Escribe notas internas aquí..."
                      className="min-h-[120px] resize-y"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="outline"
                        size="small"
                        onClick={handleGuardarNotas}
                        disabled={savingNotas}
                      >
                        {savingNotas ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Guardar Notas
                      </Button>
                    </div>
                  </div>

                  {/* Comentarios rápidos */}
                  <div className="space-y-3 p-4 border border-blue-200/40 dark:border-blue-800/30 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-blue-200/50 dark:border-blue-800/30 pb-2 text-blue-900 dark:text-blue-100">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Comentarios Rápidos
                    </h3>

                    {/* Lista de comentarios */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(fullPresupuesto?.comentarios_internos || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay comentarios aún
                        </p>
                      ) : (
                        (fullPresupuesto?.comentarios_internos || []).map((comentario, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900/30"
                          >
                            <p className="text-sm">{comentario.texto}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(comentario.fecha)}
                              {comentario.usuario && ` · ${comentario.usuario}`}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Agregar nuevo comentario */}
                    <div className="flex gap-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/30">
                      <Input
                        value={nuevoComentario}
                        onChange={(e) => setNuevoComentario(e.target.value)}
                        placeholder="Agregar comentario rápido..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAgregarComentario();
                          }
                        }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        onClick={handleAgregarComentario}
                        disabled={savingNotas || !nuevoComentario.trim()}
                        icon={<Plus />}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de Crear Pedido Parcial */}
      <AlertDialog open={showCrearPedidoDialog} onOpenChange={setShowCrearPedidoDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Crear Pedido con Items Seleccionados
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se creará un pedido de venta con los {selectedItemIds.size} items seleccionados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* Resumen de items */}
            <div className="p-3 bg-muted/50 rounded-lg border max-h-[200px] overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">Items incluidos:</p>
              <ul className="space-y-1">
                {selectedItems.map(item => {
                  const status = getStockStatus(item);
                  return (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{item.descripcion}</span>
                      <span className="flex items-center gap-2 ml-2">
                        <span className="font-mono text-xs">{item.cantidad}x</span>
                        {getStockIcon(status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Advertencias de stock */}
            {selectedItems.some(item => getStockStatus(item) === 'sin_stock' || getStockStatus(item) === 'parcial') && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Advertencia de Stock
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                  Algunos items no tienen stock suficiente. El pedido se creará de todos modos.
                </p>
              </div>
            )}

            {/* Totales */}
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(selectedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">IVA (21%):</span>
                <span className="font-mono">{formatCurrency(selectedIva)}</span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                <span>Total:</span>
                <span className="font-mono text-green-600">{formatCurrency(selectedTotal)}</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingPedido}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCrearPedidoParcial}
              disabled={creatingPedido}
              className="bg-green-600 hover:bg-green-700"
            >
              {creatingPedido ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Pedido'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmación de Conversión (legacy) */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Convertir presupuesto a pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará un nuevo pedido con todos los items de este presupuesto.
              El stock será reservado automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {convertWarnings.length > 0 && (
            <div className="my-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                ⚠️ Advertencias de Stock:
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 list-disc list-inside">
                {convertWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertirAPedido}
              disabled={converting}
              className="bg-green-600 hover:bg-green-700"
            >
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convirtiendo...
                </>
              ) : (
                'Convertir a Pedido'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Envío por WhatsApp */}
      <AlertDialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Enviar Presupuesto por WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará el presupuesto como PDF al WhatsApp del cliente desde tu número vinculado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Presupuesto:</span>
                <span className="font-semibold">#{data?.numero}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{data?.clientes?.nombre || '-'}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold text-primary">{formatCurrency(data?.total || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone" className="text-sm font-medium">
                Teléfono del cliente *
              </Label>
              <Input
                id="whatsapp_phone"
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="11 5555-1234"
                className="h-10"
              />
              <p className="text-xs text-gray-500">
                Se agregará el código de país automáticamente si no lo tiene
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingWhatsApp}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnviarWhatsApp}
              disabled={sendingWhatsApp || !whatsappPhone}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Enviar por WhatsApp
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Envío por Email */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              Enviar Presupuesto por Email
            </AlertDialogTitle>
            <AlertDialogDescription>
              El cliente recibirá un email con un link para ver y firmar el presupuesto.
              Confirma el email de destino antes de enviar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Presupuesto:</span>
                <span className="font-semibold">#{data?.numero}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{data?.clientes?.nombre || '-'}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold text-primary">{formatCurrency(data?.total || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_destino" className="text-sm font-medium">
                Email de destino *
              </Label>
              <Input
                id="email_destino"
                type="email"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
                placeholder="cliente@email.com"
                className="h-10"
              />
              {!emailDestino && (
                <p className="text-xs text-amber-600">
                  El cliente no tiene email registrado. Ingresa uno manualmente.
                </p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnviarEmail}
              disabled={sending || !emailDestino}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
