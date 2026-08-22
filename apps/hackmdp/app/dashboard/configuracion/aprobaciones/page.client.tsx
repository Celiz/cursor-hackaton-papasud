"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  Plus,
  Trash2,
  Edit,
  Loader2,
  GitBranch,
  Users,
  FileText,
  AlertTriangle,
  Shield,
  Mail,
  UserPlus,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";

interface ApprovalWorkflow {
  id: string;
  nombre: string;
  descripcion: string | null;
  entity_type: string;
  condiciones: any;
  aprobadores: { user_id?: string; rol?: string; nombre?: string }[];
  requiere_todos: boolean;
  notificar_email: boolean;
  activo: boolean;
  created_at: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return Array.isArray(data) ? data : [];
};

const ENTITY_TYPES = [
  { value: "presupuesto", label: "Presupuestos" },
  { value: "nota_credito", label: "Notas de Crédito" },
  { value: "orden_compra", label: "Órdenes de Compra" },
  { value: "factura", label: "Facturas" },
  { value: "pago", label: "Pagos" },
  { value: "descuento", label: "Descuentos" },
];

export default function AprobacionesConfigPageClient() {
  const { data: workflows, isLoading, error } = useSWR<ApprovalWorkflow[]>(
    "/api/aprobaciones?type=workflows",
    fetcher
  );

  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    entity_type: "presupuesto",
    aprobadores: [{ rol: "", nombre: "" }],
    requiere_todos: false,
    notificar_email: true,
    activo: true,
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      entity_type: "presupuesto",
      aprobadores: [{ rol: "", nombre: "" }],
      requiere_todos: false,
      notificar_email: true,
      activo: true,
    });
    setEditingWorkflow(null);
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (workflow: ApprovalWorkflow) => {
    setFormData({
      nombre: workflow.nombre,
      descripcion: workflow.descripcion || "",
      entity_type: workflow.entity_type,
      aprobadores: workflow.aprobadores.length > 0
        ? workflow.aprobadores.map((a) => ({
            rol: a.rol || "",
            nombre: a.nombre || "",
          }))
        : [{ rol: "", nombre: "" }],
      requiere_todos: workflow.requiere_todos,
      notificar_email: workflow.notificar_email,
      activo: workflow.activo,
    });
    setEditingWorkflow(workflow);
    setShowDialog(true);
  };

  const addAprobador = () => {
    setFormData({
      ...formData,
      aprobadores: [...formData.aprobadores, { rol: "", nombre: "" }],
    });
  };

  const removeAprobador = (index: number) => {
    if (formData.aprobadores.length > 1) {
      setFormData({
        ...formData,
        aprobadores: formData.aprobadores.filter((_, i) => i !== index),
      });
    }
  };

  const updateAprobador = (index: number, field: string, value: string) => {
    const updated = [...formData.aprobadores];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, aprobadores: updated });
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("Nombre es requerido");
      return;
    }

    const aprobadoresValidos = formData.aprobadores.filter(
      (a) => a.rol.trim() || a.nombre.trim()
    );
    if (aprobadoresValidos.length === 0) {
      toast.error("Al menos un aprobador es requerido");
      return;
    }

    setSaving(true);
    try {
      const body = {
        type: "workflow",
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        entity_type: formData.entity_type,
        aprobadores: aprobadoresValidos,
        requiere_todos: formData.requiere_todos,
        notificar_email: formData.notificar_email,
        activo: formData.activo,
      };

      if (editingWorkflow) {
        const res = await fetch(`/api/aprobaciones/${editingWorkflow.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al actualizar");
        }
        toast.success("Flujo actualizado");
      } else {
        const res = await fetch("/api/aprobaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al crear");
        }
        toast.success("Flujo creado");
      }

      mutate("/api/aprobaciones?type=workflows");
      setShowDialog(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (workflow: ApprovalWorkflow) => {
    if (!confirm(`¿Eliminar el flujo "${workflow.nombre}"?`)) return;

    try {
      const res = await fetch(`/api/aprobaciones/${workflow.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success("Flujo eliminado");
      mutate("/api/aprobaciones?type=workflows");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (workflow: ApprovalWorkflow) => {
    try {
      const res = await fetch(`/api/aprobaciones/${workflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...workflow,
          activo: !workflow.activo,
        }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      toast.success(workflow.activo ? "Flujo desactivado" : "Flujo activado");
      mutate("/api/aprobaciones?type=workflows");
    } catch {
      toast.error("Error al actualizar flujo");
    }
  };

  const getEntityLabel = (entityType: string) => {
    return ENTITY_TYPES.find((t) => t.value === entityType)?.label || entityType;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-blue-600" />
            Flujos de Aprobación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura flujos de aprobación para documentos y operaciones
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Flujo
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Cómo funcionan los flujos de aprobación</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li>Define quiénes deben aprobar cada tipo de documento</li>
                <li>Los aprobadores pueden ser por rol (admin, gerente) o por nombre específico</li>
                <li>Configura si todos deben aprobar o solo uno es suficiente</li>
                <li>Recibe notificaciones por email cuando hay documentos pendientes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flujos Configurados</CardTitle>
          <CardDescription>
            Administra los flujos de aprobación para tu organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Error al cargar flujos</p>
            </div>
          ) : workflows && workflows.length > 0 ? (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    workflow.activo
                      ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60"
                  }`}
                >
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <GitBranch className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{workflow.nombre}</h3>
                      <Badge variant="outline" className="shrink-0">
                        {getEntityLabel(workflow.entity_type)}
                      </Badge>
                      {!workflow.activo && (
                        <Badge variant="secondary" className="shrink-0">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {workflow.descripcion && (
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        {workflow.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {workflow.aprobadores.length} aprobador(es)
                      </span>
                      {workflow.requiere_todos && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          Todos deben aprobar
                        </span>
                      )}
                      {workflow.notificar_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-blue-500" />
                          Notificaciones
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={workflow.activo}
                      onCheckedChange={() => handleToggleActive(workflow)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(workflow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(workflow)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <GitBranch className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                No hay flujos configurados
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer flujo de aprobación para controlar documentos importantes
              </p>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Flujo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for creating/editing workflows */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? "Editar Flujo" : "Nuevo Flujo de Aprobación"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nombre del flujo *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Aprobación de presupuestos grandes"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Describe cuándo se aplica este flujo..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select
                value={formData.entity_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, entity_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aprobadores *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAprobador}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Define quién debe aprobar los documentos. Puedes usar roles
                (admin, gerente) o nombres específicos.
              </p>

              {formData.aprobadores.map((aprobador, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <Select
                    value={aprobador.rol}
                    onValueChange={(v) => updateAprobador(index, "rol", v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="contable">Contable</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">o</span>
                  <Input
                    value={aprobador.nombre}
                    onChange={(e) =>
                      updateAprobador(index, "nombre", e.target.value)
                    }
                    placeholder="Nombre específico"
                    className="flex-1"
                  />
                  {formData.aprobadores.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAprobador(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Todos deben aprobar</Label>
                  <p className="text-xs text-muted-foreground">
                    Si está activado, todos los aprobadores deben dar su visto
                    bueno
                  </p>
                </div>
                <Switch
                  checked={formData.requiere_todos}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requiere_todos: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificar por email</Label>
                  <p className="text-xs text-muted-foreground">
                    Enviar email cuando hay documentos pendientes de aprobar
                  </p>
                </div>
                <Switch
                  checked={formData.notificar_email}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notificar_email: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Flujo activo</Label>
                  <p className="text-xs text-muted-foreground">
                    Solo los flujos activos se aplican a nuevos documentos
                  </p>
                </div>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, activo: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingWorkflow ? "Guardar Cambios" : "Crear Flujo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
