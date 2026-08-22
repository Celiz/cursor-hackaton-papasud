"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar datos");
  return Array.isArray(data) ? data : [];
};

interface CatalogItem {
  id: string;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  color?: string;
  icono?: string;
  orden: number;
  activo: boolean;
  [key: string]: any;
}

interface CatalogManagerProps {
  title: string;
  description: string;
  apiEndpoint: string;
  fields: {
    name: string;
    label: string;
    type: "text" | "textarea" | "number" | "color" | "checkbox";
    required?: boolean;
  }[];
}

export function CatalogManager({
  title,
  description,
  apiEndpoint,
  fields,
}: CatalogManagerProps) {
  const { data: items = [], mutate, isLoading } = useSWR<CatalogItem[]>(
    apiEndpoint,
    fetcher
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState<Partial<CatalogItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNew = () => {
    setEditingItem(null);
    setFormData({ activo: true, orden: items.length + 1 });
    setDialogOpen(true);
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este elemento?")) return;

    try {
      const res = await fetch(`${apiEndpoint}?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast.success("Elemento eliminado exitosamente");
      mutate();
    } catch (error) {
      toast.error("Error al eliminar elemento");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const method = editingItem ? "PATCH" : "POST";
      const body = editingItem
        ? { id: editingItem.id, ...formData }
        : formData;

      const res = await fetch(apiEndpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success(
        editingItem
          ? "Elemento actualizado exitosamente"
          : "Elemento creado exitosamente"
      );
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error("Error al guardar elemento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, activo: !item.activo }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      toast.success("Estado actualizado");
      mutate();
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button iconLeft={<Plus className="h-4 w-4" />} onClick={handleNew}>
          Nuevo
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Nombre</TableHead>
              {fields.find((f) => f.name === "codigo") && (
                <TableHead className="w-24">Código</TableHead>
              )}
              {fields.find((f) => f.name === "color") && (
                <TableHead className="w-24">Color</TableHead>
              )}
              <TableHead>Descripción</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={fields.find((f) => f.name === "codigo") ? 7 : 6}
                  className="text-center py-8"
                >
                  Cargando...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={fields.find((f) => f.name === "codigo") ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay elementos
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.orden}</TableCell>
                  <TableCell className="font-semibold">{item.nombre}</TableCell>
                  {fields.find((f) => f.name === "codigo") && (
                    <TableCell>
                      <Badge variant="outline">{item.codigo}</Badge>
                    </TableCell>
                  )}
                  {fields.find((f) => f.name === "color") && (
                    <TableCell>
                      {item.color && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {item.color}
                          </span>
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {item.descripcion || "-"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="flex items-center gap-1"
                    >
                      {item.activo ? (
                        <Badge className="bg-green-500 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        iconLeft={<Pencil className="h-4 w-4" />}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        iconLeft={<Trash2 className="h-4 w-4" />}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent
          className="w-full h-[95vh] overflow-hidden p-0"
          side="bottom"
        >
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b shrink-0">
              <SheetTitle>
                {editingItem ? "Editar" : "Nuevo"} {title}
              </SheetTitle>
              <SheetDescription>
                {editingItem
                  ? "Modifica los datos del elemento"
                  : "Completa los datos del nuevo elemento"}
              </SheetDescription>
            </SheetHeader>

            <Separator />

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col">
              <div className="grid gap-4 flex-1">
                {fields.map((field) => (
                  <div key={field.name} className="grid gap-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.name}
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, [field.name]: e.target.value })
                        }
                        required={field.required}
                      />
                    ) : field.type === "checkbox" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={field.name}
                          checked={formData[field.name] || false}
                          onChange={(e) =>
                            setFormData({ ...formData, [field.name]: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <Label htmlFor={field.name} className="font-normal cursor-pointer">
                          {field.label}
                        </Label>
                      </div>
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type}
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [field.name]:
                              field.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
