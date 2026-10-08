/* ---------- Màu của bạn: profile colours, picker sheet, lip and brow checks ---------- */
// Names are the profile's own words until a colour is edited; then autoName() suggests one.
const PC_ROWS = COLOR_KEYS.filter(k => PC[k]);
const PC_PARTS = { lip: ["hex", "rim"], brow: ["hex", "head", "dark"] };
const PART_KEY = { hex: "pk.main", rim: "pk.lipRim", head: "pk.browHead", dark: "pk.browDark" };
const CODE_KEY = { hex: "pc.cMain", rim: "pc.cRim", head: "pc.cHead", dark: "pc.cDark" };
const PRESETS = {
  skin: ["#f7e3d3", "#f3d9c4", "#ecc9ab", "#e3b896", "#d9a77e", "#cc9669", "#b98259", "#9d6a44", "#7f5233"],
  found: CAT.nen.good.map(g => g[1]),
  // Curated names where auto-naming would repeat itself across close neutrals.
  lip: [["#e8b8aa", "nude hồng rất nhạt", "very pale pink nude"], ["#e2a99c", "hồng be nhạt", "pale pink beige"], ["#d99a8f", "hồng đất sáng", "light rosy earth"], ["#d38f87", "hồng đất nhạt", "pale rosy earth"], ["#c6827b", "hồng đất", "rosy earth"], ["#b97570", "hồng đất vừa", "mid rosy earth"], ["#ab6862", "hồng nâu", "rose brown"], ["#9c5c58", "hồng nâu đậm", "deep rose brown"], ["#8b4f4c", "nâu hồng", "brown rose"], ["#7a4442", "nâu hồng đậm", "deep brown rose"], ["#6a3938", "nâu hồng rất đậm", "very deep brown rose"]],
  rim: [["#c79496", "mauve nhạt", "pale mauve"], ["#bb878b", "mauve hồng", "pink mauve"], ["#ae7b82", "mauve tím", "purple mauve"], ["#9d6d76", "tím mận nhạt", "soft plum"], ["#8e636c", "tím mận", "plum"], ["#a7807b", "nâu hồng xám", "greyed rose brown"]],
  brow: [["#8a6a55", "nâu mềm", "soft brown"], ["#776655", "nâu tro", "ash brown"], ["#665e54", "taupe", "taupe"], ["#5e5249", "nâu xám", "grey brown"], ["#4b3c33", "nâu đậm", "dark brown"], ["#6b6b6b", "xám vừa", "mid grey"], ["#4e4846", "xám than hơi nâu", "brownish charcoal"], ["#464344", "đen xám hơi nâu", "black-grey, faintly brown"], ["#353334", "than chì", "graphite"], ["#2a2829", "đen mềm", "soft black"]],
  hair: [["#141414", "đen tuyền", "jet black"], ["#22211f", "đen", "black"], ["#2b2624", "đen mềm", "soft black"], ["#3b2c25", "nâu đen", "brown-black"], ["#4a3a33", "nâu đậm", "dark brown"], ["#5b4f48", "nâu tro", "ash brown"], ["#5a3d2e", "nâu hạt dẻ", "chestnut"], ["#7c5e4a", "nâu trà sữa", "milk-tea brown"]],
  iris: ["#6b5040", "#5a4436", "#50443f", "#3d3230", "#2e2624", "#231c1b"]
};
// The lip liner the profile owns (name, hex); without one the checker offers no "line first" toggle.
const LINER = P.checker.liner;
// Coverage per finish: share of the product colour over what is underneath.
const FIN = { tint: { a: .55 }, gloss: { a: .45, shine: 1 }, velvet: { a: .85 }, matte: { a: .95 }, liner: { a: .9 }, pencil: { a: .9 }, powder: { a: .5 }, eyeliner: { a: .9 } };
const FIN_BY = { son: ["tint", "gloss", "velvet", "matte", "liner"], may: ["pencil", "powder", "eyeliner"] };
// Quick tests the profile offers in the checker: { id, name, short, hex, fin }.
const CK_SAMPLES = P.checker.samples;
const STEP_L = 6; // one "bậc" = 6 CIE L* units
state.ckFin = { son: "tint", may: "pencil" };
state.ckName = null;
state.ckLined = false;
state.ckCool = false; // checker: is the layout cool-toned?
const PK = { key: null, part: "hex", tab: "pick", hex: null, orig: null, pt: null, img: null, note: "" };

const pcName = (key, part) => { const e = PC[key], p = part || "hex"; return L2(e.nm[p] || autoName(e[p])); };
const hexName = h => L2(autoName(h));

