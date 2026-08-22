"use client";

import { useState } from "react";
import { useSession } from "@/lib/hooks/use-session";
import { EquipoContrato } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  Box,
  DollarSign,
  FileText,
  AlertCircle,
  Wrench,
  Printer,
  Download,
  Clock,
  Hash,
  RefreshCw,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { downloadContratoPDF, printContratoPDF } from "@/lib/pdf-contrato";
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
import { ServicioTecnicoFormDialog } from "./ServicioTecnicoFormDialog";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetItemCard,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";
import { useRouter } from "next/navigation";
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";

interface ContratoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: EquipoContrato | null;
  onEdit?: (contrato: EquipoContrato) => void;
  onSuccess?: () => void;
}

const estadoColors: Record<string, string> = {
  borrador: "bg-gray-500",
  activo: "bg-green-500",
  vencido: "bg-red-500",
  finalizado: "bg-blue-500",
  cancelado: "bg-gray-400",
};

const tipoLabels: Record<string, string> = {
  comodato: "Comodato",
  alquiler: "Alquiler",
  demo: "Demo",
  prestamo: "Préstamo",
};

export function ContratoDetailSheet({
  open,
  onOpenChange,
  contrato,
  onEdit,
  onSuccess,
}: ContratoDetailSheetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId ?? '';
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [servicioFormOpen, setServicioFormOpen] = useState(false);
  const [showAllPrecios, setShowAllPrecios] = useState(false);

  if (!contrato) return null;

  const diasRestantes = contrato.fecha_fin
    ? Math.ceil(
        (new Date(contrato.fecha_fin).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const handleEdit = () => {
    onEdit?.(contrato);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/equipos-contratos/${contrato.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar contrato");
      }

      toast.success("Contrato eliminado correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleServiceSuccess = () => {
    toast.success("Servicio técnico creado correctamente");
    setServicioFormOpen(false);
    onSuccess?.();
  };

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setTimeout(() => router.push(path), 300);
  };

  const formatCurrency = useFormatCurrency()

  return (
    <>
      <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="blue">
        <DetailSheetHeader
          icon={Box}
          title={`Contrato de ${tipoLabels[contrato.tipo] || contrato.tipo}`}
          theme="blue"
          subtitle={
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {contrato.equipo_unidad?.codigo} -{" "}
              {contrato.equipo_unidad?.equipo?.marca}{" "}
              {contrato.equipo_unidad?.equipo?.modelo}
            </span>
          }
          badges={
            <>
              <Badge className={`text-xs text-white ${estadoColors[contrato.estado]}`}>
                {contrato.estado.charAt(0).toUpperCase() + contrato.estado.slice(1)}
              </Badge>
              {diasRestantes !== null && diasRestantes > 0 && diasRestantes < 30 && (
                <Badge variant="destructive" className="h-5 text-xs">
                  {diasRestantes} días restantes
                </Badge>
              )}
            </>
          }
          onEdit={handleEdit}
          onDelete={() => setShowDeleteDialog(true)}
          actions={
            <>
              <Button
                type="outline"
                size="tiny"
                onClick={() => printContratoPDF(contrato, orgId)}
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="outline"
                size="tiny"
                onClick={() => downloadContratoPDF(contrato, orgId)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </>
          }
        />

        <DetailSheetContent>
          {/* Información del Equipo */}
          <DetailSheetSection icon={Box} title="Equipo" theme="teal">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailSheetInfoItem
                icon={Hash}
                label="Código"
                theme="teal"
                value={
                  <span className="font-mono">
                    {contrato.equipo_unidad?.codigo || "-"}
                  </span>
                }
              />
              <DetailSheetInfoItem
                icon={Box}
                label="Marca/Modelo"
                theme="teal"
                value={`${contrato.equipo_unidad?.equipo?.marca || ""} ${
                  contrato.equipo_unidad?.equipo?.modelo || ""
                }`}
              />
              <DetailSheetInfoItem
                icon={Hash}
                label="N° Serie"
                theme="gray"
                value={
                  <span className="font-mono">
                    {contrato.equipo_unidad?.numero_serie || "-"}
                  </span>
                }
              />
              <DetailSheetInfoItem
                icon={Box}
                label="Tipo"
                theme="gray"
                value={contrato.equipo_unidad?.equipo?.tipo || "-"}
              />
            </div>
          </DetailSheetSection>

          {/* Cliente */}
          <DetailSheetSection
            icon={User}
            title="Cliente"
            theme="indigo"
            action={
              contrato.cliente_id && (
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => navigateTo(`/dashboard/empresas?id=${contrato.cliente_id}`)}
                >
                  Ver empresa
                </Button>
              )
            }
          >
            {contrato.cliente ? (
              <DetailSheetItemCard
                icon={User}
                title={contrato.cliente.razon_social || contrato.cliente.nombre || ""}
                subtitle={
                  contrato.cliente.identificador_unico
                    ? `CUIT/DNI: ${contrato.cliente.identificador_unico}`
                    : undefined
                }
                theme="indigo"
                onClick={() =>
                  navigateTo(`/dashboard/empresas?id=${contrato.cliente_id}`)
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sin cliente asignado</p>
            )}
          </DetailSheetSection>

          {/* Detalles del Contrato */}
          <DetailSheetSection icon={Calendar} title="Detalles del Contrato" theme="purple">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailSheetInfoItem
                icon={FileText}
                label="Tipo"
                theme="purple"
                value={
                  <Badge variant="secondary">
                    {tipoLabels[contrato.tipo] || contrato.tipo}
                  </Badge>
                }
              />
              <DetailSheetInfoItem
                icon={Calendar}
                label="Fecha Inicio"
                theme="purple"
                value={format(new Date(contrato.fecha_inicio), "dd/MM/yyyy", {
                  locale: es,
                })}
              />
              {contrato.fecha_fin && (
                <>
                  <DetailSheetInfoItem
                    icon={Calendar}
                    label="Fecha Fin"
                    theme="amber"
                    value={format(new Date(contrato.fecha_fin), "dd/MM/yyyy", {
                      locale: es,
                    })}
                  />
                  {diasRestantes !== null && (
                    <DetailSheetInfoItem
                      icon={Clock}
                      label="Días Restantes"
                      theme={diasRestantes < 30 ? "rose" : "green"}
                      value={
                        <span
                          className={`font-medium ${
                            diasRestantes < 30 ? "text-red-600" : ""
                          }`}
                        >
                          {diasRestantes > 0 ? `${diasRestantes} días` : "Vencido"}
                        </span>
                      }
                    />
                  )}
                </>
              )}
              {contrato.duracion_meses && (
                <DetailSheetInfoItem
                  icon={Clock}
                  label="Duración"
                  theme="gray"
                  value={`${contrato.duracion_meses} ${
                    contrato.duracion_meses === 1 ? "mes" : "meses"
                  }`}
                />
              )}
              <DetailSheetInfoItem
                icon={RefreshCw}
                label="Renovación Automática"
                theme="cyan"
                value={
                  <Badge variant={contrato.renovacion_automatica ? "default" : "secondary"}>
                    {contrato.renovacion_automatica ? "Sí" : "No"}
                  </Badge>
                }
              />
            </div>
          </DetailSheetSection>

          {/* Información Financiera */}
          <DetailSheetSection icon={DollarSign} title="Información Financiera" theme="emerald">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailSheetInfoItem
                icon={DollarSign}
                label="Costo Mensual"
                theme="emerald"
                value={
                  <span className="font-medium">
                    {contrato.costo_mensual > 0
                      ? formatCurrency(contrato.costo_mensual)
                      : "Sin costo"}
                  </span>
                }
              />
              <DetailSheetInfoItem
                icon={DollarSign}
                label="Costo Total"
                theme="emerald"
                value={
                  <span className="font-medium">
                    {contrato.costo_total > 0
                      ? formatCurrency(contrato.costo_total)
                      : "Sin costo"}
                  </span>
                }
              />
              <DetailSheetInfoItem
                icon={Wrench}
                label="Mantenimiento Incluido"
                theme="amber"
                value={
                  <Badge
                    variant={
                      contrato.requiere_mantenimiento_incluido ? "default" : "secondary"
                    }
                  >
                    {contrato.requiere_mantenimiento_incluido ? "Sí" : "No"}
                  </Badge>
                }
              />
            </div>
          </DetailSheetSection>

          {/* Condiciones Especiales */}
          {contrato.condiciones_especiales && (
            <DetailSheetSection icon={FileText} title="Condiciones Especiales" theme="gray">
              <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-line">
                {contrato.condiciones_especiales}
              </div>
            </DetailSheetSection>
          )}

          {/* Información de Devolución */}
          {contrato.fecha_devolucion_real && (
            <DetailSheetSection icon={AlertCircle} title="Información de Devolución" theme="orange">
              <div className="grid grid-cols-2 gap-3">
                <DetailSheetInfoItem
                  icon={Calendar}
                  label="Fecha Devolución"
                  theme="orange"
                  value={format(new Date(contrato.fecha_devolucion_real), "dd/MM/yyyy", {
                    locale: es,
                  })}
                />
                {contrato.condicion_devolucion && (
                  <DetailSheetInfoItem
                    icon={CheckCircle2}
                    label="Condición"
                    theme="orange"
                    value={contrato.condicion_devolucion}
                  />
                )}
              </div>
              {contrato.danos_registrados && contrato.danos_registrados.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                    Daños Registrados ({contrato.danos_registrados.length})
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                    {contrato.danos_registrados.map((dano: any, i: number) => (
                      <li key={i}>• {typeof dano === "string" ? dano : dano.descripcion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </DetailSheetSection>
          )}

          {/* Historial de Precios */}
          {contrato.historial_precios && contrato.historial_precios.length > 0 && (() => {
            const precios = [...contrato.historial_precios].sort((a, b) =>
              b.periodo.localeCompare(a.periodo)
            );
            const mesActual = format(new Date(), "yyyy-MM");
            const precioMesActual = precios.find((p) => p.periodo === mesActual);
            const visiblePrecios = showAllPrecios ? precios : precios.slice(0, 6);

            return (
              <DetailSheetSection
                icon={Receipt}
                title="Historial de Precios"
                theme="amber"
                action={
                  <span className="text-xs text-muted-foreground">
                    {precios.length} meses
                  </span>
                }
              >
                {/* Mes actual destacado */}
                <div className={`p-3 rounded-lg border-2 ${
                  precioMesActual
                    ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                    : "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Mes actual ({mesActual})</p>
                      <p className="text-lg font-bold">
                        {precioMesActual
                          ? formatCurrency(precioMesActual.monto)
                          : formatCurrency(contrato.costo_mensual)}
                      </p>
                    </div>
                    <Badge className={precioMesActual
                      ? "bg-green-500 text-white"
                      : "bg-orange-500 text-white"
                    }>
                      {precioMesActual ? "Registrado" : "Sin registrar"}
                    </Badge>
                  </div>
                </div>

                {/* Tabla de precios */}
                <div className="mt-3 space-y-0.5 max-h-[250px] overflow-y-auto">
                  {visiblePrecios.map((p) => {
                    const [year, month] = p.periodo.split("-");
                    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    const label = `${monthNames[parseInt(month) - 1]} ${year}`;
                    const isCurrent = p.periodo === mesActual;

                    return (
                      <div
                        key={p.periodo}
                        className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                          isCurrent ? "bg-green-50 dark:bg-green-900/10 font-medium" : ""
                        }`}
                      >
                        <span className="text-xs text-muted-foreground w-20">{label}</span>
                        <div className="flex-1 mx-3 h-px bg-gray-200 dark:bg-gray-700" />
                        <span className="font-mono text-xs font-medium">
                          {formatCurrency(p.monto)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {precios.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPrecios(!showAllPrecios)}
                    className="w-full text-center py-1.5 text-xs text-primary hover:underline mt-1"
                  >
                    {showAllPrecios ? "Ver menos" : `Ver todos (${precios.length} meses)`}
                  </button>
                )}
              </DetailSheetSection>
            );
          })()}

          {/* Acciones Rápidas */}
          {contrato.estado === "activo" && (
            <DetailSheetSection icon={Wrench} title="Acciones Rápidas" theme="blue">
              <Button
                onClick={() => setServicioFormOpen(true)}
                className="w-full justify-start"
                type="outline"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Crear Servicio Técnico
              </Button>
            </DetailSheetSection>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex justify-between">
              <span>Creado:</span>
              <span>
                {format(new Date(contrato.created_at), "dd/MM/yyyy HH:mm", {
                  locale: es,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Actualizado:</span>
              <span>
                {format(new Date(contrato.updated_at), "dd/MM/yyyy HH:mm", {
                  locale: es,
                })}
              </span>
            </div>
          </div>
        </DetailSheetContent>
      </DetailSheetContainer>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El contrato será eliminado permanentemente
              y el equipo será marcado como disponible nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ServicioTecnicoFormDialog
        open={servicioFormOpen}
        onOpenChange={setServicioFormOpen}
        onSuccess={handleServiceSuccess}
        prefilledData={{
          equipo_unidad_id: contrato.equipo_unidad_id,
          cliente_id: contrato.cliente_id,
          tipo: contrato.requiere_mantenimiento_incluido
            ? "mantenimiento_preventivo"
            : "mantenimiento_correctivo",
        }}
      />
    </>
  );
}
