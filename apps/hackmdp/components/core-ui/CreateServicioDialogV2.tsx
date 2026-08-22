"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchClientes, ClienteComboboxOption } from "@/hooks/use-client-search";
import { searchEquiposUnidades } from "@/hooks/use-equipo-search";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  User,
  Wrench,
  FileText,
  Check,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const servicioSchema = z.object({
  cliente_id: z.string().min(1, "Cliente es requerido"),
  equipo_id: z.string().min(1, "Equipo es requerido"),
  tecnico: z.string().min(1, "Técnico es requerido"),
  tipo_servicio: z.string().default("Reparación"),
  falla_declarada: z.string().min(10, "Describe la falla (mínimo 10 caracteres)"),
  modo_de_contacto: z.string().optional(),
  accesorios_entrantes: z.string().optional(),
  contacto: z.string().optional(),
  garantia: z.boolean().default(false),
  tipo_garantia: z.string().optional(),
  // sin_cargo: el servicio se realiza pero no se factura. Reemplaza el hack
  // legacy de `estado = 'Sin cargo'` que mezclaba estado operativo con régimen
  // de facturación. Con el flag, el estado operativo queda libre (pendiente,
  // en_curso, finalizado...) y `sin_cargo` rige el régimen por separado.
  // Los repuestos usados descargan stock normalmente (costo absorbido por Uno).
  // El constraint chk_servicios_sin_cargo_motivo (migración 887) requiere motivo.
  sin_cargo: z.boolean().default(false),
  motivo_sin_cargo: z.string().optional(),
}).refine(
  (data) => !data.sin_cargo || (data.motivo_sin_cargo && data.motivo_sin_cargo.trim().length > 0),
  { message: "Si el servicio es sin cargo, el motivo es obligatorio", path: ["motivo_sin_cargo"] }
);

