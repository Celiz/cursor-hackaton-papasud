import assert from "node:assert/strict";
import { test } from "node:test";
import {
  procesarResultados,
  unirDictado,
  estadoInicial,
  type ResultadoVoz,
} from "./dictado";

const final = (indice: number, texto: string): ResultadoVoz => ({ indice, texto, esFinal: true });
const parcial = (indice: number, texto: string): ResultadoVoz => ({ indice, texto, esFinal: false });

test("lo parcial se muestra pero no se acumula", () => {
  const s = procesarResultados([parcial(0, "pasamos con la")], estadoInicial);
  assert.equal(s.definitivo, "");
  assert.equal(s.parcial, "pasamos con la");
  assert.equal(s.estado.ultimoFinal, -1, "nada quedó fijado todavía");
});

test("cuando la frase se cierra, se emite una sola vez", () => {
  const s = procesarResultados([final(0, "pasamos con la pulverizadora")], estadoInicial);
  assert.equal(s.definitivo, "pasamos con la pulverizadora");
  assert.equal(s.estado.ultimoFinal, 0);
});

// ── El bug que reportaron ──────────────────────────────────────────────────

test("Chrome reenvía el mismo resultado final y NO se duplica", () => {
  // Primera entrega
  const a = procesarResultados([final(0, "tiramos mancozeb")], estadoInicial);
  assert.equal(a.definitivo, "tiramos mancozeb");

  // Chrome vuelve a mandar el mismo índice, ya finalizado
  const b = procesarResultados([final(0, "tiramos mancozeb")], a.estado);
  assert.equal(b.definitivo, "", "no se emite de nuevo");
  assert.equal(b.estado.ultimoFinal, 0);
});

test("results acumulativo: solo entra lo que es nuevo", () => {
  // Chrome manda TODO el historial en cada evento
  const a = procesarResultados([final(0, "en el lote ocho")], estadoInicial);
  assert.equal(a.definitivo, "en el lote ocho");

  const b = procesarResultados(
    [final(0, "en el lote ocho"), final(1, "tiramos mancozeb")],
    a.estado
  );
  assert.equal(b.definitivo, "tiramos mancozeb", "solo la frase nueva");

  const c = procesarResultados(
    [final(0, "en el lote ocho"), final(1, "tiramos mancozeb"), final(2, "dos kilos")],
    b.estado
  );
  assert.equal(c.definitivo, "dos kilos");
});

test("varias frases nuevas de golpe entran todas, en orden", () => {
  const s = procesarResultados(
    [final(0, "primera"), final(1, "segunda"), final(2, "tercera")],
    estadoInicial
  );
  assert.equal(s.definitivo, "primera segunda tercera");
  assert.equal(s.estado.ultimoFinal, 2);
});

test("una frase repetida a propósito sí entra dos veces", () => {
  // Índices distintos: el ingeniero dijo "sí" dos veces de verdad.
  const a = procesarResultados([final(0, "sí")], estadoInicial);
  const b = procesarResultados([final(0, "sí"), final(1, "sí")], a.estado);
  assert.equal(a.definitivo, "sí");
  assert.equal(b.definitivo, "sí", "la segunda es real, no un reenvío");
});

test("lo final y lo parcial conviven en el mismo evento", () => {
  const s = procesarResultados(
    [final(0, "en el lote ocho"), parcial(1, "tiramos man")],
    estadoInicial
  );
  assert.equal(s.definitivo, "en el lote ocho");
  assert.equal(s.parcial, "tiramos man");
});

test("los espacios sobrantes no ensucian el texto", () => {
  const s = procesarResultados([final(0, "   con la pulverizadora  ")], estadoInicial);
  assert.equal(s.definitivo, "con la pulverizadora");
});

// ── La unión con lo ya escrito ─────────────────────────────────────────────

test("une con un espacio, sin dobles", () => {
  assert.equal(unirDictado("en el lote ocho", "tiramos mancozeb"),
               "en el lote ocho tiramos mancozeb");
  assert.equal(unirDictado("en el lote ocho ", "  tiramos mancozeb"),
               "en el lote ocho tiramos mancozeb");
});

test("sobre texto vacío devuelve la frase sola", () => {
  assert.equal(unirDictado("", "tiramos mancozeb"), "tiramos mancozeb");
  assert.equal(unirDictado("   ", "tiramos mancozeb"), "tiramos mancozeb");
});

test("agregar vacío no cambia nada", () => {
  assert.equal(unirDictado("en el lote ocho", ""), "en el lote ocho");
  assert.equal(unirDictado("en el lote ocho", "   "), "en el lote ocho");
});

test("última red: si la frase ya es el final del texto, no se repite", () => {
  assert.equal(
    unirDictado("tiramos mancozeb dos kilos", "dos kilos"),
    "tiramos mancozeb dos kilos"
  );
  assert.equal(
    unirDictado("Tiramos Mancozeb", "tiramos mancozeb"),
    "Tiramos Mancozeb",
    "la comparación ignora mayúsculas"
  );
});

// ── El dictado completo, tal como llega de Chrome ──────────────────────────

test("un dictado real con reenvíos queda limpio", () => {
  const eventos: ResultadoVoz[][] = [
    [parcial(0, "hoy estuvimos")],
    [parcial(0, "hoy estuvimos en el lote")],
    [final(0, "hoy estuvimos en el lote ocho")],
    // Chrome reenvía el final
    [final(0, "hoy estuvimos en el lote ocho")],
    [final(0, "hoy estuvimos en el lote ocho"), parcial(1, "tiramos")],
    [final(0, "hoy estuvimos en el lote ocho"), final(1, "tiramos mancozeb dos kilos")],
    [final(0, "hoy estuvimos en el lote ocho"), final(1, "tiramos mancozeb dos kilos")],
  ];

  let estado = estadoInicial;
  let texto = "";
  for (const ev of eventos) {
    const s = procesarResultados(ev, estado);
    estado = s.estado;
    texto = unirDictado(texto, s.definitivo);
  }

  assert.equal(texto, "hoy estuvimos en el lote ocho tiramos mancozeb dos kilos");
});
