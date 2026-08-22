"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Link2, Loader2, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BibliotecaRecurso, BibliotecaCategoria, BibliotecaVinculo, BibliotecaTipo } from "@/lib/types";
import { BibliotecaVinculacionesInput } from "./BibliotecaVinculacionesInput";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TIPOS: { value: BibliotecaTipo; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'folleto', label: 'Folleto' },
  { value: 'software', label: 'Software' },
  { value: 'ficha_tecnica', label: 'Ficha técnica' },
  { value: 'politica', label: 'Política interna' },
  { value: 'otro', label: 'Otro' },
];

// Deriva el Tipo a partir del nombre de la categoría (match por nombre, sin
// acentos ni plurales). Si no matchea ninguno, cae en 'otro'. Se usa para
// auto-completar el Tipo al elegir Categoría y evitar cargar lo mismo dos veces.
function normalizarNombre(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function tipoDesdeCategoria(nombre: string): BibliotecaTipo {
  const n = normalizarNombre(nombre);
  if (n.includes('manual')) return 'manual';
  if (n.includes('folleto')) return 'folleto';
  if (n.includes('software')) return 'software';
  if (n.includes('ficha')) return 'ficha_tecnica';
  if (n.includes('politica')) return 'politica';
  return 'otro';
}

interface BibliotecaRecursoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurso?: BibliotecaRecurso | null;
  defaultVinculo?: BibliotecaVinculo;
  onSuccess: () => void;
}

