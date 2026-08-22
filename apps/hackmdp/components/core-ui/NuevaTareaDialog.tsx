'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { searchClientes } from '@/hooks/use-client-search';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import useSWR from 'swr';

interface NuevaTareaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const integrationFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
};

export default function NuevaTareaDialog({
  open,
  onOpenChange,
  onSuccess,
}: NuevaTareaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'servicio_tecnico' as const,
    prioridad: 'media' as const,
    cliente_id: '',
    fecha_requerida: '',
    ubicacion: '',
  });

  // Check if user has Google Calendar connected
  const { data: integrations } = useSWR(
    open ? '/api/google/integrations' : null,
    integrationFetcher
  );

  const hasCalendarIntegration = integrations?.some(
    (i: any) => (i.tipo === 'calendar' || i.tipo === 'both') && i.estado === 'active' && i.sync_enabled
  );

  // Auto-enable sync if user has integration and fecha is set
  useEffect(() => {
    if (hasCalendarIntegration && formData.fecha_requerida) {
      setSyncToCalendar(true);
    }
  }, [hasCalendarIntegration, formData.fecha_requerida]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo.trim()) {
      toast.error('El título es requerido');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cliente_id: formData.cliente_id || null,
          fecha_requerida: formData.fecha_requerida || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al crear tarea');
      }

      // If sync to calendar is enabled and we have a task ID
      if (syncToCalendar && hasCalendarIntegration && data.id) {
        try {
          await fetch(`/api/tareas/${data.id}/sync-calendar`, {
            method: 'POST',
          });
          toast.success('Tarea creada y sincronizada con Google Calendar');
        } catch {
          toast.success('Tarea creada (error al sincronizar con calendario)');
        }
      } else {
        toast.success('Tarea creada correctamente');
      }

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setFormData({
        titulo: '',
        descripcion: '',
        tipo: 'servicio_tecnico',
        prioridad: 'media',
        cliente_id: '',
        fecha_requerida: '',
        ubicacion: '',
      });
      setSyncToCalendar(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">Nueva Tarea</DialogTitle>
          <DialogDescription className="text-sm">
            Crea una nueva tarea o solicitud de cliente. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-sm font-medium">
                  Título <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="titulo"
                  placeholder="ej: Reparación equipo cliente XYZ"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  className="h-10"
                />
              </div>

              {/* Tipo y Prioridad - 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger id="tipo" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servicio_tecnico">Servicio Técnico</SelectItem>
                      <SelectItem value="instalacion">Instalación</SelectItem>
                      <SelectItem value="reparacion">Reparación</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="consulta_tecnica">Consulta Técnica</SelectItem>
                      <SelectItem value="presupuesto">Presupuesto</SelectItem>
                      <SelectItem value="seguimiento_comercial">Seguimiento Comercial</SelectItem>
                      <SelectItem value="reclamo">Reclamo</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridad" className="text-sm font-medium">
                    Prioridad <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value: any) => setFormData({ ...formData, prioridad: value })}
                  >
                    <SelectTrigger id="prioridad" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cliente y Fecha - 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente" className="text-sm font-medium">Cliente</Label>
                  <SearchableCombobox
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                    searchFn={searchClientes}
                    placeholder="Buscar cliente (opcional)"
                    emptyMessage="No se encontraron clientes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_requerida" className="text-sm font-medium">Fecha Requerida</Label>
                  <Input
                    id="fecha_requerida"
                    type="date"
                    value={formData.fecha_requerida}
                    onChange={(e) => setFormData({ ...formData, fecha_requerida: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="descripcion" className="text-sm font-medium">Descripción</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Detalles adicionales sobre la tarea..."
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="resize-none min-h-[100px]"
                />
              </div>

              {/* Ubicación */}
              <div className="space-y-2">
                <Label htmlFor="ubicacion" className="text-sm font-medium">Ubicación</Label>
                <Input
                  id="ubicacion"
                  placeholder="Dirección o ubicación del servicio"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  className="h-10"
                />
              </div>

              {/* Sync to Calendar - Only show if integration is available */}
              {hasCalendarIntegration && formData.fecha_requerida && (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div className="space-y-0.5">
                      <Label htmlFor="sync-calendar" className="text-sm font-medium">
                        Agregar a Google Calendar
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Se creará un evento en tu calendario para esta fecha
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="sync-calendar"
                    checked={syncToCalendar}
                    onCheckedChange={setSyncToCalendar}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                htmlType="button"
                type="default"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial h-10"
              >
                Cancelar
              </Button>
              <Button
                htmlType="submit"
                type="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
                className="flex-1 sm:flex-initial h-10"
              >
                Crear Tarea
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
