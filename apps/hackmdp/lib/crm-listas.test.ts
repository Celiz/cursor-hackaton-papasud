import assert from "node:assert/strict";
import { asArray, slugifyId, mergeVisibles } from "./crm-listas";

let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error(err instanceof Error ? err.message : String(err));
  }
};

check("asArray: array crudo pasa igual", () => {
  assert.deepEqual(asArray([1, 2, 3]), [1, 2, 3]);
});
check("asArray: objeto paginado {data} se desenvuelve", () => {
  assert.deepEqual(asArray({ data: [1, 2], pagination: {} }), [1, 2]);
});
check("asArray: null/objeto sin data -> []", () => {
  assert.deepEqual(asArray(null), []);
  assert.deepEqual(asArray({ pagination: {} }), []);
  assert.deepEqual(asArray(undefined), []);
});
check("slugifyId: normaliza acentos y espacios", () => {
  assert.equal(slugifyId("Demo de Equipo"), "custom_demo_de_equipo");
  assert.equal(slugifyId("Licitación Pública"), "custom_licitacion_publica");
});
check("mergeVisibles: excluye ocultos y agrega propios al final", () => {
  const builtins = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const custom = [{ id: "custom_x" }];
  assert.deepEqual(mergeVisibles(builtins, custom, ["b"]), [{ id: "a" }, { id: "c" }, { id: "custom_x" }]);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) fallaron`);
  process.exit(1);
}
console.log("\nTodos los tests pasaron");
