"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { searchClientes } from "@/hooks/use-client-search";
import { searchLaboratorios } from "@/hooks/use-laboratorio-search";
import { EquipoUnidad } from "@/lib/types";
import { Loader2, Building2, FlaskConical, Monitor, Info, AlertCircle, Calendar as CalendarIcon, ExternalLink, Warehouse, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CreateLaboratorioDialog } from "@/components/core-ui/CreateLaboratorioDialog";
import type { LaboratorioFormData } from "@/lib/types/laboratorios";

interface EditEquipoUnidadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<EquipoUnidad>) => Promise<void>;
  equipoUnidad: EquipoUnidad | null;
}

// Todos los estados posibles segun el check constraint de la tabla
// equipos_unidades. Si la unidad tiene un valor no estandar (ej. "Activo"
// con mayuscula) lo mergeamos dinamicamente para que el Select lo muestre.
const ESTADO_GENERAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "stock", label: "En Stock" },
  { value: "activo", label: "Activo (Instalado)" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "en_reparacion", label: "En Reparación" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "prestamo", label: "Préstamo" },
  { value: "baja", label: "Baja" },
  { value: "retirado", label: "Retirado" },
];

const CONDICION_OPTIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
  { value: "reparacion", label: "Para reparación" },
  { value: "baja", label: "Baja" },
];

interface DepositoOption {
  id: string;
  nombre: string;
  codigo: string;
}

const depositosFetcher = async (url: string): Promise<DepositoOption[]> => {
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data?.rows || [];
};

