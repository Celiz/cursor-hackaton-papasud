"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente } from "@/lib/types";
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle, Building2, Stethoscope, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TagSelector } from "@/components/core-ui/TagSelector";
import { ChipInput } from "@/components/core-ui/ChipInput";
import { EstadoCombobox } from "@/components/core-ui/EstadoCombobox";

interface CreateClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Cliente>) => Promise<void>;
  defaultNombre?: string;
  defaultEmail?: string;
  defaultTelefono?: string;
}

// Tipos para respuesta de ARCA
interface DatosContribuyenteArca {
  cuit: string;
  tipoPersona: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  nombreCompleto: string;
  condicionIva: string;
  condicionIvaCodigo: number;
  condicionIvaInterno: string;
  domicilioFiscal?: {
    direccion?: string;
    localidad?: string;
    provincia?: string;
    codigoPostal?: string;
  };
  estadoCuit: string;
  actividadPrincipal?: {
    codigo: string;
    descripcion: string;
  };
  esMonotributista: boolean;
  esResponsableInscripto: boolean;
  esExento: boolean;
}

type CuitValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'found';

export function CreateClienteDialog({ open, onOpenChange, onSave, defaultNombre, defaultEmail, defaultTelefono }: CreateClienteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [cuitStatus, setCuitStatus] = useState<CuitValidationStatus>('idle');
  const [cuitError, setCuitError] = useState<string>('');
  const [datosArca, setDatosArca] = useState<DatosContribuyenteArca | null>(null);
  const [formData, setFormData] = useState({
    nombre: defaultNombre || "",
    nombre_fantasia: "",
    cuit: "",
    email: (defaultEmail ? [defaultEmail] : []) as string[],
    telefono: (defaultTelefono ? [defaultTelefono] : []) as string[],
    direccion: "",
    estado: "En Orden",
    condicion_iva: "consumidor_final",
    tipo_documento: "CUIT",
    localidad: "",
    provincia: "",
    codigo_postal: "",
    factor_precio: "1.0000",
    division: "humanos" as "humanos" | "veterinaria",
    lista_precios_id: "",
  });

  const { data: listasPrecios } = useSWR<{id: string, nombre: string, margen_porcentaje: number}[]>(
    open ? '/api/listas-precios' : null,
    async (url: string) => {
      const res = await fetch(url)
      const data = await res.json()
      return Array.isArray(data) ? data : []
    }
  )

  // Pre-fill defaults when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        nombre: prev.nombre || defaultNombre || "",
        email: prev.email.length > 0 ? prev.email : (defaultEmail ? [defaultEmail] : []),
        telefono: prev.telefono.length > 0 ? prev.telefono : (defaultTelefono ? [defaultTelefono] : []),
      }));
    }
  }, [open, defaultNombre, defaultEmail, defaultTelefono]);

  // Estado para búsqueda de localidades
  const [localidadQuery, setLocalidadQuery] = useState("");
  const [localidadResults, setLocalidadResults] = useState<{ nombre: string; provincia: string; label: string }[]>([]);
  const [showLocalidadDropdown, setShowLocalidadDropdown] = useState(false);
  const [loadingLocalidad, setLoadingLocalidad] = useState(false);
  const localidadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const localidadRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (localidadRef.current && !localidadRef.current.contains(event.target as Node)) {
        setShowLocalidadDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda de localidades con debounce
  const handleLocalidadSearch = useCallback((value: string) => {
    setLocalidadQuery(value);
    setFormData(prev => ({ ...prev, localidad: value }));

    if (localidadTimeoutRef.current) clearTimeout(localidadTimeoutRef.current);

    if (value.length < 2) {
      setLocalidadResults([]);
      setShowLocalidadDropdown(false);
      return;
    }

    setLoadingLocalidad(true);
    localidadTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/localidades?q=${encodeURIComponent(value)}&max=8`);
        const data = await res.json();
        setLocalidadResults(data.localidades || []);
        setShowLocalidadDropdown(true);
      } catch {
        setLocalidadResults([]);
      } finally {
        setLoadingLocalidad(false);
      }
    }, 300);
  }, []);

  const handleSelectLocalidad = useCallback((loc: { nombre: string; provincia: string }) => {
    setFormData(prev => ({
      ...prev,
      localidad: loc.nombre,
      provincia: loc.provincia,
    }));
    setLocalidadQuery(loc.nombre);
    setShowLocalidadDropdown(false);
  }, []);

  // Función para validar y buscar CUIT en ARCA
  const handleValidarCuit = useCallback(async () => {
    const cuit = formData.cuit.replace(/\D/g, '');

    if (cuit.length !== 11) {
      setCuitStatus('invalid');
      setCuitError('El CUIT debe tener 11 dígitos');
      return;
    }

    setCuitStatus('validating');
    setCuitError('');
    setDatosArca(null);

    try {
      const response = await fetch('/api/arca/validar-cuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuit }),
      });

      const result = await response.json();

      if (!result.valido) {
        setCuitStatus('invalid');
        setCuitError(result.error || 'CUIT inválido');
        return;
      }

      if (result.success && result.datos) {
        // CUIT encontrado en ARCA - autocompletar datos
        const datos = result.datos as DatosContribuyenteArca;
        setDatosArca(datos);
        setCuitStatus('found');

        // Autocompletar formulario
        // A13 no devuelve condición IVA, solo setear si realmente la tiene
        const tieneCondicionIva = datos.esResponsableInscripto || datos.esMonotributista || datos.esExento;
        setFormData(prev => ({
          ...prev,
          cuit: datos.cuit,
          nombre: datos.nombreCompleto || prev.nombre,
          condicion_iva: tieneCondicionIva ? datos.condicionIvaInterno : prev.condicion_iva,
          direccion: datos.domicilioFiscal?.direccion || prev.direccion,
          localidad: datos.domicilioFiscal?.localidad || prev.localidad,
          provincia: datos.domicilioFiscal?.provincia || prev.provincia,
        }));
        // Sincronizar campo de búsqueda de localidad
        if (datos.domicilioFiscal?.localidad) {
          setLocalidadQuery(datos.domicilioFiscal.localidad);
        }

        toast.success(`Datos de ${datos.nombreCompleto} obtenidos de ARCA`);
      } else {
        // CUIT válido pero sin datos de ARCA
        setCuitStatus('valid');
        if (result.sinDatosArca) {
          toast.info('CUIT válido. No se pudo consultar ARCA.');
        }
      }
    } catch (error) {
      console.error('Error validando CUIT:', error);
      setCuitStatus('invalid');
      setCuitError('Error al validar CUIT');
    }
  }, [formData.cuit]);

  // Formatear CUIT mientras escribe
  const handleCuitChange = (value: string) => {
    // Solo permitir números y guiones
    const cleaned = value.replace(/[^\d-]/g, '');
    setFormData({ ...formData, cuit: cleaned });

    // Resetear estado si cambia el CUIT
    if (cuitStatus !== 'idle') {
      setCuitStatus('idle');
      setCuitError('');
      setDatosArca(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...formData,
        lista_precios_id: formData.lista_precios_id && formData.lista_precios_id !== 'none' ? formData.lista_precios_id : null,
        email: formData.email,
        telefono: formData.telefono,
        factor_precio: parseFloat(formData.factor_precio) || 1.0,
        division: formData.division,
        tags: selectedTags as any,
      } as Partial<Cliente>);
      // Reset form
      setFormData({
        nombre: "",
        nombre_fantasia: "",
        cuit: "",
        email: [],
        telefono: [],
        direccion: "",
        estado: "En Orden",
        condicion_iva: "consumidor_final",
        tipo_documento: "CUIT",
        localidad: "",
        provincia: "",
        codigo_postal: "",
        factor_precio: "1.0000",
        division: "humanos",
        lista_precios_id: "",
      });
      setSelectedTags([]);
      setCuitStatus('idle');
      setCuitError('');
      setDatosArca(null);
      setLocalidadQuery("");
      setLocalidadResults([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="text-xl">Crear Nuevo Cliente</DialogTitle>
            <DialogDescription className="text-sm">
              Completa la información del cliente. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            <div className="space-y-6">
              {/* CUIT con validación - PRIMERO */}
              <div className="space-y-2">
                <Label htmlFor="cuit" className="text-sm font-medium">
                  CUIT / DNI
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Input
                      id="cuit"
                      value={formData.cuit}
                      onChange={(e) => handleCuitChange(e.target.value)}
                      placeholder="CUIT o DNI"
                      className={cn(
                        "h-10 pr-10",
                        cuitStatus === 'found' && "border-green-500 focus:ring-green-500",
                        cuitStatus === 'valid' && "border-blue-500 focus:ring-blue-500",
                        cuitStatus === 'invalid' && "border-red-500 focus:ring-red-500"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleValidarCuit();
                        }
                      }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cuitStatus === 'validating' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {cuitStatus === 'found' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {cuitStatus === 'valid' && (
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      )}
                      {cuitStatus === 'invalid' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Button
                    type="default"
                    htmlType="button"
                    onClick={handleValidarCuit}
                    disabled={cuitStatus === 'validating' || formData.cuit.replace(/\D/g, '').length < 11}
                    className="h-10 px-4"
                  >
                    {cuitStatus === 'validating' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Validar CUIT</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Opcional para consumidor final. Validar CUIT autocompleta datos de ARCA.
                </p>
                {cuitError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {cuitError}
                  </p>
                )}
                {cuitStatus === 'found' && datosArca && (
                  <div className="text-sm p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                      <Building2 className="h-4 w-4" />
                      Datos obtenidos de ARCA
                    </div>
                    <div className="text-green-600 dark:text-green-500 grid grid-cols-2 gap-2">
                      {(datosArca.esResponsableInscripto || datosArca.esMonotributista || datosArca.esExento) ? (
                        <p><span className="font-medium">Condición IVA:</span> {datosArca.condicionIva}</p>
                      ) : (
                        <p className="text-amber-600 dark:text-amber-400"><span className="font-medium">Condición IVA:</span> Verificar manualmente</p>
                      )}
                      <p><span className="font-medium">Estado:</span> {datosArca.estadoCuit}</p>
                      {datosArca.actividadPrincipal && (
                        <p className="col-span-2"><span className="font-medium">Actividad:</span> {datosArca.actividadPrincipal.descripcion}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Razón Social <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Nombre completo o razón social"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre_fantasia" className="text-sm font-medium">
                    Nombre de fantasía
                  </Label>
                  <Input
                    id="nombre_fantasia"
                    value={formData.nombre_fantasia}
                    onChange={(e) => setFormData({ ...formData, nombre_fantasia: e.target.value })}
                    placeholder="Nombre comercial o secundario (opcional)"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condicion_iva" className="text-sm font-medium">
                    Condición IVA
                  </Label>
                  <Select
                    value={formData.condicion_iva}
                    onValueChange={(value) => setFormData({ ...formData, condicion_iva: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                      <SelectItem value="monotributista">Monotributista</SelectItem>
                      <SelectItem value="exento">Exento</SelectItem>
                      <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Contacto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Emails
                    </Label>
                    <ChipInput
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(next) => setFormData({ ...formData, email: next })}
                      placeholder="email@ejemplo.com"
                      ariaLabel="Lista de emails"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter o coma para agregar. Backspace borra el último.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-sm font-medium">
                      Teléfonos
                    </Label>
                    <ChipInput
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(next) => setFormData({ ...formData, telefono: next })}
                      placeholder="+54 11 1234-5678"
                      ariaLabel="Lista de teléfonos"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter o coma para agregar. Backspace borra el último.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion" className="text-sm font-medium">
                    Dirección
                  </Label>
                  <Textarea
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número, localidad, provincia"
                    rows={3}
                    className="resize-none min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 relative" ref={localidadRef}>
                    <Label htmlFor="localidad" className="text-sm font-medium">
                      Localidad
                    </Label>
                    <div className="relative">
                      <Input
                        id="localidad"
                        value={localidadQuery}
                        onChange={(e) => handleLocalidadSearch(e.target.value)}
                        onFocus={() => localidadResults.length > 0 && setShowLocalidadDropdown(true)}
                        placeholder="Buscar ciudad..."
                        className="h-10 pr-8"
                        autoComplete="off"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {loadingLocalidad ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {showLocalidadDropdown && localidadResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {localidadResults.map((loc, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => handleSelectLocalidad(loc)}
                          >
                            <span className="font-medium">{loc.nombre}</span>
                            <span className="text-muted-foreground ml-1">— {loc.provincia}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provincia" className="text-sm font-medium">
                      Provincia
                    </Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="Se autocompleta al elegir localidad"
                      className="h-10"
                      readOnly={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigo_postal" className="text-sm font-medium">
                      Código Postal
                    </Label>
                    <Input
                      id="codigo_postal"
                      value={formData.codigo_postal}
                      onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                      placeholder="Ej. 7600"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Estado, Factor Precio y Lista de Precios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-sm font-medium">
                    Estado
                  </Label>
                  <EstadoCombobox
                    id="estado"
                    value={formData.estado}
                    onChange={(value) => setFormData({ ...formData, estado: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="factor_precio" className="text-sm font-medium">
                    Factor de Precio
                  </Label>
                  <Input
                    id="factor_precio"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10"
                    value={formData.factor_precio}
                    onChange={(e) => setFormData({ ...formData, factor_precio: e.target.value })}
                    placeholder="1.00"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplicador: 1.0 = precio lista, 0.9 = -10%, 1.15 = +15%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lista_precios_id" className="text-sm font-medium">
                    Lista de Precios
                  </Label>
                  <Select
                    value={formData.lista_precios_id}
                    onValueChange={(value) => setFormData({ ...formData, lista_precios_id: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sin lista asignada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin lista</SelectItem>
                      {listasPrecios?.map((lp) => (
                        <SelectItem key={lp.id} value={lp.id}>
                          {lp.nombre} ({lp.margen_porcentaje}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define el margen para presupuestos
                  </p>
                </div>
              </div>

              {/* División */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  División
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="division" className="text-sm font-medium flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Tipo de Cliente
                  </Label>
                  <Select
                    value={formData.division}
                    onValueChange={(value: "humanos" | "veterinaria") => setFormData({ ...formData, division: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="humanos">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          Laboratorio Humano
                        </span>
                      </SelectItem>
                      <SelectItem value="veterinaria">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-500" />
                          Veterinaria
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determina el color del encabezado en presupuestos y documentos PDF
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Tags
                </h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Etiquetas
                  </Label>
                  <TagSelector
                    selectedTagIds={selectedTags}
                    onChange={setSelectedTags}
                  />
                  <p className="text-xs text-muted-foreground">
                    Clasifica la empresa con etiquetas para estadísticas y listas de difusión
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                htmlType="button"
                type="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1 sm:flex-initial h-10"
              >
                Cancelar
              </Button>
              <Button
                htmlType="submit"
                type="primary"
                disabled={loading}
                loading={loading}
                className="flex-1 sm:flex-initial h-10"
              >
                Crear Cliente
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
