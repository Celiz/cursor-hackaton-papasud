"use client";

import { Producto } from "@/lib/types";
import { formatCurrency } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Calendar,
  DollarSign,
  Hash,
  TrendingUp,
  FileText,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetStatCard,
} from "./DetailSheetComponents";
import { EntidadRecursosSection } from "./EntidadRecursosSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompatibilidadTab } from "./producto-tabs/CompatibilidadTab";
import { ProveedoresTab } from "./producto-tabs/ProveedoresTab";
import { LotesTab } from "./producto-tabs/LotesTab";
import { ClientesTab } from "./producto-tabs/ClientesTab";

interface ProductoDetailSheetProps {
  producto: Producto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (producto: Producto) => void;
  onDelete?: (producto: Producto) => void;
}

export function ProductoDetailSheet({
  producto,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ProductoDetailSheetProps) {
  if (!producto) return null;

  const stockStatus = () => {
    if (!producto.stock_minimo) return null;
    if ((producto.stock_actual ?? 0) <= 0)
      return { label: "Sin stock", variant: "destructive" as const };
    if ((producto.stock_actual ?? 0) <= producto.stock_minimo)
      return { label: "Stock bajo", variant: "destructive" as const };
    return { label: "Stock normal", variant: "default" as const };
  };

  const status = stockStatus();

  // Convertir precios a números (pueden venir como strings desde la DB)
  const precioCosto = producto.precio_costo ? Number(producto.precio_costo) : 0;
  const precioVenta = producto.precio_venta ? Number(producto.precio_venta) : 0;

  const margenGanancia =
    precioCosto > 0 && precioVenta > 0
      ? (((precioVenta - precioCosto) / precioCosto) * 100).toFixed(2)
      : null;

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="purple">
      <DetailSheetHeader
        icon={Package}
        title={producto.nombre}
        theme="purple"
        subtitle={
          <span className="text-xs font-mono">
            Código: {producto.codigo || "Sin código"}
          </span>
        }
        badges={
          <>
            {status && (
              <Badge variant={status.variant} className="h-5 text-xs">
                {status.label}
              </Badge>
            )}
            {producto.categoria && (
              <Badge variant="outline" className="h-5 text-xs">
                {producto.categoria}
              </Badge>
            )}
          </>
        }
        onEdit={onEdit ? () => onEdit(producto) : undefined}
        onDelete={onDelete ? () => onDelete(producto) : undefined}
      />

      <DetailSheetContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="precios">Precios</TabsTrigger>
            <TabsTrigger value="stock">Stock + Lotes</TabsTrigger>
            <TabsTrigger value="compatibilidad">Compatibilidad</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="docs">Documentos</TabsTrigger>
          </TabsList>

          {/* General: Información General + Proveedor (si existe) + Timestamps */}
          <TabsContent value="general">
            <DetailSheetSection icon={Package} title="Información General" theme="purple">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <DetailSheetInfoItem
                  icon={Package}
                  label="Nombre"
                  theme="purple"
                  value={producto.nombre || "-"}
                />
                <DetailSheetInfoItem
                  icon={Hash}
                  label="Código"
                  theme="gray"
                  value={<span className="font-mono">{producto.codigo || "-"}</span>}
                />
                <DetailSheetInfoItem
                  icon={FileText}
                  label="Categoría"
                  theme="indigo"
                  value={producto.categoria || "-"}
                />
                <DetailSheetInfoItem
                  icon={Package}
                  label="Unidad"
                  theme="gray"
                  value={producto.unidad_medida || "-"}
                />
              </div>

              {producto.descripcion && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {producto.descripcion}
                </div>
              )}
            </DetailSheetSection>

            {producto.proveedor && (
              <DetailSheetSection icon={Truck} title="Información del Proveedor" theme="amber">
                <DetailSheetInfoItem
                  icon={Truck}
                  label="Proveedor"
                  theme="amber"
                  value={producto.proveedor}
                />
              </DetailSheetSection>
            )}

            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
              {producto.created_at && (
                <div className="flex justify-between">
                  <span>Fecha de Registro:</span>
                  <span>
                    {format(new Date(producto.created_at), "dd/MM/yyyy", { locale: es })}
                  </span>
                </div>
              )}
              {producto.updated_at && (
                <div className="flex justify-between">
                  <span>Última Actualización:</span>
                  <span>
                    {format(new Date(producto.updated_at), "dd/MM/yyyy", { locale: es })}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Precios */}
          <TabsContent value="precios">
            <DetailSheetSection icon={DollarSign} title="Información de Precios" theme="emerald">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Precio de Costo</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {formatCurrency(precioCosto, producto.moneda || 'ARS')}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Precio de Venta</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {formatCurrency(precioVenta, producto.moneda || 'ARS')}
                  </p>
                </div>
                {margenGanancia && (
                  <DetailSheetInfoItem
                    icon={TrendingUp}
                    label="Margen de Ganancia"
                    theme="emerald"
                    value={
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {margenGanancia}%
                      </span>
                    }
                  />
                )}
              </div>
            </DetailSheetSection>
          </TabsContent>

          {/* Stock + Lotes */}
          <TabsContent value="stock">
            <DetailSheetSection icon={Hash} title="Control de Stock" theme="blue">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Stock Actual</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {producto.stock_actual || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {producto.unidad_medida || "unidades"}
                  </p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Stock Mínimo</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {producto.stock_minimo || 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {producto.unidad_medida || "unidades"}
                  </p>
                </div>
                {status && (
                  <div
                    className={`p-3 rounded-lg border text-center ${
                      status.variant === "destructive"
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-400">Estado</p>
                    <p
                      className={`text-sm font-bold mt-1 ${
                        status.variant === "destructive"
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {status.label}
                    </p>
                    {status.variant === "destructive" && producto.stock_minimo && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Requiere reposición
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DetailSheetSection>
            <LotesTab productoId={producto.id} />
          </TabsContent>

          {/* Compatibilidad */}
          <TabsContent value="compatibilidad">
            <CompatibilidadTab productoId={producto.id} />
          </TabsContent>

          {/* Proveedores */}
          <TabsContent value="proveedores">
            <ProveedoresTab productoId={producto.id} />
          </TabsContent>

          {/* Clientes */}
          <TabsContent value="clientes">
            <ClientesTab productoId={producto.id} />
          </TabsContent>

          {/* Documentos */}
          <TabsContent value="docs">
            <DetailSheetSection icon={FileText} title="Documentos" theme="blue">
              <EntidadRecursosSection entidadTipo="producto" entidadId={producto.id} />
            </DetailSheetSection>
          </TabsContent>
        </Tabs>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
