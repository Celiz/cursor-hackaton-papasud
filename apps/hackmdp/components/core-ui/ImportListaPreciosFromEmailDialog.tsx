"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Proveedor {
  id: string;
  nombre: string;
  email?: string;
}

interface ImportResult {
  lista_id: string;
  lista_nombre: string;
  resultados: {
    total: number;
    procesados: number;
    vinculados: number;
    sin_vincular: number;
    errores: { fila: number; error: string }[];
  };
  columnas_detectadas: Record<string, string>;
}

interface ImportListaPreciosFromEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: {
    filename: string;
    mime_type: string;
    size: number;
    attachment_id: string;
  };
  messageId: string;
  accountId: string;
  senderEmail?: string;
  senderName?: string;
}

export function ImportListaPreciosFromEmailDialog({
  open,
  onOpenChange,
  attachment,
  messageId,
  accountId,
  senderEmail,
  senderName,
}: ImportListaPreciosFromEmailDialogProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [moneda, setMoneda] = useState("ARS");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [matchedProveedor, setMatchedProveedor] = useState<Proveedor | null>(null);

  // Cargar proveedores al abrir
  useEffect(() => {
    if (open) {
      loadProveedores();
      // Generar nombre por defecto
      const fecha = new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      setNombre(`Lista ${fecha} - ${attachment.filename.replace(/\.(xlsx?|csv)$/i, "")}`);
      setResult(null);
    }
  }, [open, attachment.filename]);

  // Intentar matchear proveedor por email del remitente
  useEffect(() => {
    if (senderEmail && proveedores.length > 0) {
      const domain = senderEmail.split("@")[1]?.toLowerCase();
      const matched = proveedores.find((p) => {
        if (!p.email) return false;
        const provDomain = p.email.split("@")[1]?.toLowerCase();
        return provDomain === domain;
      });
      if (matched) {
        setMatchedProveedor(matched);
        setSelectedProveedor(matched.id);
      }
    }
  }, [senderEmail, proveedores]);

  const loadProveedores = async () => {
    setLoadingProveedores(true);
    try {
      const res = await fetch("/api/proveedores?activo=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProveedores(data);
      }
    } catch (error) {
      console.error("Error loading proveedores:", error);
    } finally {
      setLoadingProveedores(false);
    }
  };

  const handleImport = async () => {
    if (!selectedProveedor) {
      toast.error("Selecciona un proveedor");
      return;
    }
    if (!nombre.trim()) {
      toast.error("Ingresa un nombre para la lista");
      return;
    }

    setImporting(true);
    try {
      // 1. Download attachment as base64
      const attachmentRes = await fetch("/api/email/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          messageId,
          attachmentId: attachment.attachment_id,
        }),
      });

      if (!attachmentRes.ok) {
        const err = await attachmentRes.json();
        throw new Error(err.error || "Error al descargar adjunto");
      }

      const { data: base64Data } = await attachmentRes.json();

      // 2. Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.mime_type });

      // 3. Create FormData and send to import API
      const formData = new FormData();
      formData.append("file", blob, attachment.filename);
      formData.append("proveedor_id", selectedProveedor);
      formData.append("nombre", nombre.trim());
      formData.append("moneda", moneda);

      const importRes = await fetch("/api/proveedor-listas-precios/importar", {
        method: "POST",
        body: formData,
      });

      const importResult = await importRes.json();

      if (!importRes.ok) {
        throw new Error(importResult.error || "Error al importar");
      }

      setResult(importResult);
      toast.success(
        `Lista importada: ${importResult.resultados.procesados} productos procesados`
      );
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error(error.message || "Error al importar lista de precios");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSelectedProveedor("");
    setNombre("");
    setMoneda("ARS");
    setMatchedProveedor(null);
    onOpenChange(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Lista de Precios
          </DialogTitle>
          <DialogDescription>
            Importar el archivo adjunto como una nueva lista de precios de proveedor.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            {/* Info del archivo */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{attachment.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(attachment.size)}
                  </p>
                </div>
              </div>
              {senderEmail && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  Recibido de: {senderName || senderEmail}
                </div>
              )}
            </div>

            {/* Match automático */}
            {matchedProveedor && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                <Link2 className="h-4 w-4 text-green-600" />
                <span>
                  Proveedor detectado:{" "}
                  <span className="font-medium">{matchedProveedor.nombre}</span>
                </span>
              </div>
            )}

            {/* Selección de proveedor */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Proveedor
              </Label>
              <Select
                value={selectedProveedor}
                onValueChange={setSelectedProveedor}
                disabled={loadingProveedores}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="max-h-60">
                    {proveedores.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id}>
                        <div className="flex items-center gap-2">
                          <span>{prov.nombre}</span>
                          {prov.id === matchedProveedor?.id && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Coincide
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Nombre de la lista */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Nombre de la Lista
              </Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Lista Enero 2026"
              />
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Moneda
              </Label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                  <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          // Resultados de importación
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium">Lista importada correctamente</p>
                <p className="text-sm text-muted-foreground">{result.lista_nombre}</p>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{result.resultados.procesados}</p>
                <p className="text-xs text-muted-foreground">Productos procesados</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.resultados.vinculados}
                </p>
                <p className="text-xs text-muted-foreground">Vinculados al catálogo</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {result.resultados.sin_vincular}
                </p>
                <p className="text-xs text-muted-foreground">Sin vincular</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.resultados.errores.length}
                </p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
            </div>

            {/* Columnas detectadas */}
            <div>
              <p className="text-sm font-medium mb-2">Columnas detectadas:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(result.columnas_detectadas).map(([campo, columna]) => (
                  <Badge key={campo} variant="outline" className="text-xs">
                    {campo}: {columna}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Errores */}
            {result.resultados.errores.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Errores ({result.resultados.errores.length})
                </p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {result.resultados.errores.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        Fila {err.fila}: {err.error}
                      </p>
                    ))}
                    {result.resultados.errores.length > 10 && (
                      <p className="text-xs text-muted-foreground italic">
                        ... y {result.resultados.errores.length - 10} errores más
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || !selectedProveedor || !nombre.trim()}
                className="gap-2"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar Lista
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  handleClose();
                  window.open(`/dashboard/compras/listas-precios?id=${result.lista_id}`, "_blank");
                }}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Ver Lista
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
