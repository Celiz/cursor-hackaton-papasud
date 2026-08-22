/**
 * `personas.email` y `personas.telefono` son columnas `text`, pero su contenido
 * es heterogéneo: strings planos (`admin@locus.local`, `+5495633656`) y literales
 * de array de Postgres serializados como texto (`{"a@b.com","c@d.com"}`).
 *
 * El frontend (columns.tsx, PersonaDetailSheet) los trata como `string[]`, así que
 * cualquier valor plano rompía con `.map is not a function`. Esta función normaliza
 * cualquiera de esas formas a un `string[]` real.
 */
export function parseContactList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  // Literal de array de Postgres almacenado como texto: {"a@b.com","c@d.com"} o {valor}
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1);
    const tokens = inner.match(/"(?:[^"\\]|\\.)*"|[^,]+/g);
    if (!tokens) return [];
    return tokens
      .map((tok) => {
        let t = tok.trim();
        if (t.startsWith('"') && t.endsWith('"')) {
          t = t.slice(1, -1).replace(/\\(.)/g, "$1");
        }
        return t.trim();
      })
      .filter(Boolean);
  }

  // String plano, posiblemente legacy separado por comas.
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
