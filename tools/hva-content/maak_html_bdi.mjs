// maak_html_bdi.mjs v1 — Maker-T · N1-W02 · P3 beslissing 5 (draft-PR code/N1-W02-bdi-weergave).
// Haalt ARABIC_RUN + isolateArabic() letterlijk uit src/pages/CurriculumItemPage.tsx van de opgegeven checkout,
// transpileert dat stuk met de TypeScript van de repo en rendert per tekst de HTML die React ervan maakt
// (react-dom/server renderToStaticMarkup). Zo toetst de rendertoets exact de code van de branch, niet een kopie.
// Gebruik: node maak_html_bdi.mjs <repo-pad> <in.json: [[sleutel, tekst], ...]> <uit.json>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const [repo, inPad, uitPad] = process.argv.slice(2);
const require = createRequire(path.join(repo, "package.json"));
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const bron = fs.readFileSync(path.join(repo, "src/pages/CurriculumItemPage.tsx"), "utf8");
const m = bron.match(/const ARABIC_RUN =[\s\S]*?\nfunction isolateArabic[\s\S]*?\n}\n/);
if (!m) {
  console.error("FOUT: ARABIC_RUN/isolateArabic niet gevonden in CurriculumItemPage.tsx");
  process.exit(2);
}
const js = ts.transpileModule(m[0], {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const isolateArabic = new Function("React", js + "\nreturn isolateArabic;")(React);

const teksten = JSON.parse(fs.readFileSync(inPad, "utf8"));
const uit = teksten.map(([k, t]) => [k, t, renderToStaticMarkup(React.createElement(React.Fragment, null, isolateArabic(t)))]);
fs.writeFileSync(uitPad, JSON.stringify(uit));
console.log(
  `hulp: ${m[0].split("\n").length - 1} regels letterlijk uit CurriculumItemPage.tsx · teksten ${uit.length} · ` +
    `met <bdi> ${uit.filter((x) => x[2].includes("<bdi")).length} · <bdi>-elementen ${uit.reduce((s, x) => s + (x[2].match(/<bdi/g) || []).length, 0)}`
);
