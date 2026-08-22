'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { tipoAdjuntoDesdeMime, type AdjuntoItem } from '@/lib/instalaciones/adjuntos';
import { subirArchivo } from '@/lib/upload-archivo';

interface Props {
  instalacionId: string;
  /** id del ítem. Puede ser un uuid de instalaciones_items o el sintético `eu-<uuid>`. */
  itemRef: string;
  adjuntos: AdjuntoItem[];
  onChange: () => void | Promise<unknown>;
}

export function ItemAdjuntos({ instalacionId, itemRef, adjuntos, onChange }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const url = await subirArchivo(file, 'instalaciones');

      const res = await fetch(`/api/instalaciones/${instalacionId}/adjuntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ref: itemRef,
          tipo: tipoAdjuntoDesdeMime(file.type),
          url,
          nombre_archivo: file.name,
          tamano_bytes: file.size,
        }),
      });
      if (!res.ok) throw new Error('metadatos');
      await onChange();
      toast.success('Archivo adjuntado');
    } catch {
      toast.error('No se pudo adjuntar el archivo');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const borrar = async (adjuntoId: string) => {
    const res = await fetch(`/api/instalaciones/${instalacionId}/adjuntos/${adjuntoId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      toast.error('No se pudo borrar el archivo');
      return;
    }
    await onChange();
  };

  const fotos = adjuntos.filter((a) => a.tipo === 'foto');
  const documentos = adjuntos.filter((a) => a.tipo !== 'foto');

  return (
    <div className="px-4 py-3 space-y-3 border-b">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Adjuntos
        </h4>
        <Button
          size="tiny"
          variant="outline"
          icon={<Upload />}
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          {subiendo ? 'Subiendo...' : 'Subir archivo'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
          }}
        />
      </div>

      {adjuntos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin fotos ni manuales. Subí lo que haga falta llevar a la instalación.
        </p>
      ) : (
        <>
          {fotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fotos.map((a) => (
                <div key={a.id} className="relative group">
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt={a.nombre_archivo || 'Foto'}
                      className="h-20 w-20 object-cover rounded border"
                    />
                  </a>
                  <button
                    onClick={() => borrar(a.id)}
                    title="Quitar"
                    className="absolute -top-1.5 -right-1.5 bg-background border rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {documentos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 truncate"
              >
                {a.nombre_archivo || 'Archivo'}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto shrink-0"
                title="Quitar"
                onClick={() => borrar(a.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
