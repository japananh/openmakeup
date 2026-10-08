/* ---------- inventory (Đồ đang có) ---------- */
// Rows come from the profile (inventory.rows, the shape of data/owned-products.json). Rows of one brand + product become one item, one pan per row.
// An empty hex stays unknown: it is never guessed or matched, and the item says so.
const OWNED_SRC = P.inventory.rows;
const FIN_KEY = [[/clear/i, "ofin.clear"], [/shimmer/i, "ofin.shimmer"], [/velvet/i, "ofin.velvet"], [/matte\/satin/i, "ofin.satin"], [/matte/i, "ofin.matte"], [/gloss|gummy|coating|tint/i, "ofin.gloss"]];
const finKey = f => { const m = FIN_KEY.find(x => x[0].test(f || "")); return m ? m[1] : ""; };
// Rows with no category are eye palettes; "chì môi" and "khoá nền" are the lip liner and setting spray groups.
const OWN_CAT = { "chì môi": "chi", "khoá nền": "khoa", "khóa nền": "khoa", "": "mat" };
const PAN_KEY = { contour: "pan.o.contour", highlight: "pan.o.highlight", transition: "pan.o.transition", crease: "pan.o.crease", deepen: "pan.o.deepen", peach: "pan.peach", dark: "pan.dark", light: "pan.light" };
const PAN_ROLE = { deepen: "depth", peach: "peach", dark: "dark", light: "light" };
// Profile overrides for names the data cannot derive, keyed "brand|product": { name, short, alias }.
// name and short are a string or a [vi, en] pair; alias is how look steps call the product.
const OWN_NAMES = P.inventory.names;
function buildInv(rows) {
  const groups = [];
  rows.forEach(r => { const g = groups.find(x => x.brand === r.brand && x.product === r.product); if (g) g.rows.push(r); else groups.push({ brand: r.brand, product: r.product, rows: [r] }); });
  return groups.map((g, i) => {
    const r0 = g.rows[0], rawCat = r0.cat == null ? "" : r0.cat, cat = rawCat in OWN_CAT ? OWN_CAT[rawCat] : rawCat, brand = g.brand.replace(/ \(.*\)$/, "");
    const shades = [...new Set(g.rows.map(r => r.shade).filter(Boolean))], shared = shades.length === 1 ? shades[0] : "";
    const mk = r => ({ hex: r.hex || null, est: r.confidence === "low" && !!r.hex, fin: finKey(r.finish) });
    const it = { id: "o" + i, cat, tone: r0.tone || "", cheek: !!r0.cheek_ok, unv: /unverified/.test(g.brand), name: [brand, g.product, shared].filter(Boolean).join(" "), short: brand + " " + (shared || g.product.split(" ").slice(0, 2).join(" ")) };
    if (g.rows.length > 1) it.pans = g.rows.map((r, k) => Object.assign(mk(r), r.pan ? { n: parseInt(r.pan, 10) || k + 1, k: PAN_KEY[r.role] || "pan.n", role: PAN_ROLE[r.role] || "" } : { label: r.shade }, r.cat !== r0.cat ? { cat: OWN_CAT[r.cat] || r.cat } : {}));
    else Object.assign(it, mk(r0), r0.role ? { role: r0.role } : {});
    if (cat === "son" && (r0.cheek_ok || /gloss|tint/i.test(r0.finish))) it.role = "tint";
    // The cool-grey liner is set aside outside cool-tone layouts; the note explains why.
    if (it.tone === "cool") it.coolNote = [shared + " xám lạnh – chỉ hợp layout tông lạnh", shared + " is a cool grey – only suits cool-tone layouts"];
    if (cat === "khoa" || cat === "phu") it.noColor = true;
    else if (/clear/i.test(r0.finish)) { it.noColor = true; it.clear = true; }
    const o = OWN_NAMES[g.brand + "|" + g.product] || {};
    if (o.name) it.nameP = o.name;
    if (o.short !== undefined) it.shortP = o.short;
    it.brand = brand; it.prod = g.product;
    if (o.alias) it.alias = o.alias;
    return it;
  });
}
const INV0 = buildInv(OWNED_SRC);
// Skincare products listed on the profile, not compared with colours: { id, name, note: [vi, en] }.
const CARE0 = P.inventory.care;
const SHOPST = { tab: "need", starred: null, editStars: false, bought: [], colors: {}, split: [], manual: [], custom: [], form: null };
const NOHEX = { "Phủ phấn": "phu" };
// Palette family of the layout: cool-pink (쿨톤 핑크), cold-girl, y2k.
const COOL_LAYOUT = /cool-pink|cold-girl|y2k/;
// Only categories the kit has a product for are compared; the rest are reported as "not counted", never as missing.
const REC = new Set(INV0.flatMap(it => (it.pans || [it]).map(p => p.cat || it.cat)));
const inScope = st => REC.has(st.cat);
// Where the gap analysis gets its steps. A profile's adapted looks that carry step data (look.gap) win; otherwise
// the best-fitting catalogue layouts are used, one step per palette colour the judge knows a category for.
const stepsFromLook = l => l.steps.flatMap(s => s.items.filter(i => (i.hex && i.cat) || NOHEX[i.label]).map(i => Object.assign({ area: s.area, ref: i, cool: COOL_LAYOUT.test(l.id) }, i, i.hex ? {} : { cat: NOHEX[i.label], hex: null })).map(x => x.cat === "may" && /Kẻ mắt/.test(x.label) ? Object.assign(x, { cat: "liner" }) : x));
// Catalogue palette role -> step { cat, label, area } in the words role() and the screens expect.
const ROLE_STEP = {
  lip: ["son", "Màu môi", "Môi"], lips: ["son", "Màu môi", "Môi"], blush: ["ma", "Má hồng", "Má"], cheek: ["ma", "Má hồng", "Má"], cheeks: ["ma", "Má hồng", "Má"],
  "eye-main": ["mat", "Màu chính", "Mắt"], eyes: ["mat", "Màu chính", "Mắt"], eye: ["mat", "Màu chính", "Mắt"], lid: ["mat", "Màu chính", "Mắt"],
  "eye-depth": ["mat", "Màu đậm", "Mắt"], shimmer: ["mat", "Nhũ", "Mắt"], liner: ["liner", "Kẻ mắt", "Mắt"],
  highlight: ["hl", "Highlight", "Highlight"], bronzer: ["khoi", "Tạo khối", "Tạo khối"]
};
function stepsFromEntry(e) {
  const src = OM_CATALOG.find(x => x.id === e.id), out = [];
  src.originalPalette.forEach(p => {
    const r = ROLE_STEP[p.role], hex = normHex(p.hex);
    if (!r || !hex) return;
    const swatch = p.label_vi || p.label;
    if (p.label_vi && p.label && !DATA_EN.swatch[swatch]) DATA_EN.swatch[swatch] = p.label;
    out.push({ area: r[2], label: r[1], swatch, hex, cat: r[0], how: "", ref: p, cool: COOL_LAYOUT.test(e.id) });
  });
  return out;
}
const FIT_RANK = { "Hợp sẵn": 0, "Đổi màu là hợp": 1, "Khó hợp": 2 };
function gapSource() {
  const own = LOOKS.filter(l => l.gap);
  if (own.length) return own.map(l => ({ id: l.id, name: l.name, fit: l.fit.label, steps: stepsFromLook(l) }));
  return CATALOG.filter(e => e.kind === "layout" && e.fit in FIT_RANK)
    .map(e => ({ id: e.id, name: e.name, fit: e.fit, steps: stepsFromEntry(e), pop: e.pop === "high" ? 0 : 1 }))
    .filter(l => l.steps.length >= 3)
    .sort((x, y) => FIT_RANK[x.fit] - FIT_RANK[y.fit] || x.pop - y.pop || x.id.localeCompare(y.id))
    .slice(0, 12);
}
const GAP_ALL = gapSource();
const GAP_LOOKS = GAP_ALL.map(l => Object.assign({}, l, { steps: l.steps.filter(inScope), skip: [...new Set(l.steps.filter(x => !inScope(x)).map(x => x.cat))] }));
const skippedCats = () => [...new Set(GAP_LOOKS.flatMap(l => l.skip))].map(c => catName(c).toLowerCase()).join(", ");
const GL = Object.fromEntries(GAP_LOOKS.map(l => [l.id, l]));
// Default layouts to dress for: the ones that already suit, or the best few when none do.
SHOPST.starred = new Set(GAP_LOOKS.filter(l => l.fit === "Hợp sẵn").map(l => l.id));
if (!LOOKS.some(l => l.gap) && SHOPST.starred.size < 3) GAP_LOOKS.slice(0, 5).forEach(l => SHOPST.starred.add(l.id));
function inventory() {
  const base = INV0.map(it => {
    const c = SHOPST.colors[it.id];
    if (!c) return it;
    return Object.assign({}, it, it.pans ? { pans: it.pans.map((p, i) => Object.assign({}, p, { hex: c[i] || p.hex, est: c[i] ? false : p.est })) } : { hex: c[0] });
  });
  return base.concat(SHOPST.custom, SHOPST.split, SHOPST.bought);
}
let GAPS = null, PLAN = null;
let SRCS = [];
// Closest owned colour for one required colour, in words.
function panNear(x) {
  const r = matchStep({ cat: x.cat, hex: x.hex, label: x.steps[0], how: "" }, SRCS.filter(s => s.cat === x.cat));
  return r.nearest ? `<small class="pn">${pair(x.hex, r.nearest.src.hex)}${esc(t("near.has", { reason: diffWords(r.nearest.src.hex, x.hex, srcName(r.nearest.src), dx("swatch", x.swatch), x.cat) }))}</small>` : "";
}
function recompute() {
  const srcs = SRCS = sources(inventory());
  GAPS = Object.fromEntries(GAP_LOOKS.map(l => [l.id, lookGap(l, srcs)]));
  PLAN = plan(GAP_LOOKS.filter(l => SHOPST.starred.has(l.id)).map(l => GAPS[l.id]));
  PLAN.forEach(p => { p.nearest = nearestOwned(p, srcs); });
}
// Unknown-colour items that might already cover a need: flagged, never counted as covering it.
const maybeItems = gaps => [...new Set(gaps.flatMap(x => x.r.s === "unk" ? x.r.unk.map(u => u.item) : []))];
function maybeLine(gaps) {
  const its = maybeItems(gaps);
  return its.length ? `<small class="maybe">${t("maybe.have", { names: esc(its.map(itemShort).join(", ")) })} <button type="button" class="link" data-open-inv="${its[0].id}">${t("act.addColor")}</button></small>` : "";
}
function nearestOwned(p, srcs) {
  if (p.pans) return null;
  const hex = p.hex;
  const r = matchStep({ cat: p.cat, hex, label: p.pans ? "Màu chính" : "", how: "" }, srcs);
  p.coolSkip = r.coolSkip || null;
  return r.nearest;
}
const shopCount = () => PLAN.length + SHOPST.manual.length;

