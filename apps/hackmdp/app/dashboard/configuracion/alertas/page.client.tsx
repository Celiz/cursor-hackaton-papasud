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
  Bell,
  Plus,
  Trash2,
  Edit,
  Loader2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Clock,
  DollarSign,
  Package,
  Calendar,
  Users,
  FileText,
  Wrench,
  TrendingDown,
  Zap,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";

interface AlertaConfig {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  condicion: {
    campo: string;
    operador: string;
    valor: string | number;
    entidad?: string;
  };
  destinatarios: string[];
  canal: string;
  frecuencia: string;
  template_mensaje: string | null;
  activo: boolean;
  created_at: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return Array.isArray(data) ? data : [];
};

const TIPOS_ALERTA = [
  { value: "factura_vencida", label: "Factura por vencer", icon: FileText, color: "text-red-500" },
  { value: "stock_bajo", label: "Stock bajo", icon: Package, color: "text-amber-500" },
  { value: "servicio_pendiente", label: "Servicio pendiente", icon: Wrench, color: "text-blue-500" },
  { value: "cliente_inactivo", label: "Cliente inactivo", icon: Users, color: "text-purple-500" },
  { value: "presupuesto_vencido", label: "Presupuesto por vencer", icon: FileText, color: "text-orange-500" },
  { value: "pago_atrasado", label: "Pago atrasado", icon: DollarSign, color: "text-red-600" },
  { value: "mantenimiento_programado", label: "Mantenimiento programado", icon: Calendar, color: "text-teal-500" },
  { value: "score_bajo", label: "Score de cliente bajo", icon: TrendingDown, color: "text-rose-500" },
  { value: "personalizada", label: "Alerta personalizada", icon: Zap, color: "text-indigo-500" },
];

const CANALES = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sistema", label: "Notificación en sistema", icon: Bell },
  { value: "ambos", label: "Email + Sistema", icon: MessageSquare },
];

const FRECUENCIAS = [
  { value: "inmediata", label: "Inmediata" },
  { value: "diaria", label: "Resumen diario" },
  { value: "semanal", label: "Resumen semanal" },
];

const CONDICIONES_POR_TIPO: Record<string, { campo: string; operador: string; valorDefault: string | number; label: string }[]> = {
  factura_vencida: [
    { campo: "dias_antes_vencimiento", operador: "<=", valorDefault: 7, label: "Días antes del vencimiento" },
  ],
  stock_bajo: [
    { campo: "stock_actual", operador: "<", valorDefault: 10, label: "Stock mínimo" },
  ],
  servicio_pendiente: [
    { campo: "dias_sin_completar", operador: ">", valorDefault: 3, label: "Días sin completar" },
  ],
  cliente_inactivo: [
    { campo: "dias_sin_compra", operador: ">", valorDefault: 90, label: "Días sin compras" },
  ],
  presupuesto_vencido: [
    { campo: "dias_antes_vencimiento", operador: "<=", valorDefault: 3, label: "Días antes del vencimiento" },
  ],
  pago_atrasado: [
    { campo: "dias_atraso", operador: ">", valorDefault: 30, label: "Días de atraso" },
  ],
  mantenimiento_programado: [
    { campo: "dias_antes", operador: "<=", valorDefault: 7, label: "Días antes del mantenimiento" },
  ],
  score_bajo: [
    { campo: "score", operador: "<", valorDefault: 30, label: "Score mínimo" },
  ],
  personalizada: [
    { campo: "custom", operador: "=", valorDefault: "", label: "Condición personalizada" },
  ],
};

