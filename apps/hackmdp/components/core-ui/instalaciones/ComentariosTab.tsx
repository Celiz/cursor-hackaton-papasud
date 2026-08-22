'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useInstalacionComentarios } from '@/lib/hooks/use-instalacion-comentarios';

interface Props {
  instalacionId: string;
}

interface Miembro {
  persona_id: string;
  nombre: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ComentariosTab({ instalacionId }: Props) {
  const { comentarios, mutate } = useInstalacionComentarios(instalacionId);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [menciones, setMenciones] = useState<Miembro[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Miembros del org para autocompletar menciones
  const { data: miembros = [] } = useSWR<Miembro[]>('/api/org-members', fetcher);

  const filtered = mentionQuery
    ? miembros.filter((m) => m.nombre?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : miembros;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTexto(value);
    // Detectar @ en la última palabra
    const match = value.slice(0, e.target.selectionStart || 0).match(/@([^\s@]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1]);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (m: Miembro) => {
    const before = texto.replace(/@[^\s@]*$/, `@${m.nombre} `);
    setTexto(before);
    setMenciones((prev) => (prev.find((x) => x.persona_id === m.persona_id) ? prev : [...prev, m]));
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!texto.trim() || sending) return;
    setSending(true);
    try {
      // Filtrar menciones que efectivamente aparezcan en el texto
      const mencionesEfectivas = menciones.filter((m) => texto.includes(`@${m.nombre}`));
      const res = await fetch(`/api/instalaciones/${instalacionId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, menciones: mencionesEfectivas }),
      });
      if (res.ok) {
        setTexto('');
        setMenciones([]);
        await mutate();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {comentarios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sin comentarios. Dejá la primera nota.
          </p>
        ) : (
          comentarios.map((c) => (
            <div key={c.id} className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{c.autor_nombre || 'Usuario'}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString('es-AR')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-3 relative">
        <Textarea
          ref={textareaRef}
          placeholder="Escribí un comentario. Usá @ para mencionar."
          value={texto}
          onChange={handleChange}
          rows={3}
          className="resize-none"
        />
        {mentionOpen && filtered.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
            {filtered.slice(0, 8).map((m) => (
              <button
                key={m.persona_id}
                onClick={() => insertMention(m)}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              >
                {m.nombre}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-2">
          <Button
            size="tiny"
            icon={<Send />}
            onClick={handleSend}
            disabled={sending || !texto.trim()}
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
