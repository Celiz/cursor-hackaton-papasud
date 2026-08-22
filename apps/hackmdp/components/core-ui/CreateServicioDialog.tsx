"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { searchClientes } from "@/hooks/use-client-search";
import { searchEquiposUnidades } from "@/hooks/use-equipo-search";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const nuevoServicioSchema = z.object({
  cliente_id: z.string().min(1, "Cliente es requerido"),
  equipo_id: z.string().min(1, "Equipo es requerido"),
  tecnico: z.string().min(1, "Técnico es requerido"),
  estado: z.string().default("Reparar"),
  estado_contable: z.string().default("Pendiente"),
  falla_declarada: z.string().min(10, "Describe la falla reportada (mínimo 10 caracteres)"),
  modo_de_contacto: z.string().optional(),
  accesorios_entrantes: z.string().optional(),
  garantia: z.boolean().default(false),
});

type NuevoServicioFormData = z.infer<typeof nuevoServicioSchema>;

interface CreateServicioDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NuevoServicioFormData) => Promise<void>;
  clientes?: { id: string; nombre: string }[];
  equipos?: { id: string; marca: string; modelo: string }[];
}

const TECNICOS = [
  "Juan Pérez",
  "María González",
  "Carlos Rodríguez",
  "Ana Martínez",
];

const MODOS_CONTACTO = ["Email", "Teléfono", "WhatsApp", "Presencial"];

export function CreateServicioDialog({
  isOpen,
  onClose,
  onCreate,
  clientes = [],
  equipos = [],
}: CreateServicioDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
  } = useForm<NuevoServicioFormData>({
    resolver: zodResolver(nuevoServicioSchema) as any,
    defaultValues: {
      estado: "Reparar",
      estado_contable: "Pendiente",
      garantia: false,
    },
  });

  const onSubmit = async (data: NuevoServicioFormData) => {
    try {
      await onCreate(data);
      toast.success("Orden de servicio creada exitosamente");
      reset();
      onClose();
    } catch (error) {
      toast.error("Error al crear la orden de servicio");
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className={cn(sheetClasses.content, "h-[90vh]")} side="bottom">
        <div className="h-full flex flex-col">
          <SheetHeader className={sheetClasses.header}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-purple-500/10 dark:bg-purple-500/20 flex-shrink-0">
                <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className={sheetClasses.title}>Nueva Orden de Servicio</SheetTitle>
                <SheetDescription className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Registra una nueva orden de servicio técnico
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit(onSubmit as any)}
            className="flex-1 overflow-y-auto px-6 py-4 flex flex-col"
          >
            <div className="space-y-4 flex-1">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label htmlFor="cliente_id" className="text-sm font-medium">Cliente *</Label>
            <SearchableCombobox
              value={watch("cliente_id") || ""}
              onValueChange={(value) => setValue("cliente_id", value)}
              searchFn={searchClientes}
              placeholder="Buscar cliente"
              emptyMessage="No se encontraron clientes"
            />
            {errors.cliente_id && (
              <p className="text-sm text-red-600">{errors.cliente_id.message}</p>
            )}
          </div>

          {/* Equipo */}
          <div className="space-y-1.5">
            <Label htmlFor="equipo_id" className="text-sm font-medium">Equipo *</Label>
            <SearchableCombobox
              value={watch("equipo_id") || ""}
              onValueChange={(value) => setValue("equipo_id", value)}
              searchFn={searchEquiposUnidades}
              placeholder="Buscar equipo"
              emptyMessage="No se encontraron equipos"
            />
            {errors.equipo_id && (
              <p className="text-sm text-red-600">{errors.equipo_id.message}</p>
            )}
          </div>

          {/* Técnico */}
          <div className="space-y-1.5">
            <Label htmlFor="tecnico" className="text-sm font-medium">Técnico Asignado *</Label>
            <Select onValueChange={(value) => setValue("tecnico", value)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar técnico" />
              </SelectTrigger>
              <SelectContent>
                {TECNICOS.map((tecnico) => (
                  <SelectItem key={tecnico} value={tecnico} className="text-sm">
                    {tecnico}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tecnico && (
              <p className="text-sm text-red-600">{errors.tecnico.message}</p>
            )}
          </div>

          {/* Falla Declarada */}
          <div className="space-y-1.5">
            <Label htmlFor="falla_declarada" className="text-sm font-medium">Falla Declarada *</Label>
            <Textarea
              id="falla_declarada"
              {...register("falla_declarada")}
              placeholder="Describe detalladamente la falla reportada por el cliente..."
              className="text-sm resize-none"
              rows={3}
            />
            {errors.falla_declarada && (
              <p className="text-sm text-red-600">
                {errors.falla_declarada.message}
              </p>
            )}
          </div>

          {/* Accesorios Entrantes */}
          <div className="space-y-1.5">
            <Label htmlFor="accesorios_entrantes" className="text-sm font-medium">Accesorios Entrantes</Label>
            <Input
              id="accesorios_entrantes"
              {...register("accesorios_entrantes")}
              placeholder="Ej: Cargador, cable, estuche, manual..."
              className="h-9 text-sm"
            />
          </div>

          {/* Modo de Contacto */}
          <div className="space-y-1.5">
            <Label htmlFor="modo_de_contacto" className="text-sm font-medium">Modo de Contacto Preferido</Label>
            <Select
              onValueChange={(value) => setValue("modo_de_contacto", value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccionar modo de contacto" />
              </SelectTrigger>
              <SelectContent>
                {MODOS_CONTACTO.map((modo) => (
                  <SelectItem key={modo} value={modo} className="text-sm">
                    {modo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Garantía */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="garantia"
                {...register("garantia")}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <Label htmlFor="garantia" className="cursor-pointer text-sm">
                ¿El equipo está en garantía?
              </Label>
            </div>
          </div>

              {/* Nota informativa */}
              <div className="border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <strong>Nota:</strong> El diagnóstico técnico, insumos utilizados y
                  montos se agregarán durante el proceso de reparación.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
              <motion.div whileHover={{ opacity: 0.8 }} whileTap={{ opacity: 0.6 }}>
                <Button
                  htmlType="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  variant="outline"
                  className="h-8 text-sm"
                >
                  Cancelar
                </Button>
              </motion.div>
              <motion.div whileHover={{ opacity: 0.8 }} whileTap={{ opacity: 0.6 }}>
                <Button
                  htmlType="submit"
                  disabled={isSubmitting}
                  iconLeft={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  className="bg-purple-600 hover:bg-purple-700 h-8 text-sm text-white"
                >
                  {isSubmitting ? "Creando..." : "Crear Orden"}
                </Button>
              </motion.div>
            </div>
          </motion.form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