export default function AlertasConfigPageClient() {
  const { data: alertas, isLoading, error } = useSWR<AlertaConfig[]>(
    "/api/alertas-config",
    fetcher
  );

  const [showDialog, setShowDialog] = useState(false);
  const [editingAlerta, setEditingAlerta] = useState<AlertaConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "factura_vencida",
    condicion: {
      campo: "dias_antes_vencimiento",
      operador: "<=",
      valor: 7 as string | number,
    },
    destinatarios: [""],
    canal: "email",
    frecuencia: "inmediata",
    template_mensaje: "",
    activo: true,
  });

  const resetForm = () => {
    const defaultCondicion = CONDICIONES_POR_TIPO["factura_vencida"][0];
    setFormData({
      nombre: "",
      descripcion: "",
      tipo: "factura_vencida",
      condicion: {
        campo: defaultCondicion.campo,
        operador: defaultCondicion.operador,
        valor: defaultCondicion.valorDefault,
      },
      destinatarios: [""],
      canal: "email",
      frecuencia: "inmediata",
      template_mensaje: "",
      activo: true,
    });
    setEditingAlerta(null);
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (alerta: AlertaConfig) => {
    const condicion = typeof alerta.condicion === 'string'
      ? JSON.parse(alerta.condicion)
      : alerta.condicion;

    setFormData({
      nombre: alerta.nombre,
      descripcion: alerta.descripcion || "",
      tipo: alerta.tipo,
      condicion: {
        campo: condicion.campo,
        operador: condicion.operador,
        valor: condicion.valor,
      },
      destinatarios: alerta.destinatarios.length > 0 ? alerta.destinatarios : [""],
      canal: alerta.canal,
      frecuencia: alerta.frecuencia,
      template_mensaje: alerta.template_mensaje || "",
      activo: alerta.activo,
    });
    setEditingAlerta(alerta);
    setShowDialog(true);
  };

  const handleTipoChange = (tipo: string) => {
    const condiciones = CONDICIONES_POR_TIPO[tipo];
    if (condiciones && condiciones.length > 0) {
      setFormData({
        ...formData,
        tipo,
        condicion: {
          campo: condiciones[0].campo,
          operador: condiciones[0].operador,
          valor: condiciones[0].valorDefault,
        },
      });
    } else {
      setFormData({ ...formData, tipo });
    }
  };

  const addDestinatario = () => {
    setFormData({
      ...formData,
      destinatarios: [...formData.destinatarios, ""],
    });
  };

  const removeDestinatario = (index: number) => {
    if (formData.destinatarios.length > 1) {
      setFormData({
        ...formData,
        destinatarios: formData.destinatarios.filter((_, i) => i !== index),
      });
    }
  };

  const updateDestinatario = (index: number, value: string) => {
    const updated = [...formData.destinatarios];
    updated[index] = value;
    setFormData({ ...formData, destinatarios: updated });
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("Nombre es requerido");
      return;
    }

    const destinatariosValidos = formData.destinatarios.filter((d) => d.trim());
    if (destinatariosValidos.length === 0 && formData.canal !== "sistema") {
      toast.error("Al menos un destinatario es requerido");
      return;
    }

    setSaving(true);
    try {
      const body = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        tipo: formData.tipo,
        condicion: formData.condicion,
        destinatarios: destinatariosValidos,
        canal: formData.canal,
        frecuencia: formData.frecuencia,
        template_mensaje: formData.template_mensaje.trim() || null,
        activo: formData.activo,
      };

      if (editingAlerta) {
        const res = await fetch(`/api/alertas-config/${editingAlerta.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al actualizar");
        }
        toast.success("Alerta actualizada");
      } else {
        const res = await fetch("/api/alertas-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al crear");
        }
        toast.success("Alerta creada");
      }

      mutate("/api/alertas-config");
      setShowDialog(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alerta: AlertaConfig) => {
    if (!confirm(`¿Eliminar la alerta "${alerta.nombre}"?`)) return;

    try {
      const res = await fetch(`/api/alertas-config/${alerta.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success("Alerta eliminada");
      mutate("/api/alertas-config");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (alerta: AlertaConfig) => {
    try {
      const condicion = typeof alerta.condicion === 'string'
        ? JSON.parse(alerta.condicion)
        : alerta.condicion;

      const res = await fetch(`/api/alertas-config/${alerta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...alerta,
          condicion,
          activo: !alerta.activo,
        }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      toast.success(alerta.activo ? "Alerta desactivada" : "Alerta activada");
      mutate("/api/alertas-config");
    } catch {
      toast.error("Error al actualizar alerta");
    }
  };

  const getTipoInfo = (tipo: string) => {
    return TIPOS_ALERTA.find((t) => t.value === tipo) || TIPOS_ALERTA[TIPOS_ALERTA.length - 1];
  };

  const getCanalInfo = (canal: string) => {
    return CANALES.find((c) => c.value === canal) || CANALES[0];
  };

  const condicionActual = CONDICIONES_POR_TIPO[formData.tipo]?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-600" />
            Alertas Automáticas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura alertas automáticas para eventos importantes del sistema
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Alerta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertas?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Alertas Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {alertas?.filter((a) => a.activo).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {alertas?.filter((a) => a.canal === "email" || a.canal === "ambos").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Por Email</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {alertas?.filter((a) => a.frecuencia === "inmediata").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Inmediatas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alertas Configuradas</CardTitle>
          <CardDescription>
            Gestiona las alertas automáticas de tu sistema
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
              <p>Error al cargar alertas</p>
            </div>
          ) : alertas && alertas.length > 0 ? (
            <div className="space-y-3">
              {alertas.map((alerta) => {
                const tipoInfo = getTipoInfo(alerta.tipo);
                const canalInfo = getCanalInfo(alerta.canal);
                const TipoIcon = tipoInfo.icon;
                const CanalIcon = canalInfo.icon;

                return (
                  <div
                    key={alerta.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                      alerta.activo
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60"
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${tipoInfo.color}`}>
                      <TipoIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{alerta.nombre}</h3>
                        <Badge variant="outline" className="shrink-0">
                          {tipoInfo.label}
                        </Badge>
                        {!alerta.activo && (
                          <Badge variant="secondary" className="shrink-0">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      {alerta.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2 truncate">
                          {alerta.descripcion}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CanalIcon className="h-3 w-3" />
                          {canalInfo.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {alerta.frecuencia}
                        </span>
                        {alerta.destinatarios.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {alerta.destinatarios.length} destinatario(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={alerta.activo}
                        onCheckedChange={() => handleToggleActive(alerta)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(alerta)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alerta)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                No hay alertas configuradas
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera alerta para recibir notificaciones automáticas
              </p>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Alerta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAlerta ? "Editar Alerta" : "Nueva Alerta Automática"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la alerta *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Facturas próximas a vencer"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Describe cuándo se dispara esta alerta..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de alerta</Label>
              <Select value={formData.tipo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ALERTA.map((tipo) => {
                    const Icon = tipo.icon;
                    return (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${tipo.color}`} />
                          {tipo.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {condicionActual && (
              <div className="space-y-2">
                <Label>{condicionActual.label}</Label>
                <Input
                  type={typeof condicionActual.valorDefault === "number" ? "number" : "text"}
                  value={formData.condicion.valor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condicion: {
                        ...formData.condicion,
                        valor:
                          typeof condicionActual.valorDefault === "number"
                            ? parseInt(e.target.value) || 0
                            : e.target.value,
                      },
                    })
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Canal de notificación</Label>
                <Select
                  value={formData.canal}
                  onValueChange={(v) => setFormData({ ...formData, canal: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANALES.map((canal) => {
                      const Icon = canal.icon;
                      return (
                        <SelectItem key={canal.value} value={canal.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {canal.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={formData.frecuencia}
                  onValueChange={(v) => setFormData({ ...formData, frecuencia: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRECUENCIAS.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.canal === "email" || formData.canal === "ambos") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Destinatarios (emails)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDestinatario}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                </div>
                {formData.destinatarios.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateDestinatario(index, e.target.value)}
                      placeholder="email@ejemplo.com"
                    />
                    {formData.destinatarios.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDestinatario(index)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Template del mensaje (opcional)</Label>
              <Textarea
                value={formData.template_mensaje}
                onChange={(e) =>
                  setFormData({ ...formData, template_mensaje: e.target.value })
                }
                placeholder="Usa variables como {cliente}, {monto}, {fecha}..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles: {"{cliente}"}, {"{monto}"}, {"{fecha}"}, {"{entidad}"}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label>Alerta activa</Label>
                <p className="text-xs text-muted-foreground">
                  Solo las alertas activas envían notificaciones
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
              {editingAlerta ? "Guardar Cambios" : "Crear Alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
