/* ---------- shell: navigation, rendering, events ---------- */
const NAV = [["today", "nav.today", "today"], ["palette", "nav.palette", "palette"], ["layout", "nav.layout", "face"], ["skin", "nav.skin", "skin"]];
const pcPill = () => [P.shade, seasonName()].filter(Boolean).join(" · ");

function renderShell() {
  const navScreen = state.screen === "detail" || state.screen === "catdetail" ? "layout" : state.screen;
  $("#rail-check").innerHTML = `${ic("drop")} ${t("nav.checkColor")}`;
  $("#rail-nav").innerHTML = NAV.map(n => `<button type="button" class="rail-item" data-go="${n[0]}"${navScreen === n[0] ? ' aria-current="page"' : ""}>${ic(n[2])}${t(n[1])}</button>`).join("");
  const nBuy = shopCount();
  $("#rail-shop").innerHTML = `${ic("bag")} ${t("shop.title")} <span class="badge">${nBuy}</span>`;
  $("#tb-bag").innerHTML = `${ic("bag")}<span class="badge">${nBuy}</span>`;
  $("#tb-bag").setAttribute("aria-label", t("shop.bag", { n: nBuy }));
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === LANG));
  document.querySelectorAll(".me span, .rail-me b").forEach(el => { el.textContent = pcPill(); });
  applyI18n($(".rail")); applyI18n($(".topbar"));
  const tabs = NAV.slice(0, 2).map(n => tabBtn(n, navScreen)).join("") + `<button type="button" class="tab check" data-open="checker" id="tab-check"><span class="disc">${ic("drop")}</span><span>${t("nav.check")}</span></button>` + NAV.slice(2).map(n => tabBtn(n, navScreen)).join("");
  $("#tabbar").innerHTML = tabs;
  const prof = state.screen === "profile";
  [$("#tb-me"), $("#rail-me")].forEach(el => prof ? el.setAttribute("aria-current", "page") : el.removeAttribute("aria-current"));
}
function tabBtn(n, cur) { return `<button type="button" class="tab" data-go="${n[0]}"${cur === n[0] ? ' aria-current="page"' : ""}>${ic(n[2])}<span>${t(n[1])}</span></button>`; }
const SCREENS = { today: scrToday, palette: scrPalette, layout: scrLayout, detail: scrDetail, catdetail: scrCatDetail, skin: scrSkin, profile: scrProfile };
let lastScreen = null;
function render(keepScroll) {
  const main = $("#main"), y = main.scrollTop;
  document.documentElement.style.setProperty("--skin", PC.skin.hex);
  document.documentElement.style.setProperty("--hair-base", PC.hair.hex);
  main.innerHTML = SCREENS[state.screen]();
  if (state.screen === "layout") applyLib();
  main.scrollTop = keepScroll && lastScreen === state.screen ? y : 0;
  lastScreen = state.screen;
  renderShell();
  renderOverlay();
  syncHash();
}
function renderOverlay() {
  const ov = state.overlay;
  $("#sh-checker").innerHTML = ov === "checker" ? shChecker() : "";
  $("#sh-shop").innerHTML = ov === "shop" ? shShop() : "";
  $("#sh-picker").innerHTML = ov === "picker" ? shPicker() : "";
  if (ov === "picker" && PK.tab === "photo") pkDraw();
  ["checker", "shop", "picker"].forEach(k => $("#sh-" + k).classList.toggle("on", ov === k));
  $("#scrim").classList.toggle("on", !!ov);
  $("#app").classList.toggle("ov-open", !!ov);
  $("#sh-checker").setAttribute("aria-label", t("nav.checkColor"));
}
// The hash mirrors the screen so a reload or a shared link lands in the same place: #screen.flag.flag
function syncHash() {
  const cur = state.overlay === "shop" ? (SHOPST.tab === "inv" ? "inventory" : "shopping") : state.overlay === "checker" ? "checker" : state.screen;
  const flags = [LANG === "en" ? "en" : "", state.screen === "detail" ? "look-" + state.lookId : state.screen === "catdetail" ? "cat-" + state.catId : ""].filter(Boolean);
  try { history.replaceState(null, "", "#" + [cur].concat(flags).join(".")); } catch (e) { /* file:// in some browsers */ }
}
function refresh() { renderOverlay(); syncHash(); renderShell(); }
function go(where) {
  state.overlay = null;
  if (where === "checker") { state.screen = state.screen || "palette"; state.overlay = "checker"; }
  else if (where === "shopping" || where === "inventory") { if (!SCREENS[state.screen]) state.screen = "today"; state.overlay = "shop"; SHOPST.tab = where === "inventory" ? "inv" : "need"; SHOPST.form = null; }
  else state.screen = where;
  render();
}
let toastT;
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2200);
}
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// The profile as the app sees it now (baked-in or imported, plus edits), so an export reloads to the same state.
const exportProfile = () => JSON.stringify(Object.assign({}, P, { schema: 1 }), null, 2);
function importProfile(text) {
  const obj = JSON.parse(text);
  if (!isObj(obj)) throw new Error("not a JSON object");
  if (!isObj(obj.colors) || !obj.colors.skin || !normHex(obj.colors.skin.hex)) throw new Error("colors.skin.hex");
  store.set("profile.import", obj); store.del("profile.edits");
  location.reload();
}
function copyList() {
  const lines = PLAN.map((p, i) => `${i + 1}. ${pickName(p)} ${pickHexes(p).join(" ")}`).concat(SHOPST.manual.map(m => `+ ${m.name}${m.hex ? " " + m.hex : ""}`));
  const text = lines.join("\n");
  const done = () => toast(t("toast.copied", { n: shopCount() }));
  try { navigator.clipboard.writeText(text).then(done, () => toast(text)); } catch (e) { toast(text); }
}

