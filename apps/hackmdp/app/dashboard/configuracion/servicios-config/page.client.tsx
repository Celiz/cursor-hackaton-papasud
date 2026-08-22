"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Wrench,
  Phone,
  Settings2,
  CheckCircle,
  Search,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { cn } from "@/lib/utils";

interface ConfigItem {
  id: string;
  tipo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

type ConfigType = "tecnico" | "tipo_servicio" | "modo_contacto";

const CONFIG_TYPES: {
  value: ConfigType;
  label: string;
  labelSingular: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}[] = [
  {
    value: "tecnico",
    label: "Técnicos",
    labelSingular: "Técnico",
    icon: <Users className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    description: "Personal técnico que realiza los servicios"
  },
  {
    value: "tipo_servicio",
    label: "Tipos de Servicio",
    labelSingular: "Tipo de Servicio",
    icon: <Wrench className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    description: "Categorías de servicios disponibles"
  },
  {
    value: "modo_contacto",
    label: "Modos de Contacto",
    labelSingular: "Modo de Contacto",
    icon: <Phone className="h-5 w-5" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    description: "Formas de comunicación con clientes"
  },
];

export default function ServiciosConfigPage() {
  const [activeTab, setActiveTab] = useState<ConfigType>("tecnico");
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ConfigItem | null>(null);
  const [formData, setFormData] = useState({ nombre: "", descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeConfig = CONFIG_TYPES.find(t => t.value === activeTab)!;

  const loadItems = async (tipo: ConfigType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/servicios-configuracion?tipo=${tipo}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error("Error loading items:", error);
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(activeTab);
    setSearchQuery("");
  }, [activeTab]);

  const filteredItems = items.filter(item =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ nombre: "", descripcion: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ConfigItem) => {
    setEditingItem(item);
    setFormData({ nombre: item.nombre, descripcion: item.descripcion || "" });
    setDialogOpen(true);
  };

  const handleOpenDelete = (item: ConfigItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const res = await fetch("/api/servicios-configuracion", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
          }),
        });
        if (!res.ok) throw new Error("Error al actualizar");
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span><strong>{formData.nombre}</strong> actualizado correctamente</span>
          </div>
        );
      } else {
        const res = await fetch("/api/servicios-configuracion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: activeTab,
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
            orden: items.length + 1,
          }),
        });
        if (!res.ok) throw new Error("Error al crear");
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span><strong>{formData.nombre}</strong> agregado correctamente</span>
          </div>
        );
      }
      setDialogOpen(false);
      loadItems(activeTab);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const res = await fetch(`/api/servicios-configuracion?id=${itemToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span><strong>{itemToDelete.nombre}</strong> eliminado</span>
        </div>
      );
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadItems(activeTab);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <Settings2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Configuración de Servicios
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Administra técnicos, tipos de servicio y modos de contacto
            </p>
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CONFIG_TYPES.map((type) => {
          const isActive = activeTab === type.value;
          return (
            <button
              key={type.value}
              onClick={() => setActiveTab(type.value)}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                isActive
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/10"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2.5 rounded-lg",
                  isActive ? "bg-purple-100 dark:bg-purple-800/50" : type.bgColor
                )}>
                  <span className={isActive ? "text-purple-600 dark:text-purple-400" : type.color}>
                    {type.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "font-semibold",
                      isActive ? "text-purple-700 dark:text-purple-300" : "text-gray-900 dark:text-gray-100"
                    )}>
                      {type.label}
                    </h3>
                    {isActive && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 text-xs">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {type.description}
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-purple-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", activeConfig.bgColor)}>
                <span className={activeConfig.color}>{activeConfig.icon}</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  {activeConfig.label}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length} {items.length === 1 ? 'elemento' : 'elementos'} configurados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px] h-9"
                />
              </div>
              <Button
                onClick={handleOpenCreate}
                className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar {activeConfig.labelSingular}
              </Button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-gray-500">Cargando {activeConfig.label.toLowerCase()}...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className={cn("p-4 rounded-full", activeConfig.bgColor)}>
                <span className={activeConfig.color}>{activeConfig.icon}</span>
              </div>
              <div className="text-center">
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  {searchQuery ? "No se encontraron resultados" : `No hay ${activeConfig.label.toLowerCase()}`}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {searchQuery
                    ? "Intenta con otro término de búsqueda"
                    : `Agrega tu primer ${activeConfig.labelSingular.toLowerCase()}`
                  }
                </p>
              </div>
              {!searchQuery && (
                <Button
                  onClick={handleOpenCreate}
                  variant="outline"
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar {activeConfig.labelSingular}
                </Button>
              )}
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                    activeConfig.bgColor,
                    activeConfig.color
                  )}>
                    {activeTab === "tecnico" ? (
                      <UserCircle className="h-5 w-5" />
                    ) : (
                      item.nombre.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {item.nombre}
                    </p>
                    {item.descripcion && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDelete(item)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {filteredItems.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mostrando {filteredItems.length} de {items.length} {activeConfig.label.toLowerCase()}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", activeConfig.bgColor)}>
                <span className={activeConfig.color}>{activeConfig.icon}</span>
              </div>
              <DialogTitle className="text-lg">
                {editingItem ? "Editar" : "Nuevo"} {activeConfig.labelSingular}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder={`Nombre del ${activeConfig.labelSingular.toLowerCase()}`}
                disabled={saving}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !saving && formData.nombre.trim()) {
                    handleSave();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Descripción <span className="text-gray-400">(opcional)</span>
              </Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción breve..."
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="px-4"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.nombre.trim()}
              className="bg-purple-600 hover:bg-purple-700 px-6 shadow-lg shadow-purple-500/25 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                editingItem ? "Guardar cambios" : "Agregar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              ¿Eliminar "{itemToDelete?.nombre}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Esta acción no se puede deshacer. El elemento será desactivado y no aparecerá
              en las listas de selección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="px-4">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 px-4"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