/* illustrations */
let FID = 0;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const browCy = t => 34 - 5 * t + 30 * Math.max(0, t - .74) ** 2;
const browTh = t => t < .15 ? 9 : 9 - 6.5 * (t - .15) / .85;
function browHairs(n, seed) {
  const R = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(.99, (i + R() * .8) / n), x = 12 + t * 76, cy = browCy(t), th = browTh(t), y = cy + (R() - .5) * th * .9;
    const deg = t < .18 ? -78 + R() * 22 : t > .78 ? 6 + R() * 10 : -20 + R() * 12;
    const len = t < .18 ? 4.5 + R() * 2 : 7 + R() * 3 - 3.5 * t, r = deg * Math.PI / 180;
    const tone = t < .2 ? "head" : (y < cy - th * .12 || t > .8) ? "dark" : "main";
    out.push([x, y, x + Math.cos(r) * len, y + Math.sin(r) * len, tone]);
  }
  return out;
}
const BROW_REAL = browHairs(58, 7), BROW_FILL = browHairs(26, 31);
const BROW_PATH = (() => {
  const top = [], bot = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20, x = (12 + t * 76).toFixed(1); top.push(x + "," + (browCy(t) - browTh(t) / 2).toFixed(1)); bot.unshift(x + "," + (browCy(t) + browTh(t) / 2).toFixed(1)); }
  return "M" + top.join(" L") + " L" + bot.join(" L") + " Z";
})();
const LIP_U = "M85,158.5 C89,154.5 94.5,151.6 100,154 C105.5,151.6 111,154.5 115,158.5 C109,159.6 91,159.6 85,158.5 Z";
const LIP_L = "M85,158.5 C91,159.6 109,159.6 115,158.5 C112,166.8 106,170.4 100,170.4 C94,170.4 88,166.8 85,158.5 Z";
// Lips on a skin patch: the rim colour fills the shape and a blurred, shrunk body sits on top, which leaves a soft rim band.
function lipSVG(o) {
  const id = "lp" + (++FID), w = 100, h = o.h || 70, s = o.scale || 2.6, rim = o.rim || o.body;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.label || "")}"><defs><filter id="${id}b" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation=".6"/></filter><clipPath id="${id}c"><path d="${LIP_U}"/><path d="${LIP_L}"/></clipPath></defs>
<rect width="${w}" height="${h}" fill="${o.skin}"/>
<g transform="translate(${w / 2} ${h / 2}) scale(${s}) translate(-100 -161.5)">
<g clip-path="url(#${id}c)"><rect x="80" y="148" width="40" height="26" fill="${rim}"/>
<g filter="url(#${id}b)"><path d="${LIP_U}" fill="${o.body}" transform="translate(100 157.2) scale(.85 .72) translate(-100 -157.2)"/><path d="${LIP_L}" fill="${o.body}" transform="translate(100 163) scale(.87 .74) translate(-100 -163)"/></g></g>
<path d="M85.6,158.5 C91,159.8 109,159.8 114.4,158.5" stroke="#3a1714" stroke-opacity=".42" stroke-width=".6" fill="none"/>
${o.shine ? `<ellipse cx="102.5" cy="164.4" rx="5.2" ry="1.3" fill="#fff" opacity=".62"/><ellipse cx="95" cy="155.8" rx="2.6" ry=".65" fill="#fff" opacity=".45"/>` : ""}
</g></svg>`;
}
function browSVG(o) {
  const tone = { head: o.head || o.main, main: o.main, dark: o.dark || o.main }, sw = o.sw || 1, id = "br" + (++FID);
  let g = `<rect x="-50" y="-50" width="200" height="160" fill="${o.skin}"/>`;
  if (o.hair) g += `<path d="M0,0 H100 V11 C80,15 58,9 36,13 C22,15.5 9,14 0,17 Z" fill="${o.hair}"/>`;
  g += `<path d="${BROW_PATH}" fill="${o.main}" opacity=".14"/>`;
  if (o.cand && o.fin === "powder") g += `<path d="${BROW_PATH}" fill="${o.cand}" opacity=".5" filter="url(#${id}b)"/>`;
  g += BROW_REAL.map(s => `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${s[2].toFixed(1)}" y2="${s[3].toFixed(1)}" stroke="${tone[s[4]]}" stroke-width="${sw}" stroke-linecap="round"/>`).join("");
  if (o.cand && o.fin !== "powder") g += BROW_FILL.map(s => `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${s[2].toFixed(1)}" y2="${s[3].toFixed(1)}" stroke="${o.cand}" stroke-width="${sw * 1.05}" stroke-linecap="round" opacity=".92"/>`).join("");
  return `<svg viewBox="${o.vb || "4 6 92 44"}" role="img" aria-label="${esc(o.label || "")}"><defs><filter id="${id}b"><feGaussianBlur stdDeviation="1.1"/></filter></defs>${g}</svg>`;
}
function hairSVG(o) {
  const lite = mixLin(o.hair, "#ffffff", .12);
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(o.label || "")}"><rect width="100" height="100" fill="${o.skin}"/>
<path d="M0,0 H100 V30 C80,26 62,30 48,42 C36,52 30,70 26,100 H0 Z" fill="${o.hair}"/>
${[[8, 0, 14, 100], [20, 0, 22, 70], [34, 0, 38, 50], [52, 0, 56, 34], [70, 0, 74, 28]].map(p => `<path d="M${p[0] + 40},${p[1]} C${p[0] + 20},${p[3] * .4} ${p[2]},${p[3] * .7} ${p[2] - 4},${p[3]}" stroke="${lite}" stroke-width=".8" fill="none" opacity=".7"/>`).join("")}</svg>`;
}
function skinLipSVG(o) {
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(o.label || "")}"><rect width="50" height="100" fill="${o.skin}"/><rect x="50" width="50" height="100" fill="${o.rim || o.lip}"/><rect x="56" y="6" width="38" height="88" rx="2" fill="${o.lip}"/></svg>`;
}
// The four relationship tiles; `focus` outlines the ones an edit changes.
function pcStrip(c, focus) {
  const f = k => focus && focus.includes(k) ? " on" : "";
  return `<div class="pc-strip">
  <figure class="${f("sl")}">${skinLipSVG({ skin: c.skin, lip: c.lip, rim: c.rim, label: t("pc.pvSkinLip") })}<figcaption>${t("pc.pvSkinLip")}</figcaption></figure>
  <figure class="${f("lip")}">${lipSVG({ skin: c.skin, body: c.lip, rim: c.rim, h: 100, scale: 2.7, label: t("pc.pvLip") })}<figcaption>${t("pc.pvLip")}</figcaption></figure>
  <figure class="${f("brow")}">${browSVG({ skin: c.skin, main: c.brow, head: c.head, dark: c.dark, vb: "9 3 60 60", sw: 1.35, label: t("pc.pvBrow") })}<figcaption>${t("pc.pvBrow")}</figcaption></figure>
  <figure class="${f("hair")}">${hairSVG({ skin: c.skin, hair: c.hair, label: t("pc.pvHair") })}<figcaption>${t("pc.pvHair")}</figcaption></figure>
</div>`;
}
function pcColors(over) {
  const c = { skin: PC.skin.hex, lip: PC.lip.hex, rim: PC.lip.rim, brow: PC.brow.hex, head: PC.brow.head, dark: PC.brow.dark, hair: PC.hair.hex };
  if (over && over.key) {
    const k = over.key, p = over.part;
    if (k === "lip") c[p === "rim" ? "rim" : "lip"] = over.hex;
    else if (k === "brow") c[p === "hex" ? "brow" : p] = over.hex;
    else if (k === "skin" || k === "hair") c[k] = over.hex;
  }
  return c;
}
const FOCUS = { skin: ["sl", "lip", "brow", "hair"], found: [], lip: ["sl", "lip"], brow: ["brow"], hair: ["hair"], iris: [] };

