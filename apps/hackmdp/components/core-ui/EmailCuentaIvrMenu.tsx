"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Loader2,
  ChevronDown,
  FileText,
  AlertCircle,
  Calendar,
  Clock,
  Send,
  X,
  UserPlus,
  ArrowLeft,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format-currency";

type TipoEmail = "resumen_completo" | "solo_pendientes" | "por_periodo" | "reclamo";

interface EmailCuentaIvrMenuProps {
  emails: string[];
  clienteId: string;
  clienteNombre: string;
  cantidadPendientes: number;
  totalPendiente: number;
  className?: string;
}

const tiposEmail: {
  id: TipoEmail;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "resumen_completo",
    label: "Resumen completo",
    description: "Estado de cuenta con totales, pendientes y movimientos",
    icon: <FileText className="h-4 w-4" />,
    color: "text-blue-600",
  },
  {
    id: "solo_pendientes",
    label: "Solo pendientes",
    description: "Lista de remitos que el cliente debe pagar",
    icon: <Clock className="h-4 w-4" />,
    color: "text-orange-600",
  },
  {
    id: "por_periodo",
    label: "Por período",
    description: "Movimientos de un rango de fechas específico",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-purple-600",
  },
  {
    id: "reclamo",
    label: "Reclamo de deuda",
    description: "Aviso formal de deuda pendiente",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-600",
  },
];

