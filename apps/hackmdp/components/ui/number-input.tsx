"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  parseFormateadoLocal,
  formatMientrasEscribe,
  toTextoDisplay,
  contarSignificativos,
  caretDesdeSignificativos,
  insertarSeparadorDecimal,
} from "@/components/ui/number-format";

// Re-export para compatibilidad con quien importe parseNumeroLocal desde acá.
export { parseNumeroLocal } from "@/components/ui/number-format";

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: number | string | null | undefined;
  onValueChange: (value: number) => void;
  /** Decimales permitidos/mostrados. 2 = importes, 0 = cantidades enteras. */
  decimals?: number;
};

/**
 * Input numérico que acepta coma O punto como separador decimal y formatea EN VIVO
 * con miles (punto) y decimal (coma), como el resto de los importes. Usa
 * `type=text` + `inputMode=decimal` para no pelear con el navegador y emite siempre
 * un número ya parseado vía `onValueChange`.
 *
 * El punto del numpad (es-AR) se intercepta en `onKeyDown` y se inserta como coma
 * decimal: si no, el formateo de miles se lo comería y nunca se podrían tipear
 * decimales con el teclado numérico.
 */
export function NumberInput({
  value,
  onValueChange,
  decimals = 2,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: NumberInputProps) {
  const [text, setText] = React.useState<string>(() => toTextoDisplay(value, decimals));
  const focusedRef = React.useRef(false);

  // Sincronizar desde el prop cuando el input NO está enfocado (ej. el precio se
  // recalcula al cambiar el costo). Mientras el usuario escribe, no lo pisamos.
  React.useEffect(() => {
    if (focusedRef.current) return;
    if (parseFormateadoLocal(text) !== Number(value ?? NaN)) {
      setText(toTextoDisplay(value, decimals));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  // Aplica un texto crudo: valida, formatea, emite el número y repone el cursor.
  const aplicarTexto = (el: HTMLInputElement, raw: string, caret: number) => {
    if (!/^[\d.,\s]*$/.test(raw)) return;
    const sig = contarSignificativos(raw, caret);
    const formatted = formatMientrasEscribe(raw, decimals);
    setText(formatted);
    const n = parseFormateadoLocal(formatted);
    onValueChange(isNaN(n) ? 0 : n);
    requestAnimationFrame(() => {
      const pos = caretDesdeSignificativos(formatted, sig);
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* el input pudo desmontarse */
      }
    });
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        setText(toTextoDisplay(parseFormateadoLocal(text), decimals));
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        // Punto o coma → un único separador decimal (coma), donde esté el cursor.
        if (e.key === "." || e.key === ",") {
          const el = e.currentTarget;
          e.preventDefault();
          const res = insertarSeparadorDecimal(
            text,
            el.selectionStart ?? text.length,
            el.selectionEnd ?? text.length,
            decimals,
          );
          if (res) {
            setText(res.text);
            const n = parseFormateadoLocal(res.text);
            onValueChange(isNaN(n) ? 0 : n);
            requestAnimationFrame(() => {
              try {
                el.setSelectionRange(res.caret, res.caret);
              } catch {
                /* el input pudo desmontarse */
              }
            });
          }
          return;
        }
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        const el = e.target;
        const raw = el.value;
        // Permitir solo dígitos y separadores mientras escribe.
        if (!/^[\d.,\s]*$/.test(raw)) return;
        aplicarTexto(el, raw, el.selectionStart ?? raw.length);
      }}
    />
  );
}
