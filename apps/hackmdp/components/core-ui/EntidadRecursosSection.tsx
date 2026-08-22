"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { BibliotecaRecurso } from "@/lib/types";
import { BibliotecaRecursoFormDialog } from "./BibliotecaRecursoFormDialog";
import { BibliotecaRecursoDetailSheet } from "./BibliotecaRecursoDetailSheet";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EntidadRecursosSectionProps {
  entidadTipo: 'equipo' | 'producto';
  entidadId: string;
}

export function EntidadRecursosSection({ entidadTipo, entidadId }: EntidadRecursosSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecurso, setEditingRecurso] = useState<BibliotecaRecurso | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: recursos = [], isLoading, mutate } = useSWR<BibliotecaRecurso[]>(
    `/api/biblioteca/recursos?vinculado_a=${entidadTipo}:${entidadId}`,
    fetcher
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {recursos.length} documento{recursos.length !== 1 ? 's' : ''}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            setEditingRecurso(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : recursos.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Sin documentos vinculados</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {recursos.map((r) => (
            <button
              key={r.id}
              onClick={() => setDetailId(r.id)}
              className="w-full text-left p-2.5 rounded-lg border bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.titulo}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.categoria_nombre && (
                      <span className="text-xs text-muted-foreground">{r.categoria_nombre}</span>
                    )}
                    {r.tipo && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">{r.tipo}</Badge>
                    )}
                  </div>
                </div>
                {r.archivo_url && <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                {r.link_externo && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      )}

      <BibliotecaRecursoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recurso={editingRecurso}
        defaultVinculo={{ entidad_tipo: entidadTipo, entidad_id: entidadId }}
        onSuccess={() => {
          mutate();
          setEditingRecurso(null);
        }}
      />

      <BibliotecaRecursoDetailSheet
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        recursoId={detailId}
        onEdit={(r) => {
          setEditingRecurso(r);
          setDetailId(null);
          setFormOpen(true);
        }}
        onDelete={() => mutate()}
      />
    </div>
  );
}
