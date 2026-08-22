import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anguloDeCuadrante,
  puntoEnCirculo,
  caminoDeSector,
  centroDeSector,
  distanciaMetros,
  rumboGrados,
  ubicarEnPivote,
  ubicarEnCampo,
  type Pivote,
} from "./pivote";

const cerca = (a: number, b: number, tol = 0.5) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b} (tolerancia ${tol})`);

// ── Cuadrantes ─────────────────────────────────────────────────────────────

test("el cuadrante 1 del pivote A es el noroeste, y sigue en sentido horario", () => {
  assert.deepEqual(anguloDeCuadrante(1), { desde: 270, hasta: 360 }); // NO
  assert.deepEqual(anguloDeCuadrante(2), { desde: 0, hasta: 90 });    // NE
  assert.deepEqual(anguloDeCuadrante(3), { desde: 90, hasta: 180 });  // SE
  assert.deepEqual(anguloDeCuadrante(4), { desde: 180, hasta: 270 }); // SO
});

test("el pivote B numera del 5 al 8 con la misma orientación", () => {
  assert.deepEqual(anguloDeCuadrante(5), anguloDeCuadrante(1));
  assert.deepEqual(anguloDeCuadrante(6), anguloDeCuadrante(2));
  assert.deepEqual(anguloDeCuadrante(7), anguloDeCuadrante(3));
  assert.deepEqual(anguloDeCuadrante(8), anguloDeCuadrante(4));
});

// ── Puntos sobre el círculo ────────────────────────────────────────────────

test("el norte es arriba: en SVG el eje Y crece hacia abajo", () => {
  const n = puntoEnCirculo(100, 100, 50, 0);
  cerca(n.x, 100); cerca(n.y, 50);

  const e = puntoEnCirculo(100, 100, 50, 90);
  cerca(e.x, 150); cerca(e.y, 100);

  const s = puntoEnCirculo(100, 100, 50, 180);
  cerca(s.x, 100); cerca(s.y, 150);

  const o = puntoEnCirculo(100, 100, 50, 270);
  cerca(o.x, 50); cerca(o.y, 100);
});

// ── Caminos SVG ────────────────────────────────────────────────────────────

test("un sector que arranca en el centro es una porción de torta, sin arco interno", () => {
  const d = caminoDeSector(100, 100, 80, { rDesde: 0, rHasta: 0.5, desde: 0, hasta: 90 });
  assert.ok(d.startsWith("M 100.00 100.00"), "empieza en el centro");
  assert.equal((d.match(/A /g) ?? []).length, 1, "un solo arco");
});

test("un anillo lleva dos arcos y cierra sobre sí mismo", () => {
  const d = caminoDeSector(100, 100, 80, { rDesde: 0.3, rHasta: 0.6, desde: 90, hasta: 180 });
  assert.equal((d.match(/A /g) ?? []).length, 2, "arco externo y arco interno");
  assert.ok(d.endsWith("Z"));
  assert.ok(!d.includes("NaN"), "sin NaN en el camino");
});

test("los radios se recortan al rango válido en vez de romper el dibujo", () => {
  const d = caminoDeSector(100, 100, 80, { rDesde: -1, rHasta: 5, desde: 0, hasta: 90 });
  assert.ok(!d.includes("NaN"));
  assert.ok(d.includes("80.00"), "el radio externo se recorta al del pivote");
});

test("el centro del sector cae en el medio del anillo y del ángulo", () => {
  // Anillo entre el 20% y el 60% del radio, en el cuadrante noreste.
  const c = centroDeSector(0, 0, 100, { rDesde: 0.2, rHasta: 0.6, desde: 0, hasta: 90 });
  const dist = Math.hypot(c.x, c.y);
  cerca(dist, 40); // (0.2 + 0.6) / 2 × 100
  assert.ok(c.x > 0 && c.y < 0, "queda en el cuadrante noreste");
});

// ── Distancias y rumbos ────────────────────────────────────────────────────

test("la distancia entre dos puntos conocidos es la esperada", () => {
  // Un grado de latitud son unos 111 km.
  cerca(distanciaMetros(-38.0, -58.0, -39.0, -58.0), 111_195, 500);
  assert.equal(distanciaMetros(-38.0, -58.0, -38.0, -58.0), 0);
});

test("el rumbo apunta al norte, este, sur y oeste como corresponde", () => {
  cerca(rumboGrados(-38, -58, -37, -58), 0, 1);    // norte
  cerca(rumboGrados(-38, -58, -38, -57), 90, 1);   // este
  cerca(rumboGrados(-38, -58, -39, -58), 180, 1);  // sur
  cerca(rumboGrados(-38, -58, -38, -59), 270, 1);  // oeste
});

// ── Ubicar al ingeniero dentro del pivote ──────────────────────────────────

const pivoteA: Pivote = {
  nombre: "A",
  latitud: -38.36,
  longitud: -58.2,
  radio_m: 600,
};

test("parado en el centro, el radio es cero y cae en el primer tercio", () => {
  const u = ubicarEnPivote(-38.36, -58.2, pivoteA)!;
  assert.equal(u.distancia_m, 0);
  assert.equal(u.tercio, 1);
});

test("al norte del centro cae en el cuadrante noreste", () => {
  // ~300 m al norte: 300 m son unos 0.0027°
  const u = ubicarEnPivote(-38.3573, -58.2, pivoteA)!;
  cerca(u.distancia_m, 300, 20);
  assert.equal(u.cuadrante, 2, "el noreste es el cuadrante 2");
  assert.equal(u.tercio, 2, "la mitad del radio es el tercio del medio");
});

test("cada cuadrante recibe el punto que le corresponde", () => {
  // Puntos claramente adentro de cada cuadrante, no sobre las líneas.
  const enRumbo = (grados: number, metros = 300) => {
    const rad = (grados * Math.PI) / 180;
    const dLat = (metros * Math.cos(rad)) / 111_195;
    const dLng = (metros * Math.sin(rad)) / (111_195 * Math.cos((-38.36 * Math.PI) / 180));
    return ubicarEnPivote(-38.36 + dLat, -58.2 + dLng, pivoteA)!;
  };
  assert.equal(enRumbo(315).cuadrante, 1, "noroeste");
  assert.equal(enRumbo(45).cuadrante, 2, "noreste");
  assert.equal(enRumbo(135).cuadrante, 3, "sureste");
  assert.equal(enRumbo(225).cuadrante, 4, "suroeste");
});

test("sobre la línea divisoria el resultado es ambiguo, y no se disimula", () => {
  // Un punto a la misma latitud que el centro, hacia el oeste, NO tiene rumbo
  // 270 exacto: la geodésica da 269,999°. Cae en el suroeste, y corresponde.
  const oeste = ubicarEnPivote(-38.36, -58.2035, pivoteA)!;
  assert.equal(oeste.rumbo, 270, "redondeado a grados se lee como oeste");
  assert.equal(oeste.cuadrante, 4, "pero cae del lado del suroeste");

  // Justo al sur, 180° es donde arranca el suroeste.
  assert.equal(ubicarEnPivote(-38.3627, -58.2, pivoteA)!.cuadrante, 4);
});

test("un metro adentro de cada lado de la línea cae donde debe", () => {
  const enRumbo = (grados: number, metros: number) => {
    const rad = (grados * Math.PI) / 180;
    return ubicarEnPivote(
      -38.36 + (metros * Math.cos(rad)) / 111_195,
      -58.2 + (metros * Math.sin(rad)) / (111_195 * Math.cos((-38.36 * Math.PI) / 180)),
      pivoteA
    )!;
  };
  assert.equal(enRumbo(271, 300).cuadrante, 1, "un grado al norte del oeste: noroeste");
  assert.equal(enRumbo(269, 300).cuadrante, 4, "un grado al sur del oeste: suroeste");
});

test("el borde exterior del círculo es el tercer tercio", () => {
  // ~550 m: 0.0049° de latitud
  const u = ubicarEnPivote(-38.3551, -58.2, pivoteA)!;
  assert.equal(u.tercio, 3);
  assert.ok(u.radio > 0.9 && u.radio <= 1);
});

test("afuera del círculo devuelve null en vez de inventar un lote", () => {
  // 2 km al norte, muy afuera de un pivote de 600 m
  assert.equal(ubicarEnPivote(-38.342, -58.2, pivoteA), null);
});

test("entre varios pivotes elige aquel en el que está parado", () => {
  const pivoteB: Pivote = { nombre: "B", latitud: -38.37, longitud: -58.21, radio_m: 600 };
  const u = ubicarEnCampo(-38.3701, -58.2101, [
    { ...pivoteA, cuadrante_base: 1 },
    { ...pivoteB, cuadrante_base: 5 },
  ])!;
  assert.equal(u.pivote, "B");
  assert.ok(u.cuadrante >= 5 && u.cuadrante <= 8, "el pivote B numera del 5 al 8");
});

test("si no está dentro de ningún pivote, no devuelve nada", () => {
  assert.equal(ubicarEnCampo(-34.6, -58.38, [{ ...pivoteA }]), null); // Buenos Aires
});