const nuevoClienteSchema = z.object({
  nombre: z.string().min(2, "Nombre es requerido"),
  nombre_fantasia: z.string().optional(),
  cuit: z.string().min(11, "CUIT debe tener al menos 11 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

type ServicioFormData = z.infer<typeof servicioSchema>;
type NuevoClienteFormData = z.infer<typeof nuevoClienteSchema>;

interface CreateServicioDialogV2Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: ServicioFormData) => Promise<void>;
}

const TECNICOS = [
  "Juan Pérez",
  "María González",
  "Carlos Rodríguez",
  "Ana Martínez",
];

const MODOS_CONTACTO = ["Email", "Teléfono", "WhatsApp", "Presencial"];
const TIPOS_SERVICIO = ["Reparación", "Reacondicionamiento", "Mantenimiento", "Instalación", "Consultoría"];

// ============================================================================
// STEPPER COMPONENTS
// ============================================================================

const steps = [
  { id: 1, name: "Cliente", icon: User, description: "Selecciona o crea un cliente" },
  { id: 2, name: "Equipo", icon: Wrench, description: "Selecciona el equipo a reparar" },
  { id: 3, name: "Detalles", icon: FileText, description: "Completa la información del servicio" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm",
                  isCompleted &&
                    "bg-green-600 border-green-600 text-white shadow-green-600/20",
                  isActive &&
                    "bg-primary border-primary text-primary-foreground shadow-primary/20",
                  !isActive &&
                    !isCompleted &&
                    "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              <div className="text-center mt-3">
                <span
                  className={cn(
                    "text-sm font-semibold block",
                    isActive && "text-primary",
                    isCompleted && "text-green-600",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
                <span className="text-xs text-muted-foreground mt-1 hidden md:block">
                  {step.description}
                </span>
              </div>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 mx-4 transition-all",
                  currentStep > step.id
                    ? "bg-gradient-to-r from-green-600 to-green-400"
                    : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// CLIENTE INFO CARD
// ============================================================================

interface ClienteInfoCardProps {
  option: ClienteComboboxOption | null;
}

function ClienteInfoCard({ option }: ClienteInfoCardProps) {
  if (!option?.data) return null;

  const { nombre, nombre_fantasia, identificador_unico, cuit, email, telefono } = option.data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-xl shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-600 rounded-lg">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-base font-semibold text-green-900 dark:text-green-100 mb-1">
              Cliente seleccionado
            </h3>
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-green-700 dark:text-green-300" />
                <span className="font-medium text-green-900 dark:text-green-100">{nombre}</span>
                {nombre_fantasia && (
                  <Badge variant="secondary" className="text-xs">
                    {nombre_fantasia}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {identificador_unico && (
                  <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                    <Hash className="h-3.5 w-3.5" />
                    <span>{identificador_unico}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                  <span className="font-mono text-xs">{cuit}</span>
                </div>
                {email && email[0] && (
                  <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{email[0]}</span>
                  </div>
                )}
                {telefono && telefono[0] && (
                  <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{telefono[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// NUEVO CLIENTE DIALOG
// ============================================================================

interface NuevoClienteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCreado: (clienteId: string) => void;
}

function NuevoClienteDialog({ isOpen, onClose, onClienteCreado }: NuevoClienteDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NuevoClienteFormData>({
    resolver: zodResolver(nuevoClienteSchema),
  });

  const onSubmit = async (data: NuevoClienteFormData) => {
    try {
      const clienteData = {
        ...data,
        email: data.email ? [data.email] : [],
        telefono: data.telefono ? [data.telefono] : [],
      };

      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clienteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear cliente");
      }

      const nuevoCliente = await response.json();
      toast.success("Cliente creado exitosamente");
      onClienteCreado(nuevoCliente.id);
      reset();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear cliente");
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Nuevo Cliente
          </DialogTitle>
          <DialogDescription>
            Completa la información del nuevo cliente. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre" className="flex items-center gap-1">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                {...register("nombre")}
                placeholder="Razón social o nombre completo"
              />
              {errors.nombre && (
                <p className="text-sm text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            {/* Nombre Fantasía */}
            <div className="space-y-2">
              <Label htmlFor="nombre_fantasia">Nombre de Fantasía</Label>
              <Input
                id="nombre_fantasia"
                {...register("nombre_fantasia")}
                placeholder="Nombre comercial (opcional)"
              />
            </div>

            {/* CUIT */}
            <div className="space-y-2">
              <Label htmlFor="cuit" className="flex items-center gap-1">
                CUIT/CUIL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cuit"
                {...register("cuit")}
                placeholder="XX-XXXXXXXX-X"
              />
              {errors.cuit && (
                <p className="text-sm text-destructive">{errors.cuit.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="email@ejemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                {...register("telefono")}
                placeholder="+54 9 11 XXXX-XXXX"
              />
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                {...register("direccion")}
                placeholder="Calle, número, ciudad"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateServicioDialogV2({
  isOpen,
  onClose,
  onCreate,
}: CreateServicioDialogV2Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showNuevoClienteDialog, setShowNuevoClienteDialog] = useState(false);
  const [selectedClienteOption, setSelectedClienteOption] = useState<ClienteComboboxOption | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
    control,
    trigger,
  } = useForm<ServicioFormData>({
    resolver: zodResolver(servicioSchema) as any,
    defaultValues: {
      tipo_servicio: "Reparación",
      garantia: false,
      sin_cargo: false,
      motivo_sin_cargo: "",
    },
    mode: "onChange",
  });

  const clienteId = watch("cliente_id");
  const equipoId = watch("equipo_id");
  const garantiaValue = watch("garantia");
  const sinCargoValue = watch("sin_cargo");

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNext = async () => {
    let fieldsToValidate: (keyof ServicioFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["cliente_id"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["equipo_id"];
    }

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
        setIsTransitioning(false);
      }, 200);
    }
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
      setIsTransitioning(false);
    }, 200);
  };

  const onSubmit = async (data: ServicioFormData) => {
    try {
      await onCreate(data);
      toast.success("Orden de servicio creada exitosamente");
      handleClose();
    } catch (error) {
      toast.error("Error al crear la orden de servicio");
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    setCurrentStep(1);
    setSelectedClienteOption(null);
    onClose();
  };

  const handleClienteCreado = (clienteId: string) => {
    setValue("cliente_id", clienteId);
    // Trigger a re-fetch or update the selected option
    setTimeout(() => {
      handleNext();
    }, 500);
  };

  // Custom search function that includes the full option data
  const searchClientesWithData = useCallback(async (query: string) => {
    const results = await searchClientes(query);
    return results;
  }, []);

  // ============================================================================
  // ANIMATION VARIANTS
  // ============================================================================

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Selecciona el Cliente</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Busca un cliente existente o crea uno nuevo para comenzar la orden de servicio
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id" className="text-base font-medium">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="cliente_id"
                control={control}
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || ""}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Find and store the full option data
                      searchClientesWithData("").then((options) => {
                        const selected = options.find((opt) => opt.value === value);
                        if (selected) {
                          setSelectedClienteOption(selected as ClienteComboboxOption);
                        }
                      });
                    }}
                    searchFn={searchClientesWithData}
                    placeholder="Buscar por nombre, CUIT, email o teléfono..."
                    emptyMessage="No se encontraron clientes"
                    triggerClassName="h-12 text-base"
                  />
                )}
              />
              {errors.cliente_id && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  {errors.cliente_id.message}
                </p>
              )}
            </div>

            {/* Cliente Info Card */}
            {clienteId && selectedClienteOption && (
              <ClienteInfoCard option={selectedClienteOption} />
            )}

            {/* Botón para crear nuevo cliente */}
            <div className="flex items-center gap-3 pt-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">o</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-dashed border-2"
              onClick={() => setShowNuevoClienteDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Nuevo Cliente
            </Button>

            {/* Información adicional */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> Puedes buscar por nombre completo, nombre de fantasía, número de cliente, CUIT o email. El buscador mostrará resultados mientras escribes.
              </p>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Selecciona el Equipo</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                ¿Qué equipo del cliente requiere servicio técnico?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipo_id" className="text-base font-medium">
                Equipo <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="equipo_id"
                control={control}
                render={({ field }) => (
                  <SearchableCombobox
                    value={field.value || ""}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Auto-avanzar después de seleccionar
                      setTimeout(() => {
                        if (value) handleNext();
                      }, 600);
                    }}
                    searchFn={searchEquiposUnidades}
                    placeholder="Buscar por marca, modelo o número de serie..."
                    emptyMessage="No se encontraron equipos para este cliente"
                    triggerClassName="h-12 text-base"
                  />
                )}
              />
              {errors.equipo_id && (
                <p className="text-sm text-destructive">{errors.equipo_id.message}</p>
              )}
            </div>

            {equipoId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-green-900 dark:text-green-100 block">
                      Equipo seleccionado correctamente
                    </span>
                    <span className="text-xs text-green-700 dark:text-green-300">
                      Continúa con los detalles del servicio
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> Si el equipo no aparece en la lista, asegúrate de que esté registrado para este cliente en la sección de equipos.
              </p>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Detalles del Servicio</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Completa la información técnica de la orden de servicio
              </p>
            </div>

            {/* Grid de información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Técnico */}
              <div className="space-y-2">
                <Label htmlFor="tecnico" className="flex items-center gap-1">
                  Técnico Asignado <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) => setValue("tecnico", value)}
                  defaultValue=""
                >
                  <SelectTrigger className="h-11 bg-white dark:bg-gray-800 border-2">
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {TECNICOS.map((tecnico) => (
                      <SelectItem key={tecnico} value={tecnico}>
                        {tecnico}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tecnico && (
                  <p className="text-sm text-destructive">{errors.tecnico.message}</p>
                )}
              </div>

              {/* Tipo de Servicio */}
              <div className="space-y-2">
                <Label htmlFor="tipo_servicio">Tipo de Servicio</Label>
                <Select
                  defaultValue="Reparación"
                  onValueChange={(value) => setValue("tipo_servicio", value)}
                >
                  <SelectTrigger className="h-11 bg-white dark:bg-gray-800 border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_SERVICIO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contacto */}
              <div className="space-y-2">
                <Label htmlFor="contacto">Persona de Contacto</Label>
                <Input
                  id="contacto"
                  {...register("contacto")}
                  placeholder="Quien entrega el equipo"
                  className="h-11 bg-white dark:bg-gray-800 border-2"
                />
              </div>

              {/* Modo de Contacto */}
              <div className="space-y-2">
                <Label htmlFor="modo_de_contacto">Modo de Contacto</Label>
                <Select onValueChange={(value) => setValue("modo_de_contacto", value)}>
                  <SelectTrigger className="h-11 bg-white dark:bg-gray-800 border-2">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODOS_CONTACTO.map((modo) => (
                      <SelectItem key={modo} value={modo}>
                        {modo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Falla Declarada */}
            <div className="space-y-2">
              <Label htmlFor="falla_declarada" className="flex items-center gap-1">
                Falla Declarada <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="falla_declarada"
                {...register("falla_declarada")}
                placeholder="Describe detalladamente la falla reportada por el cliente..."
                rows={4}
                className="resize-none bg-white dark:bg-gray-800 border-2"
              />
              {errors.falla_declarada && (
                <p className="text-sm text-destructive">
                  {errors.falla_declarada.message}
                </p>
              )}
            </div>

            {/* Accesorios */}
            <div className="space-y-2">
              <Label htmlFor="accesorios_entrantes">Accesorios Entrantes</Label>
              <Input
                id="accesorios_entrantes"
                {...register("accesorios_entrantes")}
                placeholder="Ej: Cargador, cable, estuche, manual..."
                className="h-11 bg-white dark:bg-gray-800 border-2"
              />
              <p className="text-xs text-muted-foreground">
                Lista los accesorios que el cliente entrega junto con el equipo
              </p>
            </div>

            {/* Garantía */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="garantia"
                  {...register("garantia")}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="garantia" className="cursor-pointer font-medium">
                  ¿El equipo está en garantía?
                </Label>
              </div>

              {garantiaValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 space-y-2"
                >
                  <Label htmlFor="tipo_garantia">Tipo de Garantía</Label>
                  <Input
                    id="tipo_garantia"
                    {...register("tipo_garantia")}
                    placeholder="Ej: Garantía del fabricante, garantía previa..."
                    className="h-11 bg-white dark:bg-gray-800 border-2"
                  />
                </motion.div>
              )}
            </div>

            {/* Sin cargo — régimen de facturación separado del estado operativo.
                Reemplaza el hack legacy de estado='Sin cargo'. */}
            <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="sin_cargo"
                  {...register("sin_cargo")}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                />
                <Label htmlFor="sin_cargo" className="cursor-pointer font-medium">
                  Servicio sin cargo (no se facturará)
                </Label>
              </div>

              {sinCargoValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 space-y-2"
                >
                  <Label htmlFor="motivo_sin_cargo">Motivo (obligatorio)</Label>
                  <Input
                    id="motivo_sin_cargo"
                    {...register("motivo_sin_cargo")}
                    placeholder="Ej: Cortesía, garantía extendida, re-trabajo interno..."
                    className="h-11 bg-white dark:bg-gray-800 border-2 border-amber-200"
                  />
                  {errors.motivo_sin_cargo && (
                    <p className="text-xs text-destructive">{errors.motivo_sin_cargo.message as string}</p>
                  )}
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Los repuestos utilizados descargan stock igualmente (costo absorbido por Uno).
                    El servicio queda trazado pero sin facturación AFIP.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-4xl h-full overflow-hidden p-0" side="right">
          <div className="h-full flex flex-col">
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-gradient-to-r from-primary/5 to-primary/10">
              <SheetTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary rounded-lg">
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </div>
                Nueva Orden de Servicio Técnico
              </SheetTitle>
              <SheetDescription className="text-base">
                Completa la información en {steps.length} pasos simples para crear la orden
              </SheetDescription>
            </SheetHeader>

            <Separator />

            {/* Content */}
            <form
              onSubmit={handleSubmit(onSubmit as any)}
              className="flex-1 overflow-y-auto px-6 py-6 flex flex-col"
            >
              {/* Step Indicator */}
              <StepIndicator currentStep={currentStep} />

              {/* Step Content */}
              <div className="flex-1 min-h-[400px] relative">
                <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t mt-auto shrink-0 bg-background">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={currentStep === 1 ? handleClose : handleBack}
                  disabled={isSubmitting || isTransitioning}
                >
                  {currentStep === 1 ? (
                    "Cancelar"
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Atrás
                    </>
                  )}
                </Button>

                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleNext}
                    disabled={isTransitioning}
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Crear Orden
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Nuevo Cliente Dialog */}
      <NuevoClienteDialog
        isOpen={showNuevoClienteDialog}
        onClose={() => setShowNuevoClienteDialog(false)}
        onClienteCreado={handleClienteCreado}
      />
    </>
  );
}
