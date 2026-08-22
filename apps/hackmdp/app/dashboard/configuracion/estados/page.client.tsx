"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical, Wrench, DollarSign } from "lucide-react";
import { EstadoFormDialog } from "@/components/core-ui/EstadoFormDialog";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sheetClasses } from "@/lib/design-system";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error)
    throw new Error(data.error || "Error al cargar estados");
  return Array.isArray(data) ? data : [];
};

export default function EstadosPageClient() {
  const [selectedEstado, setSelectedEstado] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tipoForm, setTipoForm] = useState<"servicio" | "contable">("servicio");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estadoToDelete, setEstadoToDelete] = useState<any | null>(null);

  const { data: estadosServicio, mutate: mutateServicio } = useSWR(
    "/api/configuracion/estados?tipo=servicio",
    fetcher
  );

  const { data: estadosContable, mutate: mutateContable } = useSWR(
    "/api/configuracion/estados?tipo=contable",
    fetcher
  );

  const handleNew = (tipo: "servicio" | "contable") => {
    setSelectedEstado(null);
    setTipoForm(tipo);
    setFormOpen(true);
  };

  const handleEdit = (estado: any) => {
    setSelectedEstado(estado);
    setTipoForm(estado.tipo);
    setFormOpen(true);
  };

  const handleDeleteClick = (estado: any) => {
    setEstadoToDelete(estado);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!estadoToDelete) return;

    try {
      const res = await fetch(
        `/api/configuracion/estados?id=${estadoToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar estado");
      }

      toast.success("Estado eliminado correctamente");
      if (estadoToDelete.tipo === "servicio") {
        mutateServicio();
      } else {
        mutateContable();
      }
    } catch (error: any) {
      console.error("Error deleting estado:", error);
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setEstadoToDelete(null);
    }
  };

  const handleSuccess = () => {
    mutateServicio();
    mutateContable();
  };

  const renderTable = (estados: any[] | undefined, tipo: "servicio" | "contable") => {
    if (!estados || estados.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No hay estados configurados</p>
          <Button
            type="primary"
            size="tiny"
            className="mt-4"
            onClick={() => handleNew(tipo)}
            icon={<Plus />}
          >
            Crear primer estado
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Icono</TableHead>
              <TableHead className="w-[150px]">Vista Previa</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estados.map((estado) => (
              <TableRow key={estado.id}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                </TableCell>
                <TableCell className="font-medium">{estado.label}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground capitalize">
                    {estado.color}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground font-mono">
                    {estado.icon || "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={estado.color as any}>{estado.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(estado)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(estado)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configuración de Estados
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los estados personalizables para servicios y contabilidad
            </p>
          </div>
        </div>

        <Tabs defaultValue="servicio" className="space-y-4">
          <TabsList className={cn(sheetClasses.tabsList, "grid-cols-2")}>
            <TabsTrigger value="servicio" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
              <Wrench className="w-4 h-4" />
              <span className="text-sm">Estados de Servicio</span>
            </TabsTrigger>
            <TabsTrigger value="contable" className={cn(sheetClasses.tabsTrigger, "gap-1.5")}>
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Estados Contables</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servicio" className="space-y-4 mt-0 p-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estados de Servicio Técnico</CardTitle>
                    <CardDescription>
                      Configura los estados para las órdenes de servicio
                    </CardDescription>
                  </div>
                  <Button
                    type="primary"
                    size="tiny"
                    onClick={() => handleNew("servicio")}
                    icon={<Plus />}
                  >
                    Nuevo Estado
                  </Button>
                </div>
              </CardHeader>
              <CardContent>{renderTable(estadosServicio, "servicio")}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contable" className="space-y-4 mt-0 p-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estados Contables</CardTitle>
                    <CardDescription>
                      Configura los estados contables para facturación
                    </CardDescription>
                  </div>
                  <Button
                    type="primary"
                    size="tiny"
                    onClick={() => handleNew("contable")}
                    icon={<Plus />}
                  >
                    Nuevo Estado
                  </Button>
                </div>
              </CardHeader>
              <CardContent>{renderTable(estadosContable, "contable")}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EstadoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        estado={selectedEstado}
        tipo={tipoForm}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el estado "{estadoToDelete?.label}". Los
              servicios con este estado permanecerán sin cambios, pero el estado
              no estará disponible para nuevos servicios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
