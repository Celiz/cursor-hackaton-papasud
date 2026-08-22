"use client";

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useSWR from 'swr';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Filter, X, Box, MapPin, Users, ShoppingCart, Tag, Calendar, Building2 } from 'lucide-react';
import { EmailLista } from '@/app/dashboard/email-marketing/listas/columns';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) return [];
  return Array.isArray(data) ? data : [];
};

const listaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
  descripcion: z.string().optional(),
  tipo: z.enum(['manual', 'dinamica', 'hibrida'], {
    required_error: 'Debe seleccionar un tipo',
  }),
  activa: z.boolean().default(true),
  criterios: z.object({
    // Legacy (Electromedicina)
    tipos_equipo: z.array(z.string()).optional(),
    modelos_equipo: z.array(z.string()).optional(),
    provincias: z.array(z.string()).optional(),
    productos: z.array(z.string()).optional(),
    categorias: z.array(z.string()).optional(),
    compra_desde: z.string().optional(),
    compra_hasta: z.string().optional(),
    // CRM (personas)
    tags_any: z.array(z.string()).optional(),
    tags_all: z.array(z.string()).optional(),
    tipo_persona: z.array(z.string()).optional(),
    cliente_ids: z.array(z.string()).optional(),
    email_valido: z.boolean().optional(),
    estado_activo: z.boolean().optional(),
  }).optional(),
});

const TIPOS_PERSONA_OPTS = [
  { value: 'contacto_ventas', label: 'Contacto Ventas' },
  { value: 'bioquimico', label: 'Bioquímico' },
  { value: 'veterinario', label: 'Veterinario' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'responsable_tecnico', label: 'Responsable Técnico' },
  { value: 'otro', label: 'Otro' },
];

type ListaFormData = z.infer<typeof listaSchema>;

// Provincias de Argentina
const PROVINCIAS_ARGENTINA = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
}

interface ListaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lista?: EmailLista | null;
  onSuccess?: () => void;
}

