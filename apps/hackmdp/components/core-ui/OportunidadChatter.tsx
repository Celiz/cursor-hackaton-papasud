'use client';

import { useState, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  PhoneCall,
  Send,
  Save,
  ArrowRight,
  FileText,
  Trophy,
  Ban,
  User,
  Paperclip,
  Loader2,
  Download,
  File,
  Image,
  X,
  ChevronLeft,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import type { OportunidadActividad } from '@/lib/types';

// Tiempo relativo SEGURO: fecha nula/inválida devuelve '' en vez de tirar
// "RangeError: Invalid time value".
const fmtRel = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = parseISO(value);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: es }) : '';
};

const ACTIVIDAD_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  nota: { icon: MessageSquare, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  llamada: { icon: PhoneCall, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  email: { icon: Send, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/50' },
  reunion: { icon: User, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/50' },
  tarea: { icon: CheckCircle2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/50' },
  etapa_cambio: { icon: ArrowRight, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
  presupuesto_creado: { icon: FileText, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/50' },
  presupuesto_enviado: { icon: Send, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/50' },
  ganada: { icon: Trophy, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  perdida: { icon: Ban, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50' },
  archivo: { icon: Paperclip, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/50' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(tipo: string): boolean {
  return tipo?.startsWith('image/');
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar');
  return res.json();
};

interface OportunidadChatterProps {
  oportunidadId: string;
  onCollapse: () => void;
}

export function OportunidadChatter({ oportunidadId, onCollapse }: OportunidadChatterProps) {
  const { data: actividades, mutate } = useSWR<OportunidadActividad[]>(
    `/api/oportunidades-actividades?oportunidad_id=${oportunidadId}`,
    fetcher
  );

  const [nota, setNota] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createActividad = useCallback(async (
    tipo: string,
    titulo: string,
    descripcion?: string,
    metadata?: any
  ) => {
    await fetch('/api/oportunidades-actividades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oportunidad_id: oportunidadId,
        tipo,
        titulo,
        descripcion,
        metadata,
      }),
    });
    mutate();
  }, [oportunidadId, mutate]);

  const handleDelete = useCallback(async (id: string, titulo: string) => {
    if (!window.confirm(`¿Eliminar "${titulo}" del historial? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/oportunidades-actividades?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar');
      }
      toast.success('Eliminado del historial');
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  }, [mutate]);

  const handleSendNota = async () => {
    if (!nota.trim()) return;
    setSending(true);
    try {
      await createActividad('nota', 'Nota agregada', nota.trim());
      setNota('');
      toast.success('Nota guardada');
    } catch {
      toast.error('Error al guardar nota');
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Archivo demasiado grande (máx 10MB)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/crm/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Error al subir archivo');
      }
      const { url, nombre, tipo, tamaño } = await uploadRes.json();

      await createActividad('archivo', `Archivo adjunto: ${nombre}`, undefined, {
        url,
        nombre,
        tipo,
        tamaño,
      });

      toast.success('Archivo adjuntado');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full border-l border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 relative",
        isDragging && "ring-2 ring-inset ring-primary/60"
      )}
      onDragOver={(e) => { e.preventDefault(); if (!isDragging) setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setIsDragging(false); }}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none">
          <span className="text-sm font-medium text-primary">Soltá el archivo para adjuntarlo</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between pl-3 pr-12 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial</span>
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Ocultar historial"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Input area */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 space-y-2">
        <Textarea
          placeholder="Agregar nota..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="min-h-[60px] max-h-[120px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSendNota();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              Adjuntar
            </Button>
          </div>
          <Button
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleSendNota}
            disabled={!nota.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {!actividades || actividades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin actividad registrada</p>
          ) : (
            actividades.map((act) => {
              const config = ACTIVIDAD_ICONS[act.tipo] || ACTIVIDAD_ICONS.nota;
              const Icon = config.icon;
              const isArchivo = act.tipo === 'archivo';
              const fileMeta = isArchivo ? act.metadata as any : null;

              return (
                <div key={act.id} className="group">
                  {/* Header row */}
                  <div className="flex items-start gap-2.5">
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", config.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-sm font-medium truncate">{act.titulo}</span>
                        {(act.tipo === 'archivo' || act.tipo === 'nota') && (
                          <button
                            type="button"
                            title="Eliminar del historial"
                            onClick={() => handleDelete(act.id, act.titulo || 'este elemento')}
                            className="shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Note content */}
                      {act.tipo === 'nota' && act.descripcion && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
                          {act.descripcion}
                        </p>
                      )}

                      {/* Email content */}
                      {act.tipo === 'email' && act.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {act.descripcion}
                        </p>
                      )}

                      {/* Presupuesto enviado: destinatario */}
                      {act.tipo === 'presupuesto_enviado' && act.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {act.descripcion}
                        </p>
                      )}

                      {/* Etapa change */}
                      {act.tipo === 'etapa_cambio' && act.metadata?.etapa_anterior && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {act.metadata.etapa_anterior}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px] h-5">
                            {act.metadata.etapa_nueva}
                          </Badge>
                        </div>
                      )}

                      {/* File attachment */}
                      {isArchivo && fileMeta && (
                        <a
                          href={fileMeta.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-1.5 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group/file"
                        >
                          {isImageType(fileMeta.tipo) ? (
                            <Image className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : (
                            <File className="h-4 w-4 text-gray-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{fileMeta.nombre}</p>
                            {fileMeta.tamaño && (
                              <p className="text-[10px] text-muted-foreground">{formatFileSize(fileMeta.tamaño)}</p>
                            )}
                          </div>
                          <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/file:opacity-100 transition-opacity shrink-0" />
                        </a>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        {act.usuario_nombre && (
                          <span>{act.usuario_nombre}</span>
                        )}
                        <span>
                          {fmtRel(act.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
