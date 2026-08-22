import assert from "node:assert/strict";
import { parseContactList } from "./contact-fields";

const cases: Array<{ name: string; input: unknown; expected: string[] }> = [
  { name: "null -> []", input: null, expected: [] },
  { name: "undefined -> []", input: undefined, expected: [] },
  { name: "empty string -> []", input: "", expected: [] },
  { name: "whitespace -> []", input: "   ", expected: [] },
  { name: "empty pg array -> []", input: "{}", expected: [] },
  {
    name: "plain email -> single-item array",
    input: "admin@locus.local",
    expected: ["admin@locus.local"],
  },
  {
    name: "quoted pg array literal -> unwrapped",
    input: '{"antorios15@gmail.com"}',
    expected: ["antorios15@gmail.com"],
  },
  {
    name: "quoted pg array with phone -> unwrapped",
    input: '{"0341-3410147"}',
    expected: ["0341-3410147"],
  },
  {
    name: "plain phone with spaces stays whole",
    input: "+54 11 1234-5678",
    expected: ["+54 11 1234-5678"],
  },
  {
    name: "multi-value pg array literal",
    input: '{"a@b.com","c@d.com"}',
    expected: ["a@b.com", "c@d.com"],
  },
  {
    name: "unquoted pg array literal",
    input: "{0341-3410147}",
    expected: ["0341-3410147"],
  },
  {
    name: "legacy comma-separated plain string",
    input: "a@b.com, c@d.com",
    expected: ["a@b.com", "c@d.com"],
  },
  {
    name: "already an array -> trimmed/filtered",
    input: ["x@y.com", " ", "z@w.com"],
    expected: ["x@y.com", "z@w.com"],
  },
  {
    name: "plain phone with hyphens",
    input: "+54 9 2324 52-0557",
    expected: ["+54 9 2324 52-0557"],
  },
  {
    name: "quoted pg array with phone number",
    input: '{"+54 9 2324 52-0557"}',
    expected: ["+54 9 2324 52-0557"],
  },
];

let failed = 0;
for (const c of cases) {
  try {
    assert.deepEqual(parseContactList(c.input), c.expected);
    console.log(`  ok  ${c.name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${c.name}`);
    console.error(`      got: ${JSON.stringify(parseContactList(c.input))}`);
    console.error(`      expected: ${JSON.stringify(c.expected)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} failed`);
  process.exit(1);
}
console.log(`\nall ${cases.length} passed`);