export function EditEquipoUnidadDialog({
  open,
  onOpenChange,
  onSave,
  equipoUnidad
}: EditEquipoUnidadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipo_id: "",
    numero_serie: "",
    cliente_id: "",
    laboratorio_id: "",
    fecha_compra: "",
    estado_general: "stock",
    notas: "",
    deposito_id: "",
    ubicacion_deposito: "",
    fecha_ingreso: "",
    fecha_ultimo_control: "",
    condicion: "",
    notas_deposito: "",
  });
  const { data: depositos = [] } = useSWR<DepositoOption[]>(
    '/api/inventario/depositos',
    depositosFetcher
  );
  const [defaultClienteOption, setDefaultClienteOption] = useState<ComboboxOption | null>(null);
  const [defaultLabOption, setDefaultLabOption] = useState<ComboboxOption | null>(null);
  const [showCreateLab, setShowCreateLab] = useState(false);

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (equipoUnidad && open) {
      const eu = equipoUnidad as any;
      setFormData({
        equipo_id: equipoUnidad.equipo_id || "",
        numero_serie: equipoUnidad.numero_serie || "",
        cliente_id: equipoUnidad.cliente_id || "",
        laboratorio_id: equipoUnidad.laboratorio_id || "",
        fecha_compra: equipoUnidad.fecha_compra
          ? new Date(equipoUnidad.fecha_compra).toISOString().split('T')[0]
          : "",
        estado_general: equipoUnidad.estado_general || "stock",
        notas: equipoUnidad.notas || "",
        deposito_id: eu.deposito_id || "",
        ubicacion_deposito: eu.ubicacion_deposito || "",
        fecha_ingreso: eu.fecha_ingreso
          ? new Date(eu.fecha_ingreso).toISOString().split('T')[0]
          : "",
        fecha_ultimo_control: eu.fecha_ultimo_control
          ? new Date(eu.fecha_ultimo_control).toISOString().split('T')[0]
          : "",
        condicion: eu.condicion || "",
        notas_deposito: eu.notas_deposito || "",
      });

      // Pre-resolver las opciones del combobox usando datos ya expandidos del
      // equipoUnidad. Sin esto el SearchableCombobox async no puede mostrar
      // el cliente/lab seleccionado porque searchFn("") pagina a 50
      // resultados y el target puede no estar ahi.
      if (eu.clientes && eu.cliente_id) {
        setDefaultClienteOption({
          value: eu.cliente_id,
          label: eu.clientes.nombre_fantasia || eu.clientes.nombre || "Cliente",
          secondaryLabel:
            eu.clientes.nombre_fantasia && eu.clientes.nombre && eu.clientes.nombre_fantasia !== eu.clientes.nombre
              ? eu.clientes.nombre
              : undefined,
          badge: eu.clientes.identificador_unico || eu.clientes.identificador_legacy || undefined,
        });
      } else {
        setDefaultClienteOption(null);
      }

      if (eu.laboratorios && eu.laboratorio_id) {
        setDefaultLabOption({
          value: eu.laboratorio_id,
          label: eu.laboratorios.nombre || "Laboratorio",
          secondaryLabel: eu.laboratorios.direccion || undefined,
        });
      } else {
        setDefaultLabOption(null);
      }
    }
  }, [equipoUnidad, open]);

  // Cuando cambia el cliente, resetear el laboratorio
  const handleClienteChange = (clienteId: string) => {
    const shouldResetLab = clienteId !== formData.cliente_id;
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      laboratorio_id: shouldResetLab ? "" : prev.laboratorio_id,
    }));
  };

  // Función de búsqueda de laboratorios filtrada por cliente
  const searchLaboratoriosFiltered = useCallback(
    (query: string) => {
      return searchLaboratorios(query, formData.cliente_id || undefined);
    },
    [formData.cliente_id]
  );

  // Crear un laboratorio inline para el cliente seleccionado y dejarlo elegido.
  // Reusa el endpoint que ya vincula el lab al cliente vía M:N
  // (laboratorio_razones_sociales), así no hay que salir del form.
  const handleCreateLab = async (data: LaboratorioFormData) => {
    const res = await fetch("/api/laboratorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear laboratorio");
    }
    const created = await res.json();
    // Dejar el lab recién creado seleccionado. El SearchableCombobox aplica
    // defaultSelectedOption cuando coincide con value, así que actualizar ambos
    // basta para mostrarlo sin volver a buscar.
    setDefaultLabOption({
      value: created.id,
      label: created.nombre || data.nombre,
      secondaryLabel: created.direccion || undefined,
    });
    setFormData((prev) => ({ ...prev, laboratorio_id: created.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // equipo_id NO se manda — la unidad siempre apunta al mismo equipo
      // del catálogo. Para cambiar marca/modelo hay que ir al catálogo.
      await onSave({
        numero_serie: formData.numero_serie || undefined,
        cliente_id: formData.cliente_id || undefined,
        laboratorio_id: formData.laboratorio_id || undefined,
        fecha_compra: formData.fecha_compra || undefined,
        estado_general: formData.estado_general,
        notas: formData.notas || undefined,
        deposito_id: formData.deposito_id || null,
        ubicacion_deposito: formData.ubicacion_deposito || null,
        fecha_ingreso: formData.fecha_ingreso || null,
        fecha_ultimo_control: formData.fecha_ultimo_control || null,
        condicion: formData.condicion || null,
        notas_deposito: formData.notas_deposito || null,
      } as any);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating equipo unidad:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!equipoUnidad) return null;

  // Mostrar nombre del equipo actual
  const equipoNombre = equipoUnidad.equipos
    ? `${equipoUnidad.equipos.marca || ''} ${equipoUnidad.equipos.modelo || ''}`
    : 'Equipo sin información';

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Editar Unidad de Equipo
            </DialogTitle>
            <DialogDescription>
              {equipoNombre} - {equipoUnidad.numero_serie || equipoUnidad.codigo || 'Sin serie'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Equipo del catálogo — READ ONLY. Una unidad es una instancia
                fisica concreta, no se puede "cambiar el modelo". Para editar
                marca/modelo/tipo hay que ir al catálogo de equipos. */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1 text-muted-foreground text-xs uppercase tracking-wide">
                Equipo del catálogo
              </Label>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Monitor className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {equipoNombre}
                    </div>
                    {(equipoUnidad.equipos as any)?.tipo && (
                      <div className="text-xs text-muted-foreground truncate">
                        {(equipoUnidad.equipos as any).tipo}
                      </div>
                    )}
                  </div>
                </div>
                {formData.equipo_id && (
                  <Link
                    href={`/dashboard/equipos?id=${formData.equipo_id}`}
                    target="_blank"
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-purple-200/60 dark:border-purple-800/40 transition-colors"
                  >
                    Ver en catálogo
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Para cambiar marca, modelo o tipo, editá el equipo en el catálogo.
              </p>
            </div>

            {/* Número de Serie */}
            <div className="grid gap-2">
              <Label htmlFor="numero_serie">Número de Serie</Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                placeholder="Ej: SN-2024-001234"
                className="font-mono"
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Asignación
              </h4>

              <div className="grid gap-4">
                {/* Cliente / Razón Social */}
                <div className="grid gap-2">
                  <Label htmlFor="cliente_id">Cliente / Razón Social</Label>
                  <SearchableCombobox
                    value={formData.cliente_id}
                    onValueChange={handleClienteChange}
                    searchFn={searchClientes}
                    defaultSelectedOption={defaultClienteOption}
                    placeholder="Buscar cliente..."
                    emptyMessage="No se encontraron clientes"
                  />
                  <p className="text-xs text-muted-foreground">
                    La razón social a la que pertenece el equipo (para facturación)
                  </p>
                </div>

                {/* Laboratorio */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="laboratorio_id" className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-purple-600" />
                      Laboratorio / Ubicación Física
                    </Label>
                    {formData.cliente_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="tiny"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setShowCreateLab(true)}
                        iconLeft={<Plus className="h-3 w-3" />}
                      >
                        Crear laboratorio
                      </Button>
                    )}
                  </div>
                  <SearchableCombobox
                    key={formData.cliente_id} // Re-render cuando cambia el cliente
                    value={formData.laboratorio_id}
                    onValueChange={(value) => setFormData({ ...formData, laboratorio_id: value })}
                    searchFn={searchLaboratoriosFiltered}
                    defaultSelectedOption={defaultLabOption}
                    placeholder={formData.cliente_id ? "Buscar laboratorio del cliente..." : "Buscar laboratorio..."}
                    emptyMessage={formData.cliente_id ? "Este cliente no tiene laboratorios registrados" : "No se encontraron laboratorios"}
                  />
                  {formData.cliente_id && !formData.laboratorio_id && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Servicio técnico necesita el laboratorio para ubicar el equipo. Si no existe, usá &quot;Crear laboratorio&quot;.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-orange-600" />
                Depósito y ubicación física
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="deposito_id">Depósito</Label>
                  <Select
                    value={formData.deposito_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, deposito_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar depósito" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin depósito</SelectItem>
                      {depositos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ubicacion_deposito">Ubicación dentro del depósito</Label>
                  <Input
                    id="ubicacion_deposito"
                    value={formData.ubicacion_deposito}
                    onChange={(e) => setFormData({ ...formData, ubicacion_deposito: e.target.value })}
                    placeholder="Ej: Estante 5, Pallet, Piso"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fecha_ingreso">Fecha de ingreso al depósito</Label>
                  <Input
                    id="fecha_ingreso"
                    type="date"
                    value={formData.fecha_ingreso}
                    onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fecha_ultimo_control">Fecha de último control</Label>
                  <Input
                    id="fecha_ultimo_control"
                    type="date"
                    value={formData.fecha_ultimo_control}
                    onChange={(e) => setFormData({ ...formData, fecha_ultimo_control: e.target.value })}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="condicion">Condición</Label>
                  <Select
                    value={formData.condicion || "none"}
                    onValueChange={(v) => setFormData({ ...formData, condicion: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {CONDICION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="notas_deposito">Notas del depósito</Label>
                  <Textarea
                    id="notas_deposito"
                    value={formData.notas_deposito}
                    onChange={(e) => setFormData({ ...formData, notas_deposito: e.target.value })}
                    placeholder='Ej: "Con cubetas nuevas, falta fuente", "Desarmado", "7 bultos total"'
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-600" />
                Información Adicional
              </h4>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Fecha de Compra */}
                <div className="grid gap-2">
                  <Label htmlFor="fecha_compra">Fecha de Compra</Label>
                  <Input
                    id="fecha_compra"
                    type="date"
                    value={formData.fecha_compra}
                    onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                  />
                </div>

                {/* Estado */}
                <div className="grid gap-2">
                  <Label htmlFor="estado_general">Estado</Label>
                  <Select
                    value={formData.estado_general}
                    onValueChange={(value) => setFormData({ ...formData, estado_general: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Si el valor actual no está en las opciones estándar
                          (ej. "Activo" con mayúscula), lo incluimos al tope
                          para que no se muestre vacío el Select. */}
                      {formData.estado_general &&
                        !ESTADO_GENERAL_OPTIONS.some((o) => o.value === formData.estado_general) && (
                          <SelectItem value={formData.estado_general}>
                            {formData.estado_general}
                          </SelectItem>
                        )}
                      {ESTADO_GENERAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notas */}
              <div className="grid gap-2 mt-4">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Observaciones adicionales sobre esta unidad..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              iconLeft={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Crear laboratorio inline para el cliente del equipo. Va fuera del form
        de arriba para no anidar <form> dentro de <form>. */}
    <CreateLaboratorioDialog
      open={showCreateLab}
      onOpenChange={setShowCreateLab}
      defaultRazonSocialId={formData.cliente_id || undefined}
      onSave={handleCreateLab}
    />
    </>
  );
}
