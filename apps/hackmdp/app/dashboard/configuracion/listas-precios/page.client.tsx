'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useFormatCurrency } from "@/lib/hooks/use-format-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Pencil,
  Trash2,
  Percent,
  Tags,
  Loader2,
  RefreshCw,
  DollarSign,
  Package,
} from 'lucide-react';
import { ListaPreciosDetailSheet } from '@/components/precios/ListaPreciosDetailSheet';
import { toast } from 'sonner';

interface ListaPrecios {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  margen_porcentaje: number;
  activa: boolean;
  orden: number;
  created_at: string;
  clientes_count?: number;
  excepciones_count?: number;
}

interface Cotizacion {
  id: string;
  fecha: string;
  tipo: string;
  valor_compra: number;
  valor_venta: number;
  fuente: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar datos');
  return data;
};

const fetcherArray = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar datos');
  return Array.isArray(data) ? data : [];
};

export default function ListasPreciosPageClient() {
  const { data: listas, error, isLoading, mutate } = useSWR<ListaPrecios[]>(
    '/api/listas-precios',
    fetcherArray
  );
  const { data: cotizacion, mutate: mutateCotizacion } = useSWR<Cotizacion>(
    '/api/cotizaciones?tipo=oficial',
    fetcher
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLista, setEditingLista] = useState<ListaPrecios | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    margen_porcentaje: 30,
    orden: 0,
  });
  const [saving, setSaving] = useState(false);
  const [updatingCotizacion, setUpdatingCotizacion] = useState(false);
  const [sheetLista, setSheetLista] = useState<ListaPrecios | null>(null);

  const openDialog = (lista?: ListaPrecios) => {
    if (lista) {
      setEditingLista(lista);
      setFormData({
        nombre: lista.nombre,
        codigo: lista.codigo,
        descripcion: lista.descripcion || '',
        margen_porcentaje: lista.margen_porcentaje,
        orden: lista.orden,
      });
    } else {
      setEditingLista(null);
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        margen_porcentaje: 30,
        orden: (listas?.length || 0) + 1,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.codigo) {
      toast.error('Nombre y código son requeridos');
      return;
    }

    setSaving(true);
    try {
      const url = '/api/listas-precios';
      const method = editingLista ? 'PATCH' : 'POST';
      const body = editingLista ? { ...formData, id: editingLista.id } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      toast.success(editingLista ? 'Lista actualizada' : 'Lista creada');
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar esta lista de precios?')) return;

    try {
      const res = await fetch(`/api/listas-precios?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Lista desactivada');
      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== id) : current, { revalidate: true });
    } catch {
      toast.error('Error al desactivar lista');
    }
  };

  const handleToggleActiva = async (lista: ListaPrecios) => {
    try {
      const res = await fetch('/api/listas-precios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lista.id, activa: !lista.activa }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      mutate();
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const updateCotizacion = async () => {
    setUpdatingCotizacion(true);
    try {
      const res = await fetch('/api/cotizaciones/actualizar');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      toast.success('Cotizaciones actualizadas');
      mutateCotizacion();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar cotizaciones');
    } finally {
      setUpdatingCotizacion(false);
    }
  };

  const formatCurrency = useFormatCurrency();

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error al cargar listas de precios</p>
          <Button onClick={() => mutate()} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Listas de Precios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configura márgenes de ganancia por tipo de cliente
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Lista
        </Button>
      </div>

      {/* Cotización del día */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cotización del Dólar
              </CardTitle>
              <CardDescription>
                Última cotización disponible para cálculo de precios
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={updateCotizacion}
              disabled={updatingCotizacion}
            >
              {updatingCotizacion ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Actualizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cotizacion?.valor_venta ? (
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Oficial (Venta)</p>
                <p className="text-2xl font-bold">{formatCurrency(cotizacion.valor_venta)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oficial (Compra)</p>
                <p className="text-xl font-semibold text-muted-foreground">
                  {formatCurrency(cotizacion.valor_compra)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="text-sm">{cotizacion.fecha}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fuente</p>
                <Badge variant="outline">{cotizacion.fuente}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No hay cotización disponible.{' '}
              <button onClick={updateCotizacion} className="text-primary underline">
                Actualizar ahora
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabla de listas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Listas Configuradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-center">Margen</TableHead>
                  <TableHead className="text-center">Ejemplo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listas?.map((lista) => (
                  <TableRow key={lista.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => setSheetLista(lista)}
                        className="text-left hover:underline hover:text-primary"
                      >
                        {lista.nombre}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lista.codigo}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        <Percent className="h-3 w-3 mr-1" />
                        {lista.margen_porcentaje}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      <div>
                        Costo $100 → Venta{' '}
                        <span className="font-medium text-foreground">
                          ${(100 * (1 + lista.margen_porcentaje / 100)).toFixed(0)}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5">
                        {lista.clientes_count ?? 0} cliente{(lista.clientes_count ?? 0) === 1 ? '' : 's'} · {lista.excepciones_count ?? 0} excep.
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={lista.activa}
                        onCheckedChange={() => handleToggleActiva(lista)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSheetLista(lista)}
                          title="Ver productos"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(lista)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lista.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!listas || listas.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay listas de precios configuradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLista ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
            </DialogTitle>
            <DialogDescription>
              Configura el margen de ganancia para este tipo de cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Hospital Público"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  placeholder="Ej: HOSP_PUB"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="margen">Margen de Ganancia (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="margen"
                  type="number"
                  min="0"
                  max="500"
                  step="0.5"
                  value={formData.margen_porcentaje}
                  onChange={(e) =>
                    setFormData({ ...formData, margen_porcentaje: parseFloat(e.target.value) || 0 })
                  }
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  Ejemplo: Costo $100 → Venta{' '}
                  <strong>${(100 * (1 + formData.margen_porcentaje / 100)).toFixed(0)}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Input
                id="descripcion"
                placeholder="Descripción de esta lista"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingLista ? 'Guardar Cambios' : 'Crear Lista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ListaPreciosDetailSheet
        open={!!sheetLista}
        onOpenChange={(o) => { if (!o) setSheetLista(null) }}
        lista={sheetLista}
        onRefreshParent={() => mutate()}
      />
    </div>
  );
}