/* ---------- events ---------- */
$("#app").addEventListener("click", e => {
  const btn = e.target.closest("button, [data-close], summary");
  if (!btn || btn.tagName === "SUMMARY") return;
  const d = btn.dataset;
  if (d.close !== undefined) { state.overlay = null; refresh(); return; }
  if (d.look) { state.lookId = d.look; state.done = new Set(); state.screen = "detail"; state.overlay = null; render(); return; }
  if (d.lib) {
    if (LOOK[d.lib]) { state.lookId = d.lib; state.done = new Set(); state.screen = "detail"; state.overlay = null; render(); }
    else if (catEntry(d.lib)) { state.catId = d.lib; state.screen = "catdetail"; state.overlay = null; render(); }
    else toast(t("toast.noDetail"));
    return;
  }
  if (d.nextPick !== undefined) { state.pick++; render(true); return; }
  if (d.go) { if (d.cat) state.cat = d.cat; state.screen = d.go; state.overlay = null; render(); return; }
  if (d.open) { state.overlay = d.open; refresh(); return; }
  if (d.checkHex) { state.checkHex = d.checkHex; state.checkCat = d.checkCat || state.checkCat; state.overlay = "checker"; refresh(); return; }
  if (d.ckCat) { state.checkCat = d.ckCat; state.ckName = null; state.ckLined = false; renderOverlay(); return; }
  if (pcClick(d)) return;
  if (d.cat) { state.cat = d.cat; render(true); return; }
  if (d.occ) { state.occ = d.occ; render(true); return; }
  if (d.kind) { state.kind = d.kind; document.querySelectorAll(".kind-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.kind === state.kind)); applyLib(); return; }
  if (d.filter) { state.filters.has(d.filter) ? state.filters.delete(d.filter) : state.filters.add(d.filter); btn.setAttribute("aria-pressed", state.filters.has(d.filter)); applyLib(); return; }
  if (d.done !== undefined) { const i = +d.done; state.done.has(i) ? state.done.delete(i) : state.done.add(i); render(true); return; }
  if (d.rtick !== undefined) { toggleStep(d.rtick); render(true); return; }
  if (d.remove !== undefined) { SHOPST.manual.splice(+d.remove, 1); saveShop(); refresh(); return; }
  if (d.lang) { LANG = d.lang; render(true); return; }
  if (d.clim) { LOC.climate = d.clim; saveLoc(LOC); render(true); return; }
  if (d.deflang) { saveDefaultLang(d.deflang); state.defLang = d.deflang; LANG = d.deflang; render(true); toast(t("set.saved")); return; }
  if (d.export !== undefined) { download("openmakeup-profile.json", exportProfile()); toast(t("set.exported")); return; }
  if (d.reset !== undefined) {
    if (confirm(t("set.resetAsk"))) { store.del("profile.import"); store.del("profile.edits"); location.reload(); }
    return;
  }
  if (d.shopTab) { SHOPST.tab = d.shopTab; SHOPST.form = d.edit ? "edit" + d.edit : null; state.overlay = "shop"; refresh(); if (d.edit) scrollForm(); return; }
  if (d.openInv) { SHOPST.tab = "inv"; SHOPST.form = "edit" + d.openInv; state.overlay = "shop"; refresh(); scrollForm(); return; }
  if (d.edit) { SHOPST.form = SHOPST.form === "edit" + d.edit ? null : "edit" + d.edit; renderOverlay(); return; }
  if (d.editStars !== undefined) { SHOPST.editStars = !SHOPST.editStars; renderOverlay(); return; }
  if (d.star) {
    const on = !SHOPST.starred.has(d.star);
    on ? SHOPST.starred.add(d.star) : SHOPST.starred.delete(d.star);
    saveShop(); recompute(); render(true);
    if (d.starAdd !== undefined || state.overlay !== "shop") toast(t(on ? "toast.star" : "toast.unstar", { n: GAPS[d.star].need.length, name: lkName(d.star) }));
    return;
  }
  if (d.buy !== undefined) { SHOPST.form = SHOPST.form === "buy" + d.buy ? null : "buy" + d.buy; renderOverlay(); return; }
  if (d.formClose !== undefined) { SHOPST.form = null; renderOverlay(); return; }
  if (d.buySave !== undefined) {
    const before = readyIds();
    buy(PLAN[+d.buySave], formColors());
    const now = readyIds().filter(id => !before.includes(id));
    toast(now.length ? t("toast.boughtReady", { names: names(now, 4) }) : t("toast.bought"));
    return;
  }
  if (d.editSave) {
    setColor(d.editSave, formColors());
    toast(t("toast.color", { n: GAP_LOOKS.length }));
    return;
  }
  if (d.addItem !== undefined) { SHOPST.tab = "inv"; SHOPST.form = SHOPST.form === "add" ? null : "add"; renderOverlay(); return; }
  if (d.addSave !== undefined) {
    const name = ($("#add-name").value || "").trim().slice(0, 60), cat = $("#add-type").value, hex = formColors()[0];
    if (!name) { $("#add-name").focus(); return; }
    const it = { id: "c" + Date.now().toString(36), cat, tone: "", cheek: false, name, short: name };
    if (cat === "phu" || cat === "khoa") it.noColor = true; else it.hex = hex;
    SHOPST.custom.push(it); SHOPST.form = null;
    saveShop(); recompute(); render(true);
    toast(t("toast.itemAdded"));
    // Categories the kit has something in are fixed at load; a first item in a new category needs a fresh start.
    if (!REC.has(cat)) setTimeout(() => location.reload(), 600);
    return;
  }
  if (d.copyList !== undefined) { copyList(); return; }
  if (d.add) {
    const name = d.add;
    if (!SHOPST.manual.some(s => s.name === name || (d.addHex && s.hex === d.addHex))) SHOPST.manual.push({ name, hex: d.addHex || null, src: d.addSrc || "" });
    saveShop(); renderShell(); if (state.overlay === "shop") renderOverlay();
    toast(t("toast.manual")); return;
  }
  if (d.toast) { toast(d.toast); return; }
});
$("#app").addEventListener("input", e => {
  if (pcInput(e)) return;
  if (e.target.dataset.pname !== undefined) { P.name = e.target.value.trim().slice(0, 30); editProfile({ name: P.name }); return; }
  if (e.target.id === "lib-q") { state.q = e.target.value; applyLib(); }
  if (e.target.dataset.loc !== undefined) { LOC = { id: e.target.value, climate: LOC.climate }; saveLoc(LOC); render(true); toast(t("set.locSaved")); return; }
  if (e.target.dataset.fcolor !== undefined) e.target.parentNode.style.background = e.target.value;
  if (e.target.id === "ck-color") { state.checkHex = e.target.value; const y = $("#sh-checker .sh-body").scrollTop; renderOverlay(); $("#sh-checker .sh-body").scrollTop = y; }
  if (e.target.id === "ck-hex") { const h = normHex(e.target.value); if (h) { state.checkHex = h; renderOverlay(); const el = $("#ck-hex"); el.focus(); el.setSelectionRange(7, 7); } }
});
$("#app").addEventListener("change", e => {
  if (e.target.id !== "import-file" || !e.target.files[0]) return;
  const rd = new FileReader();
  rd.onload = () => { try { importProfile(String(rd.result)); } catch (err) { toast(t("set.importErr", { why: err.message })); } };
  rd.readAsText(e.target.files[0]);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && state.overlay) { state.overlay = null; refresh(); } });
