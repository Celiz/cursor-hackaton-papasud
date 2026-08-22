"use client";

import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { Automatizacion } from "@/app/dashboard/email-marketing/automatizaciones/columns";

interface FilaHistorial {
  id: string;
  email: string;
  nombre: string | null;
  creado_at: string;
  estado: string;
  abierto: boolean;
  clicks: number;
  bounce_type: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar el historial");
  return Array.isArray(data) ? data : [];
};

/** El estado más informativo que se puede decir de un envío, en una palabra. */
function estadoDe(f: FilaHistorial): { label: string; clase: string } {
  if (f.bounce_type) return { label: "Rebotado", clase: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" };
  if (f.clicks > 0) return { label: "Click", clase: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" };
  if (f.abierto) return { label: "Abierto", clase: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" };
  if (f.estado === "enviado") return { label: "Enviado", clase: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" };
  if (f.estado === "fallido") return { label: "Falló", clase: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" };
  // 'cancelado' (migración 2026-07-27c): el envío estaba en cola y no salió.
  // Pasa cuando la persona se dio de baja antes de que le tocara el turno, o
  // cuando alguien frenó la cola de la automatización a mano. Gris, no rojo:
  // no es un error, es un envío que decidimos no hacer.
  if (f.estado === "cancelado") return { label: "Cancelado", clase: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100" };
  return { label: "En cola", clase: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" };
}

export function AutomatizacionHistorialSheet({
  automatizacion,
  open,
  onOpenChange,
}: {
  automatizacion: Automatizacion | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data, isLoading, error } = useSWR<FilaHistorial[]>(
    open && automatizacion ? `/api/email/automatizaciones/${automatizacion.id}/historial` : null,
    fetcher,
  );

  if (!automatizacion) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] overflow-hidden p-0 md:h-[85vh]">
        <SheetHeader className="border-b px-6 pb-4 pt-5">
          <SheetTitle>Historial · {automatizacion.nombre || automatizacion.evento}</SheetTitle>
          <SheetDescription>
            Cada persona aparece una sola vez por período. Los envíos salen por la cola, así que
            pueden tardar hasta un minuto en pasar de «En cola» a «Enviado».
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-6.5rem)] px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando...
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-red-600">{String(error.message || error)}</p>
          ) : !data || data.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Todavía no se envió ningún email con esta automatización.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((f) => {
                  const e = estadoDe(f);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(f.creado_at).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">{f.nombre || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={e.clase}>
                          {e.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
