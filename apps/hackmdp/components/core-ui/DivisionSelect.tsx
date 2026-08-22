'use client';

import useSWR from 'swr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { coloresDeDivision, etiquetaDeDivision } from '@/lib/division-colores';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Desplegable de división del cliente, con las opciones del catálogo.
 *
 * Antes este Select estaba escrito a mano con dos opciones fijas y COPIADO en
 * CreateClienteDialog y EditClienteDialog, así que agregar una división pedía
 * tocar los dos y migrar la base. Ahora las opciones salen de
 * /api/divisiones (tabla cliente_divisiones) y este componente es el único
 * lugar donde se dibujan.
 */
export function DivisionSelect({ value, onChange, className }: Props) {
  const { data } = useSWR<any[]>('/api/divisiones', fetcher);
  const divisiones = Array.isArray(data) ? data : [];

  // Si el cliente tiene una división que ya no está en el catálogo (la
  // desactivaron, o es un valor viejo), se agrega igual a la lista. Si no, el
  // Select mostraría vacío y al guardar le cambiaría la división sin que nadie
  // lo haya pedido.
  const opciones =
    value && !divisiones.some((d) => d.nombre === value)
      ? [...divisiones, { nombre: value, color: null, fueraDeCatalogo: true }]
      : divisiones;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || 'h-10'}>
        <SelectValue placeholder="Elegí una división" />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((d: any) => (
          <SelectItem key={d.nombre} value={d.nombre}>
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${coloresDeDivision(d.color).punto}`} />
              {etiquetaDeDivision(d.nombre)}
              {d.fueraDeCatalogo && (
                <span className="text-xs text-muted-foreground">(fuera de la lista)</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
