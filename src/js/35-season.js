/* ---------- location and season: tips follow the climate the profile names, not a hard-coded city ---------- */
let MONTH = new Date().getMonth() + 1; // a #month-N flag in the URL overrides it for testing
const LOCS = {
  hanoi: { k: "loc.hanoi", climate: "north" },
  hcm: { k: "loc.hcm", climate: "south" },
  danang: { k: "loc.danang", climate: "central" },
  dalat: { k: "loc.dalat", climate: "highland" },
  other: { k: "loc.other", climate: null }
};
// Month (1–12) → season id for each climate model.
const CLIMATE = {
  north: m => m === 12 || m <= 2 ? "n.winter" : m <= 4 ? "n.spring" : m <= 8 ? "n.summer" : "n.autumn",
  south: m => m >= 5 && m <= 11 ? "s.rainy" : "s.dry",
  central: m => m >= 9 ? "c.rainy" : m <= 4 ? "c.spring" : "c.summer",
  highland: m => m === 12 || m <= 3 ? "h.dry" : "h.rainy",
  humid: () => "o.humid",
  cold: m => m >= 11 || m <= 3 ? "o.cold" : "o.mild",
  mild: () => "o.mild"
};
// Season → weather kind, which picks the tips: humid, hot, dry, mixed (dry mornings, hot noon), cool.
const SEASON_KIND = { "n.winter": "dry", "n.spring": "humid", "n.summer": "humid", "n.autumn": "mixed", "s.rainy": "humid", "s.dry": "hot", "c.rainy": "humid", "c.spring": "mixed", "c.summer": "hot", "h.dry": "dry", "h.rainy": "cool", "o.humid": "humid", "o.cold": "dry", "o.mild": "mixed" };
// Older builds kept the location under bp.location.
function readLoc() {
  const ok = v => v && LOCS[v.id] ? { id: v.id, climate: CLIMATE[v.climate] ? v.climate : "humid" } : null;
  const own = EDITS.location || IMPORTED && IMPORTED.location;
  if (ok(own)) return ok(own);
  try { const old = ok(JSON.parse(localStorage.getItem("bp.location") || "null")); if (old) return old; } catch (e) { /* storage blocked */ }
  return ok(P.location) || { id: "other", climate: "mild" };
}
function saveLoc(v) { editProfile({ location: v }); }
let LOC = readLoc();
function season() {
  const model = LOCS[LOC.id].climate || LOC.climate, id = CLIMATE[model](MONTH), kind = SEASON_KIND[id];
  const place = LOC.id === "other" ? t("clim." + LOC.climate) : t(LOCS[LOC.id].k);
  return { id, kind, place, name: t("sea." + id) };
}
