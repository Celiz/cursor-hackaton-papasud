'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  /** Localidad actual (texto). */
  value?: string;
  /** Cambio de texto libre (mientras se tipea). */
  onChange: (localidad: string) => void;
  /** Al elegir una localidad del dropdown: trae localidad + provincia + CP por defecto. */
  onSelect: (localidad: string, provincia: string, codigoPostal?: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Combobox de ciudad con autocomplete contra /api/localidades (proxy a georef.gob.ar).
 * Al elegir una opción, además de la localidad completa la provincia (onSelect).
 *
 * El dropdown se renderiza EN FLUJO (bloque normal debajo del input), NO en un portal
 * ni absolute: así no lo recorta el overflow del contenedor (el contenido en flujo
 * extiende el área scrolleable), el click funciona dentro del diálogo (Radix no lo
 * cierra) y la rueda del mouse scrollea normal. Enter nunca guarda: elige la 1ra
 * coincidencia y corta la propagación.
 */
export function CiudadCombobox({ value, onChange, onSelect, placeholder, className, id }: Props) {
  const [results, setResults] = useState<{ nombre: string; provincia: string; codigo_postal?: string }[]>([]);
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera del wrapper.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setShow(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const buscar = useCallback((v: string) => {
    // El sistema guarda todo en MAYÚSCULA (localidad y provincia).
    onChange(v.toUpperCase());
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (v.trim().length < 2) {
      setResults([]);
      setShow(false);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/localidades?q=${encodeURIComponent(v)}&max=8`);
        const data = await res.json();
        setResults(data.localidades || []);
        setShow(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }, [onChange]);

  const elegir = (loc: { nombre: string; provincia: string; codigo_postal?: string }) => {
    // Guardar en MAYÚSCULA (convención del sistema); el dropdown se muestra normal.
    onSelect(loc.nombre.toUpperCase(), (loc.provincia || '').toUpperCase(), loc.codigo_postal || undefined);
    setShow(false);
    setResults([]);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        id={id}
        value={value ?? ''}
        onChange={(e) => buscar(e.target.value)}
        onFocus={() => { if (results.length > 0) setShow(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Nunca guardar/avanzar desde este campo. Si hay opciones, elegir la 1ra.
            e.preventDefault();
            e.stopPropagation();
            if (show && results.length > 0) elegir(results[0]);
          } else if (e.key === 'Escape') {
            setShow(false);
          }
        }}
        placeholder={placeholder ?? 'Buscar ciudad...'}
        className={className}
        autoComplete="off"
      />
      {show && results.length > 0 && (
        <div className="mt-1 max-h-52 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          {results.map((loc, i) => (
            <button
              key={`${loc.nombre}-${loc.provincia}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(loc)}
              className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {loc.nombre}
              <span className="text-xs text-muted-foreground"> · {loc.provincia}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