/* Hồ sơ → Màu của bạn */
function pcSwatch(key) {
  const e = PC[key];
  if (key === "lip") return `<span class="pc-sw" style="background:${e.hex};box-shadow:inset 0 0 0 5px ${e.rim || e.hex}, inset 0 0 0 6px rgba(0,0,0,.08)"></span>`;
  if (key === "brow") return `<span class="pc-sw"><i style="background:${e.head};flex:1"></i><i style="background:${e.hex};flex:2"></i><i style="background:${e.dark};flex:1"></i></span>`;
  return `<span class="pc-sw" style="background:${e.hex}"></span>`;
}
function pcRow(key) {
  const e = PC[key], parts = PC_PARTS[key] || ["hex"], label = t("pc." + key);
  const extra = key === "lip" && e.rim ? ` · ${esc(pcName("lip", "rim"))}` : "";
  const auto = parts.some(p => e[p] && !e.nm[p]) ? ` <span class="tag nice">${t("pc.auto")}</span>` : "";
  const codes = parts.filter(p => e[p]).map(p => `${parts.length > 1 ? `<span>${t(CODE_KEY[p])}</span> ` : ""}<code>${e[p]}</code>`).join(" · ");
  return `<li class="pc-row">${pcSwatch(key)}<div class="pc-txt"><span class="pc-k">${label}</span><b>${esc(pcName(key))}${extra}${auto}</b><small>${t("pc." + key + "Sub")}</small>
  <details class="pc-hex"><summary>${t("pc.hex")}${ic("chev", "chev")}</summary><p>${codes}</p></details></div>
  <button type="button" class="btn pc-edit" data-pc-edit="${key}" aria-label="${esc(t("pc.editAria", { name: label }))}">${t("pc.edit")}</button></li>`;
}
function pcPanel() {
  return `<section class="sec pc" id="pc">
  <div class="sec-h"><h2 class="h2">${t("pc.title")}</h2></div>
  <p class="sub">${t("pc.sub")}</p>
  <ul class="pc-list">${PC_ROWS.map(pcRow).join("")}</ul>
  <div class="pc-pv"><h3 class="eyebrow">${t("pc.preview")}</h3>${pcStrip(pcColors())}<p class="hint">${t("pc.pvHint")}</p></div>
</section>`;
}

