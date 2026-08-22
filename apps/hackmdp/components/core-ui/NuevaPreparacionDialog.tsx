'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Plus, Trash2, GripVertical, Package, PenLine, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error');
  return Array.isArray(data) ? data : [];
};

interface EquipoUnidad {
  id: string;
  codigo: string;
  numero_serie: string;
  estado_general: string;
  estado_comodato: string;
  cliente_id: string | null;
  equipo_catalogo_id: string;
  marca: string;
  modelo: string;
  tipo: string;
  categoria: string;
  cliente_nombre: string | null;
  display_label: string;
  display_subtitle: string;
}

interface NuevoItem {
  // Modo: 'seleccionar' o 'manual'
  modo: 'seleccionar' | 'manual';
  // Si es seleccionado del sistema
  equipo_unidad_id: string | null;
  equipo_catalogo_id: string | null;
  // Datos del equipo (manual o desde selección)
  tipo_equipo: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  condicion: 'nuevo' | 'reacondicionado' | 'usado' | 'demo';
  ubicacion: string;
  notas: string;
}

interface NuevaPreparacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const condicionOptions = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'reacondicionado', label: 'Reacondicionado' },
  { value: 'usado', label: 'Usado' },
  { value: 'demo', label: 'Demo' },
];

const tiposClienteOptions = [
  { value: 'veterinaria', label: 'Veterinaria' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'consultorio', label: 'Consultorio' },
  { value: 'otro', label: 'Otro' },
];

const createEmptyItem = (): NuevoItem => ({
  modo: 'seleccionar',
  equipo_unidad_id: null,
  equipo_catalogo_id: null,
  tipo_equipo: '',
  marca: '',
  modelo: '',
  numero_serie: '',
  condicion: 'nuevo',
  ubicacion: '',
  notas: '',
});

