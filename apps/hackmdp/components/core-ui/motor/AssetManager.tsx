'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

interface Img { name: string; url: string }

export default function AssetManager({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [imgs, setImgs] = useState<Img[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/upload/list?bucket=email');
      const d = await r.json();
      setImgs(Array.isArray(d) ? d : []);
    } catch {
      setImgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    let ultima = '';
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('bucket', 'email');
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (d?.url) ultima = d.url;
      }
      await load();
      if (ultima) onSelect(ultima);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-800">Imágenes</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr]">
          <div className="border-r border-gray-200 p-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition ${drag ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-gray-50'}`}
            >
              {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
              {uploading ? 'Subiendo…' : 'Arrastrá una imagen o hacé click para subir'}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          </div>
          <div className="min-h-0 overflow-y-auto p-4">
            {loading ? (
              <div className="flex h-44 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : imgs.length === 0 ? (
              <p className="pt-10 text-center text-sm text-gray-400">Todavía no subiste imágenes.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {imgs.map((im) => (
                  <button
                    key={im.url}
                    onClick={() => { onSelect(im.url); onClose(); }}
                    title={im.name}
                    className="overflow-hidden rounded-lg border border-gray-200 transition hover:border-blue-500 hover:ring-2 hover:ring-blue-200"
                  >
                    <img src={im.url} alt={im.name} className="h-24 w-full bg-gray-50 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
