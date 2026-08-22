'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Star, Hash, MessageSquare, ListChecks, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PreguntaEncuesta, TipoPreguntaEncuesta } from '@/lib/types';

interface NuevaEncuestaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const tipoPreguntaOptions: { value: TipoPreguntaEncuesta; label: string; icon: React.ReactNode }[] = [
  { value: 'nps', label: 'NPS (0-10)', icon: <Hash className="h-4 w-4" /> },
  { value: 'estrellas', label: 'Estrellas (1-5)', icon: <Star className="h-4 w-4" /> },
  { value: 'texto', label: 'Texto libre', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'opcion_multiple', label: 'Opción múltiple', icon: <ListChecks className="h-4 w-4" /> },
];

export default function NuevaEncuestaDialog({ open, onOpenChange, onSuccess }: NuevaEncuestaDialogProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [preguntas, setPreguntas] = useState<PreguntaEncuesta[]>([
    { tipo: 'nps', pregunta: '¿Qué tan probable es que nos recomiendes a un amigo o colega?', requerida: true },
  ]);
  const [activa, setActiva] = useState(true);
  const [triggerAutomatico, setTriggerAutomatico] = useState<string>('');
  const [diasDespuesTrigger, setDiasDespuesTrigger] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleAddPregunta = () => {
    setPreguntas([
      ...preguntas,
      { tipo: 'texto', pregunta: '', requerida: false },
    ]);
  };

  const handleRemovePregunta = (index: number) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

  const handlePreguntaChange = (index: number, field: keyof PreguntaEncuesta, value: unknown) => {
    setPreguntas(
      preguntas.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    );
  };

  const handleAddOpcion = (preguntaIndex: number) => {
    const pregunta = preguntas[preguntaIndex];
    const opciones = pregunta.opciones || [];
    handlePreguntaChange(preguntaIndex, 'opciones', [...opciones, '']);
  };

  const handleOpcionChange = (preguntaIndex: number, opcionIndex: number, value: string) => {
    const pregunta = preguntas[preguntaIndex];
    const opciones = [...(pregunta.opciones || [])];
    opciones[opcionIndex] = value;
    handlePreguntaChange(preguntaIndex, 'opciones', opciones);
  };

  const handleRemoveOpcion = (preguntaIndex: number, opcionIndex: number) => {
    const pregunta = preguntas[preguntaIndex];
    const opciones = (pregunta.opciones || []).filter((_, i) => i !== opcionIndex);
    handlePreguntaChange(preguntaIndex, 'opciones', opciones);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (preguntas.length === 0) {
      toast.error('Debe agregar al menos una pregunta');
      return;
    }

    for (const pregunta of preguntas) {
      if (!pregunta.pregunta.trim()) {
        toast.error('Todas las preguntas deben tener texto');
        return;
      }
      if (pregunta.tipo === 'opcion_multiple' && (!pregunta.opciones || pregunta.opciones.length < 2)) {
        toast.error('Las preguntas de opción múltiple deben tener al menos 2 opciones');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/encuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          descripcion: descripcion || null,
          preguntas,
          activa,
          trigger_automatico: triggerAutomatico || null,
          dias_despues_trigger: diasDespuesTrigger,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear encuesta');
      }

      toast.success('Encuesta creada correctamente');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setPreguntas([
      { tipo: 'nps', pregunta: '¿Qué tan probable es que nos recomiendes a un amigo o colega?', requerida: true },
    ]);
    setActiva(true);
    setTriggerAutomatico('');
    setDiasDespuesTrigger(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Encuesta</DialogTitle>
          <DialogDescription>
            Crea una encuesta para recopilar feedback de tus clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nombre">Nombre de la encuesta *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Encuesta de satisfacción post-servicio"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe brevemente el propósito de la encuesta"
                rows={2}
              />
            </div>
          </div>

          {/* Preguntas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Preguntas</Label>
              <Button htmlType="button" size="small" type="outline" onClick={handleAddPregunta}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar pregunta
              </Button>
            </div>

            <div className="space-y-4">
              {preguntas.map((pregunta, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg space-y-3 bg-gray-50/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 pt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-sm font-medium text-muted-foreground">{idx + 1}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={pregunta.tipo}
                          onValueChange={(value: TipoPreguntaEncuesta) =>
                            handlePreguntaChange(idx, 'tipo', value)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tipoPreguntaOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  {opt.icon}
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 ml-auto">
                          <Label htmlFor={`req-${idx}`} className="text-xs text-muted-foreground">
                            Requerida
                          </Label>
                          <Switch
                            id={`req-${idx}`}
                            checked={pregunta.requerida}
                            onCheckedChange={(checked) =>
                              handlePreguntaChange(idx, 'requerida', checked)
                            }
                          />
                        </div>
                      </div>

                      <Input
                        value={pregunta.pregunta}
                        onChange={(e) => handlePreguntaChange(idx, 'pregunta', e.target.value)}
                        placeholder="Escribe la pregunta..."
                      />

                      {/* Opciones para opción múltiple */}
                      {pregunta.tipo === 'opcion_multiple' && (
                        <div className="space-y-2 pl-4">
                          {(pregunta.opciones || []).map((opcion, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input
                                value={opcion}
                                onChange={(e) => handleOpcionChange(idx, optIdx, e.target.value)}
                                placeholder={`Opción ${optIdx + 1}`}
                                className="flex-1"
                              />
                              <Button
                                htmlType="button"
                                type="text"
                                size="small"
                                onClick={() => handleRemoveOpcion(idx, optIdx)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            htmlType="button"
                            type="text"
                            size="small"
                            onClick={() => handleAddOpcion(idx)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar opción
                          </Button>
                        </div>
                      )}
                    </div>

                    <Button
                      htmlType="button"
                      type="text"
                      size="small"
                      onClick={() => handleRemovePregunta(idx)}
                      disabled={preguntas.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Config */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Encuesta activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las encuestas inactivas no pueden ser respondidas
                </p>
              </div>
              <Switch checked={activa} onCheckedChange={setActiva} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Envío automático (opcional)</Label>
                <Select value={triggerAutomatico || "none"} onValueChange={(val) => setTriggerAutomatico(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin envío automático</SelectItem>
                    <SelectItem value="post_servicio">Post servicio técnico</SelectItem>
                    <SelectItem value="post_entrega">Post entrega de pedido</SelectItem>
                    <SelectItem value="post_instalacion">Post instalación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerAutomatico && (
                <div>
                  <Label>Días después del trigger</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={diasDespuesTrigger}
                    onChange={(e) => setDiasDespuesTrigger(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Crear Encuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
