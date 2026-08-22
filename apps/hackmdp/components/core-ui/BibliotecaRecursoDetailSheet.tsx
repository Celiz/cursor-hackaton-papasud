"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, ExternalLink, Edit, Trash2, Package, Wrench,
  Calendar, User, Tag, Loader2, Eye, Link2,
} from "lucide-react";
import { BibliotecaRecurso } from "@/lib/types";
import { toast } from "sonner";
import { VincularEntidadDialog } from "./VincularEntidadDialog";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" });

// Heurística para decidir si el archivo es previsualizable inline.
// PDFs e imágenes los renderizamos con iframe/img. Otros formatos solo descargan.
function isPreviewable(recurso: BibliotecaRecurso | undefined): { type: 'pdf' | 'image' | 'none' } {
  if (!recurso?.archivo_url) return { type: 'none' };
  const fmt = (recurso.formato || '').toLowerCase();
  const name = (recurso.archivo_nombre || recurso.archivo_url).toLowerCase();
  if (fmt === 'pdf' || name.endsWith('.pdf')) return { type: 'pdf' };
  if (fmt === 'jpg' || fmt === 'jpeg' || fmt === 'png' || fmt === 'webp' || fmt === 'gif' ||
      /\.(jpe?g|png|webp|gif)$/i.test(name)) return { type: 'image' };
  return { type: 'none' };
}

interface BibliotecaRecursoDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recursoId: string | null;
  onEdit?: (recurso: BibliotecaRecurso) => void;
  onDelete?: () => void;
}

