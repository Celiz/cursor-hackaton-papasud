"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell, Check, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  metadata: { url?: string; [k: string]: any } | null;
  created_at: string;
}

interface NotificacionesResponse {
  notificaciones: Notificacion[];
  unread_count: number;
}

const fetcherNotif = async (url: string): Promise<NotificacionesResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar notificaciones");
  return res.json();
};

// Colores por tipo para el punto visual del item
const TIPO_COLORS: Record<string, string> = {
  info: "bg-blue-500",
  crm_actividad: "bg-purple-500",
  mantenimiento: "bg-amber-500",
  servicio: "bg-teal-500",
  envio_fabrica: "bg-orange-500",
  alerta: "bg-red-500",
};

/**
 * Bell dropdown clásico para el header. Poll cada 45s para refrescar el
 * unread_count. Al abrirse muestra las últimas 20. Click en un item:
 *  1. Marca como leída
 *  2. Navega a metadata.url si existe
 *  3. Cierra el popover
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data, mutate, isLoading } = useSWR<NotificacionesResponse>(
    "/api/notificaciones?limit=20",
    fetcherNotif,
    {
      refreshInterval: 45_000,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  );

  const notificaciones = data?.notificaciones || [];
  const unreadCount = data?.unread_count || 0;

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      try {
        await fetch("/api/notificaciones", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        mutate();
      } catch {}
    },
    [mutate]
  );

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      mutate();
    } catch {}
  }, [mutate]);

  const deleteNotif = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await fetch(`/api/notificaciones?id=${id}`, { method: "DELETE" });
        mutate();
      } catch {}
    },
    [mutate]
  );

  const handleItemClick = (n: Notificacion) => {
    if (!n.leida) {
      markRead([n.id]);
    }
    setOpen(false);
    const url = n.metadata?.url;
    if (url) {
      router.push(url);
    }
  };

  // Auto-hide the badge después de 5s si llegan muchas para que no distraiga
  useEffect(() => {
    if (open) mutate();
  }, [open, mutate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center h-9 w-9 rounded-lg",
            "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
            "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
          )}
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full",
                "bg-red-500 text-white text-[10px] font-bold",
                "flex items-center justify-center",
                "ring-2 ring-white dark:ring-gray-900"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({unreadCount} sin leer)
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 font-medium inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </button>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="max-h-[480px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sin notificaciones
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cuando alguien te asigne algo, aparecerá acá.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {notificaciones.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    "group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors",
                    "hover:bg-gray-50 dark:hover:bg-gray-900/60",
                    !n.leida && "bg-purple-50/50 dark:bg-purple-950/20"
                  )}
                >
                  {/* Tipo dot */}
                  <div className="flex-shrink-0 pt-1.5">
                    <span
                      className={cn(
                        "block h-2 w-2 rounded-full",
                        TIPO_COLORS[n.tipo] || TIPO_COLORS.info
                      )}
                    />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-tight",
                        n.leida
                          ? "text-gray-700 dark:text-gray-300 font-normal"
                          : "text-gray-900 dark:text-gray-100 font-semibold"
                      )}
                    >
                      {n.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.mensaje}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>

                  {/* Acciones hover */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!n.leida && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead([n.id]);
                        }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                        title="Marcar como leída"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => deleteNotif(n.id, e)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Indicador de no leída (puntito a la izquierda) */}
                  {!n.leida && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-purple-600" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {notificaciones.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2 text-center">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/notificaciones");
              }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 font-medium"
            >
              Ver todas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
