'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageCircle, Paperclip, AlertTriangle, User, Send } from 'lucide-react';

interface Contexto {
  contacto: { nombre: string; telefono: string | null; telefono_crudo: string | null; telefonos?: string[] };
  linea: { conectada: boolean; persona_id?: string; phone_number?: string; nombre?: string };
  adjuntos: string[];
  total_texto: string;
  mensaje_default: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuestoId: string;
  presupuestoNumero: string;
  onEnviado?: () => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo cargar el contexto');
  return res.json();
};

export function EnviarWhatsappDialog({ open, onOpenChange, presupuestoId, presupuestoNumero, onEnviado }: Props) {
  const { data: ctx, error: ctxError, isLoading } = useSWR<Contexto>(
    open ? `/api/presupuestos-equipos/${presupuestoId}/whatsapp-contexto` : null,
    fetcher
  );
  const [mensaje, setMensaje] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (ctx?.mensaje_default) setMensaje(ctx.mensaje_default);
  }, [ctx?.mensaje_default]);

  // NO precargamos: el usuario elige de la lista o escribe a mano. Reseteamos a
  // vacío cuando cambia el presupuesto (nuevo contexto).
  useEffect(() => {
    setTelefono('');
  }, [ctx?.contacto.telefono, ctx?.contacto.nombre]);

  const sinLinea = !!ctx && !ctx.linea.conectada;
  // Validación liviana: al menos 10 dígitos (área + abonado). El servidor
  // normaliza y valida en serio contra el formato de WhatsApp.
  const telefonoValido = telefono.replace(/\D/g, '').length >= 10;
  const puedeEnviar = !!ctx && telefonoValido && !sinLinea && !!mensaje.trim() && !enviando;

  const enviar = async () => {
    if (!puedeEnviar) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/presupuestos-equipos/${presupuestoId}/enviar-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, telefono }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.reason || 'No se pudo enviar');
      }
      if (data.parcial) {
        toast.warning('Presupuesto enviado, pero algunos adjuntos no salieron.');
      } else {
        toast.success('Presupuesto enviado por WhatsApp');
      }
      onEnviado?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo enviar por WhatsApp');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar presupuesto {presupuestoNumero} por WhatsApp
          </DialogTitle>
        </DialogHeader>

        {ctxError && !isLoading ? (
          <div className="py-8 text-center text-sm text-destructive">
            No se pudo cargar la información del envío.
          </div>
        ) : isLoading || !ctx ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <div className="space-y-4">
            {/* A quién — el número es editable: se precarga con el del contacto
                y se puede tipear/corregir si no hay o está mal. */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{ctx.contacto.nombre}</span>
              </div>
              {(ctx.contacto.telefonos?.length ?? 0) >= 1 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Teléfonos del contacto</Label>
                  <select
                    value={ctx.contacto.telefonos?.includes(telefono) ? telefono : ''}
                    onChange={(e) => { if (e.target.value) setTelefono(e.target.value); }}
                    className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm font-mono"
                  >
                    <option value="">Elegí un número…</option>
                    {ctx.contacto.telefonos!.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label htmlFor="wa-telefono" className="text-xs text-muted-foreground">
                  Número de WhatsApp
                </Label>
                <Input
                  id="wa-telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 223 563 3653"
                  inputMode="tel"
                  className="mt-1 font-mono"
                />
                {!telefonoValido && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {telefono.trim()
                      ? 'Número incompleto.'
                      : (ctx.contacto.telefonos?.length ?? 0) > 0
                      ? 'Elegí un número de la lista o escribí uno.'
                      : 'Este contacto no tiene teléfono. Escribí uno para enviar.'}
                  </p>
                )}
              </div>
            </div>

            {/* Desde */}
            {sinLinea ? (
              <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Conectá tu WhatsApp para poder enviar.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Se envía desde tu línea{ctx.linea.phone_number ? ` (${ctx.linea.phone_number})` : ''}.
              </p>
            )}

            {/* Qué se manda */}
            <div>
              <Label className="text-xs text-muted-foreground">Se adjunta</Label>
              <ul className="mt-1 space-y-1">
                {ctx.adjuntos.map((a) => (
                  <li key={a} className="flex items-center gap-1.5 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mensaje */}
            <div>
              <Label htmlFor="wa-mensaje">Mensaje</Label>
              <Textarea
                id="wa-mensaje"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={enviar}
            disabled={!puedeEnviar}
            icon={<Send />}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {enviando ? 'Enviando…' : 'Enviar por WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