export function BibliotecaRecursoDetailSheet({
  open, onOpenChange, recursoId, onEdit, onDelete,
}: BibliotecaRecursoDetailSheetProps) {
  const { data: recurso, isLoading, mutate } = useSWR<BibliotecaRecurso>(
    open && recursoId ? `/api/biblioteca/recursos?id=${recursoId}` : null,
    fetcher
  );

  const [vincularOpen, setVincularOpen] = useState(false);

  const handleSaveVinculos = async (
    vinculaciones: Array<{ entidad_tipo: 'equipo' | 'producto'; entidad_id: string }>
  ) => {
    if (!recurso) return;
    try {
      const res = await fetch('/api/biblioteca/recursos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recurso.id, vinculaciones }),
      });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success('Vinculaciones actualizadas');
    } catch {
      toast.error('Error al guardar vinculaciones');
    }
  };

  const handleDelete = async () => {
    if (!recurso || !confirm(`¿Eliminar "${recurso.titulo}"?`)) return;
    try {
      const res = await fetch(`/api/biblioteca/recursos?id=${recurso.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Recurso eliminado');
      onOpenChange(false);
      onDelete?.();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const preview = isPreviewable(recurso);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full h-[100dvh] md:h-[90vh] max-h-[100dvh] overflow-hidden p-0 flex flex-col bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-violet-950/20"
        side="bottom"
      >
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 sm:pr-14 border-b border-gray-200/50 dark:border-gray-800/30 shrink-0 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-950/10 dark:to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-2 sm:p-3 rounded-xl border border-blue-200/30 dark:border-blue-800/30 shadow-sm shrink-0">
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base sm:text-lg truncate">
                {isLoading ? 'Cargando…' : recurso?.titulo}
              </SheetTitle>
              {recurso && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {recurso.categoria_nombre && (
                    <Badge variant="outline" className="text-[10px] h-5">{recurso.categoria_nombre}</Badge>
                  )}
                  {recurso.tipo && (
                    <Badge variant="outline" className="text-[10px] h-5">{recurso.tipo}</Badge>
                  )}
                  {recurso.formato && (
                    <Badge variant="outline" className="text-[10px] h-5 font-mono uppercase">{recurso.formato}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {recurso && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
            {/* Preview (PDF embedido o imagen). En mobile va arriba (ratio 16:10), en desktop ocupa 7 cols. */}
            <div className="md:col-span-7 bg-gray-100 dark:bg-gray-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 min-h-[280px] md:min-h-0 flex items-center justify-center overflow-hidden">
              {preview.type === 'pdf' && recurso.archivo_url ? (
                <iframe
                  src={`${recurso.archivo_url}#view=FitH&toolbar=1`}
                  title={recurso.titulo}
                  className="w-full h-full border-0"
                />
              ) : preview.type === 'image' && recurso.archivo_url ? (
                <img
                  src={recurso.archivo_url}
                  alt={recurso.titulo}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <Eye className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin vista previa disponible</p>
                  {recurso.formato && (
                    <p className="text-xs mt-1">Formato: <span className="font-mono uppercase">{recurso.formato}</span></p>
                  )}
                  {recurso.archivo_url && (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <a href={recurso.archivo_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Descargar para ver
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Panel de detalles */}
            <div className="md:col-span-5 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Vinculo a equipo/producto — destacado arriba porque es lo más útil
                  para entender de qué es el documento. Editable via picker. */}
              <div
                className={cn(
                  'p-3 rounded-lg border',
                  recurso.vinculos && recurso.vinculos.length > 0
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'
                    : 'bg-gray-50 dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide',
                      recurso.vinculos && recurso.vinculos.length > 0
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-muted-foreground'
                    )}
                  >
                    Asociado a
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1"
                    onClick={() => setVincularOpen(true)}
                  >
                    <Link2 className="h-3 w-3" />
                    {recurso.vinculos && recurso.vinculos.length > 0 ? 'Editar' : 'Vincular'}
                  </Button>
                </div>
                {recurso.vinculos && recurso.vinculos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {recurso.vinculos.map((v, i) => (
                      <Badge key={i} variant="outline" className="gap-1 bg-white dark:bg-gray-900 border-blue-300">
                        {v.entidad_tipo === 'equipo' ? (
                          <Wrench className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Package className="h-3 w-3 text-emerald-500" />
                        )}
                        {v.entidad_nombre}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sin vinculación. Tocá "Vincular" para asociarlo a equipos o productos.
                  </p>
                )}
              </div>

              {recurso.descripcion && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {recurso.descripcion}
                </p>
              )}

              {/* Boton de accion principal — solo si NO es PDF (el iframe ya
                  tiene su propio boton de descarga en la toolbar). Para links
                  externos siempre mostramos el boton (no hay preview). */}
              {recurso.link_externo && (
                <Button asChild className="w-full">
                  <a href={recurso.link_externo} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir link
                  </a>
                </Button>
              )}
              {recurso.archivo_url && preview.type !== 'pdf' && (
                <Button asChild className="w-full">
                  <a
                    href={recurso.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={recurso.archivo_nombre}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </a>
                </Button>
              )}

              {recurso.tags && recurso.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                    <Tag className="h-3 w-3" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recurso.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t border-gray-200 dark:border-gray-800">
                {recurso.archivo_nombre && <p>Archivo: {recurso.archivo_nombre}</p>}
                {recurso.archivo_tamano && <p>Tamaño: {formatFileSize(recurso.archivo_tamano)}</p>}
                {recurso.created_by_nombre && (
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" /> Subido por {recurso.created_by_nombre}
                  </p>
                )}
                <p className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {formatDate(recurso.created_at)}
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(recurso)} className="flex-1">
                    <Edit className="h-4 w-4 mr-1.5" /> Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
      {recurso && (
        <VincularEntidadDialog
          open={vincularOpen}
          onOpenChange={setVincularOpen}
          initialVinculos={
            (recurso.vinculos || [])
              .filter((v) => v.entidad_tipo === 'equipo' || v.entidad_tipo === 'producto')
              .map((v) => ({
                entidad_tipo: v.entidad_tipo as 'equipo' | 'producto',
                entidad_id: v.entidad_id,
              }))
          }
          onConfirm={handleSaveVinculos}
        />
      )}
    </Sheet>
  );
}
