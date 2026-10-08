#!/usr/bin/env node
// Static checks that need no browser: the shipped app embeds the data files, its script parses, and the judge keeps its promises.
//   node scripts/test.mjs [--source path/to/original-catalogue.json]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const json = p => JSON.parse(read(p));
let failed = 0;
const test = (name, fn) => { try { fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e.message).split("\n")[0]); } };

// ---- the built demo app embeds the data files
const app = read("app/index.html");
const embedded = name => JSON.parse(app.match(new RegExp("const " + name + " = (.*);\\n"))[1].replace(/\\u003c/g, "<"));
test("app embeds the catalogue", () => assert.deepEqual(embedded("OM_CATALOG"), json("data/layouts-catalog.json")));
test("app embeds the palette", () => assert.deepEqual(embedded("OM_PALETTE"), json("data/palettes/deep-autumn.json")));
test("app embeds the demo profile", () => assert.deepEqual(embedded("OM_PROFILE"), json("profiles/demo.json")));
test("app script parses", () => new vm.Script(app.match(/<script>([\s\S]*)<\/script>/)[1]));
test("app carries no test hook", () => assert.ok(!app.includes("window.__om")));

// ---- catalogue shape
const catalog = json("data/layouts-catalog.json");
test("catalogue has 169 entries with sources and Vietnamese fields", () => {
  assert.equal(catalog.length, 169);
  assert.equal(new Set(catalog.map(e => e.id)).size, 169);
  for (const e of catalog) {
    assert.ok(Array.isArray(e.sources), e.id + " sources");
    assert.ok(e.features_vi && e.origin_vi && e.trend_period_vi, e.id + " _vi fields");
    assert.ok(!("fit_hint" in e), e.id + " carries a personal fit hint");
  }
});
const srcArg = process.argv.indexOf("--source");
if (srcArg > 0) test("catalogue equals the source (minus fit_hint)", () => {
  const src = JSON.parse(fs.readFileSync(process.argv[srcArg + 1], "utf8")).map(e => { const c = { ...e }; delete c.fit_hint; return c; });
  assert.deepEqual(catalog, src);
});

// ---- the engine in a bare context
const ctx = vm.createContext({});
const strip = s => s.replace(/^const (\$|esc|SHIFTED) =/gm, "var $1 =");
vm.runInContext(strip(read("src/js/00-core.js")) + strip(read("src/js/02-judge.js")), ctx);
const judge = (hex, cat, skin, shift) => vm.runInContext(`judge(${JSON.stringify(hex)}, ${JSON.stringify(cat)}, ${JSON.stringify(skin)}, ${shift})`, ctx);
const run = code => vm.runInContext(code, ctx);
const palette = json("data/palettes/deep-autumn.json"), demo = json("profiles/demo.json");
const skin = demo.colors.skin.hex, shift = demo.undertone.shift;

test("palette good colours never fail the judge, avoid colours never pass (demo skin)", () => {
  for (const c of palette.cats) {
    if (c.id === "nen" || c.id === "che") continue;
    for (const g of c.good) assert.notEqual(judge(g.hex, c.id, skin, shift).v, 2, `${c.id} ${g.n[0]} ${g.hex}`);
    for (const g of c.avoid) assert.notEqual(judge(g.hex, c.id, skin, shift).v, 0, `${c.id} avoid ${g.n[0]} ${g.hex}`);
  }
});
test("foundation and concealer offsets resolve to colours near the skin", () => {
  for (const id of ["nen", "che"]) for (const g of palette.cats.find(c => c.id === id).good) {
    if (!g.rel) continue;
    const hex = run(`relHex(${JSON.stringify(skin)}, ${JSON.stringify(g.rel)})`);
    assert.match(hex, /^#[0-9a-f]{6}$/);
    assert.ok(run(`dE(${JSON.stringify(skin)}, ${JSON.stringify(hex)})`) < 20, id + " " + g.n[0]);
  }
});
test("colour difference is zero for equal colours and symmetric", () => {
  assert.equal(run('dE("#a0645e", "#a0645e")'), 0);
  assert.ok(Math.abs(run('dE("#a0645e", "#c08a7a")') - run('dE("#c08a7a", "#a0645e")')) < 1e-9);
  assert.ok(run('dE("#000000", "#ffffff")') > 90);
});
test("judge explains every verdict that is not a pass", () => {
  for (const hex of ["#a0645e", "#e8732c", "#f4b6c8", "#151313", "#c2185b"]) for (const cat of ["ma", "son", "mat", "khoi", "hl", "may"]) {
    const r = judge(hex, cat, skin, shift);
    assert.ok(r.v === 0 || r.notes.length > 0, `${cat} ${hex}`);
  }
});
test("every judge message key exists in the strings", () => {
  const strings = read("src/js/03-strings.js"), keys = new Set([...read("src/js/02-judge.js").matchAll(/"(j\.[A-Za-z0-9.]+)"/g)].map(m => m[1]));
  for (const k of keys) assert.ok(strings.includes(`"${k}":`), k);
});
test("every UI string is a Vietnamese and English pair", () => {
  const c = vm.createContext({});
  vm.runInContext(read("src/js/03-strings.js").replace("const STR =", "STR ="), c);
  const pairs = Object.entries(c.STR);
  assert.ok(pairs.length > 500);
  for (const [k, v] of pairs) assert.ok(Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "string", k);
});

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
