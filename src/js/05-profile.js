/* Profile: the person the app is drawn for. Built from the baked-in profile (OM_PROFILE), an imported one and the edits
   made in the app. Nothing about a person lives in the code; see docs/profile.md for the schema. */
const KEY = "openmakeup.v1.";
const store = {
  get(k, fb) { try { const v = localStorage.getItem(KEY + k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(KEY + k); } catch (e) { /* nothing to remove */ } }
};
const isObj = v => v && typeof v === "object" && !Array.isArray(v);
// Objects merge key by key; arrays and scalars in `over` replace the base value.
function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = Object.assign({}, base);
  Object.keys(over).forEach(k => { out[k] = k in base ? deepMerge(base[k], over[k]) : over[k]; });
  return out;
}
const clone = v => JSON.parse(JSON.stringify(v));

const COLOR_KEYS = ["skin", "found", "lip", "brow", "hair", "iris"];
// Neutral stand-ins for a profile that leaves a colour out.
const COLOR_FALLBACK = { skin: "#dfb593", lip: "#c98f84", brow: "#4a3c34", hair: "#2a2220", iris: "#4a3a30" };

function normaliseProfile(raw) {
  const p = deepMerge({
    schema: 1, name: "", season: "deep-autumn", shade: "", colors: {}, undertone: { shift: 0 },
    location: { id: "other", climate: "mild" }, identity: {}, face: {}, inventory: {}, routine: {},
    looks: [], catalogFit: {}, picks: [], checker: {}, i18n: {}, dataEn: {}, nameEn: {}
  }, raw || {});
  p.inventory = deepMerge({ rows: [], names: {}, care: [] }, p.inventory);
  p.routine = deepMerge({ am: [], noon: [], pm: [], meds: [] }, p.routine);
  p.checker = deepMerge({ samples: { son: [], may: [] }, liner: null }, p.checker);
  p.face = deepMerge({ analysis: null, rules: {}, hints: {}, weight: null, notes: {}, geometry: {} }, p.face);
  COLOR_KEYS.forEach(k => {
    const c = isObj(p.colors[k]) ? p.colors[k] : {};
    const hex = normHex(c.hex) || COLOR_FALLBACK[k] || null;
    if (!hex) { delete p.colors[k]; return; }
    p.colors[k] = Object.assign({}, c, { hex, nm: isObj(c.nm) ? c.nm : {} });
    ["rim", "head", "dark"].forEach(part => { if (part in p.colors[k]) p.colors[k][part] = normHex(p.colors[k][part]) || undefined; });
  });
  p.undertone.shift = Number(p.undertone.shift) || 0;
  return p;
}

const IMPORTED = store.get("profile.import", null);
const EDITS = store.get("profile.edits", {});
const P = normaliseProfile(deepMerge(IMPORTED || OM_PROFILE, EDITS));
const PC = P.colors;
const SKIN = () => PC.skin.hex;
const UNDERTONE_SHIFT = () => P.undertone.shift;
// Persists a partial change on top of whichever base profile is active.
function editProfile(patch) { Object.assign(EDITS, deepMerge(EDITS, patch)); store.set("profile.edits", EDITS); }

/* ---------- season palette, resolved for this skin ---------- */
const tx = v => Array.isArray(v) ? (LANG === "en" && v[1] ? v[1] : v[0]) : v == null ? "" : v;
const seasonName = () => tx(OM_PALETTE.name);

// Foundation and concealer shades are offsets from the skin; everything else is a fixed hex.
function instantiatePalette(pal, skin) {
  const hexOf = g => g.rel ? relHex(skin, g.rel) : g.hex;
  return pal.cats.map(c => Object.assign({}, c, {
    good: c.good.map(g => [g.n, hexOf(g), g.occ || "", g.role || "", g.tier || "Good"]),
    avoid: c.avoid.map(g => [g.n, hexOf(g), g.why])
  }));
}
const CATS = instantiatePalette(OM_PALETTE, SKIN());
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

/* ---------- catalogue: the runtime view of data/layouts-catalog.json ---------- */
const lowerHex = h => typeof h === "string" ? h.toLowerCase() : h;
const normUrl = u => u.replace(/^(https?:\/\/)www\./, "$1").replace(/\/$/, "");
// Palette role in the catalogue -> product category the judge knows.
const ROLE_CAT = { lip: "son", lips: "son", blush: "ma", cheek: "ma", cheeks: "ma", "eye-main": "mat", eyes: "mat", eye: "mat", lid: "mat", "eye-depth": "mat", shimmer: "mat", liner: "mat", highlight: "hl", bronzer: "khoi" };
const FIT_LABELS = ["Hợp sẵn", "Đổi màu là hợp", "Khó hợp", "Tham khảo"];

// How well the entry's own colours suit this skin: share of judged colours that pass, half credit for "okay".
function computeFit(e) {
  if (e.kind === "traditional") return { level: "Tham khảo", ok: 0, n: 0 };
  let score = 0, n = 0;
  e.originalPalette.forEach(p => {
    const cat = ROLE_CAT[p.role], hex = normHex(p.hex);
    if (!cat || !hex) return;
    const v = judge(hex, cat, SKIN()).v;
    score += v === 0 ? 1 : v === 1 ? .5 : 0; n++;
  });
  if (!n) return { level: "Tham khảo", ok: 0, n: 0 };
  const r = score / n;
  return { level: r >= .7 ? "Hợp sẵn" : r >= .4 ? "Đổi màu là hợp" : "Khó hợp", ok: Math.round(score), n };
}
function catView(e) {
  const v = e.evidence && e.evidence.verified_sources || [], vn = new Set(v.map(normUrl));
  const hint = P.catalogFit[e.id], auto = hint ? null : computeFit(e);
  const out = {
    id: e.id, name: e.name, aka: e.aka.slice(0, 4), regions: e.regions, kind: e.kind, status: e.status, pop: e.popularity_vn,
    fit: hint ? hint.level : auto.level,
    fitWhy: hint ? hint.reason : auto.n ? [`${auto.ok}/${auto.n} màu trong bảng hợp ${OM_PALETTE.name[0]}.`, `${auto.ok}/${auto.n} colours in the palette suit ${OM_PALETTE.name[1]}.`] : "",
    period: e.trend_period, family: e.palette_family, summary: e.summary,
    pal: e.originalPalette.slice(0, 6).map(p => [lowerHex(p.hex), p.label]),
    vnSrc: !!e.popularity_vn_verified, periodVi: e.trend_period_vi,
    det: {
      o: e.origin, f: e.features, p: e.originalPalette.map(p => [lowerHex(p.hex), p.label, p.role, p.label_vi]), k: e.key_techniques,
      v, s: (e.sources || []).filter(u => !vn.has(normUrl(u))), n: e.evidence && e.evidence.source_count
    }
  };
  if (e.aka.length > 4) out.det.a = e.aka.slice(4);
  if (e.origin_vi) out.det.ov = e.origin_vi;
  if (e.features_vi) out.det.fv = e.features_vi;
  if (e.key_techniques_vi) out.det.kv = e.key_techniques_vi;
  return out;
}
const LOOKS = P.looks;
const LOOK = Object.fromEntries(LOOKS.map(l => [l.id, l]));
const CATALOG = OM_CATALOG.map(catView);
// A look with its own adapted data shows its fit instead of the computed one.
CATALOG.forEach(c => { const l = LOOK[c.id]; if (l) c.fit = l.fit.label; });
const KIND_COUNT = CATALOG.reduce((a, c) => (a[c.kind] = (a[c.kind] || 0) + 1, a), {});