export function EmailCuentaIvrMenu({
  emails,
  clienteId,
  clienteNombre,
  cantidadPendientes,
  totalPendiente,
  className,
}: EmailCuentaIvrMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoEmail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Email selection state
  const [showEmailSelect, setShowEmailSelect] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Period selection state
  const [periodo, setPeriodo] = useState<string>("30");
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const manualEmailInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  // Filter valid emails
  const clienteEmails = emails.filter(Boolean);

  // Calculate menu position when opening
  useEffect(() => {
    if (menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [menuOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // No cerrar si hay un diálogo abierto
      if (dialogOpen) return;

      const target = event.target as Node;

      // Verificar si el click fue dentro del menú o botón
      const isInsideMenu = menuRef.current && menuRef.current.contains(target);
      const isInsideButton = buttonRef.current && buttonRef.current.contains(target);

      // También verificar si el click fue dentro de cualquier diálogo de Radix
      const isInsideDialog = (target as Element).closest?.('[role="dialog"]');

      if (!isInsideMenu && !isInsideButton && !isInsideDialog) {
        setMenuOpen(false);
        setShowEmailSelect(false);
        setShowManualInput(false);
      }
    };

    if (menuOpen) {
      // Usar setTimeout para evitar que el evento de click que abrió el menú lo cierre
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [menuOpen, dialogOpen]);

  const handleTipoSelect = (tipo: TipoEmail) => {
    // Prevenir cualquier cierre automático
    setSelectedTipo(tipo);

    // Si es por período, abrir diálogo para seleccionar rango
    if (tipo === "por_periodo") {
      // Primero abrir el diálogo, luego cerrar el menú
      setDialogOpen(true);
      // Pequeño delay para asegurar que el diálogo se monte antes de cerrar el menú
      setTimeout(() => setMenuOpen(false), 50);
      return;
    }

    // Si hay un solo email, enviar directamente
    if (clienteEmails.length === 1) {
      handleSendEmail(tipo, clienteEmails);
      return;
    }

    // Si hay múltiples emails o ninguno, mostrar selector
    setShowEmailSelect(true);
    if (clienteEmails.length > 0) {
      setSelectedEmails([...clienteEmails]); // Pre-select all
    }
  };

  const handleSendEmail = async (
    tipo: TipoEmail,
    emailsToSend: string[],
    options?: { periodo?: string; mensaje?: string }
  ) => {
    if (emailsToSend.length === 0) {
      toast.error("Seleccione al menos un destinatario");
      return;
    }

    setSending(true);
    setMenuOpen(false);
    setShowEmailSelect(false);
    setDialogOpen(false);

    const toastId = toast.loading(`Enviando ${tiposEmail.find(t => t.id === tipo)?.label.toLowerCase()}...`);

    try {
      const res = await fetch("/api/cuentas-corrientes-ivr/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          email_destino: emailsToSend.length === 1 ? emailsToSend[0] : emailsToSend,
          tipo_email: tipo,
          periodo_dias: options?.periodo ? parseInt(options.periodo) : undefined,
          mensaje_personalizado: options?.mensaje,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");

      toast.success("Email enviado correctamente", {
        id: toastId,
        description: `Enviado a ${emailsToSend.length} destinatario(s)`,
      });
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email", { id: toastId });
    } finally {
      setSending(false);
      setSelectedTipo(null);
      setSelectedEmails([]);
      setMensajePersonalizado("");
    }
  };

  const toggleEmailSelection = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const handleManualEmailSubmit = () => {
    if (!manualEmail || !manualEmail.includes("@")) {
      toast.error("Ingrese un email válido");
      return;
    }
    if (selectedTipo) {
      handleSendEmail(selectedTipo, [manualEmail]);
    }
    setManualEmail("");
    setShowManualInput(false);
  };

  const handlePeriodoSubmit = () => {
    // Si hay un solo email, enviar directamente
    if (clienteEmails.length === 1) {
      handleSendEmail("por_periodo", clienteEmails, {
        periodo,
        mensaje: mensajePersonalizado,
      });
      return;
    }

    // Mostrar selector de emails
    setDialogOpen(false);
    setMenuOpen(true);
    setShowEmailSelect(true);
    setSelectedEmails([...clienteEmails]);
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Botón principal */}
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={sending}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
            menuOpen
              ? "bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-sm"
              : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
            sending && "opacity-50 cursor-not-allowed"
          )}
          title="Enviar estado de cuenta por email"
          whileTap={{ scale: 0.98 }}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          <motion.span
            animate={{ rotate: menuOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.span>
        </motion.button>
      </div>

      {/* Menú desplegable - renderizado en Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              ref={menuRef}
              style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
              // pointer-events-auto: el menú se portalea a document.body, que
              // Radix deja en pointer-events:none mientras el Sheet de detalle
              // está abierto. Sin esto los items del menú no reciben clicks.
              className="pointer-events-auto z-[9999] w-80 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <AnimatePresence mode="wait">
                {!showEmailSelect ? (
                  // Vista de selección de tipo
                  <motion.div
                    key="tipo-select"
                    className="p-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="px-2 py-1.5 mb-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Enviar a {clienteNombre}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {tiposEmail.map((tipo, idx) => {
                        // Deshabilitar reclamo si no hay pendientes
                        const disabled = tipo.id === "reclamo" && cantidadPendientes === 0;

                        return (
                          <motion.button
                            key={tipo.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (!disabled) handleTipoSelect(tipo.id);
                            }}
                            disabled={disabled}
                            className={cn(
                              "w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                              disabled
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <div className={cn("mt-0.5", tipo.color)}>
                              {tipo.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {tipo.label}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {tipo.description}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Info de pendientes */}
                    {cantidadPendientes > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 px-2">
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          {cantidadPendientes} remito(s) pendiente(s) • {formatCurrency(totalPendiente)}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  // Vista de selección de emails
                  <motion.div
                    key="email-select"
                    className="p-2 space-y-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                  >
                    {!showManualInput ? (
                      <>
                        <div className="flex items-center gap-2 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEmailSelect(false);
                              setSelectedTipo(null);
                            }}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Seleccionar destinatarios
                          </span>
                          {clienteEmails.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedEmails.length === clienteEmails.length) {
                                  setSelectedEmails([]);
                                } else {
                                  setSelectedEmails([...clienteEmails]);
                                }
                              }}
                              className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {selectedEmails.length === clienteEmails.length ? "Ninguno" : "Todos"}
                            </button>
                          )}
                        </div>

                        {clienteEmails.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {clienteEmails.map((email, idx) => (
                              <motion.button
                                key={email}
                                type="button"
                                onClick={() => toggleEmailSelection(email)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
                                  selectedEmails.includes(email)
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                )}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                                    selectedEmails.includes(email)
                                      ? "bg-blue-500 border-blue-500"
                                      : "border-zinc-300 dark:border-zinc-600"
                                  )}
                                >
                                  {selectedEmails.includes(email) && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <span className="truncate flex-1">{email}</span>
                              </motion.button>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                          <button
                            type="button"
                            onClick={() => {
                              setShowManualInput(true);
                              setTimeout(() => manualEmailInputRef.current?.focus(), 100);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                          >
                            <UserPlus className="h-3 w-3" />
                            Otro email
                          </button>
                          {clienteEmails.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedTipo) {
                                  handleSendEmail(selectedTipo, selectedEmails, {
                                    periodo: selectedTipo === "por_periodo" ? periodo : undefined,
                                    mensaje: mensajePersonalizado,
                                  });
                                }
                              }}
                              disabled={selectedEmails.length === 0 || sending}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition-colors",
                                selectedEmails.length > 0
                                  ? "bg-blue-500 text-white hover:bg-blue-600"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                              )}
                            >
                              {sending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Enviar ({selectedEmails.length})
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      // Input manual de email
                      <>
                        <div className="flex items-center gap-2 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowManualInput(false);
                              setManualEmail("");
                            }}
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Enviar a otro email
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            ref={manualEmailInputRef}
                            type="email"
                            placeholder="ejemplo@email.com"
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleManualEmailSubmit();
                              }
                              if (e.key === "Escape") {
                                setShowManualInput(false);
                                setManualEmail("");
                              }
                            }}
                            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {manualEmail && (
                            <button
                              type="button"
                              onClick={() => setManualEmail("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleManualEmailSubmit}
                          disabled={!manualEmail || !manualEmail.includes("@") || sending}
                          className={cn(
                            "w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            manualEmail && manualEmail.includes("@")
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                          )}
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Enviar
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Diálogo para selección de período */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Resumen por período
            </DialogTitle>
            <DialogDescription>
              Selecciona el período de movimientos que deseas incluir en el email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger id="periodo">
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="15">Últimos 15 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="60">Últimos 60 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensaje">Mensaje personalizado (opcional)</Label>
              <Textarea
                id="mensaje"
                placeholder="Agregue un mensaje adicional si lo desea..."
                value={mensajePersonalizado}
                onChange={(e) => setMensajePersonalizado(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setSelectedTipo(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handlePeriodoSubmit} className="bg-purple-600 hover:bg-purple-700">
              <Send className="h-4 w-4 mr-2" />
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