/* picker sheet */
function pkOpen(key, part) {
  Object.assign(PK, { key, part: part || "hex", tab: PK.key === key ? PK.tab : "pick", pt: null, note: "" });
  PK.orig = PC[key][PK.part]; PK.hex = PK.orig;
  state.overlay = "picker";
}
const presetKey = () => PK.part === "rim" ? "rim" : PK.key;
function shPicker() {
  const key = PK.key, parts = PC_PARTS[key], label = t("pc." + key);
  const tabs = [["pick", "pk.tabPick"], ["photo", "pk.tabPhoto"], ["preset", "pk.tabPreset"]];
  let panel = "";
  if (PK.tab === "pick") {
    const steps = [["lighter", "darker"], ["warmer", "cooler"], ["richer", "softer"]];
    panel = `<div class="pk-pick"><label class="ck-pick pk-native" style="background:${PK.hex}"><input type="color" id="pk-color" value="${PK.hex}" aria-label="${t("pk.open")}"></label>
      <div><b>${t("pk.open")}</b><p class="hint">${esc(hexName(PK.hex))}</p></div></div>
    <div class="sec" style="gap:8px"><h3 class="eyebrow">${t("pk.fine")}</h3>
      <div class="pk-steps">${steps.map(p => p.map(k => `<button type="button" class="btn" data-pk-step="${k}">${t("pk." + k)}</button>`).join("")).join("")}</div>
      <p class="hint">${t("pk.fineHint")}</p>
      ${PK.hex !== PK.orig ? `<button type="button" class="link" data-pk-reset>${t("pk.reset")}</button>` : ""}</div>`;
  } else if (PK.tab === "photo") {
    panel = `<p class="notice pk-light">${ic("today")}<span>${t("pk.light")}</span></p>
    <div class="pk-photo"><canvas id="pk-canvas" width="320" height="240" tabindex="0" aria-label="${t("pk.photoAria")}"></canvas><span class="pk-mark" id="pk-mark" aria-hidden="true"></span></div>
    <p class="hint">${PK.img ? "" : t("pk.demo")}</p>
    <div class="pk-loupe"><canvas id="pk-loupe" width="88" height="88" role="img" aria-label="${t("pk.loupe")}"></canvas>
      <div><span class="eyebrow">${t("pk.avg")}</span><p class="pk-avg"><i class="sw" id="pk-avg-sw"></i><b id="pk-avg-name"></b></p><p class="hint" id="pk-status" role="status">${PK.note || t("pk.tap")}</p></div></div>
    <label class="btn pk-up">${t("pk.upload")}<input type="file" id="pk-file" accept="image/*"></label>`;
  } else {
    panel = `<p class="hint">${t("pk.presetHint")}</p><div class="pk-presets" role="group" aria-label="${t("pk.tabPreset")}">${PRESETS[presetKey()].map(x => { const h = Array.isArray(x) ? x[0] : x, n = Array.isArray(x) ? L2(x.slice(1)) : hexName(h); return `<button type="button" data-pk-preset="${h}" aria-pressed="${h === PK.hex}"><i style="background:${h}"></i><span>${esc(n)}</span></button>`; }).join("")}</div>`;
  }
  return `<header class="sh-head"><h2>${label}</h2><button type="button" class="icon-btn" data-close aria-label="${t("act.close")}">${ic("close")}</button><p>${t("pk.sub")}</p></header>
<div class="sh-body">
  ${parts ? `<div class="seg3" role="group" aria-label="${t("pk.parts")}">${parts.map(p => `<button type="button" data-pk-part="${p}" aria-pressed="${p === PK.part}">${t(PART_KEY[p])}</button>`).join("")}</div>` : ""}
  <div class="pk-ba"><figure><i style="background:${PK.orig}"></i><figcaption><span>${t("pk.before")}</span>${esc(hexName(PK.orig))}</figcaption></figure>
    ${ic("arrow")}<figure><i style="background:${PK.hex}"></i><figcaption><span>${t("pk.after")}</span>${esc(hexName(PK.hex))}</figcaption></figure></div>
  <div>${pcStrip(pcColors(PK), FOCUS[key])}</div>
  <div class="pk-tabs" role="tablist" aria-label="${t("pk.tabs")}">${tabs.map(([k, l]) => `<button type="button" role="tab" id="pk-tab-${k}" aria-controls="pk-panel" aria-selected="${PK.tab === k}" data-pk-tab="${k}">${t(l)}</button>`).join("")}</div>
  <div class="pk-panel" id="pk-panel" role="tabpanel" aria-labelledby="pk-tab-${PK.tab}">${panel}</div>
</div>
<footer class="sh-foot"><button type="button" class="btn" data-close>${t("act.cancel")}</button><button type="button" class="btn primary" data-pk-save>${t("pk.save")}</button></footer>`;
}

