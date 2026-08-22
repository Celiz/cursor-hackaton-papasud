'use client';

import { useState, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageSquare,
  PhoneCall,
  Send,
  ArrowRight,
  FileText,
  Paperclip,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Receipt,
  DollarSign,
} from 'lucide-react';

interface ServicioActividad {
  id: string;
  servicio_id: string;
  tipo: string;
  titulo: string | null;
  descripcion: string | null;
  metadata: any;
  usuario_id: string | null;
  usuario_nombre: string | null;
  created_at: string;
}

const TIPO_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  nota:                { icon: MessageSquare, color: 'text-gray-600 dark:text-gray-400',       bg: 'bg-gray-100 dark:bg-gray-800',         label: 'Nota' },
  llamada:             { icon: PhoneCall,     color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-900/50',      label: 'Llamada' },
  email:               { icon: Send,          color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-100 dark:bg-purple-900/50',  label: 'Email' },
  whatsapp:            { icon: Send,          color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/50',label: 'WhatsApp' },
  archivo:             { icon: Paperclip,     color: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-100 dark:bg-orange-900/50',  label: 'Archivo' },
  estado_cambio:       { icon: ArrowRight,    color: 'text-green-600 dark:text-green-400',     bg: 'bg-green-100 dark:bg-green-900/50',    label: 'Estado' },
  precio_listo:        { icon: DollarSign,    color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-900/50',    label: 'Precio listo' },
  presupuesto_creado:  { icon: FileText,      color: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-100 dark:bg-indigo-900/50',  label: 'Presupuesto' },
  presupuesto_enviado: { icon: Send,          color: 'text-pink-600 dark:text-pink-400',       bg: 'bg-pink-100 dark:bg-pink-900/50',      label: 'Enviado' },
  facturado:           { icon: Receipt,       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/50',label: 'Facturado' },
  comunicado:          { icon: CheckCircle2,  color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-900/50',      label: 'Comunicado' },
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error');
  return res.json();
};

interface Props {
  servicioId: string;
  onCollapse: () => void;
}

export function ServicioChatter({ servicioId, onCollapse }: Props) {
  const { data: actividades, mutate } = useSWR<ServicioActividad[]>(
    `/api/servicios-actividades?servicio_id=${servicioId}`,
    fetcher
  );

  const [nota, setNota] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createActividad = useCallback(async (
    tipo: string,
    titulo: string,
    descripcion?: string,
    metadata?: any
  ) => {
    await fetch('/api/servicios-actividades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servicio_id: servicioId, tipo, titulo, descripcion, metadata }),
    });
    mutate();
  }, [servicioId, mutate]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      await createActividad('archivo', `Archivo adjunto: ${nombre}`, undefined, { url, nombre, tipo, tamaño });
      toast.success('Archivo adjuntado');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between pl-3 pr-12 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actividad</span>
        <button
          onClick={onCollapse}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Ocultar actividad"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Input */}
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
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              Adjuntar
            </Button>
          </div>
          <Button
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleSendNota}
            disabled={!nota.trim() || sending}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar
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
              const cfg = TIPO_CONFIG[act.tipo] || TIPO_CONFIG.nota;
              const Icon = cfg.icon;
              const isArchivo = act.tipo === 'archivo';
              const meta = act.metadata || {};
              return (
                <div key={act.id} className="group">
                  <div className="flex items-start gap-2.5">
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{act.titulo || cfg.label}</span>
                      {act.descripcion && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
                          {act.descripcion}
                        </p>
                      )}
                      {isArchivo && meta?.url && (
                        <a
                          href={meta.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                        >
                          Ver archivo
                        </a>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span>{formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: es })}</span>
                        {act.usuario_nombre && <span>· {act.usuario_nombre}</span>}
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
