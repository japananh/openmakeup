#!/usr/bin/env node
// Opens a built page in headless Chrome and walks every screen in Vietnamese and English.
// Fails on any console error or uncaught exception.   node scripts/smoke.mjs app/index.html [--shots dir]
// Chrome is found at $CHROME or the usual macOS and Linux paths; nothing is shown on screen.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const file = path.resolve(args.find(a => !a.startsWith("--")) || "app/index.html");
const shotsDir = args.includes("--shots") ? path.resolve(args[args.indexOf("--shots") + 1]) : null;
const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(p => fs.existsSync(p));
if (!CHROME) { console.error("Chrome not found; set CHROME"); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9600 + Math.floor(Math.random() * 300);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "om-smoke-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const stop = async () => { chrome.kill(); await sleep(200); fs.rmSync(dir, { recursive: true, force: true }); };
// A failed step must not leave a browser running.
process.on("uncaughtException", async e => { console.error(e.message); await stop(); process.exit(1); });
process.on("unhandledRejection", async e => { console.error(String(e)); await stop(); process.exit(1); });

let tabs;
for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const errors = [];
ws.addEventListener("message", m => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  else if (d.method === "Runtime.exceptionThrown") { const x = d.params.exceptionDetails, f = (x.stackTrace && x.stackTrace.callFrames[0]) || {}; errors.push(`exception ${(x.exception && x.exception.description || x.text).split("\n")[0]} in ${f.functionName || "?"}:${f.lineNumber}`); }
  else if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("console " + JSON.stringify(d.params.args).slice(0, 300));
  else if (d.method === "Log.entryAdded" && d.params.entry.level === "error" && !/fonts\.(googleapis|gstatic)/.test(d.params.entry.url || "") && !/ERR_(INTERNET|NAME|CONNECTION|BLOCKED)/.test(d.params.entry.text)) errors.push("log " + d.params.entry.text);
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
const shot = async name => { if (!shotsDir) return; fs.mkdirSync(shotsDir, { recursive: true }); const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(shotsDir, name + ".png"), Buffer.from(r.result.data, "base64")); };
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true;})()`);

let failures = 0;
const check = (label, ok, extra = "") => { if (!ok) { failures++; console.log(`FAIL ${label} ${extra}`); } };

for (const [lang, width, height] of [["vi", 390, 844], ["en", 1280, 860], ["vi", 1280, 860], ["en", 390, 844]]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url: "about:blank" }); await sleep(100);
  await send("Page.navigate", { url: "file://" + file + (lang === "en" ? "#today.en" : "#today") }); await sleep(1500);
  const tag = `${lang}-${width}`;
  const text = () => ev("document.body.innerText");
  check(`${tag} lang`, (await ev("document.documentElement.lang")) === lang);
  check(`${tag} no review chrome`, await ev(`!document.querySelector("#rv, #notes, [data-anno], .rv-notes")`));

  for (const screen of ["today", "palette", "layout", "skin", "profile"]) {
    await click(`[data-go="${screen}"]`); await sleep(250);
    const t = await text();
    check(`${tag} ${screen} renders`, t.length > 120, `(${t.length} chars)`);
    check(`${tag} ${screen} no raw keys`, !/\b(?:today|nav|pal|lib|det|skin|prof|ck|pk|pc|set|shop|need|inv|cd|j|sc|id)\.[a-zA-Z]+[A-Za-z0-9.]*\b/.test(t.replace(/https?:\S+/g, "")), (t.match(/\b(?:today|nav|pal|lib|det|skin|prof|ck|pk|pc|set|shop|need|inv|cd|j|sc|id)\.[a-zA-Z]+[A-Za-z0-9.]*\b/) || [])[0]);
    await shot(`${tag}-${screen}`);
  }
  // palette: every category
  await click('[data-go="palette"]');
  const cats = await ev(`[...document.querySelectorAll(".cat-tab")].map(b=>b.dataset.cat)`);
  for (const c of cats) { await click(`.cat-tab[data-cat="${c}"]`); await sleep(80); check(`${tag} palette ${c}`, (await text()).length > 200); }
  // layout list, a card, the detail page
  await click('[data-go="layout"]'); await sleep(200);
  const n = await ev(`document.querySelectorAll(".lcard").length`);
  check(`${tag} catalogue cards`, n === 169, `(${n})`);
  await ev(`document.querySelector("#lib-q").value="a"; document.querySelector("#lib-q").dispatchEvent(new Event("input",{bubbles:true}))`);
  await click('[data-kind="technique"]'); await sleep(100);
  await click('[data-kind="all"]');
  const firstId = await ev(`document.querySelector(".lcard").dataset.lib`);
  await click(`.lcard[data-lib="${firstId}"]`); await sleep(300);
  check(`${tag} detail page`, (await text()).length > 300);
  await shot(`${tag}-detail`);
  // every catalogue entry opens without an error
  const ids = await ev(`[...document.querySelectorAll(".lcard")].map(c=>c.dataset.lib)`);
  for (const cid of ids) {
    await ev(`(()=>{const c=document.querySelector('.lcard[data-lib="${cid}"]'); if(c) c.click(); else {document.querySelector('[data-go="layout"]').click(); document.querySelector('.lcard[data-lib="${cid}"]').click();} })()`);
    const ok = await ev(`document.querySelector(".det") !== null`);
    if (!ok) { check(`${tag} entry ${cid}`, false); }
    await click('[data-go="layout"]');
  }
  // checker: each category, sample colours
  await click('[data-open="checker"]'); await sleep(200);
  const ckCats = await ev(`[...document.querySelectorAll("[data-ck-cat]")].map(b=>b.dataset.ckCat)`);
  for (const c of ckCats) { await click(`[data-ck-cat="${c}"]`); await sleep(60); check(`${tag} checker ${c}`, (await ev(`document.querySelector("#sh-checker").innerText.length`)) > 100); if (c === "son" || c === "may") await shot(`${tag}-checker-${c}`); }
  await click("[data-close]");
  // shopping list: need + inventory
  await click('[data-open="shop"]'); await sleep(200);
  check(`${tag} shop need`, (await ev(`document.querySelector("#sh-shop").innerText.length`)) > 100);
  await shot(`${tag}-shop`);
  await click('#sh-shop [data-shop-tab="inv"]'); await sleep(150);
  check(`${tag} shop inv`, (await ev(`document.querySelector("#sh-shop").innerText.length`)) > 60);
  await click("[data-close]");
  // picker sheet from the profile
  await click('[data-go="profile"]'); await sleep(150);
  const edit = await ev(`[...document.querySelectorAll("[data-pc-edit]")].map(b=>b.dataset.pcEdit)`);
  for (const k of edit) { await click(`[data-pc-edit="${k}"]`); await sleep(80); check(`${tag} picker ${k}`, (await ev(`document.querySelector("#sh-picker").innerText.length`)) > 50); await click("[data-close]"); }
}
// Settings: importing a profile replaces the baked one after a reload; reset brings it back.
const demoJson = path.join(path.dirname(file), "..", "profiles", "demo.json");
if (fs.existsSync(demoJson) && /app[\\/]index\.html$/.test(file)) {
  const custom = JSON.parse(fs.readFileSync(demoJson, "utf8"));
  custom.name = "Imported Test"; custom.colors.skin.hex = "#c8956d";
  const tmp = path.join(dir, "import.json"); fs.writeFileSync(tmp, JSON.stringify(custom));
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "file://" + file + "#profile" }); await sleep(1200);
  const doc = (await send("DOM.getDocument", { depth: 1 })).result.root.nodeId;
  const node = (await send("DOM.querySelector", { nodeId: doc, selector: "#import-file" })).result.nodeId;
  await send("DOM.setFileInputFiles", { nodeId: node, files: [tmp] }); await sleep(1500);
  check("import applies", (await ev(`document.querySelector("[data-pname]") && document.querySelector("[data-pname]").value`)) === "Imported Test");
  await ev(`window.confirm = () => true; document.querySelector("[data-reset]").click()`); await sleep(1500);
  check("reset restores", (await ev(`document.querySelector("[data-pname]") && document.querySelector("[data-pname]").value`)) === "Linh");
}
console.log(errors.length ? errors.map(e => "ERROR " + e).join("\n") : "console: 0 errors");
await stop();
if (errors.length || failures) { console.log(`smoke: ${failures} failed checks, ${errors.length} errors`); process.exit(1); }
console.log("smoke: ok");