/* photo sampler: a drawn stand-in photo until the user uploads one */
function drawDemo(ctx) {
  const W = 320, H = 240, R = rng(5);
  ctx.fillStyle = PC.skin.hex; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(200, 130, 20, 200, 130, 260); g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(1, "rgba(60,20,10,.10)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PC.hair.hex; ctx.fill(new Path2D("M0,0 H320 V20 C250,30 170,22 110,34 C60,44 28,70 0,110 Z"));
  ctx.save(); ctx.translate(40, 34); ctx.scale(1.35, 1.35); ctx.lineCap = "round"; ctx.lineWidth = 1.1;
  ctx.globalAlpha = .14; ctx.fillStyle = PC.brow.hex; ctx.fill(new Path2D(BROW_PATH)); ctx.globalAlpha = 1;
  const tone = { head: PC.brow.head || PC.brow.hex, main: PC.brow.hex, dark: PC.brow.dark || PC.brow.hex };
  BROW_REAL.forEach(s => { ctx.strokeStyle = tone[s[4]]; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); });
  ctx.restore();
  ctx.save(); ctx.translate(108, 118);
  ctx.fillStyle = "#efe7e2"; ctx.beginPath(); ctx.ellipse(0, 0, 38, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PC.iris.hex; ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#121010"; ctx.beginPath(); ctx.arc(2, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1c1918"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, 0, 38, 12, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(222, 196); ctx.scale(3.4, 3.4); ctx.translate(-100, -161.5);
  const U = new Path2D(LIP_U), Lo = new Path2D(LIP_L);
  ctx.fillStyle = PC.lip.rim || PC.lip.hex; ctx.fill(U); ctx.fill(Lo);
  ctx.save(); ctx.clip(U); ctx.filter = "blur(2px)"; ctx.fillStyle = PC.lip.hex; ctx.translate(100, 157.2); ctx.scale(.85, .72); ctx.translate(-100, -157.2); ctx.fill(U); ctx.restore();
  ctx.save(); ctx.clip(Lo); ctx.filter = "blur(2px)"; ctx.fillStyle = PC.lip.hex; ctx.translate(100, 163); ctx.scale(.87, .74); ctx.translate(-100, -163); ctx.fill(Lo); ctx.restore();
  ctx.restore();
  const d = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < d.data.length; i += 4) { const n = (R() - .5) * 9; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  ctx.putImageData(d, 0, 0);
}
const DEMO_PT = { skin: [262, 120], found: [262, 120], lip: [222, 204], rim: [222, 222], brow: [128, 74], head: [62, 80], dark: [160, 66], hair: [40, 20], iris: [104, 114] };
function pkPt() { return PK.pt || DEMO_PT[PK.part === "hex" ? PK.key : PK.part] || [160, 120]; }
function sampleAvg(ctx, x, y) {
  const d = ctx.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 5, 5).data, s = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) s[c] += linC(d[i + c]);
  const n = d.length / 4;
  return toHex(gamC(s[0] / n), gamC(s[1] / n), gamC(s[2] / n));
}
function pkDraw() {
  const cv = $("#pk-canvas"); if (!cv) return;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (PK.img) { const im = PK.img, sc = Math.max(320 / im.width, 240 / im.height); ctx.drawImage(im, (320 - im.width * sc) / 2, (240 - im.height * sc) / 2, im.width * sc, im.height * sc); }
  else drawDemo(ctx);
  pkLoupe();
}
function pkLoupe() {
  const cv = $("#pk-canvas"), lp = $("#pk-loupe"); if (!cv || !lp) return;
  const [x, y] = pkPt(), l = lp.getContext("2d");
  l.imageSmoothingEnabled = false; l.clearRect(0, 0, 88, 88);
  l.drawImage(cv, x - 5, y - 5, 11, 11, 0, 0, 88, 88);
  l.strokeStyle = "#fff"; l.lineWidth = 2; l.strokeRect(24, 24, 40, 40); l.strokeStyle = "rgba(0,0,0,.6)"; l.lineWidth = 1; l.strokeRect(22.5, 22.5, 43, 43);
  const avg = sampleAvg(cv.getContext("2d"), x, y);
  $("#pk-avg-sw").style.background = avg; $("#pk-avg-name").textContent = hexName(avg);
  const m = $("#pk-mark"); m.style.left = (x / 320 * 100) + "%"; m.style.top = (y / 240 * 100) + "%";
  return avg;
}
function pkTake() {
  const avg = pkLoupe(); if (!avg) return;
  PK.hex = avg; PK.note = t("pk.sampled", { name: hexName(avg) });
  rerenderSheet("picker");
}
function canvasPt(e) {
  const cv = $("#pk-canvas"), r = cv.getBoundingClientRect();
  return [Math.round(Math.min(317, Math.max(2, (e.clientX - r.left) / r.width * 320))), Math.round(Math.min(237, Math.max(2, (e.clientY - r.top) / r.height * 240)))];
}
function rerenderSheet(k) {
  const b = $("#sh-" + k + " .sh-body"), y = b ? b.scrollTop : 0;
  renderOverlay();
  const nb = $("#sh-" + k + " .sh-body"); if (nb) nb.scrollTop = y;
}

