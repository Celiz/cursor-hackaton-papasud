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
import { Label } from '@/components/ui/label';
import { Loader2, Wrench } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipoDescripcion: string;
  onConfirm: (motivo: string) => Promise<void>;
}

/**
 * Diálogo para marcar un equipo "A reparar / reacondicionar" con su motivo.
 * (Marcar "Reparado" no pasa por acá — es una acción directa.)
 */
export function ReparacionDialog({ open, onOpenChange, equipoDescripcion, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      setMotivo('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMotivo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-600" />
            Marcar a reparar / reacondicionar
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{equipoDescripcion}</p>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-sm">Motivo (por qué hay que reparar o reacondicionar)</Label>
          <Textarea
            placeholder="Ej: gabinete golpeado, hay que reacondicionar antes de instalar"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Marcar a reparar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
