"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  AlertCircle,
  User,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  ArrowRight,
  Paperclip,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Comentario {
  id: string;
  entidad_tipo: string;
  entidad_id: string;
  usuario_id?: string;
  usuario_nombre: string;
  comentario: string;
  tipo: "nota" | "alerta" | "cambio_estado" | "cliente" | "interno" | "publico";
  es_importante: boolean;
  requiere_accion: boolean;
  visible_cliente: boolean;
  adjuntos?: any[];
  created_at: string;
}

interface ComentariosTimelineProps {
  entidadTipo: string;
  entidadId: string;
  comentarios?: Comentario[];
  isLoading?: boolean;
  onNewComentario?: (comentario: string, tipo: string) => Promise<void>;
}

const comentarioConfig = {
  nota: {
    label: "Nota",
    icon: MessageSquare,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  alerta: {
    label: "Alerta",
    icon: AlertCircle,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  cambio_estado: {
    label: "Cambio de Estado",
    icon: ArrowRight,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  cliente: {
    label: "Cliente",
    icon: User,
    color: "text-green-600 bg-green-50 border-green-200",
  },
  interno: {
    label: "Interno",
    icon: MessageSquare,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  publico: {
    label: "Público",
    icon: MessageSquare,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
};

export function ComentariosTimeline({
  entidadTipo,
  entidadId,
  comentarios = [],
  isLoading = false,
  onNewComentario,
}: ComentariosTimelineProps) {
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [tipoComentario, setTipoComentario] = useState<string>("nota");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!nuevoComentario.trim() || !onNewComentario) return;

    setIsSubmitting(true);
    try {
      await onNewComentario(nuevoComentario, tipoComentario);
      setNuevoComentario("");
    } catch (error) {
      console.error("Error al crear comentario:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* New Comment Form */}
      {onNewComentario && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Nuevo Comentario</h4>
          </div>

          <Textarea
            placeholder="Escribe tu comentario aquí..."
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            className="min-h-[80px]"
          />

          <div className="flex items-center justify-between">
            <select
              value={tipoComentario}
              onChange={(e) => setTipoComentario(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="nota">Nota</option>
              <option value="alerta">Alerta</option>
              <option value="interno">Interno</option>
              <option value="cliente">Para Cliente</option>
              <option value="publico">Público</option>
            </select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Paperclip className="h-4 w-4" />}
              >
                Adjuntar
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!nuevoComentario.trim() || isSubmitting}
                iconLeft={<Send className="h-4 w-4" />}
              >
                {isSubmitting ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : comentarios.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay comentarios aún</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Timeline Items */}
            <div className="space-y-4">
              {comentarios.map((comentario, index) => {
                const config = comentarioConfig[comentario.tipo] || comentarioConfig.nota;
                const Icon = config.icon;

                return (
                  <div key={comentario.id} className="relative pl-12">
                    {/* Timeline Dot */}
                    <div
                      className={cn(
                        "absolute left-0 w-8 h-8 rounded-full border-2 border-primary/20 dark:border-primary/30 flex items-center justify-center",
                        config.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Comment Card */}
                    <div
                      className={cn(
                        "bg-white border rounded-lg p-4 space-y-2",
                        comentario.es_importante
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {comentario.usuario_nombre}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", config.color)}
                          >
                            {config.label}
                          </Badge>
                          {comentario.es_importante && (
                            <Badge variant="destructive" className="text-xs">
                              Importante
                            </Badge>
                          )}
                          {comentario.requiere_accion && (
                            <Badge className="text-xs bg-orange-500 text-white">
                              Requiere Acción
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(comentario.created_at).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Comment Text */}
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {comentario.comentario}
                      </p>

                      {/* Attachments */}
                      {comentario.adjuntos && comentario.adjuntos.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {comentario.adjuntos.length} adjunto(s)
                          </span>
                        </div>
                      )}

                      {/* Visibility Indicator */}
                      <div className="flex items-center gap-2 pt-1">
                        {comentario.visible_cliente ? (
                          <Badge variant="outline" className="text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Visible para cliente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Interno
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
