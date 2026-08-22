"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkflowStep } from "./WorkflowCanvas";
import useSWR from "swr";

interface WorkflowStepConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: WorkflowStep | null;
  onSave: (config: any) => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
};

export function WorkflowStepConfigDialog({
  open,
  onOpenChange,
  step,
  onSave,
}: WorkflowStepConfigDialogProps) {
  const [config, setConfig] = useState<any>({});

  // Cargar templates para "enviar_email"
  const { data: templates } = useSWR(
    step?.tipo === "enviar_email" ? "/api/email/templates" : null,
    fetcher
  );

  // Cargar listas para "cambiar_lista"
  const { data: listas } = useSWR(
    step?.tipo === "cambiar_lista" ? "/api/email/listas" : null,
    fetcher
  );

  useEffect(() => {
    if (step) {
      setConfig(step.configuracion || {});
    }
  }, [step]);

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Paso: {getTipoLabel(step.tipo)}</DialogTitle>
          <DialogDescription>{getTipoDescription(step.tipo)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step.tipo === "enviar_email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="template_id">Template de Email *</Label>
                <Select
                  value={config.template_id || ""}
                  onValueChange={(value) => setConfig({ ...config, template_id: value })}
                >
                  <SelectTrigger id="template_id">
                    <SelectValue placeholder="Selecciona un template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto del Email</Label>
                <Input
                  id="asunto"
                  value={config.asunto || ""}
                  onChange={(e) => setConfig({ ...config, asunto: e.target.value })}
                  placeholder="Deja vacío para usar el asunto del template"
                />
              </div>
            </>
          )}

          {step.tipo === "esperar" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={config.cantidad || 1}
                  onChange={(e) =>
                    setConfig({ ...config, cantidad: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad *</Label>
                <Select
                  value={config.unidad || "dias"}
                  onValueChange={(value) => setConfig({ ...config, unidad: value })}
                >
                  <SelectTrigger id="unidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutos">Minutos</SelectItem>
                    <SelectItem value="horas">Horas</SelectItem>
                    <SelectItem value="dias">Días</SelectItem>
                    <SelectItem value="semanas">Semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step.tipo === "condicion" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campo">Campo a Evaluar *</Label>
                <Select
                  value={config.campo || "abrio_email"}
                  onValueChange={(value) => setConfig({ ...config, campo: value })}
                >
                  <SelectTrigger id="campo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abrio_email">Abrió Email</SelectItem>
                    <SelectItem value="hizo_click">Hizo Click en Email</SelectItem>
                    <SelectItem value="tiene_tag">Tiene Tag</SelectItem>
                    <SelectItem value="esta_en_lista">Está en Lista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operador">Operador *</Label>
                <Select
                  value={config.operador || "=="}
                  onValueChange={(value) => setConfig({ ...config, operador: value })}
                >
                  <SelectTrigger id="operador">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="==">Es igual a</SelectItem>
                    <SelectItem value="!=">Es diferente de</SelectItem>
                    <SelectItem value=">">Mayor que</SelectItem>
                    <SelectItem value="<">Menor que</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  value={config.valor || ""}
                  onChange={(e) => setConfig({ ...config, valor: e.target.value })}
                  placeholder="true, false, número, texto..."
                />
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Nota:</strong> Las condiciones bifurcan el flujo del workflow. Implementa
                  la lógica de ramificación según el resultado.
                </p>
              </div>
            </>
          )}

          {step.tipo === "agregar_tag" && (
            <div className="space-y-2">
              <Label htmlFor="tag_nombre">Nombre del Tag *</Label>
              <Input
                id="tag_nombre"
                value={config.tag_nombre || ""}
                onChange={(e) => setConfig({ ...config, tag_nombre: e.target.value })}
                placeholder="Ej: Cliente Interesado, VIP, Activo"
              />
            </div>
          )}

          {step.tipo === "cambiar_lista" && (
            <div className="space-y-2">
              <Label htmlFor="lista_id">Lista de Destino *</Label>
              <Select
                value={config.lista_id || ""}
                onValueChange={(value) => setConfig({ ...config, lista_id: value })}
              >
                <SelectTrigger id="lista_id">
                  <SelectValue placeholder="Selecciona una lista" />
                </SelectTrigger>
                <SelectContent>
                  {listas?.map((lista: any) => (
                    <SelectItem key={lista.id} value={lista.id}>
                      {lista.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step.tipo === "crear_tarea" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="titulo">Título de la Tarea *</Label>
                <Input
                  id="titulo"
                  value={config.titulo || ""}
                  onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
                  placeholder="Ej: Contactar al cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={config.descripcion || ""}
                  onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
                  placeholder="Detalles de la tarea..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asignado_a">Asignar a (ID Usuario)</Label>
                <Input
                  id="asignado_a"
                  value={config.asignado_a || ""}
                  onChange={(e) => setConfig({ ...config, asignado_a: e.target.value })}
                  placeholder="ID del usuario (opcional)"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSave}>Guardar Configuración</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getTipoLabel(tipo: WorkflowStep["tipo"]): string {
  const labels = {
    enviar_email: "Enviar Email",
    esperar: "Esperar",
    condicion: "Condición",
    agregar_tag: "Agregar Tag",
    cambiar_lista: "Cambiar Lista",
    crear_tarea: "Crear Tarea",
  };
  return labels[tipo];
}

function getTipoDescription(tipo: WorkflowStep["tipo"]): string {
  const descriptions = {
    enviar_email: "Configura el template y asunto del email a enviar",
    esperar: "Define cuánto tiempo esperar antes del siguiente paso",
    condicion: "Establece una condición para bifurcar el workflow",
    agregar_tag: "Agrega un tag de segmentación al contacto",
    cambiar_lista: "Mueve el contacto a una lista diferente",
    crear_tarea: "Crea una tarea para tu equipo",
  };
  return descriptions[tipo];
}
