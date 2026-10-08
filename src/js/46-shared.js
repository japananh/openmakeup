/* ---------- shared bits ---------- */
const lkName = id => { const l = GL[id]; if (LANG === "en" && NAME_EN[id]) return NAME_EN[id]; const m = titleParts(l.name)[0].replace(/\s+makeup$/i, ""); return m.split(" / ")[0]; };
const names = (ids, max) => { const n = ids.map(lkName); return n.length > (max || 4) ? n.slice(0, max || 4).join(", ") + " " + t("more", { n: n.length - (max || 4) }) : n.join(", "); };
const ST_LABEL = { ok: "st.ok", near: "st.near", miss: "st.miss", unk: "st.unk" };
const stChip = s => `<span class="stc ${s}">${t(ST_LABEL[s])}</span>`;
function readyBadge(g) {
  if (g.state === "ready") return `<span class="ready r-ok">${t("ready.ok")}</span>`;
  if (g.state === "unk") return `<span class="ready r-unk">${t("ready.unk")}</span>`;
  return `<span class="ready r-miss">${t("ready.miss", { n: g.miss.length })}</span>`;
}
function readyLine(g) {
  if (g.state === "ready") return t(g.est ? "sum.readyEst" : "sum.ready");
  if (g.state === "unk") return tn("sum.unk", g.unkItems.length, { m: g.unkItems.length });
  return tn("sum.miss", g.miss.length, { n: g.miss.length }) + (g.unkItems.length ? " · " + tn("sum.alsoUnk", g.unkItems.length, { m: g.unkItems.length }) : "");
}
const itemName = it => it.buy ? pickName(it.buy) : it.multi && SHOPST.split.length ? t("inv.tintsOther") : it.nameK ? t(it.nameK) : it.nameP ? tx(it.nameP) : it.name;
const itemShort = it => it.buy ? pickName(it.buy) : it.shortK ? t(it.shortK) : it.shortP !== undefined ? tx(it.shortP) : it.short;
const panName = p => p.k ? t(p.k, { n: p.n }) : p.label || dx("swatch", p.swatch);
const srcName = s => s.item.pans ? `${itemShort(s.item)} · ${panName(s.item.pans[s.pan])}` : itemShort(s.item);
const catName = c => t("cat." + c);
const pickName = p => p.pans ? t("grp." + p.group) : `${catName(p.cat)} · ${dx("swatch", p.swatch)}`;
const ROLE_WORD = { base: "r.base", main: "r.main", depth: "r.depth", liner: "r.liner", shimmer: "r.shimmer", matte: "r.matte", glow: "r.glow", cream: "r.cream", powder: "r.powder" };
// Plain name of a required colour: "be hồng trung tính – màu nền mắt".
function panWords(p) {
  const roles = [...new Set(p.steps.map(l => /Nhũ|Bọng mắt: sáng/.test(l) ? "shimmer" : role({ cat: p.cat, label: l, how: "" })).concat([p.role]))]
    .map(r => r === "" ? (p.cat === "khoi" ? "r.contour" : null) : ROLE_WORD[r]).filter(Boolean);
  const n = dx("swatch", p.swatch);
  return n.charAt(0).toLowerCase() + n.slice(1) + " – " + [...new Set(roles.map(r => t(r)))].join(", ");
}
const pickHexes = p => p.pans ? p.pans.map(x => x.hex) : [p.hex];

/* ---------- similarity in words: the UI never shows ΔE ---------- */
function diffWords(own, need, ownName, needName, cat) {
  const d = diffs(own, need).slice(0, 2);
  if (!d.length) return t("why.close", { own: ownName });
  const nn = needName.charAt(0).toLowerCase() + needName.slice(1), ck = STR["c." + cat + "." + d[0][0]] ? "c." + cat + "." + d[0][0] : "c." + d[0][0];
  return t("why.diff", { own: ownName, d: d.map(x => t("d." + x[0])).join(t("d.and")), need: nn, cons: t(ck, { need: nn }) });
}
function nearWords(own, need, cat) { const d = diffs(own, need)[0]; return d ? t(STR["n." + cat + "." + d[0]] ? "n." + cat + "." + d[0] : "why.near", { d: t("d." + d[0]) }) : ""; }
const pair = (need, own) => `<span class="pair2" title="${esc(t("pair.tip"))}"><i${need ? ` style="background:${need}"` : ' class="none"'}></i><i class="${own ? "" : "none"}"${own ? ` style="background:${own}"` : ""}></i></span>`;

