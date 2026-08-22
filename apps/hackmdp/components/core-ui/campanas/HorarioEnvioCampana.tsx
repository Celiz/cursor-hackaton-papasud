'use client';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { puedeEnviarAhora } from '@/lib/email/campana-runner-pure';

/**
 * Franja horaria y días en los que una campaña tiene permitido enviar.
 *
 * Es CONTROLADO a propósito: vive en dos lugares con formas de guardar
 * distintas — la ficha de la campaña persiste cada cambio al toque, y el panel
 * de Ajustes del editor lo guarda junto con el resto del formulario al apretar
 * "Guardar". Si el componente persistiera solo, en el editor un cambio quedaría
 * grabado aunque después cancelaras.
 */
export interface ValorHorarioEnvio {
  envio_hora_desde: number | null;
  envio_hora_hasta: number | null;
  envio_dias: number[] | null;
}

interface Props {
  valor: ValorHorarioEnvio;
  onChange: (v: ValorHorarioEnvio) => void;
  disabled?: boolean;
  /** Muestra "ahora está en pausa" — sólo tiene sentido con la campaña en curso. */
  avisarPausa?: boolean;
}

const DIAS_SEMANA = [
  { iso: 1, letra: 'L' }, { iso: 2, letra: 'M' }, { iso: 3, letra: 'M' },
  { iso: 4, letra: 'J' }, { iso: 5, letra: 'V' }, { iso: 6, letra: 'S' },
  { iso: 7, letra: 'D' },
];

const HORAS = Array.from({ length: 24 }, (_, h) => h);

const NOMBRE_DIA: Record<number, string> = {
  1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 7: 'domingo',
};

/** "de lunes a viernes", "los sábados y domingos", "todos los días". */
export function describirDias(dias: number[]): string {
  if (dias.length === 0 || dias.length === 7) return 'todos los días';
  const orden = [...dias].sort((a, b) => a - b);
  const corridos = orden.every((d, i) => i === 0 || d === orden[i - 1] + 1);
  if (corridos && orden.length > 2) {
    return `de ${NOMBRE_DIA[orden[0]]} a ${NOMBRE_DIA[orden[orden.length - 1]]}`;
  }
  const nombres = orden.map((d) => NOMBRE_DIA[d]);
  if (nombres.length === 1) return `sólo los ${nombres[0]}`;
  return `los ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

export function HorarioEnvioCampana({ valor, onChange, disabled, avisarPausa }: Props) {
  const desde = valor.envio_hora_desde;
  const hasta = valor.envio_hora_hasta;
  const dias = valor.envio_dias ?? [];
  const restringido = desde !== null && hasta !== null;

  const alternarDia = (iso: number) => {
    // La lista vacía significa "todos los días" y se dibuja con los 7 botones
    // encendidos. Si al hacer clic partiéramos del arreglo vacío, apagar un día
    // dejaría seleccionado justo el que el usuario quiso sacar.
    const base = dias.length === 0 ? [1, 2, 3, 4, 5, 6, 7] : dias;
    const nuevos = base.includes(iso)
      ? base.filter((d) => d !== iso)
      : [...base, iso].sort((a, b) => a - b);
    if (nuevos.length === 0) {
      // Sin ningún día la campaña no saldría nunca y nada lo explicaría.
      toast.error('Tiene que quedar al menos un día. Para no limitar, destildá el horario.');
      return;
    }
    onChange({ envio_hora_desde: desde, envio_hora_hasta: hasta, envio_dias: nuevos });
  };

  // Misma función que usa el runner: si acá dijera otra cosa que allá, el
  // usuario vería "puede enviar" mientras el server lo tiene frenado.
  const estado = puedeEnviarAhora({
    envio_hora_desde: desde,
    envio_hora_hasta: hasta,
    envio_dias: dias.length ? dias : null,
  });

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-purple-600"
          checked={restringido}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { envio_hora_desde: 9, envio_hora_hasta: 18, envio_dias: [1, 2, 3, 4, 5] }
                : { envio_hora_desde: null, envio_hora_hasta: null, envio_dias: null },
            )
          }
        />
        <span className="font-medium">Enviar sólo en un horario</span>
      </label>

      {!restringido ? (
        <p className="text-xs text-muted-foreground">
          Sin restricción: puede salir a cualquier hora, cualquier día. Una campaña grande
          tarda días en drenar, así que va a mandar de madrugada también.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Entre las</span>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={desde ?? 9}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  envio_hora_desde: Number(e.target.value),
                  envio_hora_hasta: hasta,
                  envio_dias: dias,
                })
              }
            >
              {HORAS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
            <span className="text-muted-foreground">y las</span>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={hasta ?? 18}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  envio_hora_desde: desde,
                  envio_hora_hasta: Number(e.target.value),
                  envio_dias: dias,
                })
              }
            >
              {HORAS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {DIAS_SEMANA.map((d) => {
              const activo = dias.length === 0 || dias.includes(d.iso);
              return (
                <button
                  key={d.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => alternarDia(d.iso)}
                  title={NOMBRE_DIA[d.iso]}
                  className={cn(
                    'h-8 w-8 rounded-full text-xs font-semibold border transition-colors',
                    activo
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-muted',
                  )}
                >
                  {d.letra}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Manda de {String(desde).padStart(2, '0')}:00 a {String(hasta).padStart(2, '0')}:00,{' '}
            {describirDias(dias)}. Lo que caiga fuera queda en cola y sale cuando reabre.
          </p>

          {avisarPausa && !estado.puede && (
            <p className="text-xs rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2.5 py-1.5">
              Ahora mismo está en pausa: {estado.motivo}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
