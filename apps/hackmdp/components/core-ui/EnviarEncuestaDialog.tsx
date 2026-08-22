'use client';

import { useState, useEffect } from 'react';
import { Send, Search, Loader2, User, Copy, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Encuesta } from '@/lib/types';
import useSWR from 'swr';

interface EnviarEncuestaDialogProps {
  encuesta: Encuesta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Cliente {
  id: string;
  nombre: string;
  email?: string | string[];
  identificador_unico?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return Array.isArray(data) ? data : [];
};

export default function EnviarEncuestaDialog({
  encuesta,
  open,
  onOpenChange,
  onSuccess,
}: EnviarEncuestaDialogProps) {
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: clientes } = useSWR<Cliente[]>(open ? '/api/clientes' : null, fetcher);

  useEffect(() => {
    if (!open) {
      setSelectedCliente(null);
      setGeneratedLink(null);
    }
  }, [open]);

  // cmdk handles filtering via the value prop on CommandItem
  const allClientes = clientes || [];

  const getClienteEmail = (cliente: Cliente): string | null => {
    if (!cliente.email) return null;
    if (Array.isArray(cliente.email)) {
      return cliente.email[0] || null;
    }
    return cliente.email;
  };

  const handleGenerarLink = async () => {
    if (!encuesta || !selectedCliente) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/encuestas/${encuesta.id}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: selectedCliente.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar link');
      }

      const link = `${window.location.origin}/encuesta/${data.token}`;
      setGeneratedLink(link);
      toast.success('Link de encuesta generado');
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success('Link copiado al portapapeles');
    }
  };

  const handleEnviarEmail = async () => {
    if (!selectedCliente || !generatedLink || !encuesta) return;

    const email = getClienteEmail(selectedCliente);
    if (!email) {
      toast.error('El cliente no tiene email registrado');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/encuestas/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          cliente_nombre: selectedCliente.nombre,
          encuesta_nombre: encuesta.nombre,
          link: generatedLink,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar email');
      }

      toast.success(`Email enviado a ${email}`);
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(errorMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  if (!encuesta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Encuesta</DialogTitle>
          <DialogDescription>
            Genera un link único para que un cliente responda la encuesta "{encuesta.nombre}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cliente selector */}
          <div>
            <Label>Seleccionar cliente *</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between mt-1"
                >
                  {selectedCliente ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedCliente.nombre}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Buscar cliente...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar cliente..."
                  />
                  <CommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No se encontraron clientes</CommandEmpty>
                    <CommandGroup>
                      {allClientes.map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={`${cliente.nombre} ${cliente.identificador_unico || ''} ${getClienteEmail(cliente) || ''}`}
                          onSelect={() => {
                            setSelectedCliente(cliente);
                            setSearchOpen(false);
                            setGeneratedLink(null);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{cliente.nombre}</span>
                            <span className="text-xs text-muted-foreground">
                              {cliente.identificador_unico}
                              {cliente.email && ` - ${getClienteEmail(cliente)}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Cliente info */}
          {selectedCliente && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedCliente.nombre}</span>
              </div>
              {getClienteEmail(selectedCliente) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {getClienteEmail(selectedCliente)}
                </div>
              )}
            </div>
          )}

          {/* Generated link */}
          {generatedLink && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Link generado correctamente</span>
              </div>

              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs bg-white" />
                <Button type="outline" size="small" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="outline"
                  size="small"
                  onClick={() => window.open(generatedLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {getClienteEmail(selectedCliente!) && (
                <Button
                  className="w-full"
                  onClick={handleEnviarEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Enviar por email a {getClienteEmail(selectedCliente!)}
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="outline" onClick={() => onOpenChange(false)}>
            {generatedLink ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!generatedLink && (
            <Button type="primary" onClick={handleGenerarLink} disabled={!selectedCliente || submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Generar Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