function formColors() { return [...document.querySelectorAll("#sh-shop [data-fcolor]")].map(i => i.value); }
function scrollForm() { const f = $("#sh-shop .buy-form"); if (f) f.scrollIntoView({ block: "center" }); }
const readyIds = () => GAP_LOOKS.filter(l => SHOPST.starred.has(l.id) && GAPS[l.id].state === "ready").map(l => l.id);
function buy(p, cols) {
  const it = { id: "buy" + SHOPST.bought.length, buy: p, cat: p.cat, role: p.role };
  if (p.pans) it.pans = p.pans.map((x, i) => ({ swatch: x.swatch, role: x.role, hex: cols[i] || x.hex }));
  else it.hex = cols[0] || p.hex;
  SHOPST.bought.push(it); SHOPST.form = null;
  saveShop(); recompute(); render(true);
}
function setColor(id, cols) {
  const it = INV0.find(x => x.id === id);
  // A "many tints" entry stays unknown; each recorded tint becomes its own item.
  if (it && it.multi) SHOPST.split.push({ id: "tint" + SHOPST.split.length, nameK: "inv.tintRec", shortK: "inv.tintRecS", cat: "son", role: "tint", hex: cols[0] });
  else SHOPST.colors[id] = cols;
  SHOPST.form = null; saveShop(); recompute(); render(true);
}

/* ---------- shopping state survives a reload ---------- */
// Only what the person decided is saved: chosen layouts, bought items, recorded colours, hand-added items, items they added to the kit.
function saveShop() {
  store.set("shop", { starred: [...SHOPST.starred], bought: SHOPST.bought, colors: SHOPST.colors, split: SHOPST.split, manual: SHOPST.manual, custom: SHOPST.custom });
}
function loadShop() {
  const s = store.get("shop", null);
  if (!s) return;
  if (Array.isArray(s.starred)) SHOPST.starred = new Set(s.starred.filter(id => GL[id]));
  ["bought", "split", "manual", "custom"].forEach(k => { if (Array.isArray(s[k])) SHOPST[k] = s[k]; });
  if (s.colors && typeof s.colors === "object") SHOPST.colors = s.colors;
}
