/* ---------- look helpers: only used when the profile supplies adapted looks ---------- */
function slotOf(label) {
  const L = label.replace(/^Nguyên bản:\s*/, "");
  if (/^Viền mắt/i.test(L)) return "rim";
  if (/^Kẻ/i.test(L)) return "liner";
  if (/^(Khói|Mắt)/i.test(L)) return "lid";
  if (/^Nhũ/i.test(L)) return "shimmer";
  if (/^Highlight/i.test(L)) return "hl";
  if (/^Bronzer/i.test(L)) return "contour";
  if (/^Má/i.test(L)) return "blush";
  if (/^Viền môi/i.test(L)) return "lipOuter";
  if (/^Môi/i.test(L)) return "lip";
  if (/^Nền/i.test(L)) return "base";
  if (/^Tàn nhang/i.test(L)) return "freckles";
  return null;
}
const SLOT_CAT = { rim: "mat", liner: "mat", lid: "mat", shimmer: "hl", hl: "hl", contour: "khoi", blush: "ma", lipOuter: "son", lip: "son", base: "nen" };
function stepHex(look, re) {
  for (const s of look.steps) for (const it of s.items) if (it.hex && re.test(it.label)) return it.hex;
  return null;
}
// Bare face: empty diagram, so the drawing shows the profile's natural brow, eyes and lips.
function bareFace() { return {}; }
function adapted(look) {
  const a = JSON.parse(JSON.stringify(look.diagram));
  const outer = stepHex(look, /^Viền môi/i);
  if (outer) a.lips.outer = outer;
  const fr = stepHex(look, /Tàn nhang/i);
  if (fr) a.freckles = fr;
  return a;
}
function original(look) {
  const o = JSON.parse(JSON.stringify(look.diagram)), seen = {};
  look.originalPalette.forEach(p => {
    const s = slotOf(p.label), h = p.hex;
    if (!s || seen[s]) return; seen[s] = 1;
    if (s === "rim") { o.lid.depth = h; if (!o.lid.lowerLash || o.lid.lowerLash === "none") o.lid.lowerLash = "full"; }
    if (s === "liner") o.liner = Object.assign({}, o.liner, { hex: h });
    if (s === "lid") o.lid.main = h;
    if (s === "shimmer") { o.lid.shimmer = h; if (!seen.hl) o.highlight.hex = h; }
    if (s === "hl") o.highlight.hex = h;
    if (s === "contour") { o.contour.hex = h; if (!o.contour.areas || !o.contour.areas.length) o.contour.areas = ["cheek-hollow", "jaw"]; }
    if (s === "blush") { o.blush.hex = h; o.blush.intensity = Math.max(o.blush.intensity || 0, .42); }
    if (s === "lipOuter") o.lips.outer = h;
    if (s === "lip") o.lips.color = h;
    if (s === "base") o.skin = h;
    if (s === "freckles") o.freckles = h;
  });
  return o;
}
function swatchName(look, hex) {
  if (!hex) return "";
  for (const s of look.steps) for (const it of s.items) if (it.hex && it.hex.toLowerCase() === hex.toLowerCase()) return it.swatch;
  for (const c of CATS) for (const g of c.good) if (g[1] === hex.toLowerCase()) return tx(g[0]);
  return hex === SKIN() ? (P.shade || t("ck.skin")) : "";
}
function swaps(look) {
  const a = adapted(look), out = [];
  const pick = { rim: a.lid.depth, liner: a.liner && a.liner.hex, lid: a.lid.main, shimmer: a.lid.shimmer || a.highlight.hex, hl: a.highlight.hex,
    contour: a.contour.hex, blush: a.blush.hex, lipOuter: a.lips.outer, lip: a.lips.color, base: a.skin, freckles: a.freckles };
  look.originalPalette.forEach(p => {
    const s = slotOf(p.label); if (!s) return;
    const to = pick[s] || null, cat = SLOT_CAT[s];
    if (to && to.toLowerCase() === p.hex.toLowerCase()) return;
    let why = "";
    if (cat) {
      const av = CAT[cat].avoid.map(x => [dist(x[1], p.hex.toLowerCase()), x[2]]).sort((m, n) => m[0] - n[0])[0];
      const r = judge(p.hex.toLowerCase(), cat, SKIN());
      why = av && av[0] < 40 ? tx(av[1]) : r.v > 0 ? t(r.notes[0]) : t("j.swapDefault");
    }
    out.push({ from: p.hex.toLowerCase(), fromName: p.label.replace(/^Nguyên bản:\s*/, ""), to, toName: to ? swatchName(look, to) : "Bỏ bước này", why });
  });
  return out;
}
// Shape notes for one look, from the profile's own text (face.notes) after the look's adaptation lines.
function faceNotes(look) {
  const dg = look.diagram, N = P.face.notes || {}, out = look.adaptation.filter(s => !/^(Giữ|Đổi)/.test(s));
  const add = k => { if (N[k]) out.push(tx(N[k])); };
  add(dg.liner && dg.liner.style === "puppy" ? "linerPuppy" : "linerDefault");
  add("lid");
  if (dg.lid && dg.lid.aegyo) add("aegyo");
  else if (!out.some(s => /Má/.test(s))) add("blush");
  return out.slice(0, 4);
}
function titleParts(name) {
  const m = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  let main = m ? m[1] : name, sub = m ? m[2] : "";
  main = main.replace(/^Makeup\s+/i, "");
  return [main.charAt(0).toUpperCase() + main.slice(1), sub];
}
// A look step names a product; it counts as owned only when the profile inventory holds that product.
const normP = s => s.toLowerCase().replace(/\s+/g, " ");
function ownedItem(p) {
  const q = normP(p);
  return INV0.find(it => it.prod && q.includes(normP(it.brand)) && (q.includes(normP(it.prod)) || (it.alias && q.includes(it.alias)))) || null;
}
const isGlossTint = p => /tint bóng/i.test(p) && INV0.some(it => it.cat === "son" && it.role === "tint");
function ownedShort(look) {
  const set = new Set();
  look.steps.forEach(s => s.items.forEach(it => {
    if (!it.product) return;
    const o = ownedItem(it.product);
    if (o) set.add(itemShort(o)); else if (isGlossTint(it.product)) set.add(t("own.tint"));
  }));
  return [...set];
}
const occText = s => s.split("").map(c => OCC[c]).filter(Boolean).join(", ").toLowerCase();
const strip = hexes => `<span class="strip" aria-hidden="true">${hexes.filter(Boolean).map(h => `<i style="background:${h}"></i>`).join("")}</span>`;
const adaptedStrip = a => strip([a.lid.base, a.lid.main, a.lid.depth, a.blush.hex, a.lips.outer, a.lips.color, a.highlight.hex]);

