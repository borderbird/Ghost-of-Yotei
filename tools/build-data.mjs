// Bündelt data/*.json zu data/bundle.js, damit index.html auch per Doppelklick (file://) läuft.
// Aufruf: node tools/build-data.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));

const examples = {};
for (const f of readdirSync(new URL("data/examples/", root)).filter((f) => f.endsWith(".json")).sort()) {
  examples[f.replace(/\.json$/, "")] = read(`data/examples/${f}`);
}

const data = { legends: read("data/legends.json"), gear: read("data/gear.json"), examples };
writeFileSync(
  new URL("data/bundle.js", root),
  "// Automatisch erzeugt von tools/build-data.mjs – nicht von Hand bearbeiten.\n" +
    "window.LEGENDS_DATA = " + JSON.stringify(data) + ";\n"
);
console.log(`data/bundle.js geschrieben (${Object.keys(examples).length} Beispiel-Loadouts).`);
