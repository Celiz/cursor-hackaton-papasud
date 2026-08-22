"use client";

import { useState, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportResult {
  total: number;
  procesados: number;
  vinculados_lista: number;
  errores: string[];
}

interface ImportCatalogoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorId: string;
  proveedorNombre: string;
  onSuccess: () => void;
}

export function ImportCatalogoDialog({
  open,
  onOpenChange,
  proveedorId,
  proveedorNombre,
  onSuccess,
}: ImportCatalogoDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [crearLista, setCrearLista] = useState(false);
  const [nombreLista, setNombreLista] = useState("");
  const [moneda, setMoneda] = useState("ARS");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Seleccioná un archivo primero");
      return;
    }
    if (crearLista && !nombreLista.trim()) {
      toast.error("Ingresá el nombre de la lista de precios");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proveedor_id", proveedorId);
      formData.append("crear_lista_precios", String(crearLista));
      if (crearLista) {
        formData.append("nombre_lista", nombreLista.trim());
        formData.append("moneda", moneda);
      }

      const res = await fetch("/api/catalogo-items/importar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Error al importar");
      }

      const data: ImportResult = await res.json();
      setResult(data);
      toast.success(`Importación completada: ${data.procesados} items procesados`);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al importar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCrearLista(false);
    setNombreLista("");
    setMoneda("ARS");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            Importar Catálogo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground">
            Importar items de catálogo de{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">{proveedorNombre}</span>{" "}
            desde un archivo Excel o CSV.
          </p>

          {/* File picker */}
          <div className="space-y-2">
            <Label htmlFor="catalogo-file">Archivo (.xlsx, .xls, .csv)</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                file
                  ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                id="catalogo-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(1)} KB — clic para cambiar
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Clic para seleccionar archivo</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls o .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de precios */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="crear-lista" className="cursor-pointer">
                Crear lista de precios
              </Label>
              <Switch id="crear-lista" checked={crearLista} onCheckedChange={setCrearLista} />
            </div>

            {crearLista && (
              <div className="space-y-3 pl-2 border-l-2 border-blue-200 dark:border-blue-800">
                <div className="space-y-1">
                  <Label htmlFor="nombre-lista">Nombre de la lista</Label>
                  <Input
                    id="nombre-lista"
                    value={nombreLista}
                    onChange={(e) => setNombreLista(e.target.value)}
                    placeholder={`Lista ${proveedorNombre}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="moneda-lista">Moneda</Label>
                  <select
                    id="moneda-lista"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="ARS">ARS — Pesos argentinos</option>
                    <option value="USD">USD — Dólares</option>
                    <option value="EUR">EUR — Euros</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Importación completada
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{result.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">{result.procesados}</p>
                  <p className="text-xs text-muted-foreground">Procesados</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">{result.vinculados_lista}</p>
                  <p className="text-xs text-muted-foreground">En lista</p>
                </div>
              </div>
              {result.errores && result.errores.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    {result.errores.length} error{result.errores.length !== 1 ? "es" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {result.errores.slice(0, 5).map((e, i) => (
                      <p key={i} className="truncate">
                        {e}
                      </p>
                    ))}
                    {result.errores.length > 5 && (
                      <p>...y {result.errores.length - 5} más</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {result ? "Cerrar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={loading || !file}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
