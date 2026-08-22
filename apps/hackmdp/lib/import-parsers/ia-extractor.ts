import * as XLSX from "xlsx";
import { pdftotextLayout } from "./gematec";
import { construirPrompt, parseSobreLLM } from "./ia-sobre";
import { validarFilas } from "./ia-validacion";
import type { FilaExtraida, ResultadoExtraccion } from "./ia-tipos";

const MODELO = process.env.IMPORT_IA_MODEL || "google/gemini-2.5-flash";

/** Convierte el archivo a texto para el LLM. xlsx/xlsm/csv → CSV por hoja; pdf → pdftotext. */
export async function archivoATexto(nombre: string, buf: Buffer): Promise<string> {
  const ext = (nombre.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") {
    return await pdftotextLayout(buf);
  }
  if (ext === "csv" || ext === "txt") {
    return buf.toString("utf8");
  }
  // xlsx / xlsm / xls
  const wb = XLSX.read(buf, { type: "buffer" });
  const partes: string[] = [];
  for (const nombreHoja of wb.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[nombreHoja]);
    if (csv.trim()) partes.push(`### Hoja: ${nombreHoja}\n${csv}`);
  }
  return partes.join("\n\n");
}

/** Convierte el archivo a chunks (uno por hoja para xlsx/xlsm/xls; uno solo para pdf/csv/txt), para procesar cada uno en una llamada IA separada.
 *  `hojas`, si viene con al menos un nombre, filtra las hojas de Excel a procesar (match exacto de nombre). Ignorado en pdf/csv/txt. */
export async function archivoAChunks(
  nombre: string, buf: Buffer, hojas?: string[],
): Promise<{ etiqueta: string; texto: string }[]> {
  const ext = (nombre.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") {
    return [{ etiqueta: nombre, texto: await pdftotextLayout(buf) }];
  }
  if (ext === "csv" || ext === "txt") {
    return [{ etiqueta: nombre, texto: buf.toString("utf8") }];
  }
  // xlsx / xlsm / xls
  const wb = XLSX.read(buf, { type: "buffer" });
  const filtro = hojas && hojas.length > 0 ? new Set(hojas) : null;
  const chunks: { etiqueta: string; texto: string }[] = [];
  for (const nombreHoja of wb.SheetNames) {
    if (filtro && !filtro.has(nombreHoja)) continue;
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[nombreHoja]);
    if (csv.trim()) {
      chunks.push({ etiqueta: `Hoja: ${nombreHoja}`, texto: `### Hoja: ${nombreHoja}\n${csv}` });
    }
  }
  return chunks;
}

/** Lista los nombres de hoja de un archivo Excel (para que la UI ofrezca selección antes de extraer). pdf/csv/txt no tienen hojas → []. */
export function listarHojas(nombre: string, buf: Buffer): string[] {
  const ext = (nombre.split(".").pop() || "").toLowerCase();
  if (ext === "pdf" || ext === "csv" || ext === "txt") return [];
  const wb = XLSX.read(buf, { type: "buffer" });
  return wb.SheetNames;
}

/** Llama OpenRouter (chat completions) y devuelve el contenido de texto de la respuesta. */
export async function llamarOpenRouter(system: string, user: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY no configurada");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      max_tokens: 16000,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** texto → LLM → filas. Reintenta 1 vez si el JSON no parsea. */
export async function extraerFilasIA(texto: string, hint?: { tipo?: string }): Promise<FilaExtraida[]> {
  const { system, user } = construirPrompt(texto, hint);
  let ultimoError: unknown = null;
  for (let intento = 0; intento < 3; intento++) {
    const raw = await llamarOpenRouter(system, user);
    try {
      return parseSobreLLM(raw);
    } catch (e) {
      ultimoError = e;
    }
  }
  throw new Error(`No pude interpretar la respuesta del modelo: ${String(ultimoError)}`);
}

/** Orquesta todo: archivo → chunks (por hoja) → filas por chunk → validación. Una hoja que falla se vuelve alerta en vez de tirar abajo todo el import. */
export async function extraerLista(
  nombre: string, buf: Buffer, hint?: { tipo?: string; hojas?: string[] },
): Promise<ResultadoExtraccion> {
  const chunks = await archivoAChunks(nombre, buf, hint?.hojas);
  const todas: FilaExtraida[] = [];
  const alertasChunk: string[] = [];
  for (const ch of chunks) {
    try {
      const crudas = await extraerFilasIA(ch.texto, hint);
      todas.push(...crudas);
    } catch (e: any) {
      alertasChunk.push(`No se pudo procesar ${ch.etiqueta}: ${e?.message ?? e}`);
    }
  }
  const { filas, alertas } = validarFilas(todas);
  return { filas, alertas: [...alertasChunk, ...alertas], modelo: MODELO };
}
