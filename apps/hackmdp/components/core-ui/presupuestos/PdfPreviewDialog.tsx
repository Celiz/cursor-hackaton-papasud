'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL del PDF embebido (inline). */
  url: string;
  /** URL de descarga (attachment). */
  downloadUrl: string;
  titulo: string;
}

export function PdfPreviewDialog({ open, onOpenChange, url, downloadUrl, titulo }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
        {/* pr-12 deja lugar a la X de cerrar (absolute right-4 de shadcn) para
            que no se superponga con el botón Descargar. */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 pr-12 py-2 border-b space-y-0">
          <DialogTitle className="text-sm truncate">{titulo}</DialogTitle>
          <Button
            size="tiny"
            variant="outline"
            icon={<Download />}
            onClick={() => window.open(downloadUrl, '_blank')}
          >
            Descargar
          </Button>
        </DialogHeader>
        {open && (
          <iframe src={url} title={titulo} className="flex-1 w-full border-0" />
        )}
      </DialogContent>
    </Dialog>
  );
}