export function NuevaPreparacionDialog({
  open,
  onOpenChange,
  onCreated,
}: NuevaPreparacionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [tipoCliente, setTipoCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaRequerida, setFechaRequerida] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<NuevoItem[]>([createEmptyItem()]);

  const { data: clientes = [] } = useSWR('/api/clientes?view=principal', fetcher);

  // Cargar equipos disponibles (en stock o del cliente seleccionado)
  const equiposUrl = clienteId
    ? `/api/equipos-unidades/disponibles?cliente_id=${clienteId}`
    : '/api/equipos-unidades/disponibles?solo_stock=true';

  const { data: equiposDisponibles = [] } = useSWR<EquipoUnidad[]>(
    open ? equiposUrl : null,
    fetcher
  );

  // IDs de equipos ya seleccionados en esta orden
  const equiposSeleccionadosIds = useMemo(() => {
    return items
      .filter((item) => item.equipo_unidad_id)
      .map((item) => item.equipo_unidad_id);
  }, [items]);

  // Filtrar equipos disponibles que no están ya seleccionados
  const equiposFiltrados = useMemo(() => {
    return equiposDisponibles.filter(
      (eq) => !equiposSeleccionadosIds.includes(eq.id)
    );
  }, [equiposDisponibles, equiposSeleccionadosIds]);

  const clienteOptions = clientes.map((c: any) => ({
    value: c.id,
    label: c.nombre || c.nombre_fantasia || 'Sin nombre',
  }));

  const handleClienteChange = (value: string) => {
    setClienteId(value);
    const cliente = clientes.find((c: any) => c.id === value);
    if (cliente) {
      setClienteNombre(cliente.nombre || cliente.nombre_fantasia || '');
      if (cliente.direccion && !ubicacion) {
        setUbicacion(cliente.direccion);
      }
    }
    // Resetear items cuando cambia el cliente
    setItems([createEmptyItem()]);
  };

  const addItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, updates: Partial<NuevoItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleSelectEquipo = (index: number, equipoId: string) => {
    const equipo = equiposDisponibles.find((eq) => eq.id === equipoId);
    if (equipo) {
      updateItem(index, {
        equipo_unidad_id: equipo.id,
        equipo_catalogo_id: equipo.equipo_catalogo_id,
        tipo_equipo: equipo.tipo || 'Equipo',
        marca: equipo.marca || '',
        modelo: equipo.modelo || '',
        numero_serie: equipo.numero_serie || '',
        condicion: 'usado', // Por defecto si viene del sistema
      });
    }
  };

  const toggleModo = (index: number) => {
    const currentModo = items[index].modo;
    const newModo = currentModo === 'seleccionar' ? 'manual' : 'seleccionar';

    // Limpiar datos al cambiar de modo
    updateItem(index, {
      modo: newModo,
      equipo_unidad_id: null,
      equipo_catalogo_id: null,
      tipo_equipo: '',
      marca: '',
      modelo: '',
      numero_serie: '',
      condicion: 'nuevo',
    });
  };

  const resetForm = () => {
    setClienteId('');
    setClienteNombre('');
    setTipoCliente('');
    setUbicacion('');
    setFechaRequerida('');
    setNotas('');
    setItems([createEmptyItem()]);
  };

  const handleSubmit = async () => {
    if (!clienteNombre && !clienteId) {
      toast.error('Ingresa un cliente');
      return;
    }

    const validItems = items.filter(
      (item) => item.tipo_equipo.trim() !== '' || item.equipo_unidad_id
    );
    if (validItems.length === 0) {
      toast.error('Agrega al menos un equipo');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/preparacion-entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId || null,
          cliente_nombre: clienteNombre,
          tipo_cliente: tipoCliente || null,
          ubicacion: ubicacion || null,
          fecha_requerida: fechaRequerida || null,
          notas: notas || null,
          items: validItems.map((item) => ({
            tipo_equipo: item.tipo_equipo,
            marca: item.marca || null,
            modelo: item.modelo || null,
            numero_serie: item.numero_serie || null,
            condicion: item.condicion,
            ubicacion: item.ubicacion || null,
            notas: item.notas || null,
            estado: 'pendiente',
            equipo_unidad_id: item.equipo_unidad_id || null,
            equipo_catalogo_id: item.equipo_catalogo_id || null,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear orden');
      }

      toast.success('Orden de preparación creada');
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Opciones para el combobox de equipos
  const equipoOptions = equiposFiltrados.map((eq) => ({
    value: eq.id,
    label: eq.display_label,
    subtitle: eq.display_subtitle,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Preparación</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información del Cliente */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Información del Cliente
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente (existente)</Label>
                <SearchableCombobox
                  preloadedOptions={clienteOptions}
                  value={clienteId}
                  onValueChange={handleClienteChange}
                  placeholder="Buscar cliente..."
                  emptyMessage="No se encontraron clientes"
                />
              </div>

              <div className="space-y-2">
                <Label>O ingresa nombre manualmente</Label>
                <Input
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Ej: Aparicio Esteban"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <Select value={tipoCliente} onValueChange={setTipoCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposClienteOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación / Ciudad</Label>
                <Input
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: MDP, Córdoba, CABA"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Requerida</Label>
                <Input
                  type="date"
                  value={fechaRequerida}
                  onChange={(e) => setFechaRequerida(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas generales</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas sobre la orden..."
                rows={2}
              />
            </div>
          </div>

          {/* Equipos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Equipos a Preparar
              </h3>
              <Button type="outline" size="small" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Equipo
              </Button>
            </div>

            {/* Info sobre equipos disponibles */}
            {equiposDisponibles.length > 0 && (
              <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-md">
                <Package className="h-3 w-3 inline mr-1" />
                {equiposDisponibles.length} equipo(s) disponible(s) en el sistema
                {clienteId && ' (en stock o asignados a este cliente)'}
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 bg-gray-50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Equipo {index + 1}</span>

                      {/* Toggle modo */}
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          type={item.modo === 'seleccionar' ? 'secondary' : 'text'}
                          size="tiny"
                          onClick={() => item.modo !== 'seleccionar' && toggleModo(index)}
                          className={cn(
                            'text-xs',
                            item.modo === 'seleccionar' && 'bg-purple-100 text-purple-700'
                          )}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          Del sistema
                        </Button>
                        <Button
                          type={item.modo === 'manual' ? 'secondary' : 'text'}
                          size="tiny"
                          onClick={() => item.modo !== 'manual' && toggleModo(index)}
                          className={cn(
                            'text-xs',
                            item.modo === 'manual' && 'bg-purple-100 text-purple-700'
                          )}
                        >
                          <PenLine className="h-3 w-3 mr-1" />
                          Manual
                        </Button>
                      </div>

                      {item.equipo_unidad_id && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Vinculado
                        </Badge>
                      )}
                    </div>

                    {items.length > 1 && (
                      <Button
                        type="text"
                        size="small"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Modo Seleccionar */}
                  {item.modo === 'seleccionar' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Seleccionar equipo del sistema</Label>
                        <SearchableCombobox
                          preloadedOptions={equipoOptions}
                          value={item.equipo_unidad_id || ''}
                          onValueChange={(value) => handleSelectEquipo(index, value)}
                          placeholder="Buscar equipo por tipo, marca, modelo o serie..."
                          emptyMessage={
                            equiposDisponibles.length === 0
                              ? 'No hay equipos disponibles'
                              : 'No se encontró el equipo'
                          }
                        />
                      </div>

                      {/* Mostrar datos del equipo seleccionado */}
                      {item.equipo_unidad_id && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-white rounded border text-xs">
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>{' '}
                            <span className="font-medium">{item.tipo_equipo}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Marca:</span>{' '}
                            <span className="font-medium">{item.marca}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Modelo:</span>{' '}
                            <span className="font-medium">{item.modelo}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Serie:</span>{' '}
                            <span className="font-mono">{item.numero_serie}</span>
                          </div>
                        </div>
                      )}

                      {/* Campos adicionales para equipo seleccionado */}
                      {item.equipo_unidad_id && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Condición</Label>
                            <Select
                              value={item.condicion}
                              onValueChange={(v) => updateItem(index, { condicion: v as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {condicionOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Ubicación física</Label>
                            <Input
                              value={item.ubicacion}
                              onChange={(e) => updateItem(index, { ubicacion: e.target.value })}
                              placeholder="ESTANTE 3, ADELANTE..."
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Notas</Label>
                            <Input
                              value={item.notas}
                              onChange={(e) => updateItem(index, { notas: e.target.value })}
                              placeholder="Notas adicionales..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modo Manual */}
                  {item.modo === 'manual' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo de Equipo *</Label>
                          <Input
                            value={item.tipo_equipo}
                            onChange={(e) => updateItem(index, { tipo_equipo: e.target.value })}
                            placeholder="Autoanalizador, Contador..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Marca</Label>
                          <Input
                            value={item.marca}
                            onChange={(e) => updateItem(index, { marca: e.target.value })}
                            placeholder="Wiener, Mindray..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Modelo</Label>
                          <Input
                            value={item.modelo}
                            onChange={(e) => updateItem(index, { modelo: e.target.value })}
                            placeholder="CM-250, BC-3000..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Condición</Label>
                          <Select
                            value={item.condicion}
                            onValueChange={(v) => updateItem(index, { condicion: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {condicionOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">N° Serie</Label>
                          <Input
                            value={item.numero_serie}
                            onChange={(e) => updateItem(index, { numero_serie: e.target.value })}
                            placeholder="Serial..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Ubicación física</Label>
                          <Input
                            value={item.ubicacion}
                            onChange={(e) => updateItem(index, { ubicacion: e.target.value })}
                            placeholder="ESTANTE 3, ADELANTE..."
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Notas del equipo</Label>
                          <Input
                            value={item.notas}
                            onChange={(e) => updateItem(index, { notas: e.target.value })}
                            placeholder="stock, le prestamos..."
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? 'Creando...' : 'Crear Orden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
