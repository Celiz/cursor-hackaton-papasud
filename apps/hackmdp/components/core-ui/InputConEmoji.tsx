'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

/**
 * Campo de texto con selector de emojis.
 *
 * Reusa el mismo <emoji-picker> que el editor de email, servido con los datos
 * en español desde /emoji-data.es.json (nada de CDN externo). La librería se
 * importa recién cuando se abre el selector: es pesada y la mayoría de las
 * veces no se usa.
 *
 * El emoji entra DONDE ESTÁ EL CURSOR, no al final: en un asunto uno los quiere
 * al principio tanto como al final.
 */
interface Props {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function InputConEmoji({ id, value, onChange, placeholder, maxLength, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const posicionRef = useRef<number | null>(null);
  const [abierto, setAbierto] = useState(false);

  // Guardar la posición del cursor ANTES de que el foco se vaya al selector.
  const recordarCursor = () => {
    const el = inputRef.current;
    posicionRef.current = el && el.selectionStart != null ? el.selectionStart : null;
  };

  const insertar = (emoji: string) => {
    if (!emoji) return;
    const pos = posicionRef.current ?? value.length;
    const nuevo = value.slice(0, pos) + emoji + value.slice(pos);
    if (maxLength && nuevo.length > maxLength) return;
    onChange(nuevo);
    setAbierto(false);
    const siguiente = pos + emoji.length;
    posicionRef.current = siguiente;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(siguiente, siguiente);
    });
  };

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    (async () => {
      try {
        await import('emoji-picker-element');
        if (!vivo || !contenedorRef.current) return;
        if (contenedorRef.current.querySelector('emoji-picker')) return;
        const picker: any = document.createElement('emoji-picker');
        picker.setAttribute('data-source', '/emoji-data.es.json');
        picker.style.cssText = 'width:100%;max-height:320px';
        picker.addEventListener('emoji-click', (ev: any) => insertar(ev?.detail?.unicode || ''));
        contenedorRef.current.appendChild(picker);
      } catch {
        /* si no carga, el campo sigue funcionando como texto común */
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, value]);

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={recordarCursor}
        onKeyUp={recordarCursor}
        onClick={recordarCursor}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`pr-10 ${className || ''}`}
      />
      <Popover open={abierto} onOpenChange={(v) => { if (v) recordarCursor(); setAbierto(v); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Insertar emoji"
            aria-label="Insertar emoji"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
          >
            <Smile className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[320px] p-0 overflow-hidden">
          <div ref={contenedorRef} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
