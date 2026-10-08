/* ---------- gap engine: what you own vs what a layout asks for ---------- */
const MATCH = 4, USABLE = 8;
// The step's job decides which stand-ins are allowed (a blush can be an eye main colour, not an eye base).
function role(st) {
  const l = st.label;
  if (st.cat === "mat") return /Màu nền mắt/.test(l) ? "base" : /Màu đậm|Khói|Bọng mắt: đổ bóng/.test(l) ? "depth" : /Kẻ/.test(l) ? "liner" : /Nhũ/.test(l) ? "shimmer" : "main";
  if (st.cat === "hl") return /Lì|matte/i.test(st.how || "") ? "matte" : "glow";
  if (st.cat === "ma") return /Kem|tint/i.test(st.how || "") ? "cream" : "powder";
  if (st.cat === "liner") return "liner";
  return "";
}
// [step cat, step role, owned cat, owned role, rule key]; a stand-in is never better than "Dùng tạm".
const CROSS = [
  ["nen", "*", "che", "*", "x.cheNen"], ["che", "*", "nen", "*", "x.nenChe"],
  ["mat", "main", "ma", "*", "x.blushEye"], ["mat", "depth", "khoi", "*", "x.contourEye"],
  ["khoi", "*", "mat", "depth", "x.eyeContour"], ["khoi", "*", "mat", "main", "x.eyeContour"],
  ["mat", "base", "hl", "matte", "x.hlBase"], ["hl", "matte", "mat", "base", "x.baseHl"],
  ["hl", "matte", "che", "light", "x.cheHl"], ["ma", "cream", "son", "tint", "x.tintBlush"],
  ["son", "*", "ma", "cream", "x.blushTint"], ["son", "*", "chi", "*", "x.linerLip"],
  ["mat", "liner", "may", "*", "x.browLiner"], ["liner", "*", "mat", "depth", "x.eyeLiner"]
];
// An eyeliner product answers eyeliner steps directly; every other category matches by category alone.
const isDirect = (st, s) => s.cat === st.cat || (s.cat === "liner" && role(st) === "liner");
function crossRule(st, src) {
  const r = role(st), c = CROSS.find(c => c[0] === st.cat && (c[1] === "*" || c[1] === r) && c[2] === src.cat && (c[3] === "*" || c[3] === src.role));
  return c ? c[4] : null;
}
function sources(inv) {
  const out = [];
  inv.forEach(it => (it.pans || [it]).forEach((p, i) => out.push({ item: it, pan: it.pans ? i : -1, cat: p.cat || it.cat, role: p.role || it.role || "", hex: p.hex || null, est: !!p.est, nc: !!it.noColor, tone: it.tone || "", it: it })));
  return out;
}
// One step vs the inventory → { s: ok|near|miss|unk, src, d, rule, nearest, unk }
function matchStep(st, all) {
  // A cool-grey item is set aside outside cool-tone layouts; the reason travels with the result.
  const eligible = all.filter(s => s.tone === "cool" && (isDirect(st, s) || crossRule(st, s)));
  const r = matchCore(st, st.cool ? all : all.filter(s => s.tone !== "cool"));
  if (!st.cool && eligible.length) r.coolSkip = eligible[0].it;
  return r;
}
function matchCore(st, srcs) {
  // A step with no colour (setting powder) only needs the product type.
  if (!st.hex) { const have = srcs.find(x => x.cat === st.cat); return have ? { s: "ok", src: have, d: 0, plain: true } : { s: "miss", nearest: null }; }
  const direct = srcs.filter(s => isDirect(st, s)), cross = srcs.filter(s => s.cat !== st.cat && crossRule(st, s));
  let best = null;
  direct.filter(s => s.hex).forEach(s => { const d = dE(st.hex, s.hex); if (!best || d < best.d) best = { src: s, d, rule: null }; });
  if (best && best.d <= MATCH) return Object.assign({ s: "ok" }, best);
  let use = best && best.d <= USABLE ? best : null;
  cross.filter(s => s.hex).forEach(s => { const d = dE(st.hex, s.hex); if (d <= USABLE && (!use || d < use.d)) use = { src: s, d, rule: crossRule(st, s) }; });
  if (use) return Object.assign({ s: "near" }, use);
  let nearest = null;
  direct.concat(cross).filter(s => s.hex).forEach(s => { const d = dE(st.hex, s.hex); if (!nearest || d < nearest.d) nearest = { src: s, d }; });
  const unk = direct.filter(s => !s.hex && !s.nc);
  return unk.length ? { s: "unk", unk, nearest } : { s: "miss", nearest };
}
// Two steps in one colour (Socola for depth and for liner) are one thing to buy.
function distinct(list) {
  const out = [];
  list.forEach(x => { if (!out.some(y => y.st.cat === x.st.cat && (!x.st.hex || !y.st.hex ? x.st.hex === y.st.hex : dE(y.st.hex, x.st.hex) <= MATCH))) out.push(x); });
  return out;
}
function lookGap(lk, srcs) {
  const rows = lk.steps.map(st => ({ st, r: matchStep(st, srcs) }));
  const miss = distinct(rows.filter(x => x.r.s === "miss")), unk = rows.filter(x => x.r.s === "unk");
  const unkItems = [...new Set(unk.flatMap(x => x.r.unk.map(u => u.item)))];
  // An unknown-colour item never covers a need: the need stays in the list and is flagged instead.
  const need = distinct(rows.filter(x => x.r.s === "miss" || x.r.s === "unk"));
  return { lk, rows, miss, need, unk, unkItems, est: rows.some(x => x.r.src && x.r.src.est), state: miss.length ? "miss" : unkItems.length ? "unk" : "ready" };
}
// Categories where one product holds several colours: the suggestion is a list of required colours, not a fixed palette.
const GROUPS = { eye: ["mat"], face: ["khoi", "hl"], blush: ["ma"] };
const groupOf = cat => Object.keys(GROUPS).find(g => GROUPS[g].includes(cat)) || null;
// Cluster open gaps into required colours: the colour wanted by most layouts first; it absorbs same-category gaps it can stand in for.
function clusterGaps(list) {
  let rest = list.slice();
  const out = [];
  while (rest.length) {
    let best = null;
    rest.forEach(x => {
      const hit = rest.filter(y => y.st.cat === x.st.cat && (!x.st.hex || !y.st.hex ? x.st.hex === y.st.hex : dE(x.st.hex, y.st.hex) <= USABLE));
      const looks = [...new Set(hit.map(y => y.id))];
      if (!best || looks.length > best.looks.length || (looks.length === best.looks.length && hit.length > best.hit.length)) best = { x, hit, looks };
    });
    const st = best.x.st;
    out.push({ cat: st.cat, role: role(st), hex: st.hex, swatch: st.swatch, steps: [...new Set(best.hit.map(y => y.st.label))], looks: best.looks, gaps: best.hit });
    rest = rest.filter(y => !best.hit.includes(y));
  }
  return out;
}
function candidates(open) {
  const all = [];
  open.forEach((list, id) => list.forEach(x => all.push(Object.assign({ id }, x))));
  const cands = [];
  Object.keys(GROUPS).forEach(g => {
    const pans = clusterGaps(all.filter(x => GROUPS[g].includes(x.st.cat)));
    if (pans.length >= 2) cands.push({ group: g, cat: GROUPS[g][0], pans });
    else if (pans.length) cands.push(Object.assign({ multi: pans[0].role === "cream" ? "cream" : "" }, pans[0]));
  });
  clusterGaps(all.filter(x => !groupOf(x.st.cat))).forEach(c => cands.push(Object.assign({ multi: "" }, c)));
  return cands;
}
// A required colour covers exactly the gaps it was clustered from; cross-use still counts for other categories.
function covers(c, x) {
  if ((c.pans || [c]).some(p => p.gaps.some(y => y.st === x.st))) return true;
  const r = matchStep(x.st, c._src || (c._src = sources([{ cat: c.cat, role: c.role, hex: c.hex, pans: c.pans }])));
  return r.s === "ok" || r.s === "near";
}
// Greedy set cover over the starred layouts, candidates rebuilt from what is still open each round.
// Score: layouts completed, layouts touched, gaps filled, multi-use bonus.
function plan(gaps) {
  const open = new Map(gaps.map(g => [g.lk.id, g.need.slice()]));
  const picks = [];
  for (;;) {
    let best = null;
    candidates(open).forEach(c => {
      let fills = 0;
      const touched = [], done = [];
      open.forEach((list, id) => {
        const hit = list.filter(x => covers(c, x));
        if (!hit.length) return;
        fills += hit.length; touched.push(id);
        if (hit.length === list.length) done.push(id);
      });
      if (!fills) return;
      const score = [done.length, touched.length, fills, c.multi === "cream" ? 1 : 0];
      if (!best || cmp(score, best.score) > 0) best = { c, score, touched, done };
    });
    if (!best) break;
    open.forEach((list, id) => open.set(id, list.filter(x => !covers(best.c, x))));
    picks.push(Object.assign(best.c, { touched: best.touched, done: best.done, readyAfter: [...open].filter(e => !e[1].length).map(e => e[0]) }));
  }
  return picks;
}
function cmp(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }

