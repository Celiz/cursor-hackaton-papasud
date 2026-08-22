"use client";

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Building,
  Wallet,
  Edit,
  Trash2,
  Calendar,
  FileText,
  Hash,
  CheckCircle2,
  XCircle,
  DollarSign,
  Globe,
  History,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sheetClasses } from '@/lib/design-system';
import { PlanCuenta } from '@/app/dashboard/contabilidad/plan-cuentas/columns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { toast } from 'sonner';

interface PlanCuentaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: PlanCuenta | null;
  onEdit?: (cuenta: PlanCuenta) => void;
  onSuccess?: () => void;
}

const getTipoIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'activo':
      return <Banknote className="h-6 w-6 text-green-600" />;
    case 'pasivo':
      return <TrendingDown className="h-6 w-6 text-red-600" />;
    case 'patrimonio':
      return <Building className="h-6 w-6 text-blue-600" />;
    case 'ingreso':
      return <TrendingUp className="h-6 w-6 text-emerald-600" />;
    case 'gasto':
      return <Wallet className="h-6 w-6 text-orange-600" />;
    default:
      return <FileText className="h-6 w-6" />;
  }
};

const getTipoBadgeColor = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'activo':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'pasivo':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'patrimonio':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ingreso':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'gasto':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export function PlanCuentaDetailSheet({
  open,
  onOpenChange,
  cuenta,
  onEdit,
  onSuccess,
}: PlanCuentaDetailSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!cuenta) return null;

  const tipoLabel = cuenta.tipo.charAt(0).toUpperCase() + cuenta.tipo.slice(1);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(cuenta);
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contabilidad/plan-cuentas?id=${cuenta.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al eliminar cuenta');
      }

      toast.success('Cuenta eliminada correctamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full h-[95vh] overflow-hidden p-0 bg-purple-50 dark:bg-gray-950"
          side="bottom"
        >
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    {getTipoIcon(cuenta.tipo)}
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">
                      {cuenta.nombre}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono text-muted-foreground">
                        {cuenta.codigo}
                      </span>
                      <Badge variant="outline" className={getTipoBadgeColor(cuenta.tipo)}>
                        {tipoLabel}
                      </Badge>
                      <Badge variant={cuenta.activa ? "default" : "secondary"}>
                        {cuenta.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {onEdit && (
                    <Button
                      size="tiny"
                      type="default"
                      onClick={handleEdit}
                      iconLeft={<Edit className="h-4 w-4" />}
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    size="tiny"
                    type="danger"
                    onClick={() => setShowDeleteDialog(true)}
                    iconLeft={<Trash2 className="h-4 w-4" />}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className={cn(sheetClasses.tabsList, "grid-cols-3")}>
                  <TabsTrigger value="general" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Información General</span>
                  </TabsTrigger>
                  <TabsTrigger value="config" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Configuración</span>
                  </TabsTrigger>
                  <TabsTrigger value="historial" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
                    <History className="w-4 h-4" />
                    <span className="text-sm">Historial</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-0 p-4">
                  {/* Información Básica */}
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <FileText className="h-5 w-5" />
                      Información Básica
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <p className="font-mono font-medium text-sm mt-1">
                          {cuenta.codigo}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Nivel</Label>
                        <p className="font-medium text-sm mt-1">
                          Nivel {cuenta.nivel}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                        <p className="font-medium text-sm mt-1">
                          {cuenta.nombre}
                        </p>
                      </div>
                    </div>

                    {cuenta.descripcion && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">Descripción</Label>
                        <p className="text-sm mt-2 p-3 bg-muted/50 rounded-lg">
                          {cuenta.descripcion}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tipo y Categoría */}
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <Hash className="h-5 w-5" />
                      Clasificación
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Tipo de Cuenta</Label>
                        <div className="mt-2">
                          <Badge variant="outline" className={getTipoBadgeColor(cuenta.tipo)}>
                            {tipoLabel}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Estado</Label>
                        <div className="mt-2">
                          <Badge variant={cuenta.activa ? "default" : "secondary"}>
                            {cuenta.activa ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Activa
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactiva
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadatos */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg bg-card">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de Creación
                      </Label>
                      <p className="font-semibold mt-1">
                        {format(new Date(cuenta.created_at), "PPP", { locale: es })}
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg bg-card">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Última Actualización
                      </Label>
                      <p className="font-semibold mt-1">
                        {format(new Date(cuenta.updated_at), "PPP", { locale: es })}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="space-y-6 mt-0 p-4">
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <Globe className="h-5 w-5" />
                      Configuración Contable
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Cuenta Imputable</span>
                        <Badge variant="outline">Por implementar</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Requiere Centro de Costo</span>
                        <Badge variant="outline">Por implementar</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Requiere Tercero</span>
                        <Badge variant="outline">Por implementar</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Acepta Multimoneda</span>
                        <Badge variant="outline">Por implementar</Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="historial" className="space-y-6 mt-0 p-4">
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                      <DollarSign className="h-5 w-5" />
                      Historial de Movimientos
                    </h3>
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">
                        El historial de movimientos se mostrará aquí cuando se implemente el módulo de asientos contables.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la cuenta <strong>{cuenta.codigo} - {cuenta.nombre}</strong>?
              Esta acción no se puede deshacer.
              {cuenta.padre_id && (
                <span className="block mt-2 text-yellow-600">
                  Nota: Esta cuenta podría tener subcuentas asociadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
