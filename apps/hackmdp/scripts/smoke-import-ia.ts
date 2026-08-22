// apps/gesti/scripts/smoke-import-ia.ts
import * as fs from "node:fs";
import { extraerLista } from "../lib/import-parsers/ia-extractor";

async function main() {
  const ruta = process.argv[2];
  const tipo = process.argv[3] || "equipos";
  const buf = fs.readFileSync(ruta);
  const r = await extraerLista(ruta.split("/").pop()!, buf, { tipo });
  console.log("modelo:", r.modelo);
  console.log("filas:", r.filas.length);
  for (const f of r.filas.slice(0, 15)) {
    console.log(`  [${f.moneda ?? "?"}] ${f.codigo ?? "-"} | ${f.nombre} | neto=${f.precio} | c/iva=${f.precio_con_iva}`);
  }
  if (r.filas.length > 15) console.log(`  … y ${r.filas.length - 15} más`);
  console.log("alertas:", r.alertas);
}
main().catch((e) => { console.error(e); process.exit(1); });