/* lip check: against the natural lip (depth, rim) and the skin (undertone) */
function lipTone(hex, liner) {
  const c = hexToHsl(hex), hr = (c.h - UNDERTONE_SHIFT() + 360) % 360, L = lch(hex);
  if (liner) return L.h > (PC.lip.rim ? lch(PC.lip.rim).h + 15 : 40) && L.C >= 12 ? [0, "lt.nude"] : inHue(hr, 290, 345) ? [1, "lt.cool"] : [1, "lt.grey"];
  if (c.s < 15) return [2, "lt.grey"];
  if (inHue(hr, 335, 13)) return L.h > 45 ? [1, "lt.yellow"] : [0, "lt.good"];
  if (inHue(hr, 13, 35)) return [1, "lt.orange"];
  if (inHue(hr, 290, 335)) return [c.s > 50 || c.l < 35 ? 2 : 1, "lt.cool"];
  if (inHue(hr, 35, 50)) return [1, "lt.yellow"];
  return [2, "lt.odd"];
}
function judgeLip(hex, fin) {
  const LP = PC.lip, a = FIN[fin].a, liner = fin === "liner";
  const onLip = mixLin(LP.hex, hex, a), onRim = LP.rim ? mixLin(LP.rim, hex, a) : null;
  const steps = (lab(LP.hex)[0] - lab(onLip)[0]) / STEP_L, n = fmtN(half(steps));
  const crit = [], tags = [];
  let depth;
  if (liner) depth = steps > .5 ? [1, t("ll.dark", { rim: t("ck.rimWord") })] : [-1, t("ll.main", { n: steps < -.25 ? n : fmtN(.5) })];
  else if (steps < -.5) depth = [2, t("lp.lighter", { n })];
  else if (steps < .5) depth = [1, t(a < .75 && dE(onLip, LP.hex) < 6 ? "ll.closeSheer" : "lp.same")];
  else if (steps < 1) depth = [1, t("lp.half")];
  else if (steps <= 2.2) depth = [0, t("lp.target", { n })];
  else if (steps <= 3.5) depth = [1, t("lp.deep", { n })];
  else depth = [1, t("lp.vdeep")];
  crit.push(["cr.depth"].concat(depth));
  const tone = lipTone(hex, liner);
  crit.push(["cr.tone", tone[0], t(tone[1])]);
  let rimShows = false;
  if (!onRim) crit.push(["cr.rim", -1, t("lr.none")]);
  else if (liner) crit.push(["cr.rim", dE(onLip, onRim) < 3 ? 0 : 1, t(dE(onLip, onRim) < 3 ? "lr.fixes" : "ll.dark", { rim: t("ck.rimWord") })]);
  else { rimShows = a < .75 && dE(onLip, onRim) >= 5; crit.push(["cr.rim", rimShows ? "f" : 0, rimShows ? t("lr.shows", { fin: t("fin." + fin), n: Math.round(a * 100), rim: t("ck.rimWord") }) : t("lr.covered", { rim: t("ck.rimWord") })]); }
  if (rimShows) tags.push(t("ck.tagRim"));
  if (liner || (a < .75 && Math.abs(steps) < .5)) tags.unshift(t("ck.vLiner"));
  const v = liner ? "l" : Math.max(depth[0], tone[0], 0);
  const worst = crit.filter(c => typeof c[1] === "number" && c[1] > 0).sort((x, y) => y[1] - x[1])[0];
  const head = liner ? depth[1] : v === 0 ? t(rimShows ? "ck.hLipOkRim" : "ck.hLipOk") : worst[2];
  return { v, head, crit, tags, onLip, onRim, rimShows, a, steps };
}
/* brow check: against the brow tones and the hair */
// A grey on the olive side of the profile's brows, and not redder than them, reads cool and detaches from the face.
function coolGrey(c) {
  const bl = lab(PC.brow.hex);
  return c.C <= 9 && c.h >= 70 && c.h <= 200 && c.a <= bl[1] + .5;
}
function judgeBrow(hex, fin, coolLayout = state.ckCool) {
  const B = PC.brow, c = lch(hex), Lb = lab(B.hex)[0], Lh = lab(PC.hair.hex)[0], Lhead = lab(B.head || B.hex)[0];
  const n = fmtN(half((c.L - Lb) / STEP_L)), crit = [], tags = [];
  let light;
  if (c.L < Lh + 3) light = [1, t("bl.tooDark")];
  else if (c.L <= Lb + 4) light = [0, t("bl.match")];
  else if (c.L <= Lhead + 5) { light = [0, t("bl.head", { n })]; tags.push(t("ck.tagHead")); }
  else if (c.L <= Lb + 30) light = [1, t("bl.light", { n })];
  else light = [2, t("bl.vlight")];
  crit.push(["cr.light"].concat(light));
  const cool = coolGrey(c);
  const warm = cool ? (coolLayout ? [0, "bw.coolOk"] : [2, "bw.cool"]) : c.C <= 9 ? [0, "bw.neutral"] : c.C <= 16 ? [1, "bw.warm"] : c.h < 45 ? [2, "bw.red"] : [1, "bw.brown"];
  crit.push(["cr.warm", warm[0], t(warm[1])]);
  const lightLook = light[0] === 1 && c.L > Lhead + 5 || warm[0] === 1 && c.C > 16;
  if (lightLook && warm[0] < 2 && light[0] < 2) tags.unshift(t("ck.tagLight"));
  crit.push(["cr.use", -1, t(fin === "eyeliner" ? "bu.eyeliner" : lightLook ? "bu.light" : "bu.fill")]);
  const off = cool && !coolLayout;
  if (off) { tags.length = 0; tags.push(t("ck.tagCool")); }
  const v = Math.max(light[0], warm[0]);
  const worst = crit.filter(x => x[1] > 0).sort((x, y) => y[1] - x[1])[0];
  return { v, head: off ? t("bw.cool") : worst ? worst[2] : light[1], crit, tags, pill: off ? "ck.vCool" : null };
}
function critList(crit) {
  const cls = s => s === -1 ? "n" : s;
  return `<ul class="crit">${crit.map(c => `<li class="c${cls(c[1])}"><i aria-hidden="true"></i><div><b>${t(c[0])} <span class="vh">· ${t("cs." + cls(c[1]))}</span></b><p>${esc(c[2])}</p></div></li>`).join("")}</ul>`;
}
function ckSamples(cat) {
  if (!CK_SAMPLES[cat].length) return "";
  return `<div class="sec" style="gap:6px"><span class="field">${t("ck.samples")}</span><div class="chip-row">${CK_SAMPLES[cat].map(s => `<button type="button" class="chip ck-s" data-ck-sample="${s.id}" aria-pressed="${state.checkHex === s.hex && state.ckName === s.name}"><i class="sw" style="background:${s.hex}"></i>${esc(s.short)}</button>`).join("")}</div></div>`;
}
function ckFinish(cat) {
  return `<div class="sec" style="gap:6px"><span class="field">${t(cat === "son" ? "ck.finish" : "ck.ptype")}</span><div class="chip-row">${FIN_BY[cat].map(f => `<button type="button" class="chip" data-ck-fin="${f}" aria-pressed="${state.ckFin[cat] === f}">${t("fin." + f)} <small>${t("ck.cover", { n: Math.round(FIN[f].a * 100) })}</small></button>`).join("")}</div></div>`;
}
function ckHeadInput(sub) {
  const hex = state.checkHex, cat = CAT[state.checkCat];
  return `<header class="sh-head"><h2>${t("nav.checkColor")}</h2><button type="button" class="icon-btn" data-close aria-label="${t("act.close")}">${ic("close")}</button><p>${t(sub)}</p></header>
<div class="sh-body">
  <div class="ck-input">
    <label class="ck-pick" style="background:${hex}"><input type="color" id="ck-color" value="${hex}" aria-label="${t("ck.pick")}"></label>
    <label class="field">${t("ck.hex")}<input id="ck-hex" value="${hex}" maxlength="7" spellcheck="false" autocomplete="off"></label>
  </div>
  <div class="sec" style="gap:6px"><span class="field">${t("ck.for")}</span>
    <div class="chip-row">${CATS.map(c => `<button type="button" class="chip" data-ck-cat="${c.id}" aria-pressed="${c.id === cat.id}">${esc(catShort(c))}</button>`).join("")}</div>
  </div>`;
}
function ckVerdict(r) {
  const pill = r.v === "l" ? `<span class="pill vl">${t("ck.vLiner")}</span>` : r.pill ? `<span class="pill v${r.v}">${t(r.pill)}</span>` : `<span class="pill v${r.v}">${t("ck.v" + r.v)}</span>`;
  const tags = r.tags.filter(x => !(r.v === "l" && x === t("ck.vLiner")));
  return `<div class="verdict"><div class="v-top">${pill}${tags.map(x => `<span class="tag own">${esc(x)}</span>`).join("")}</div><p class="v-main">${esc(r.head)}</p>${critList(r.crit)}</div>`;
}
function ckFoot(cat, hex) {
  const name = state.ckName || hex;
  return `<footer class="sh-foot"><button type="button" class="btn" data-close>${t("act.done")}</button><button type="button" class="btn primary" data-add="${esc(catShort(cat) + " · " + name)}" data-add-hex="${hex}" data-add-src="${esc(t("ck.src"))}">${t("ck.addManual")}</button></footer>`;
}
function shCheckerLip() {
  const hex = state.checkHex, cat = CAT.son, fin = state.ckFin.son, r = judgeLip(hex, fin), LP = PC.lip, shine = !!FIN[fin].shine;
  const lined = state.ckLined && LP.rim && LINER && fin !== "liner";
  const rimUnder = lined ? mixLin(LP.rim, LINER.hex, FIN.liner.a) : LP.rim;
  const withRim = LP.rim ? mixLin(rimUnder, hex, r.a) : null;
  const nm = state.ckName ? esc(state.ckName) : t("ck.test");
  return ckHeadInput("ck.subLip") + `
  ${ckSamples("son")}${ckFinish("son")}
  <div class="ck-compare">
    <figure><div style="background:${PC.skin.hex}"></div><figcaption>${t("ck.skin")}<br><small>${esc(pcName("skin"))}</small></figcaption></figure>
    <figure><div style="background:${LP.hex};box-shadow:inset 0 0 0 7px ${LP.rim || LP.hex}"></div><figcaption>${t("ck.natLip")}<br><small>${esc(pcName("lip"))}${LP.rim ? ", " + t("ck.rimWord") : ""}</small></figcaption></figure>
    <figure><div style="background:${hex}"></div><figcaption>${nm}<br><small>${esc(hexName(hex))}</small></figcaption></figure>
  </div>
  <section class="sec ck-on" style="gap:8px">
    <h3 class="eyebrow">${t("ck.onLips")}</h3>
    <div class="ck-lips">
      <figure>${lipSVG({ skin: PC.skin.hex, body: LP.hex, rim: LP.rim, label: t("ck.bare") })}<figcaption>${t("ck.bare")}</figcaption></figure>
      <figure>${lipSVG({ skin: PC.skin.hex, body: r.onLip, rim: withRim, shine, label: t(lined ? "ck.withLined" : "ck.with") })}<figcaption>${t(lined ? "ck.withLined" : "ck.with")} · ${t("fin." + fin)}</figcaption></figure>
    </div>
    <p class="hint">${t("ck.onLipsSub")}</p>
    ${LP.rim && LINER && fin !== "liner" ? `<button type="button" class="chip ck-lined" data-ck-lined aria-pressed="${!!lined}"><i class="sw" style="background:${LINER.hex}"></i>${t("ck.lined")}</button>` : ""}
  </section>
  ${ckVerdict(r)}
  ${ckNearest(cat, hex)}
</div>` + ckFoot(cat, hex);
}
function shCheckerBrow() {
  const hex = state.checkHex, cat = CAT.may, fin = state.ckFin.may, r = judgeBrow(hex, fin), B = PC.brow;
  const nm = state.ckName ? esc(state.ckName) : t("ck.test");
  const bo = { skin: PC.skin.hex, hair: PC.hair.hex, main: B.hex, head: B.head, dark: B.dark, vb: "4 2 92 44", sw: .95 };
  return ckHeadInput("ck.subBrow") + `
  ${ckSamples("may")}${ckFinish("may")}
  <div class="chip-row"><button type="button" class="chip" data-ck-cool aria-pressed="${state.ckCool}">${t("ck.coolLayout")}</button></div>
  <div class="ck-compare">
    <figure><div style="background:linear-gradient(90deg, ${B.head} 0 25%, ${B.hex} 25% 75%, ${B.dark} 75%)"></div><figcaption>${t("ck.brow")}<br><small>${esc(pcName("brow"))}</small></figcaption></figure>
    <figure><div style="background:${PC.hair.hex}"></div><figcaption>${t("ck.hair")}<br><small>${esc(pcName("hair"))}</small></figcaption></figure>
    <figure><div style="background:${hex}"></div><figcaption>${nm}<br><small>${esc(hexName(hex))}</small></figcaption></figure>
  </div>
  <section class="sec ck-on" style="gap:8px">
    <h3 class="eyebrow">${t("ck.onBrows")}</h3>
    <div class="ck-lips">
      <figure>${browSVG(Object.assign({ label: t("ck.browBare") }, bo))}<figcaption>${t("ck.browBare")}</figcaption></figure>
      <figure>${browSVG(Object.assign({ label: t("ck.browWith"), cand: hex, fin }, bo))}<figcaption>${t("ck.browWith")} · ${t("fin." + fin)}</figcaption></figure>
    </div>
    <p class="hint">${t("ck.onBrowsSub")}</p>
  </section>
  ${ckVerdict(r)}
  ${ckNearest(cat, hex)}
</div>` + ckFoot(cat, hex);
}
function ckNearest(cat, hex) {
  const alts = cat.good.map(g => [dist(g[1], hex), g]).sort((m, n) => m[0] - n[0]).slice(0, 2).map(x => x[1]);
  return `<section class="sec" style="gap:8px"><h3 class="eyebrow">${t("ck.nearest", { cat: catShort(cat).toLowerCase() })}</h3>
    <div class="alt-list">${alts.map(g => `<button type="button" data-check-hex="${g[1]}" data-check-cat="${cat.id}"><i style="background:${g[1]}"></i><b>${esc(tx(g[0]))}</b><small>${g[4] === "Best" ? t("pal.best") : t("pal.good")} · ${esc(hexName(g[1]))}</small><span class="link">${t("act.view")}</span></button>`).join("")}</div></section>`;
}
function shChecker() {
  if (state.checkCat === "son") return shCheckerLip();
  if (state.checkCat === "may") return shCheckerBrow();
  return shCheckerSkin();
}
function ckSample(id) {
  for (const cat in CK_SAMPLES) {
    const s = CK_SAMPLES[cat].find(x => x.id === id);
    if (s) { state.checkCat = cat; state.checkHex = s.hex; state.ckFin[cat] = s.fin; state.ckName = s.name; state.ckLined = false; state.ckCool = false; return true; }
  }
  return false;
}