export function ListaFormDialog({
  open,
  onOpenChange,
  lista,
  onSuccess,
}: ListaFormDialogProps) {
  const isEdit = !!lista;

  // Fetch tipos de equipos y modelos para filtros dinámicos
  const { data: tiposEquipo = [] } = useSWR<string[]>('/api/equipos/tipos', fetcher);
  const { data: modelosEquipo = [] } = useSWR<string[]>('/api/equipos/modelos', fetcher);
  const { data: categoriasDisponibles = [] } = useSWR<string[]>('/api/categorias', fetcher);
  const { data: tagsDisponibles = [] } = useSWR<Array<{ id: string; nombre: string; color?: string }>>('/api/tags', fetcher);
  const { data: clientesDisponibles = [] } = useSWR<Array<{ id: string; nombre: string }>>('/api/clientes?limit=500', fetcher);

  // Estado local para los criterios seleccionados
  const [selectedTiposEquipo, setSelectedTiposEquipo] = useState<string[]>([]);
  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);
  const [selectedProvincias, setSelectedProvincias] = useState<string[]>([]);
  const [selectedProductos, setSelectedProductos] = useState<Producto[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [compraDesde, setCompraDesde] = useState('');
  const [compraHasta, setCompraHasta] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Criterios CRM
  const [selectedTagsAny, setSelectedTagsAny] = useState<string[]>([]);
  const [selectedTagsAll, setSelectedTagsAll] = useState<string[]>([]);
  const [selectedTipoPersona, setSelectedTipoPersona] = useState<string[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [emailValido, setEmailValido] = useState(true);
  const [estadoActivo, setEstadoActivo] = useState(true);
  const [crmPreviewCount, setCrmPreviewCount] = useState<number | null>(null);
  const [loadingCrmPreview, setLoadingCrmPreview] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Producto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ListaFormData>({
    resolver: zodResolver(listaSchema) as any,
    defaultValues: lista
      ? {
          nombre: lista.nombre,
          descripcion: lista.descripcion || '',
          tipo: lista.tipo,
          activa: lista.activa,
          criterios: lista.criterios || {},
        }
      : {
          activa: true,
          criterios: {},
        },
  });

  // Reset form when lista changes
  useEffect(() => {
    if (lista) {
      reset({
        nombre: lista.nombre,
        descripcion: lista.descripcion || '',
        tipo: lista.tipo,
        activa: lista.activa,
        criterios: lista.criterios || {},
      });
      const criterios = lista.criterios || {};
      setSelectedTiposEquipo(criterios.tipos_equipo || []);
      setSelectedModelos(criterios.modelos_equipo || []);
      setSelectedProvincias(criterios.provincias || []);
      setSelectedCategorias(criterios.categorias || []);
      setCompraDesde(criterios.compra_desde || '');
      setCompraHasta(criterios.compra_hasta || '');
      setSelectedTagsAny(criterios.tags_any || []);
      setSelectedTagsAll(criterios.tags_all || []);
      setSelectedTipoPersona(criterios.tipo_persona || []);
      setSelectedClientes(criterios.cliente_ids || []);
      setEmailValido(criterios.email_valido ?? true);
      setEstadoActivo(criterios.estado_activo ?? true);
      // Restore selected products — we have IDs, need to fetch names
      if (criterios.productos?.length) {
        fetch(`/api/productos?pageSize=200`)
          .then(r => r.json())
          .then(data => {
            const allProducts: Producto[] = (data.data || []).map((p: any) => ({
              id: p.id, nombre: p.nombre, codigo: p.codigo,
            }));
            const ids = new Set(criterios.productos);
            setSelectedProductos(allProducts.filter(p => ids.has(p.id)));
          })
          .catch(() => {});
      } else {
        setSelectedProductos([]);
      }
    } else {
      reset({
        nombre: '',
        descripcion: '',
        tipo: undefined,
        activa: true,
        criterios: {},
      });
      setSelectedTiposEquipo([]);
      setSelectedModelos([]);
      setSelectedProvincias([]);
      setSelectedProductos([]);
      setSelectedCategorias([]);
      setCompraDesde('');
      setCompraHasta('');
      setSelectedTagsAny([]);
      setSelectedTagsAll([]);
      setSelectedTipoPersona([]);
      setSelectedClientes([]);
      setEmailValido(true);
      setEstadoActivo(true);
    }
    setPreviewCount(null);
    setCrmPreviewCount(null);
    setProductSearch('');
    setProductResults([]);
  }, [lista, reset]);

  // Product search debounce
  useEffect(() => {
    if (productSearch.length < 2) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }

    setLoadingProducts(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/productos?search=${encodeURIComponent(productSearch)}&pageSize=20`);
        const data = await res.json();
        const results: Producto[] = (data.data || []).map((p: any) => ({
          id: p.id, nombre: p.nombre, codigo: p.codigo,
        }));
        setProductResults(results);
        setShowProductDropdown(true);
      } catch {
        setProductResults([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Close product dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Preview de cantidad de clientes que coinciden con los criterios
  const handlePreviewCriterios = async () => {
    if (watch('tipo') !== 'dinamica') return;

    setLoadingPreview(true);
    try {
      const res = await fetch('/api/email/listas/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipos_equipo: selectedTiposEquipo,
          modelos_equipo: selectedModelos,
          provincias: selectedProvincias,
          productos: selectedProductos.map(p => p.id),
          categorias: selectedCategorias,
          compra_desde: compraDesde || undefined,
          compra_hasta: compraHasta || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error previewing criteria:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Auto-preview cuando cambian los criterios
  useEffect(() => {
    if (watch('tipo') === 'dinamica' || watch('tipo') === 'hibrida') {
      const timer = setTimeout(handlePreviewCriterios, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedTiposEquipo, selectedModelos, selectedProvincias, selectedProductos, selectedCategorias, compraDesde, compraHasta, watch('tipo')]);

  // Preview CRM: evalúa criterios sobre personas
  const buildCrmCriterios = () => ({
    tags_any: selectedTagsAny.length > 0 ? selectedTagsAny : undefined,
    tags_all: selectedTagsAll.length > 0 ? selectedTagsAll : undefined,
    tipo_persona: selectedTipoPersona.length > 0 ? selectedTipoPersona : undefined,
    cliente_ids: selectedClientes.length > 0 ? selectedClientes : undefined,
    email_valido: emailValido || undefined,
    estado_activo: estadoActivo || undefined,
  });

  const handlePreviewCrm = async () => {
    const t = watch('tipo');
    if (t !== 'dinamica' && t !== 'hibrida') return;
    setLoadingCrmPreview(true);
    try {
      const res = await fetch('/api/email/listas/evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterios: buildCrmCriterios() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCrmPreviewCount(data.total ?? 0);
      }
    } catch (e) {
      console.error('Error previewing CRM criteria:', e);
    } finally {
      setLoadingCrmPreview(false);
    }
  };

  useEffect(() => {
    const t = watch('tipo');
    if (t !== 'dinamica' && t !== 'hibrida') return;
    const timer = setTimeout(handlePreviewCrm, 500);
    return () => clearTimeout(timer);
  }, [selectedTagsAny, selectedTagsAll, selectedTipoPersona, selectedClientes, emailValido, estadoActivo, watch('tipo')]);

  const toggleSelection = (
    item: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(s => s !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const addProducto = (producto: Producto) => {
    if (!selectedProductos.find(p => p.id === producto.id)) {
      setSelectedProductos([...selectedProductos, producto]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeProducto = (id: string) => {
    setSelectedProductos(selectedProductos.filter(p => p.id !== id));
  };

  const onSubmit = async (data: ListaFormData) => {
    try {
      const url = isEdit ? `/api/email/listas?id=${lista.id}` : '/api/email/listas';
      const method = isEdit ? 'PUT' : 'POST';

      const criterios = (data.tipo === 'dinamica' || data.tipo === 'hibrida') ? {
        tipos_equipo: selectedTiposEquipo,
        modelos_equipo: selectedModelos,
        provincias: selectedProvincias,
        productos: selectedProductos.map(p => p.id),
        categorias: selectedCategorias,
        compra_desde: compraDesde || undefined,
        compra_hasta: compraHasta || undefined,
        ...buildCrmCriterios(),
      } : {};

      const body = isEdit
        ? { ...data, id: lista.id, criterios }
        : { ...data, criterios };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar lista');
      }

      toast.success(isEdit ? 'Lista actualizada correctamente' : 'Lista creada correctamente');
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedTiposEquipo([]);
    setSelectedModelos([]);
    setSelectedProvincias([]);
    setSelectedProductos([]);
    setSelectedCategorias([]);
    setCompraDesde('');
    setCompraHasta('');
    setSelectedTagsAny([]);
    setSelectedTagsAll([]);
    setSelectedTipoPersona([]);
    setSelectedClientes([]);
    setEmailValido(true);
    setEstadoActivo(true);
    setPreviewCount(null);
    setCrmPreviewCount(null);
    setProductSearch('');
    onOpenChange(false);
  };

  const tipoSeleccionado = watch('tipo');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Save className="h-5 w-5" />
                Editar Lista
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Nueva Lista
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifica los datos de la lista de contactos'
              : 'Crea una nueva lista de contactos para tus campañas'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Lista *</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Ej: Clientes Frecuentes"
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Describe el propósito de esta lista..."
              rows={3}
            />
            {errors.descripcion && (
              <p className="text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Lista *</Label>
            <Select
              value={watch('tipo')}
              onValueChange={(value: 'manual' | 'dinamica' | 'hibrida') => setValue('tipo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex flex-col">
                    <span className="font-medium">Manual</span>
                    <span className="text-xs text-muted-foreground">
                      Agrega contactos manualmente uno por uno
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="dinamica">
                  <div className="flex flex-col">
                    <span className="font-medium">Dinámica</span>
                    <span className="text-xs text-muted-foreground">
                      Se actualiza automáticamente según criterios
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="hibrida">
                  <div className="flex flex-col">
                    <span className="font-medium">Híbrida</span>
                    <span className="text-xs text-muted-foreground">
                      Criterios automáticos + overrides manuales
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-red-600">{errors.tipo.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {watch('tipo') === 'manual'
                ? 'Lista manual: Los contactos se agregan manualmente'
                : watch('tipo') === 'dinamica'
                ? 'Lista dinámica: Los contactos se regeneran 100% desde los criterios. No se pueden agregar/quitar a mano.'
                : watch('tipo') === 'hibrida'
                ? 'Lista híbrida: Criterios automáticos + podés incluir/excluir personas manualmente como override'
                : 'Selecciona el tipo de lista'}
            </p>
          </div>

          {/* Criterios Dinámicos */}
          {(tipoSeleccionado === 'dinamica' || tipoSeleccionado === 'hibrida') && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4 text-purple-600" />
                  Criterios de Selección
                  {previewCount !== null && (
                    <Badge variant="secondary" className="ml-auto">
                      {loadingPreview ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {previewCount} clientes
                        </span>
                      )}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipos de Equipo */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    Clientes con estos tipos de equipo:
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {tiposEquipo.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Cargando tipos de equipo...</p>
                    ) : (
                      tiposEquipo.slice(0, 30).map((tipo) => (
                        <Badge
                          key={tipo}
                          variant={selectedTiposEquipo.includes(tipo) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selectedTiposEquipo.includes(tipo)
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : 'hover:bg-purple-100'
                          }`}
                          onClick={() => toggleSelection(tipo, selectedTiposEquipo, setSelectedTiposEquipo)}
                        >
                          {tipo}
                          {selectedTiposEquipo.includes(tipo) && (
                            <X className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))
                    )}
                  </div>
                  {selectedTiposEquipo.length > 0 && (
                    <p className="text-xs text-purple-600">
                      {selectedTiposEquipo.length} tipo(s) seleccionado(s)
                    </p>
                  )}
                </div>

                {/* Modelos de Equipo */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    Clientes con estos modelos de equipo:
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {modelosEquipo.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Cargando modelos...</p>
                    ) : (
                      modelosEquipo.slice(0, 50).map((modelo) => (
                        <Badge
                          key={modelo}
                          variant={selectedModelos.includes(modelo) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selectedModelos.includes(modelo)
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'hover:bg-blue-100'
                          }`}
                          onClick={() => toggleSelection(modelo, selectedModelos, setSelectedModelos)}
                        >
                          {modelo}
                          {selectedModelos.includes(modelo) && (
                            <X className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))
                    )}
                  </div>
                  {selectedModelos.length > 0 && (
                    <p className="text-xs text-blue-600">
                      {selectedModelos.length} modelo(s) seleccionado(s)
                    </p>
                  )}
                </div>

                {/* Provincias */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Clientes en estas provincias:
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {PROVINCIAS_ARGENTINA.map((provincia) => (
                      <Badge
                        key={provincia}
                        variant={selectedProvincias.includes(provincia) ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${
                          selectedProvincias.includes(provincia)
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'hover:bg-green-100'
                        }`}
                        onClick={() => toggleSelection(provincia, selectedProvincias, setSelectedProvincias)}
                      >
                        {provincia}
                        {selectedProvincias.includes(provincia) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  {selectedProvincias.length > 0 && (
                    <p className="text-xs text-green-600">
                      {selectedProvincias.length} provincia(s) seleccionada(s)
                    </p>
                  )}
                </div>

                {/* Productos comprados */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    Clientes que compraron estos productos:
                  </Label>
                  <div ref={productSearchRef} className="relative">
                    <Input
                      placeholder="Buscar producto por nombre o código..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => productResults.length > 0 && setShowProductDropdown(true)}
                    />
                    {loadingProducts && (
                      <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                    {showProductDropdown && productResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {productResults
                          .filter(p => !selectedProductos.find(sp => sp.id === p.id))
                          .map((producto) => (
                            <button
                              key={producto.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm border-b last:border-b-0 transition-colors"
                              onClick={() => addProducto(producto)}
                            >
                              <span className="font-mono text-amber-700">{producto.codigo}</span>
                              {' — '}
                              <span>{producto.nombre}</span>
                            </button>
                          ))}
                        {productResults.filter(p => !selectedProductos.find(sp => sp.id === p.id)).length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Todos los resultados ya están seleccionados</p>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedProductos.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white">
                      {selectedProductos.map((producto) => (
                        <Badge
                          key={producto.id}
                          variant="default"
                          className="bg-amber-600 hover:bg-amber-700 cursor-pointer transition-colors"
                          onClick={() => removeProducto(producto.id)}
                        >
                          {producto.codigo} — {producto.nombre}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selectedProductos.length > 0 && (
                    <p className="text-xs text-amber-600">
                      {selectedProductos.length} producto(s) seleccionado(s)
                    </p>
                  )}
                </div>

                {/* Categorías de productos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Clientes que compraron de estas categorías:
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {categoriasDisponibles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Cargando categorías...</p>
                    ) : (
                      categoriasDisponibles.map((cat) => (
                        <Badge
                          key={cat}
                          variant={selectedCategorias.includes(cat) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selectedCategorias.includes(cat)
                              ? 'bg-orange-600 hover:bg-orange-700'
                              : 'hover:bg-orange-100'
                          }`}
                          onClick={() => toggleSelection(cat, selectedCategorias, setSelectedCategorias)}
                        >
                          {cat}
                          {selectedCategorias.includes(cat) && (
                            <X className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))
                    )}
                  </div>
                  {selectedCategorias.length > 0 && (
                    <p className="text-xs text-orange-600">
                      {selectedCategorias.length} categoría(s) seleccionada(s)
                    </p>
                  )}
                </div>

                {/* Período de compra */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Clientes que compraron entre estas fechas:
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Desde</Label>
                      <Input
                        type="date"
                        value={compraDesde}
                        onChange={(e) => setCompraDesde(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hasta</Label>
                      <Input
                        type="date"
                        value={compraHasta}
                        onChange={(e) => setCompraHasta(e.target.value)}
                      />
                    </div>
                  </div>
                  {(compraDesde || compraHasta) && (
                    <p className="text-xs text-muted-foreground">
                      {compraDesde && compraHasta
                        ? `Compras entre ${compraDesde} y ${compraHasta}`
                        : compraDesde
                        ? `Compras desde ${compraDesde}`
                        : `Compras hasta ${compraHasta}`}
                      {selectedProductos.length === 0 && selectedCategorias.length === 0
                        ? ' (cualquier producto)'
                        : ' (filtrado por productos/categorías seleccionados)'}
                    </p>
                  )}
                </div>

                {/* Info */}
                <p className="text-xs text-muted-foreground bg-white p-2 rounded border">
                  <strong>Criterios legacy:</strong> se aplican sobre la tabla de clientes
                  (equipos, productos, facturas). Útil para Electromedicina. Para filtrar
                  sobre personas/contactos usá la sección CRM debajo.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Criterios CRM (personas) */}
          {(tipoSeleccionado === 'dinamica' || tipoSeleccionado === 'hibrida') && (
            <Card className="border-teal-200 bg-teal-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-600" />
                  Criterios CRM (personas)
                  {crmPreviewCount !== null && (
                    <Badge variant="secondary" className="ml-auto">
                      {loadingCrmPreview ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {crmPreviewCount} personas
                        </span>
                      )}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags ANY */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Con cualquiera de estos tags:
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {tagsDisponibles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay tags definidos</p>
                    ) : (
                      tagsDisponibles.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={selectedTagsAny.includes(tag.id) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selectedTagsAny.includes(tag.id)
                              ? 'bg-teal-600 hover:bg-teal-700'
                              : 'hover:bg-teal-100'
                          }`}
                          onClick={() => toggleSelection(tag.id, selectedTagsAny, setSelectedTagsAny)}
                        >
                          {tag.nombre}
                          {selectedTagsAny.includes(tag.id) && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Tags ALL */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Con todos estos tags (AND):
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {tagsDisponibles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay tags definidos</p>
                    ) : (
                      tagsDisponibles.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={selectedTagsAll.includes(tag.id) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selectedTagsAll.includes(tag.id)
                              ? 'bg-cyan-600 hover:bg-cyan-700'
                              : 'hover:bg-cyan-100'
                          }`}
                          onClick={() => toggleSelection(tag.id, selectedTagsAll, setSelectedTagsAll)}
                        >
                          {tag.nombre}
                          {selectedTagsAll.includes(tag.id) && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Tipo de persona */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Tipo de contacto:
                  </Label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white">
                    {TIPOS_PERSONA_OPTS.map((t) => (
                      <Badge
                        key={t.value}
                        variant={selectedTipoPersona.includes(t.value) ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${
                          selectedTipoPersona.includes(t.value)
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'hover:bg-indigo-100'
                        }`}
                        onClick={() => toggleSelection(t.value, selectedTipoPersona, setSelectedTipoPersona)}
                      >
                        {t.label}
                        {selectedTipoPersona.includes(t.value) && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Clientes vinculados */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Vinculados a estos clientes:
                  </Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-white">
                    {clientesDisponibles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Cargando clientes...</p>
                    ) : (
                      clientesDisponibles.slice(0, 100).map((c) => (
                        <Badge
                          key={c.id}
                          variant={selectedClientes.includes(c.id) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            selectedClientes.includes(c.id)
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'hover:bg-rose-100'
                          }`}
                          onClick={() => toggleSelection(c.id, selectedClientes, setSelectedClientes)}
                        >
                          {c.nombre}
                          {selectedClientes.includes(c.id) && <X className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))
                    )}
                  </div>
                  {clientesDisponibles.length > 100 && (
                    <p className="text-[11px] text-muted-foreground">
                      Mostrando primeros 100. Usá tags para filtros más amplios.
                    </p>
                  )}
                </div>

                {/* Flags: email válido + activo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between space-x-2 rounded-md border bg-white p-3">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">Email válido</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Excluye bounces y desuscriptos
                      </p>
                    </div>
                    <Switch checked={emailValido} onCheckedChange={setEmailValido} />
                  </div>
                  <div className="flex items-center justify-between space-x-2 rounded-md border bg-white p-3">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">Sólo activos</Label>
                      <p className="text-[11px] text-muted-foreground">
                        personas.activo = true
                      </p>
                    </div>
                    <Switch checked={estadoActivo} onCheckedChange={setEstadoActivo} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-white p-2 rounded border">
                  <strong>CRM:</strong> se aplica sobre la tabla de personas. Los criterios
                  se combinan con <strong>AND</strong>. Si no seleccionás nada, no hay match.
                  Cambios en una persona disparan sync automático.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Activa */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="activa" className="text-base">
                Lista Activa
              </Label>
              <p className="text-sm text-muted-foreground">
                Las listas inactivas no se pueden usar en campañas
              </p>
            </div>
            <Switch
              id="activa"
              checked={watch('activa')}
              onCheckedChange={(checked) => setValue('activa', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              htmlType="button"
              type="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              disabled={isSubmitting}
              iconLeft={
                isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )
              }
            >
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Lista'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
