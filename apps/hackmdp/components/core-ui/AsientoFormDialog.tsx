"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AsientoContable } from "@/app/dashboard/contabilidad/asientos/columns";
import { cn } from "@/lib/utils";

interface AsientoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asiento: AsientoContable | null;
  onSuccess?: () => void;
}

interface AsientoItem {
  id?: string;
  cuenta_id: string;
  cuenta_codigo?: string;
  cuenta_nombre?: string;
  debe: number;
  haber: number;
  descripcion: string;
}

interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  activa: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error");
  return Array.isArray(data) ? data : [];
};

export function AsientoFormDialog({
  open,
  onOpenChange,
  asiento,
  onSuccess,
}: AsientoFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    numero: "",
    fecha: new Date().toISOString().split("T")[0],
    tipo: "manual",
    glosa: "",
    referencia: "",
  });
  const [items, setItems] = useState<AsientoItem[]>([
    { cuenta_id: "", debe: 0, haber: 0, descripcion: "" },
    { cuenta_id: "", debe: 0, haber: 0, descripcion: "" },
  ]);

  const { data: cuentas } = useSWR<Cuenta[]>(
    open ? "/api/contabilidad/plan-cuentas?activa=true" : null,
    fetcher
  );

  // Cargar datos del asiento si es edición
  useEffect(() => {
    if (asiento) {
      setFormData({
        numero: asiento.numero,
        fecha: asiento.fecha?.split("T")[0] || new Date().toISOString().split("T")[0],
        tipo: asiento.tipo,
        glosa: asiento.glosa || "",
        referencia: asiento.referencia || "",
      });
      if (asiento.items && asiento.items.length > 0) {
        setItems(
          asiento.items.map((item) => ({
            id: item.id,
            cuenta_id: item.cuenta_id,
            cuenta_codigo: item.cuenta?.codigo,
            cuenta_nombre: item.cuenta?.nombre,
            debe: Number(item.debe) || 0,
            haber: Number(item.haber) || 0,
            descripcion: item.descripcion || "",
          }))
        );
      }
    } else {
      // Generar número automático
      generateNumero();
      setFormData({
        numero: "",
        fecha: new Date().toISOString().split("T")[0],
        tipo: "manual",
        glosa: "",
        referencia: "",
      });
      setItems([
        { cuenta_id: "", debe: 0, haber: 0, descripcion: "" },
        { cuenta_id: "", debe: 0, haber: 0, descripcion: "" },
      ]);
    }
  }, [asiento, open]);

  const generateNumero = async () => {
    try {
      const res = await fetch("/api/contabilidad/asientos/next-number");
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, numero: data.numero }));
      }
    } catch {
      // Si falla, usar fecha + random
      const numero = `AST-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 1000)).padStart(4, "0")}`;
      setFormData((prev) => ({ ...prev, numero }));
    }
  };

  const addItem = () => {
    setItems([...items, { cuenta_id: "", debe: 0, haber: 0, descripcion: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 2) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof AsientoItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Si se selecciona una cuenta, actualizar código y nombre
    if (field === "cuenta_id" && cuentas) {
      const cuenta = cuentas.find((c) => c.id === value);
      if (cuenta) {
        newItems[index].cuenta_codigo = cuenta.codigo;
        newItems[index].cuenta_nombre = cuenta.nombre;
      }
    }

    // Asegurar que debe y haber no estén ambos llenos
    if (field === "debe" && value > 0) {
      newItems[index].haber = 0;
    } else if (field === "haber" && value > 0) {
      newItems[index].debe = 0;
    }

    setItems(newItems);
  };

  const totalDebe = items.reduce((sum, item) => sum + (Number(item.debe) || 0), 0);
  const totalHaber = items.reduce((sum, item) => sum + (Number(item.haber) || 0), 0);
  const diferencia = totalDebe - totalHaber;
  const isBalanceado = Math.abs(diferencia) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.numero) {
      toast.error("El número es requerido");
      return;
    }
    if (!formData.fecha) {
      toast.error("La fecha es requerida");
      return;
    }

    const validItems = items.filter(
      (item) => item.cuenta_id && (Number(item.debe) > 0 || Number(item.haber) > 0)
    );

    if (validItems.length < 2) {
      toast.error("El asiento debe tener al menos 2 líneas válidas");
      return;
    }

    if (!isBalanceado) {
      toast.error("El asiento debe estar balanceado (Debe = Haber)");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = asiento
        ? `/api/contabilidad/asientos/${asiento.id}`
        : "/api/contabilidad/asientos";

      const res = await fetch(url, {
        method: asiento ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: validItems.map((item, index) => ({
            cuenta_id: item.cuenta_id,
            debe: Number(item.debe) || 0,
            haber: Number(item.haber) || 0,
            descripcion: item.descripcion,
            linea: index + 1,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al guardar asiento");
      }

      toast.success(asiento ? "Asiento actualizado" : "Asiento creado");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ordenar cuentas por código
  const sortedCuentas = cuentas?.sort((a, b) => a.codigo.localeCompare(b.codigo)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asiento ? "Editar Asiento Contable" : "Nuevo Asiento Contable"}
          </DialogTitle>
          <DialogDescription>
            {asiento
              ? "Modifica los datos del asiento contable"
              : "Registra un nuevo asiento en el libro diario"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="AST-202501-0001"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatico">Automático</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="cierre">Cierre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                placeholder="Ref. opcional"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="glosa">Concepto / Glosa</Label>
            <Textarea
              id="glosa"
              value={formData.glosa}
              onChange={(e) => setFormData({ ...formData, glosa: e.target.value })}
              placeholder="Descripción del asiento contable..."
              rows={2}
            />
          </div>

          {/* Líneas del asiento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Líneas del Asiento</Label>
              <Button type="button" size="tiny" onClick={addItem} iconLeft={<Plus className="h-4 w-4" />}>
                Agregar Línea
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[250px]">Cuenta</TableHead>
                    <TableHead className="min-w-[150px]">Descripción</TableHead>
                    <TableHead className="w-32 text-right">Debe</TableHead>
                    <TableHead className="w-32 text-right">Haber</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.cuenta_id}
                          onValueChange={(value) => updateItem(index, "cuenta_id", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar cuenta...">
                              {item.cuenta_id && (
                                <span className="truncate">
                                  {item.cuenta_codigo} - {item.cuenta_nombre}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {sortedCuentas.map((cuenta) => (
                              <SelectItem key={cuenta.id} value={cuenta.id}>
                                <span className="font-mono text-xs mr-2">{cuenta.codigo}</span>
                                {cuenta.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.descripcion}
                          onChange={(e) => updateItem(index, "descripcion", e.target.value)}
                          placeholder="Descripción..."
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.debe || ""}
                          onChange={(e) => updateItem(index, "debe", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-9 text-right font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.haber || ""}
                          onChange={(e) => updateItem(index, "haber", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-9 text-right font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="tiny"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          disabled={items.length <= 2}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Fila de totales */}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      TOTALES
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-700">
                      ${totalDebe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-700">
                      ${totalHaber.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Indicador de balance */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              isBalanceado
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
            )}>
              <div className="flex items-center gap-2">
                {isBalanceado ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className={cn(
                  "font-medium",
                  isBalanceado ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"
                )}>
                  {isBalanceado ? "Asiento balanceado" : "Asiento desbalanceado"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">Diferencia:</span>
                <Badge variant={isBalanceado ? "default" : "destructive"} className="font-mono">
                  ${Math.abs(diferencia).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isBalanceado}>
              {isSubmitting ? "Guardando..." : asiento ? "Guardar Cambios" : "Crear Asiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