export function BibliotecaRecursoFormDialog({
  open, onOpenChange, recurso, defaultVinculo, onSuccess,
}: BibliotecaRecursoFormDialogProps) {
  const isEdit = !!recurso?.id;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'archivo' | 'link'>('archivo');

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    categoria_id: '',
    tipo: '' as BibliotecaTipo | '',
    formato: '',
    archivo_url: '',
    archivo_nombre: '',
    archivo_tamano: 0,
    link_externo: '',
    tags: '' as string,
  });
  const [vinculos, setVinculos] = useState<BibliotecaVinculo[]>([]);

  const { data: categorias = [] } = useSWR<BibliotecaCategoria[]>(
    open ? '/api/biblioteca/categorias' : null,
    fetcher
  );

  useEffect(() => {
    if (recurso?.id) {
      setForm({
        titulo: recurso.titulo,
        descripcion: recurso.descripcion || '',
        categoria_id: recurso.categoria_id || '',
        tipo: recurso.tipo || '',
        formato: recurso.formato || '',
        archivo_url: recurso.archivo_url || '',
        archivo_nombre: recurso.archivo_nombre || '',
        archivo_tamano: recurso.archivo_tamano || 0,
        link_externo: recurso.link_externo || '',
        tags: (recurso.tags || []).join(', '),
      });
      setVinculos(recurso.vinculos || []);
      setMode(recurso.link_externo ? 'link' : 'archivo');
    } else {
      setForm({
        titulo: '', descripcion: '', categoria_id: '', tipo: '', formato: '',
        archivo_url: '', archivo_nombre: '', archivo_tamano: 0, link_externo: '',
        tags: '',
      });
      setVinculos(defaultVinculo ? [defaultVinculo] : []);
      setMode('archivo');
    }
  }, [recurso, open, defaultVinculo]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (form.categoria_id) {
        const cat = categorias.find(c => c.id === form.categoria_id);
        if (cat) fd.append('subcarpeta', cat.slug);
      }

      const res = await fetch('/api/biblioteca/upload', { method: 'POST', body: fd });

      // La respuesta puede NO ser JSON si un proxy (Cloudflare) corta la subida
      // de un archivo grande (502/413/504 en HTML). Parseamos a mano para evitar
      // el críptico "Unexpected token" y dar un mensaje útil.
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* respuesta no-JSON */ }

      if (!res.ok || !data.url) {
        const tamMB = Math.round(file.size / 1024 / 1024);
        const grande = res.status === 413 || res.status === 502 || res.status === 504;
        throw new Error(
          grande
            ? `No se pudo subir "${file.name}" (${tamMB} MB) — el archivo es demasiado pesado para la subida directa. Probá con uno más liviano o usá "Link externo".`
            : (data.error || `Error al subir el archivo (código ${res.status}).`)
        );
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const formato =
        ['pdf'].includes(ext) ? 'pdf' :
        ['zip', 'rar', '7z'].includes(ext) ? 'zip' :
        ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? 'imagen' :
        ['mp4', 'mov', 'avi', 'webm'].includes(ext) ? 'video' : 'otro';

      setForm(f => ({
        ...f,
        archivo_url: data.url,
        archivo_nombre: file.name,
        archivo_tamano: file.size,
        formato,
      }));
      toast.success('Archivo subido');
    } catch (e: any) {
      toast.error(e.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast.error('El título es requerido');
      return;
    }

    const hasContent = mode === 'archivo' ? !!form.archivo_url : !!form.link_externo.trim();
    if (!hasContent) {
      toast.error(mode === 'archivo' ? 'Subí un archivo' : 'Ingresá un link');
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria_id: form.categoria_id || null,
        tipo: form.tipo || null,
        formato: mode === 'link' ? 'link' : form.formato || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        vinculaciones: vinculos.map(v => ({ entidad_tipo: v.entidad_tipo, entidad_id: v.entidad_id })),
      };

      if (mode === 'archivo') {
        body.archivo_url = form.archivo_url;
        body.archivo_nombre = form.archivo_nombre;
        body.archivo_tamano = form.archivo_tamano;
        body.link_externo = null;
      } else {
        body.link_externo = form.link_externo.trim();
        body.archivo_url = null;
      }

      if (isEdit) body.id = recurso!.id;

      const res = await fetch('/api/biblioteca/recursos', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');

      toast.success(isEdit ? 'Recurso actualizado' : 'Recurso creado');
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar recurso' : 'Agregar recurso'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del recurso.' : 'Agregá un manual, folleto, software u otro documento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Manual de operación X..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select
                value={form.categoria_id}
                onValueChange={(v) => {
                  const cat = categorias.find((c) => c.id === v);
                  setForm((f) => ({
                    ...f,
                    categoria_id: v,
                    tipo: cat ? tipoDesdeCategoria(cat.nombre) : f.tipo,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as BibliotecaTipo })}
              >
                <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              placeholder="Descripción opcional"
            />
          </div>

          <div className="space-y-2">
            <Label>Contenido *</Label>
            <div className="inline-flex rounded-lg border p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setMode('archivo')}
                className={cn(
                  "px-3 py-1 rounded text-sm transition-colors",
                  mode === 'archivo' ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                Archivo
              </button>
              <button
                type="button"
                onClick={() => setMode('link')}
                className={cn(
                  "px-3 py-1 rounded text-sm transition-colors",
                  mode === 'link' ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                Link externo
              </button>
            </div>

            {mode === 'archivo' ? (
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {form.archivo_url ? (
                  <div className="flex items-center gap-2 text-sm">
                    <FileIcon className="h-5 w-5 text-blue-500" />
                    <span className="flex-1 truncate text-left">{form.archivo_nombre}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, archivo_url: '', archivo_nombre: '', archivo_tamano: 0 })}
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {uploading ? 'Subiendo...' : 'Click para subir (PDF, ZIP, imagen, etc)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="https://..."
                  value={form.link_externo}
                  onChange={(e) => setForm({ ...form, link_externo: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Tags (separados por coma)</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="veterinaria, sysmex, usb..."
            />
          </div>

          <div className="space-y-1">
            <Label>Vincular a equipos/productos</Label>
            <BibliotecaVinculacionesInput value={vinculos} onChange={setVinculos} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Guardar' : 'Crear recurso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
