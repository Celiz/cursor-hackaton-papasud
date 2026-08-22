import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizarDiagnostico,
  construirPromptVision,
  extraerJsonDiagnostico,
  UMBRAL_CONFIANZA,
} from "./vision";

// ── Lo que el modelo devuelve bien ─────────────────────────────────────────

test("un diagnóstico claro pasa entero", () => {
  const d = normalizarDiagnostico({
    hallazgo: "tizon_temprano",
    confianza: 0.82,
    severidad: "media",
    visible: "Manchas circulares con anillos concéntricos en hojas basales.",
    observacion: "Compatible con Alternaria.",
    recomendacion: "Recorrer el resto del lote y confirmar antes de aplicar.",
  });
  assert.equal(d.hallazgo, "tizon_temprano");
  assert.equal(d.etiqueta, "Tizón temprano");
  assert.equal(d.severidad, "media");
  assert.equal(d.urgente, false);
  assert.deepEqual(d.avisos, []);
});

test("acepta los nombres en inglés y los sinónimos del laboratorio", () => {
  assert.equal(normalizarDiagnostico({ hallazgo: "Late Blight", confianza: 0.9 }).hallazgo, "tizon_tardio");
  assert.equal(normalizarDiagnostico({ hallazgo: "early_blight", confianza: 0.9 }).hallazgo, "tizon_temprano");
  assert.equal(normalizarDiagnostico({ hallazgo: "Phytophthora infestans", confianza: 0.9 }).hallazgo, "tizon_tardio");
  assert.equal(normalizarDiagnostico({ hallazgo: "healthy", confianza: 0.9 }).hallazgo, "sana");
  assert.equal(normalizarDiagnostico({ hallazgo: "Tizón Tardío", confianza: 0.9 }).hallazgo, "tizon_tardio");
});

// ── El umbral, que es la regla de negocio ──────────────────────────────────

test("por debajo del umbral no se afirma el diagnóstico", () => {
  const d = normalizarDiagnostico({ hallazgo: "tizon_tardio", confianza: 0.4 });
  assert.equal(d.hallazgo, "no_concluyente", "se degrada en vez de afirmar");
  assert.equal(d.urgente, false, "y no dispara la alerta");
  assert.ok(d.avisos.some((a) => a.includes("40%")));
});

test("justo en el umbral sí se afirma", () => {
  const d = normalizarDiagnostico({ hallazgo: "tizon_tardio", confianza: UMBRAL_CONFIANZA });
  assert.equal(d.hallazgo, "tizon_tardio");
});

test("la confianza en porcentaje se entiende igual", () => {
  assert.equal(normalizarDiagnostico({ hallazgo: "sana", confianza: 85 }).confianza, 0.85);
  assert.equal(normalizarDiagnostico({ hallazgo: "sana", confianza: "0,73" }).confianza, 0.73);
});

test("una confianza absurda se recorta al rango válido", () => {
  assert.equal(normalizarDiagnostico({ hallazgo: "sana", confianza: 999 }).confianza, 1);
  assert.equal(normalizarDiagnostico({ hallazgo: "sana", confianza: -5 }).confianza, 0);
});

// ── Urgencia ───────────────────────────────────────────────────────────────

test("el tizón tardío y la virosis se marcan como urgentes", () => {
  assert.equal(normalizarDiagnostico({ hallazgo: "tizon_tardio", confianza: 0.9 }).urgente, true);
  assert.equal(normalizarDiagnostico({ hallazgo: "virosis", confianza: 0.9 }).urgente, true);
  assert.equal(normalizarDiagnostico({ hallazgo: "tizon_temprano", confianza: 0.9 }).urgente, false);
});

// ── Lo que el modelo devuelve mal ──────────────────────────────────────────

test("un hallazgo que no existe no se inventa: queda no concluyente y avisa", () => {
  const d = normalizarDiagnostico({ hallazgo: "hongo raro del vecino", confianza: 0.95 });
  assert.equal(d.hallazgo, "no_concluyente");
  assert.ok(d.avisos.some((a) => a.includes("no está en el catálogo")));
});

test("sin hallazgo ni confianza no rompe", () => {
  const d = normalizarDiagnostico({});
  assert.equal(d.hallazgo, "no_concluyente");
  assert.equal(d.confianza, 0);
  assert.equal(d.urgente, false);
});

test("no_concluyente es una respuesta legítima, sin aviso de catálogo", () => {
  const d = normalizarDiagnostico({
    hallazgo: "no_concluyente",
    confianza: 0.2,
    visible: "Foto muy oscura, no se distingue el follaje.",
  });
  assert.equal(d.hallazgo, "no_concluyente");
  assert.equal(d.visible, "Foto muy oscura, no se distingue el follaje.");
  assert.ok(!d.avisos.some((a) => a.includes("catálogo")));
});

// ── Prompt ─────────────────────────────────────────────────────────────────

test("el contexto del lote entra en el prompt", () => {
  const p = construirPromptVision({ lote: "L811", variedad: "Asterix", pivote: "B", tercio: 2 });
  assert.ok(p.includes("lote L811"));
  assert.ok(p.includes("variedad Asterix"));
  assert.ok(p.includes("pivote B, tercio 2"));
});

test("sin contexto el prompt sigue siendo válido", () => {
  const p = construirPromptVision();
  assert.ok(p.includes("no_concluyente"));
  assert.ok(!p.includes("Contexto de la foto"));
});

test("el prompt pide explícitamente que no invente dosis", () => {
  assert.ok(construirPromptVision().includes("Nunca indiques una"));
});

// ── Parseo ─────────────────────────────────────────────────────────────────

test("extrae el JSON aunque venga envuelto", () => {
  assert.deepEqual(extraerJsonDiagnostico('{"hallazgo":"sana"}'), { hallazgo: "sana" });
  assert.deepEqual(extraerJsonDiagnostico('```json\n{"hallazgo":"sana"}\n```'), { hallazgo: "sana" });
  assert.deepEqual(
    extraerJsonDiagnostico('Claro, acá va:\n{"hallazgo":"sana"}\nEspero que sirva.'),
    { hallazgo: "sana" }
  );
  assert.equal(extraerJsonDiagnostico("no hay json"), null);
  assert.equal(extraerJsonDiagnostico("{roto"), null);
});

// ── El caso completo ───────────────────────────────────────────────────────

test("una foto borrosa termina en no concluyente, con lo visible guardado", () => {
  const crudo = extraerJsonDiagnostico(
    '```json\n{"visible":"Imagen movida, no se distingue la hoja","hallazgo":"no_concluyente","confianza":0.1,"severidad":null,"observacion":"Sacar de nuevo más cerca","recomendacion":"Repetir la foto"}\n```'
  )!;
  const d = normalizarDiagnostico(crudo);
  assert.equal(d.hallazgo, "no_concluyente");
  assert.equal(d.visible, "Imagen movida, no se distingue la hoja");
  assert.equal(d.recomendacion, "Repetir la foto");
  assert.equal(d.urgente, false);
});
