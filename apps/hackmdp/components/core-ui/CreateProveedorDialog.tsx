"use client";

import { useState } from "react";
import { Proveedor } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface CreateProveedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedor?: Proveedor | null;
  onSuccess?: () => void;
}

const initialFormData = {
  nombre: "",
  cuit: "",
  email: [] as string[],
  telefono: [] as string[],
  direccion: "",
  localidad: "",
  provincia: "",
  codigo_postal: "",
  condiciones_pago: "",
  moneda: "ARS",
  cuenta_bancaria: "",
  cbu: "",
  alias_cbu: "",
  notas: "",
  estado: "activo" as "activo" | "inactivo",
  dias_aviso_vencimiento: "" as number | string | null,
  dias_antiguedad_aviso: "" as number | string | null,
};

export function CreateProveedorDialog({
  open,
  onOpenChange,
  proveedor,
  onSuccess,
}: CreateProveedorDialogProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newTelefono, setNewTelefono] = useState("");

  const isEditing = !!proveedor;

  // Cargar datos del proveedor si estamos editando
  useState(() => {
    if (proveedor && open) {
      setFormData({
        nombre: proveedor.nombre || "",
        cuit: proveedor.cuit || "",
        email: proveedor.email || [],
        telefono: proveedor.telefono || [],
        direccion: proveedor.direccion || "",
        localidad: proveedor.localidad || "",
        provincia: proveedor.provincia || "",
        codigo_postal: proveedor.codigo_postal || "",
        condiciones_pago: proveedor.condiciones_pago || "",
        moneda: proveedor.moneda || "ARS",
        cuenta_bancaria: proveedor.cuenta_bancaria || "",
        cbu: proveedor.cbu || "",
        alias_cbu: proveedor.alias_cbu || "",
        notas: proveedor.notas || "",
        estado: (proveedor.estado || "activo") as "activo" | "inactivo",
        dias_aviso_vencimiento: proveedor.dias_aviso_vencimiento ?? "",
        dias_antiguedad_aviso: proveedor.dias_antiguedad_aviso ?? "",
      });
    } else if (!open) {
      setFormData(initialFormData);
    }
  });

  const handleClose = () => {
    setFormData(initialFormData);
    setNewEmail("");
    setNewTelefono("");
    onOpenChange(false);
  };

  const addEmail = () => {
    if (newEmail && !formData.email.includes(newEmail)) {
      setFormData({ ...formData, email: [...formData.email, newEmail] });
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setFormData({ ...formData, email: formData.email.filter((e) => e !== email) });
  };

  const addTelefono = () => {
    if (newTelefono && !formData.telefono.includes(newTelefono)) {
      setFormData({ ...formData, telefono: [...formData.telefono, newTelefono] });
      setNewTelefono("");
    }
  };

  const removeTelefono = (tel: string) => {
    setFormData({ ...formData, telefono: formData.telefono.filter((t) => t !== tel) });
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/proveedores/${proveedor.id}` : "/api/proveedores";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar proveedor");
      }

      toast.success(isEditing ? "Proveedor actualizado" : "Proveedor creado");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="contacto" className="gap-2">
                <Phone className="h-4 w-4" />
                Contacto
              </TabsTrigger>
              <TabsTrigger value="pago" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Pago
              </TabsTrigger>
            </TabsList>

            {/* Tab General */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="nombre">Nombre / Razón Social *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT</Label>
                  <Input
                    id="cuit"
                    value={formData.cuit}
                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                    placeholder="XX-XXXXXXXX-X"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: "activo" | "inactivo") =>
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales sobre el proveedor..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Tab Contacto */}
            <TabsContent value="contacto" className="space-y-4">
              {/* Emails */}
              <div className="space-y-2">
                <Label>Emails</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addEmail}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.email.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.email.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        <Mail className="h-3 w-3" />
                        {email}
                        <button onClick={() => removeEmail(email)} className="hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Teléfonos */}
              <div className="space-y-2">
                <Label>Teléfonos</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTelefono())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTelefono}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.telefono.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.telefono.map((tel) => (
                      <span
                        key={tel}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm"
                      >
                        <Phone className="h-3 w-3" />
                        {tel}
                        <button onClick={() => removeTelefono(tel)} className="hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Dirección */}
              <div className="space-y-4 pt-2 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Calle y número</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Av. Corrientes 1234"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="localidad">Localidad</Label>
                    <Input
                      id="localidad"
                      value={formData.localidad}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="Buenos Aires"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigo_postal">CP</Label>
                    <Input
                      id="codigo_postal"
                      value={formData.codigo_postal}
                      onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                      placeholder="1234"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab Pago */}
            <TabsContent value="pago" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condiciones_pago">Condiciones de Pago</Label>
                  <Select
                    value={formData.condiciones_pago}
                    onValueChange={(value) =>
                      setFormData({ ...formData, condiciones_pago: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Contado</SelectItem>
                      <SelectItem value="15_dias">15 días</SelectItem>
                      <SelectItem value="30_dias">30 días</SelectItem>
                      <SelectItem value="45_dias">45 días</SelectItem>
                      <SelectItem value="60_dias">60 días</SelectItem>
                      <SelectItem value="90_dias">90 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select
                    value={formData.moneda}
                    onValueChange={(value) => setFormData({ ...formData, moneda: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dias_aviso_vencimiento">Avisar X días antes de vencer</Label>
                  <Input
                    id="dias_aviso_vencimiento"
                    type="number"
                    min={1}
                    value={formData.dias_aviso_vencimiento ?? ""}
                    onChange={(e) => setFormData({ ...formData, dias_aviso_vencimiento: e.target.value })}
                    placeholder="por defecto 7"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dias_antiguedad_aviso">Avisar a los X días sin novedad</Label>
                  <Input
                    id="dias_antiguedad_aviso"
                    type="number"
                    min={1}
                    value={formData.dias_antiguedad_aviso ?? ""}
                    onChange={(e) => setFormData({ ...formData, dias_antiguedad_aviso: e.target.value })}
                    placeholder="por defecto 60"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Datos Bancarios
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="cuenta_bancaria">Banco / Cuenta</Label>
                  <Input
                    id="cuenta_bancaria"
                    value={formData.cuenta_bancaria}
                    onChange={(e) => setFormData({ ...formData, cuenta_bancaria: e.target.value })}
                    placeholder="Banco Nación - Cta Cte 12345"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cbu">CBU</Label>
                    <Input
                      id="cbu"
                      value={formData.cbu}
                      onChange={(e) => setFormData({ ...formData, cbu: e.target.value })}
                      placeholder="0000000000000000000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alias_cbu">Alias CBU</Label>
                    <Input
                      id="alias_cbu"
                      value={formData.alias_cbu}
                      onChange={(e) => setFormData({ ...formData, alias_cbu: e.target.value })}
                      placeholder="MI.ALIAS.CBU"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar Cambios" : "Crear Proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