/* events */
function pcClick(d) {
  if (d.pcEdit) { pkOpen(d.pcEdit); refresh(); return true; }
  if (d.pkPart) { pkOpen(PK.key, d.pkPart); rerenderSheet("picker"); return true; }
  if (d.pkTab) { PK.tab = d.pkTab; rerenderSheet("picker"); const b = $("#pk-tab-" + PK.tab); if (b) b.focus(); return true; }
  if (d.pkStep) { PK.hex = pkStep(PK.hex, d.pkStep); rerenderSheet("picker"); const b = $(`[data-pk-step="${d.pkStep}"]`); if (b) b.focus(); return true; }
  if (d.pkReset !== undefined) { PK.hex = PK.orig; rerenderSheet("picker"); return true; }
  if (d.pkPreset) { PK.hex = d.pkPreset; rerenderSheet("picker"); const b = $(`[data-pk-preset="${d.pkPreset}"]`); if (b) b.focus(); return true; }
  if (d.pkSave !== undefined) {
    const e = PC[PK.key];
    if (PK.hex !== e[PK.part]) {
      const cur = PRESETS[presetKey()].find(x => Array.isArray(x) && x[0] === PK.hex);
      // null clears an older name so autoName() suggests one for the new colour.
      e[PK.part] = PK.hex; e.nm[PK.part] = cur ? cur.slice(1) : null;
      editProfile({ colors: { [PK.key]: { [PK.part]: PK.hex, nm: { [PK.part]: e.nm[PK.part] } } } });
    }
    state.overlay = null; render(true); toast(t("pk.saved"));
    // Foundation shades and fit are computed from the skin when the page loads, so a new skin colour needs a fresh start.
    if (PK.key === "skin") setTimeout(() => location.reload(), 600);
    return true;
  }
  if (d.ckSample) { ckSample(d.ckSample); rerenderSheet("checker"); return true; }
  if (d.ckFin) { state.ckFin[state.checkCat] = d.ckFin; rerenderSheet("checker"); return true; }
  if (d.ckCool !== undefined) { state.ckCool = !state.ckCool; rerenderSheet("checker"); return true; }
  if (d.ckLined !== undefined) { state.ckLined = !state.ckLined; rerenderSheet("checker"); return true; }
  return false;
}
function pcInput(e) {
  if (e.target.id === "pk-color") { PK.hex = e.target.value; rerenderSheet("picker"); return true; }
  if (e.target.id === "ck-color" || e.target.id === "ck-hex") state.ckName = null;
  return false;
}
$("#app").addEventListener("change", e => {
  if (e.target.id !== "pk-file" || !e.target.files[0]) return;
  const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => { PK.img = im; PK.pt = [160, 120]; PK.note = ""; rerenderSheet("picker"); }; im.src = rd.result; };
  rd.readAsDataURL(e.target.files[0]);
});
let pkDown = false;
$("#app").addEventListener("pointerdown", e => { if (e.target.id !== "pk-canvas") return; pkDown = true; e.target.setPointerCapture(e.pointerId); PK.pt = canvasPt(e); pkLoupe(); });
$("#app").addEventListener("pointermove", e => { if (!pkDown || e.target.id !== "pk-canvas") return; PK.pt = canvasPt(e); pkLoupe(); });
$("#app").addEventListener("pointerup", e => { if (!pkDown) return; pkDown = false; pkTake(); });
$("#app").addEventListener("keydown", e => {
  if (e.target.id !== "pk-canvas") return;
  const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (m) { e.preventDefault(); const s = e.shiftKey ? 10 : 2, p = pkPt(); PK.pt = [Math.min(317, Math.max(2, p[0] + m[0] * s)), Math.min(237, Math.max(2, p[1] + m[1] * s))]; pkLoupe(); }
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pkTake(); const c = $("#pk-canvas"); if (c) c.focus(); }
});

