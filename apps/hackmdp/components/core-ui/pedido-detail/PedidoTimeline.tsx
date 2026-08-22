"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  History,
  MessageSquare,
  RefreshCw,
  Edit3,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { DetailSheetSection } from "../DetailSheetComponents";
import type { PedidoNota, PedidoCallbacks } from "./types";

interface PedidoTimelineProps {
  pedidoId: string;
  notas: PedidoNota[] | undefined;
  callbacks: PedidoCallbacks;
}

export function PedidoTimeline({ pedidoId, notas, callbacks }: PedidoTimelineProps) {
  const [nuevaNota, setNuevaNota] = useState("");
  const [enviandoNota, setEnviandoNota] = useState(false);
  const notaInputRef = useRef<HTMLTextAreaElement>(null);

  const handleAgregarNota = async () => {
    if (!pedidoId || !nuevaNota.trim()) return;

    setEnviandoNota(true);
    try {
      const res = await fetch(`/api/pedidos-ventas/${pedidoId}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "nota",
          contenido: nuevaNota.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al agregar nota");
      }

      toast.success("Nota agregada");
      setNuevaNota("");
      callbacks.mutateNotas();
    } catch (error: any) {
      toast.error(error.message || "Error al agregar nota");
    } finally {
      setEnviandoNota(false);
    }
  };

  return (
    <DetailSheetSection icon={History} title="Timeline del Pedido" theme="blue">
      {/* Input for new note */}
      <div className="mb-4 space-y-2">
        <Textarea
          ref={notaInputRef}
          value={nuevaNota}
          onChange={(e) => setNuevaNota(e.target.value)}
          placeholder="Agregar una nota... (ej: 'Cliente llamó para modificar cantidad', 'Se envía mitad del pedido')"
          className="min-h-[60px] resize-none"
          disabled={enviandoNota}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAgregarNota}
            disabled={enviandoNota || !nuevaNota.trim()}
          >
            {enviandoNota ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Agregar Nota
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {!notas || notas.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay notas aún</p>
            <p className="text-xs mt-1">Las notas y cambios de estado aparecerán aquí</p>
          </div>
        ) : (
          notas.map((nota) => (
            <div
              key={nota.id}
              className={`p-3 rounded-lg border ${
                nota.tipo === "cambio_estado"
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : nota.tipo === "modificacion"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : nota.tipo === "envio_parcial"
                  ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start gap-2">
                {nota.tipo === "cambio_estado" ? (
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                ) : nota.tipo === "modificacion" ? (
                  <Edit3 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                ) : nota.tipo === "envio_parcial" ? (
                  <Truck className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{nota.contenido}</p>

                  {nota.items_agregados && nota.items_agregados.length > 0 && (
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                      <span className="font-medium">+ Agregados:</span>{" "}
                      {nota.items_agregados.map((i: any) => `${i.nombre} (${i.cantidad})`).join(", ")}
                    </div>
                  )}
                  {nota.items_eliminados && nota.items_eliminados.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      <span className="font-medium">- Eliminados:</span>{" "}
                      {nota.items_eliminados.map((i: any) => `${i.nombre} (${i.cantidad})`).join(", ")}
                    </div>
                  )}
                  {nota.items_modificados && nota.items_modificados.length > 0 && (
                    <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      <span className="font-medium">~ Modificados:</span>{" "}
                      {nota.items_modificados.map((i: any) => `${i.nombre} (${i.cantidad_anterior} → ${i.cantidad_nueva})`).join(", ")}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(nota.created_at).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {nota.usuario_nombre && (
                      <>
                        <span>•</span>
                        <span>{nota.usuario_nombre}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DetailSheetSection>
  );
}
