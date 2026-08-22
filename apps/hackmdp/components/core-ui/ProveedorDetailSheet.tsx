"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Copy,
  ExternalLink,
  TrendingUp,
  Receipt,
  BookOpen,
} from "lucide-react";
import { Proveedor, RemitoCompra } from "@/lib/types";
import { CatalogoTab } from "./CatalogoTab";
import { toast } from "sonner";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { formatCurrency } from "@/lib/format-currency";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProveedorDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedor: Proveedor | null;
  onEdit?: (proveedor: Proveedor) => void;
  onDelete?: (proveedor: Proveedor) => void;
  onRefresh?: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado al portapapeles`);
};

export function ProveedorDetailSheet({
  open,
  onOpenChange,
  proveedor,
  onEdit,
  onDelete,
  onRefresh,
}: ProveedorDetailSheetProps) {
  // Fetch remitos de compra del proveedor
  const { data: remitos = [] } = useSWR<RemitoCompra[]>(
    open && proveedor ? `/api/remitos-compra?proveedor_id=${proveedor.id}` : null,
    fetcher
  );

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!remitos || !Array.isArray(remitos)) {
      return {
        totalCompras: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        cantidadRemitos: 0,
        remitosPendientes: 0,
      };
    }

    const totalCompras = remitos.reduce((sum, r) => sum + (r.total || 0), 0);
    const saldoPendiente = remitos.reduce((sum, r) => sum + (r.saldo_pendiente || 0), 0);
    const totalPagado = totalCompras - saldoPendiente;
    const remitosPendientes = remitos.filter((r) => r.estado === "pendiente").length;

    return {
      totalCompras,
      totalPagado,
      saldoPendiente,
      cantidadRemitos: remitos.length,
      remitosPendientes,
    };
  }, [remitos]);

  if (!proveedor) return null;

  const condicionesPagoLabel: Record<string, string> = {
    contado: "Contado",
    "15_dias": "15 días",
    "30_dias": "30 días",
    "45_dias": "45 días",
    "60_dias": "60 días",
    "90_dias": "90 días",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-[600px] overflow-hidden p-0 bg-gradient-to-br from-white via-white to-blue-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-blue-950/10"
        side="right"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b border-gray-200/50 dark:border-gray-800/30 shrink-0 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-950/10 dark:to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 rounded-2xl border border-blue-200/30 dark:border-blue-800/30 shadow-sm">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {proveedor.nombre}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {proveedor.cuit && (
                    <Badge
                      variant="outline"
                      className="text-gray-500 border-gray-300 cursor-pointer hover:bg-gray-100"
                      onClick={() => copyToClipboard(proveedor.cuit, "CUIT")}
                    >
                      CUIT: {proveedor.cuit}
                      <Copy className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                  <Badge
                    variant={proveedor.estado === "activo" ? "default" : "secondary"}
                    className={cn(
                      proveedor.estado === "activo"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {proveedor.estado || "activo"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 flex-shrink-0">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(proveedor)}
                  className="gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 pb-6 pt-4">
          <Tabs defaultValue="info" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className={cn(sheetClasses.tabsList, "grid-cols-4")}>
              <TabsTrigger value="info" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <Building2 className="w-4 h-4" />
                <span className="text-sm">Info</span>
              </TabsTrigger>
              <TabsTrigger value="cuenta" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Cuenta</span>
              </TabsTrigger>
              <TabsTrigger value="compras" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <Receipt className="w-4 h-4" />
                <span className="text-sm">Compras</span>
              </TabsTrigger>
              <TabsTrigger value="catalogo" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Catálogo</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Info */}
            <TabsContent value="info" className="flex-1 overflow-auto mt-0 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Contacto */}
                <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900/50">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Phone className="h-4 w-4 text-blue-500" />
                    Contacto
                  </h3>

                  {proveedor.email && proveedor.email.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <div className="flex flex-wrap gap-2">
                        {proveedor.email.map((email) => (
                          <a
                            key={email}
                            href={`mailto:${email}`}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {email}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {proveedor.telefono && proveedor.telefono.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                      <div className="flex flex-wrap gap-2">
                        {proveedor.telefono.map((tel) => (
                          <a
                            key={tel}
                            href={`tel:${tel}`}
                            className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {tel}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {!proveedor.email?.length && !proveedor.telefono?.length && (
                    <p className="text-sm text-muted-foreground">Sin información de contacto</p>
                  )}
                </section>

                {/* Dirección */}
                {(proveedor.direccion || proveedor.localidad || proveedor.provincia) && (
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900/50">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-red-500" />
                      Dirección
                    </h3>
                    <div className="text-sm">
                      {proveedor.direccion && <p>{proveedor.direccion}</p>}
                      <p className="text-muted-foreground">
                        {[proveedor.localidad, proveedor.provincia, proveedor.codigo_postal]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </section>
                )}

                {/* Datos de Pago */}
                <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900/50">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    Condiciones de Pago
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Condiciones</p>
                      <p className="text-sm font-medium">
                        {condicionesPagoLabel[proveedor.condiciones_pago || ""] || "No especificado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Moneda</p>
                      <p className="text-sm font-medium">{proveedor.moneda || "ARS"}</p>
                    </div>
                  </div>

                  {(proveedor.cbu || proveedor.alias_cbu || proveedor.cuenta_bancaria) && (
                    <div className="pt-2 border-t space-y-2">
                      {proveedor.cuenta_bancaria && (
                        <div>
                          <p className="text-xs text-muted-foreground">Banco / Cuenta</p>
                          <p className="text-sm">{proveedor.cuenta_bancaria}</p>
                        </div>
                      )}
                      {proveedor.cbu && (
                        <div
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded -mx-2"
                          onClick={() => copyToClipboard(proveedor.cbu!, "CBU")}
                        >
                          <p className="text-xs text-muted-foreground">CBU</p>
                          <p className="text-sm font-mono flex items-center gap-2">
                            {proveedor.cbu}
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </p>
                        </div>
                      )}
                      {proveedor.alias_cbu && (
                        <div
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded -mx-2"
                          onClick={() => copyToClipboard(proveedor.alias_cbu!, "Alias")}
                        >
                          <p className="text-xs text-muted-foreground">Alias</p>
                          <p className="text-sm font-mono flex items-center gap-2">
                            {proveedor.alias_cbu}
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Notas */}
                {proveedor.notas && (
                  <section className="space-y-3 p-4 border border-gray-200/40 dark:border-gray-800/30 rounded-xl bg-white dark:bg-gray-900/50">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <FileText className="h-4 w-4 text-amber-500" />
                      Notas
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{proveedor.notas}</p>
                  </section>
                )}
              </motion.div>
            </TabsContent>

            {/* Tab Cuenta Corriente */}
            <TabsContent value="cuenta" className="flex-1 overflow-auto mt-0 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Resumen */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-xs text-muted-foreground">Total Compras</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalCompras)}</p>
                    <p className="text-xs text-muted-foreground">{stats.cantidadRemitos} remitos</p>
                  </div>

                  <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                    <p className="text-xs text-muted-foreground">Total Pagado</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalPagado)}</p>
                  </div>

                  <div
                    className={cn(
                      "p-4 rounded-xl border col-span-2",
                      stats.saldoPendiente > 0
                        ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                        <p
                          className={cn(
                            "text-2xl font-bold",
                            stats.saldoPendiente > 0 ? "text-orange-600" : "text-gray-600"
                          )}
                        >
                          {formatCurrency(stats.saldoPendiente)}
                        </p>
                      </div>
                      {stats.remitosPendientes > 0 && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                          {stats.remitosPendientes} pendiente{stats.remitosPendientes !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Para ver el detalle completo, visita la sección de Cuentas Corrientes de Proveedores
                </p>
              </motion.div>
            </TabsContent>

            {/* Tab Compras */}
            <TabsContent value="compras" className="flex-1 overflow-hidden mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Últimas Compras ({remitos.length})
                  </h3>
                </div>

                {remitos.length > 0 ? (
                  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                    <div className="space-y-2 pb-4">
                      <AnimatePresence mode="popLayout">
                        {remitos.slice(0, 10).map((remito, index) => (
                          <motion.div
                            key={remito.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{remito.numero}</span>
                                  <Badge
                                    variant={remito.estado === "pagada" ? "default" : "outline"}
                                    className={cn(
                                      "text-xs",
                                      remito.estado === "pagada"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    )}
                                  >
                                    {remito.estado}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(remito.fecha)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm">{formatCurrency(remito.total)}</p>
                                {remito.saldo_pendiente && remito.saldo_pendiente > 0 && (
                                  <p className="text-xs text-orange-600">
                                    Pend: {formatCurrency(remito.saldo_pendiente)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay compras registradas</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>
            {/* Tab Catálogo */}
            <TabsContent value="catalogo" className="flex-1 overflow-hidden mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <CatalogoTab
                  proveedorId={proveedor.id}
                  proveedorNombre={proveedor.nombre}
                />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer con fecha */}
        <div className="px-6 py-3 border-t bg-gray-50/50 dark:bg-gray-900/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Creado: {formatDate(proveedor.created_at)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
