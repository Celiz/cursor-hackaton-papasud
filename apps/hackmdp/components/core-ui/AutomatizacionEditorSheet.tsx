"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import {
  type Automatizacion,
  ICONO_EVENTO,
  LABEL_EVENTO_UI,
} from "@/app/dashboard/email-marketing/automatizaciones/columns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Explicación de cuándo dispara cada evento. El evento no se puede cambiar. */
const EXPLICACION: Record<string, string> = {
  contacto_nuevo:
    "Se dispara cuando alguien da de alta un contacto con email desde el CRM. Las importaciones de listas y el sync automático no la disparan.",
  cumpleanos:
    "Barre todos los días a la hora elegida y saluda a quien cumpla años ese día. Necesita la fecha de nacimiento cargada en la ficha del contacto.",
  aniversario_cliente:
    "Barre todos los días a la hora elegida y saluda a los clientes que cumplen años de alta, a partir del primer año.",
  cliente_inactivo:
    "Barre todos los días a la hora elegida y busca clientes que llegaron a los meses configurados sin ninguna factura. Sólo alcanza a quien cruza el umbral después de que activaste la automatización.",
};

const HORAS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Valida que el texto sea un entero (sin decimales, sin signo salvo el propio
 * número, sin vacío) dentro del rango que acepta el servidor. Devuelve el
 * número o null si no es válido, para no dejar pasar NaN silenciosamente.
 */
function validarEntero(raw: string, min: number, max: number): number | null {
  const limpio = raw.trim();
  if (!/^-?\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  if (n < min || n > max) return null;
  return n;
}

export function AutomatizacionEditorSheet({
  automatizacion,
  open,
  onOpenChange,
  onGuardar,
  onPrueba,
}: {
  automatizacion: Automatizacion | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGuardar: (id: string, cambios: Record<string, unknown>) => Promise<void>;
  onPrueba: (a: Automatizacion) => void;
}) {
  const { data: templates } = useSWR<Array<{ id: string; nombre: string }>>(
    open ? "/api/email/templates" : null,
    fetcher,
  );

  // Se recuerda la última automatización mostrada para poder seguir
  // dibujando el contenido mientras el Sheet baja con su animación de
  // cierre: el padre pone `automatizacion` en null en el mismo tick que
  // `onOpenChange(false)`, y si el contenido dependiera sólo de esa prop el
  // panel desaparecería de golpe en vez de animarse.
  const [mostrada, setMostrada] = useState<Automatizacion | null>(automatizacion);

  const [nombre, setNombre] = useState("");
  const [templateId, setTemplateId] = useState("");
  // Los campos numéricos de texto libre se guardan como string: así se puede
  // borrar el contenido o tipear un valor intermedio inválido sin que el
  // estado caiga en NaN. La validación real pasa recién al guardar.
  const [delayRaw, setDelayRaw] = useState("0");
  const [hora, setHora] = useState(9);
  const [topeRaw, setTopeRaw] = useState("50");
  const [mesesRaw, setMesesRaw] = useState("6");
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  useEffect(() => {
    if (!automatizacion) return;
    setMostrada(automatizacion);
    setNombre(automatizacion.nombre || LABEL_EVENTO_UI[automatizacion.evento] || "");
    setTemplateId(automatizacion.template_id);
    setDelayRaw(String(automatizacion.delay_minutos ?? 0));
    setHora(automatizacion.config?.hora_envio ?? 9);
    setTopeRaw(String(automatizacion.tope_diario ?? 50));
    setMesesRaw(String(automatizacion.config?.meses_inactividad ?? 6));
    setErrorValidacion(null);
  }, [automatizacion]);

  const a = mostrada;
  if (!a) return null;

  const esCola = a.evento === "contacto_nuevo";
  const esInactivo = a.evento === "cliente_inactivo";
  const Icono = ICONO_EVENTO[a.evento];

  const guardar = async () => {
    const errores: string[] = [];

    const topeNum = validarEntero(topeRaw, 1, 1000);
    if (topeNum === null) {
      errores.push("Tope de envíos por día: tiene que ser un entero entre 1 y 1000");
    }

    let delayNum = 0;
    if (esCola) {
      const v = validarEntero(delayRaw, 0, 10080);
      if (v === null) {
        errores.push("Demora después del alta: tiene que ser un entero entre 0 y 10080 minutos");
      } else {
        delayNum = v;
      }
    }

    let mesesNum = 6;
    if (esInactivo) {
      const v = validarEntero(mesesRaw, 1, 60);
      if (v === null) {
        errores.push("Meses sin comprar: tiene que ser un entero entre 1 y 60");
      } else {
        mesesNum = v;
      }
    }

    if (errores.length > 0) {
      setErrorValidacion(errores.join(" · "));
      return;
    }

    setErrorValidacion(null);
    setGuardando(true);
    try {
      const cambios: Record<string, unknown> = {
        nombre,
        template_id: templateId,
        tope_diario: topeNum,
      };
      if (esCola) cambios.delay_minutos = delayNum;
      else cambios.hora_envio = hora;
      if (esInactivo) cambios.meses_inactividad = mesesNum;

      await onGuardar(a.id, cambios);
      onOpenChange(false);
    } catch {
      // El error ya se muestra por toast desde onGuardar; acá sólo evitamos
      // dejar una promesa rechazada sin manejar. El panel queda abierto.
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] overflow-hidden p-0 md:h-[85vh]">
        <SheetHeader className="border-b px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="flex items-start gap-3">
              {Icono ? <Icono className="mt-1 h-5 w-5 text-muted-foreground" /> : null}
              <div>
                <SheetTitle>{nombre || LABEL_EVENTO_UI[a.evento]}</SheetTitle>
                <SheetDescription>{EXPLICACION[a.evento]}</SheetDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onPrueba(a)}>
              <Send className="mr-2 h-4 w-4" />
              Enviar prueba a mí
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100%-9.5rem)]">
          <div className="mx-auto grid max-w-2xl gap-5 px-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="auto-nombre">Nombre</Label>
              <Input id="auto-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="auto-template">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="auto-template">
                  <SelectValue placeholder="Elegí un template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Para cambiar el diseño, editalo en la pestaña Templates.
              </p>
            </div>

            {esCola ? (
              <div className="grid gap-2">
                <Label htmlFor="auto-delay">Demora después del alta (minutos)</Label>
                <Input
                  id="auto-delay"
                  type="number"
                  min={0}
                  max={10080}
                  value={delayRaw}
                  onChange={(e) => setDelayRaw(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Una demora corta evita mandar el mail mientras todavía se está cargando la ficha
                  del contacto.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="auto-hora">Hora de envío</Label>
                <Select value={String(hora)} onValueChange={(v) => setHora(Number(v))}>
                  <SelectTrigger id="auto-hora">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Horario de Argentina.</p>
              </div>
            )}

            {esInactivo ? (
              <div className="grid gap-2">
                <Label htmlFor="auto-meses">Meses sin comprar</Label>
                <Input
                  id="auto-meses"
                  type="number"
                  min={1}
                  max={60}
                  value={mesesRaw}
                  onChange={(e) => setMesesRaw(e.target.value)}
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="auto-tope">Tope de envíos por día</Label>
              <Input
                id="auto-tope"
                type="number"
                min={1}
                max={1000}
                value={topeRaw}
                onChange={(e) => setTopeRaw(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Freno de seguridad. Si un día califican más, el resto queda afuera y queda
                registrado en el historial.
              </p>
            </div>

            {errorValidacion ? (
              <p className="text-sm text-destructive">{errorValidacion}</p>
            ) : null}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando || !templateId}>
            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
