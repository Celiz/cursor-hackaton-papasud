'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mail, X, Search, Loader2 } from 'lucide-react';
import type { EstadoCompra } from '@locus/core/instalaciones';

interface EmailSelection {
  thread_id: string;
  subject: string;
  account_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemDescripcion: string;
  estadoActual: EstadoCompra;
  estadoNuevo: EstadoCompra;
  estadoLabels: Record<EstadoCompra, string>;
  onConfirm: (data: {
    nota?: string;
    email_thread_id?: string;
    email_subject?: string;
    email_account_id?: string;
    fecha_estimada_llegada?: string;
  }) => Promise<void>;
}

export function CambioEstadoDialog({
  open,
  onOpenChange,
  itemDescripcion,
  estadoActual,
  estadoNuevo,
  estadoLabels,
  onConfirm,
}: Props) {
  const [nota, setNota] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [emailResults, setEmailResults] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailSelection | null>(null);
  const [showEmailSearch, setShowEmailSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const searchEmails = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/email/inbox?query=${encodeURIComponent(q)}&maxResults=5`
      );
      const data = await res.json();
      if (data.threads) {
        setEmailResults(
          data.threads.map((t: any) => ({ ...t, _accountId: data.account?.id || '' }))
        );
      }
    } catch {
      setEmailResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        nota: nota.trim() || undefined,
        email_thread_id: selectedEmail?.thread_id,
        email_subject: selectedEmail?.subject,
        email_account_id: selectedEmail?.account_id,
        fecha_estimada_llegada: fechaEstimada || undefined,
      });
      setNota('');
      setFechaEstimada('');
      setSelectedEmail(null);
      setShowEmailSearch(false);
      setEmailSearch('');
      setEmailResults([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setNota('');
    setFechaEstimada('');
    setSelectedEmail(null);
    setShowEmailSearch(false);
    setEmailSearch('');
    setEmailResults([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {itemDescripcion}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {estadoLabels[estadoActual]} → {estadoLabels[estadoNuevo]}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Textarea
            placeholder="Nota opcional..."
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
          />

          {estadoNuevo === 'en_camino' && (
            <div>
              <label className="text-sm text-muted-foreground">Llega aprox.</label>
              <Input
                type="date"
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {selectedEmail ? (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{selectedEmail.subject}</span>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : showEmailSearch ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar email..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchEmails(emailSearch)}
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => searchEmails(emailSearch)}
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {emailResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {emailResults.map((thread: any) => (
                    <button
                      key={thread.id}
                      onClick={() => {
                        setSelectedEmail({
                          thread_id: thread.id,
                          subject: thread.subject,
                          account_id: thread._accountId || '',
                        });
                        setShowEmailSearch(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
                    >
                      <p className="font-medium truncate">{thread.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {thread.from_name || thread.from_email} ·{' '}
                        {new Date(thread.last_message_at).toLocaleDateString('es-AR')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {emailResults.length === 0 && emailSearch && !searching && (
                <p className="text-xs text-muted-foreground">Sin resultados</p>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailSearch(true)}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Vincular email
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
