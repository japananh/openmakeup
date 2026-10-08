/* ---------- boot ---------- */
const BRAND = Object.assign({ name: "openmakeup", tag: "" }, P.brand);

// Reads what earlier builds kept in the browser once: the prototype's bp.* keys and the first app's tumau.v2.* keys.
// Nothing is deleted, so going back to an old build still works.
function migrateLegacy() {
  if (store.get("migrated", false)) return;
  const raw = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const json = k => { try { return JSON.parse(raw(k)); } catch (e) { return null; } };
  const edits = {};
  const bpName = raw("bp.profileName");
  if (bpName && bpName.trim() && !EDITS.name) edits.name = bpName.trim().slice(0, 30);
  const old = json("tumau.v2.profile");
  if (old && typeof old === "object") {
    if (typeof old.name === "string" && old.name.trim() && old.name.trim().length > 1 && !edits.name && !EDITS.name) edits.name = old.name.trim().slice(0, 30);
    if (typeof old.shade === "string" && old.shade.trim()) edits.shade = old.shade.trim().slice(0, 12);
    const sk = normHex(old.skin);
    if (sk && sk !== PC.skin.hex) edits.colors = { skin: { hex: sk, nm: {} } };
  }
  const tab = json("tumau.v2.tab"), occ = json("tumau.v2.occ");
  if (typeof tab === "string" && CAT[tab]) state.cat = tab;
  if (typeof occ === "string" && (occ === "all" || OCC[occ])) state.occ = occ;
  const list = json("tumau.v2.list");
  if (Array.isArray(list)) {
    const known = [...INV0.map(it => normP(it.brand + " " + it.prod)), ...CARE0.map(c => normP(c.name))];
    const matches = n => known.some(k => normP(n).includes(k) || k.includes(normP(n)));
    list.forEach(it => {
      if (!it || typeof it !== "object") return;
      // A colour saved from a palette becomes a hand-added shopping item.
      if (it.cat !== "use" && CAT[it.cat] && normHex(it.hex)) {
        const name = catShort(CAT[it.cat]) + " · " + (typeof it.name === "string" ? it.name : it.hex);
        if (!SHOPST.manual.some(m => m.name === name)) SHOPST.manual.push({ name, hex: normHex(it.hex), src: "tumau" });
      } else if (it.cat === "use" && typeof it.name === "string" && !matches(it.name) && it.group !== "Da") {
        // A product added by hand to the old "in use" list; its colour is unknown.
        const lower = it.name.toLowerCase(), guess = [["che khuyết", "che"], ["phấn phủ", "phu"], ["kem nền", "nen"], ["cushion", "nen"], ["má", "ma"], ["chì kẻ môi", "chi"], ["son", "son"], ["mày", "may"], ["kẻ mắt", "liner"], ["tạo khối", "khoi"], ["highlight", "hl"]].find(g => lower.includes(g[0]));
        SHOPST.custom.push({ id: "c" + Date.now().toString(36) + SHOPST.custom.length, cat: guess ? guess[1] : "mat", tone: "", cheek: false, name: it.name, short: it.name });
      } else if (it.cat === "use" && it.group === "Da" && typeof it.name === "string" && !matches(it.name)) {
        const extra = { id: "x" + CARE_EXTRA.length, name: it.name, note: "" };
        CARE_EXTRA.push(extra); CARE0.push(extra);
      }
    });
    saveShop();
    if (CARE_EXTRA.length) store.set("care.extra", CARE_EXTRA);
  }
  store.set("migrated", true);
  // The profile was built before the old name and colours were read, so start over once with them applied.
  if (Object.keys(edits).length) { editProfile(edits); location.reload(); }
}
const CARE_EXTRA = store.get("care.extra", []);
CARE_EXTRA.forEach(c => CARE0.push(c));

const ROUTES = new Set(["today", "palette", "layout", "skin", "profile"]);
function bootFromHash() {
  const parts = location.hash.slice(1).split(".").filter(Boolean), flags = new Set(parts.slice(1)), screen = parts[0];
  if (flags.has("en")) LANG = "en";
  const month = [...flags].find(f => /^month-\d+$/.test(f));
  if (month) MONTH = Math.min(12, Math.max(1, +month.slice(6)));
  const look = [...flags].find(f => f.startsWith("look-")), cat = [...flags].find(f => f.startsWith("cat-"));
  if (look && LOOK[look.slice(5)]) { state.lookId = look.slice(5); state.screen = "detail"; }
  else if (cat && catEntry(cat.slice(4))) { state.catId = cat.slice(4); state.screen = "catdetail"; }
  else if (ROUTES.has(screen)) state.screen = screen;
  if (state.lookId == null && LOOKS.length) state.lookId = LOOKS[0].id;
  if (state.catId == null) state.catId = CATALOG[0].id;
  if (screen === "checker") state.overlay = "checker";
  if (screen === "shopping" || screen === "inventory") { state.overlay = "shop"; SHOPST.tab = screen === "inventory" ? "inv" : "need"; }
}

state.defLang = readDefaultLang() || "vi";
LANG = state.defLang;
loadShop();
migrateLegacy();
recompute();
bootFromHash();
document.title = BRAND.name + (BRAND.tag ? " " + BRAND.tag : "");
[$("#rail-brand"), $("#tb-brand")].forEach(el => { el.innerHTML = esc(BRAND.name) + (BRAND.tag ? `<span>${esc(BRAND.tag)}</span>` : ""); });
render();
