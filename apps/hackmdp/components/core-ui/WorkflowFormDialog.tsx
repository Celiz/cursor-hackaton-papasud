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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowCanvas, WorkflowStep } from "./WorkflowCanvas";
import { WorkflowStepConfigDialog } from "./WorkflowStepConfigDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { sheetClasses } from "@/lib/design-system";

interface WorkflowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: any;
  onSave: (data: any) => Promise<void>;
}

export function WorkflowFormDialog({ open, onOpenChange, workflow, onSave }: WorkflowFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "canvas">("info");

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    trigger_tipo: "cliente_nuevo" as string,
    trigger_config: {} as any,
  });

  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepConfigOpen, setStepConfigOpen] = useState(false);

  useEffect(() => {
    if (workflow) {
      setFormData({
        nombre: workflow.nombre || "",
        descripcion: workflow.descripcion || "",
        trigger_tipo: workflow.trigger_tipo || "cliente_nuevo",
        trigger_config: workflow.trigger_config || {},
      });
      setSteps(workflow.pasos || []);
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        trigger_tipo: "cliente_nuevo",
        trigger_config: {},
      });
      setSteps([]);
    }
    setActiveTab("info");
  }, [workflow, open]);

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepConfigOpen(true);
  };

  const handleSaveStepConfig = (config: any) => {
    if (editingStep) {
      const updatedSteps = steps.map((s) =>
        s.id === editingStep.id ? { ...s, configuracion: config } : s
      );
      setSteps(updatedSteps);
    }
    setEditingStep(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        pasos: steps,
        ...(workflow?.id && { id: workflow.id }),
      };

      await onSave(dataToSave);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] overflow-hidden flex flex-col bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-800 pb-3">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {workflow ? "Editar Workflow" : "Nuevo Workflow"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configura los triggers y pasos de automatización para tu workflow de emails
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "info" | "canvas")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className={cn(sheetClasses.tabsList, "grid-cols-2")}>
              <TabsTrigger
                value="info"
                className={cn(sheetClasses.tabsTrigger, "gap-1.5")}
              >
                <Info className="w-4 h-4" />
                <span className="text-sm">Información Básica</span>
              </TabsTrigger>
              <TabsTrigger
                value="canvas"
                className={cn(sheetClasses.tabsTrigger, "gap-1.5")}
              >
                <Workflow className="w-4 h-4" />
                <span className="text-sm">Canvas del Workflow</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="flex-1 overflow-y-auto">
              <ScrollArea className="h-[calc(95vh-200px)] px-4">
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-w-3xl mx-auto">
                  {/* Grupo principal - densidad alta */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="nombre" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Nombre del Workflow *
                      </Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Bienvenida Nuevos Clientes"
                        required
                        className="h-9 text-sm border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="descripcion" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Descripción
                      </Label>
                      <Textarea
                        id="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="Describe el propósito de este workflow..."
                        rows={3}
                        className="text-sm border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="trigger_tipo" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Tipo de Trigger *
                      </Label>
                      <Select
                        value={formData.trigger_tipo}
                        onValueChange={(value) => setFormData({ ...formData, trigger_tipo: value })}
                      >
                        <SelectTrigger id="trigger_tipo" className="h-9 text-sm border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 dark:border-gray-800">
                          <SelectItem value="cliente_nuevo" className="text-sm">Cliente Nuevo</SelectItem>
                          <SelectItem value="factura_vencida" className="text-sm">Factura Vencida</SelectItem>
                          <SelectItem value="sin_compra_dias" className="text-sm">Sin Compra (X días)</SelectItem>
                          <SelectItem value="comodato_vence" className="text-sm">Comodato por Vencer</SelectItem>
                          <SelectItem value="tag_agregado" className="text-sm">Tag Agregado</SelectItem>
                          <SelectItem value="suscripcion_nueva" className="text-sm">Nueva Suscripción</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Configuración específica del trigger - Compacto */}
                  {formData.trigger_tipo === "sin_compra_dias" && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-1.5">
                      <Label htmlFor="dias_sin_compra" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Días sin Compra
                      </Label>
                      <Input
                        id="dias_sin_compra"
                        type="number"
                        min="1"
                        value={formData.trigger_config.dias || 30}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trigger_config: { ...formData.trigger_config, dias: parseInt(e.target.value) },
                          })
                        }
                        className="h-9 text-sm border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {formData.trigger_tipo === "tag_agregado" && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-1.5">
                      <Label htmlFor="tag_nombre" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Nombre del Tag
                      </Label>
                      <Input
                        id="tag_nombre"
                        value={formData.trigger_config.tag_nombre || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trigger_config: { ...formData.trigger_config, tag_nombre: e.target.value },
                          })
                        }
                        placeholder="Nombre del tag que dispara el workflow"
                        className="h-9 text-sm border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {formData.trigger_tipo === "comodato_vence" && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-1.5">
                      <Label htmlFor="dias_anticipacion" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Días de Anticipación
                      </Label>
                      <Input
                        id="dias_anticipacion"
                        type="number"
                        min="1"
                        value={formData.trigger_config.dias_anticipacion || 7}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            trigger_config: {
                              ...formData.trigger_config,
                              dias_anticipacion: parseInt(e.target.value),
                            },
                          })
                        }
                        className="h-9 text-sm border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Tip box - Estilo Supabase */}
                  <div className="border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
                        <strong className="font-semibold">Tip:</strong> Una vez configurado el trigger y la información básica, ve a la pestaña "Canvas del Workflow" para armar la secuencia de pasos.
                      </p>
                    </div>
                  </div>
                </form>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="canvas" className="flex-1 overflow-y-auto">
              <ScrollArea className="h-[calc(95vh-200px)] pr-4">
                <WorkflowCanvas steps={steps} onChange={setSteps} onEditStep={handleEditStep} />
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t border-gray-200 dark:border-gray-800 pt-3 gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 px-3 text-sm border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-8 px-4 text-sm bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              {loading ? "Guardando..." : workflow ? "Actualizar Workflow" : "Crear Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de configuración de paso */}
      <WorkflowStepConfigDialog
        open={stepConfigOpen}
        onOpenChange={setStepConfigOpen}
        step={editingStep}
        onSave={handleSaveStepConfig}
      />
    </>
  );
}
