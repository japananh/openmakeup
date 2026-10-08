/* Colour math shared by the judge, the gap engine, the checkers and the face drawing. */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function normHex(s) {
  if (typeof s !== "string") return null;
  s = s.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split("").map(function (c) { return c + c; }).join("");
  return /^[0-9a-f]{6}$/.test(s) ? "#" + s : null;
}
function hexToHsl(hex) {
  var n = parseInt(hex.slice(1), 16);
  var r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  var l = (max + min) / 2, h = 0, s = 0;
  if (d) {
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h: h, s: s * 100, l: l * 100 };
}
function toHex(r, g, b) {
  return "#" + [r, g, b].map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join("");
}
// Inclusive-start hue band that may wrap past 360.
function inHue(h, a, b) { return a <= b ? (h >= a && h < b) : (h >= a || h < b); }
function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function dist(a, b) { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }

function lab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = v => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
  const r = lin(n >> 16 & 255), g = lin(n >> 8 & 255), b = lin(n & 255);
  const x = (r * .4124564 + g * .3575761 + b * .1804375) / .95047;
  const y = r * .2126729 + g * .7151522 + b * .0721750;
  const z = (r * .0193339 + g * .1191920 + b * .9503041) / 1.08883;
  const f = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
// CIEDE2000 (Sharma et al. 2005), kL = kC = kH = 1. The UI never shows the number, only words.
function dE(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2);
  const rad = Math.PI / 180, p7 = v => Math.pow(v, 7);
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = .5 * (1 - Math.sqrt(p7(Cb) / (p7(Cb) + p7(25))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => (a === 0 && b === 0) ? 0 : (Math.atan2(b, a) / rad + 360) % 360;
  const h1p = hp(a1p, b1), h2p = hp(a2p, b2);
  let dhp = 0;
  if (C1p * C2p) { dhp = h2p - h1p; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p) hbp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2;
  const T = 1 - .17 * Math.cos((hbp - 30) * rad) + .24 * Math.cos(2 * hbp * rad) + .32 * Math.cos((3 * hbp + 6) * rad) - .2 * Math.cos((4 * hbp - 63) * rad);
  const dTh = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(p7(Cbp) / (p7(Cbp) + p7(25)));
  const SL = 1 + .015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + .045 * Cbp, SH = 1 + .015 * Cbp * T, RT = -Math.sin(2 * dTh * rad) * RC;
  return Math.sqrt(Math.pow((L2 - L1) / SL, 2) + Math.pow((C2p - C1p) / SC, 2) + Math.pow(dHp / SH, 2) + RT * ((C2p - C1p) / SC) * (dHp / SH));
}
function labHex(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = v => v * v * v > .008856 ? v * v * v : (v - 16 / 116) / 7.787;
  const X = inv(fx) * .95047, Y = inv(fy), Z = inv(fz) * 1.08883;
  const gm = v => 255 * Math.min(1, Math.max(0, v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055));
  return toHex(gm(3.2404542 * X - 1.5371385 * Y - .4985314 * Z), gm(-.969266 * X + 1.8760108 * Y + .041556 * Z), gm(.0556434 * X - .2040259 * Y + 1.0572252 * Z));
}
const linC = v => (v /= 255) <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const gamC = v => 255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055);
// Product over skin or lip: mixed in linear light, where pigment layers actually add up.
function mixLin(under, over, a) { const u = rgb(under), o = rgb(over); return toHex(...u.map((v, i) => gamC(linC(v) * (1 - a) + linC(o[i]) * a))); }
function lch(hex) { const [L, a, b] = lab(hex); return { L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, a, b }; }
function lchArr(hex) { const [L, a, b] = lab(hex); return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360]; }
function pkStep(hex, k) {
  let { L, a, b, C } = lch(hex);
  if (k === "lighter") L += 2.5;
  if (k === "darker") L -= 2.5;
  if (k === "warmer") b += 2;
  if (k === "cooler") { b -= 2; a += .6; }
  if (k === "richer") { if (C < 1.5) { a += .8; b += 1.2; } else { a *= 1.15; b *= 1.15; } }
  if (k === "softer") { a /= 1.15; b /= 1.15; }
  return labHex(Math.max(0, Math.min(100, L)), a, b);
}
const half = n => Math.max(.5, Math.round(Math.abs(n) * 2) / 2);
function autoName(hex) {
  const { L, C, h, b } = lch(hex);
  const W = (v, e) => [v, e];
  const depth = L > 78 ? W("sáng", "light") : L > 60 ? W("nhạt", "pale") : L > 45 ? null : L > 32 ? W("đậm", "deep") : W("rất đậm", "very deep");
  let base;
  if (C < 4) {
    base = L < 16 ? W("đen", "black") : L < 34 ? W("đen xám", "black-grey") : L < 58 ? W("xám", "grey") : W("xám nhạt", "light grey");
    if (C >= 1.2 && b > .4) base = [base[0] + " hơi nâu", base[1] + ", faintly brown"];
    return base;
  }
  if (C < 12) base = L >= 35 ? W("xám nâu", "taupe") : W("nâu", "brown");
  else if (h < 15 || h >= 330) base = W("hồng tím mauve", "mauve");
  else if (h < 40) base = L > 60 ? W("hồng đất", "rosy earth") : C > 30 ? W("đỏ nâu", "brown red") : W("hồng nâu", "rose brown");
  else if (h < 60) base = L > 72 ? W("be hồng", "pink beige") : L > 58 ? W("đào", "peach") : W("nâu ấm", "warm brown");
  else if (h < 85) base = L > 75 ? W("be", "beige") : L > 45 ? W("nâu sáng", "light brown") : W("nâu", "brown");
  else if (h < 110) base = L > 75 ? W("be vàng", "yellow beige") : W("nâu ô liu", "olive brown");
  else if (h < 170) base = W("xanh lá", "green");
  else if (h < 260) base = W("xanh dương", "blue");
  else base = W("tím", "purple");
  return depth ? [base[0] + " " + depth[0], depth[1] + " " + base[1]] : base;
}

// Applies [dL, dC, dH] (L*, chroma, hue degrees) to a colour: how foundation and concealer shades follow the skin.
function relHex(hex, rel) {
  const c = lch(hex), L = Math.max(0, Math.min(100, c.L + rel[0])), C = Math.max(0, c.C + rel[1]), h = (c.h + rel[2] + 360) % 360;
  return labHex(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));
}
// Darkens a hex by a fraction of each channel.
function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return toHex((n >> 16 & 255) * (1 - k), (n >> 8 & 255) * (1 - k), (n & 255) * (1 - k));
}
function mixHex(a, b, f) {
  const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
  return toHex((p >> 16 & 255) * (1 - f) + (q >> 16 & 255) * f, (p >> 8 & 255) * (1 - f) + (q >> 8 & 255) * f, (p & 255) * (1 - f) + (q & 255) * f);
}

// Differences of "yours" against "needed", strongest first: [key, weight].
function diffs(own, need) {
  const [L1, C1, h1] = lchArr(own), [L2, C2, h2] = lchArr(need);
  let dh = h1 - h2; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  const out = [];
  if (Math.abs(L1 - L2) > 3) out.push([L1 > L2 ? "lighter" : "darker", Math.abs(L1 - L2) / 3]);
  // Hue is meaningless on near-greys, so weight it by chroma.
  if (Math.min(C1, C2) > 8 && Math.abs(dh) > 5) out.push([dh > 0 ? "warmer" : "pinker", Math.abs(dh) / 5]);
  if (Math.abs(C1 - C2) > 5) out.push([C1 > C2 ? "vivid" : "muted", Math.abs(C1 - C2) / 5]);
  return out.sort((a, b) => b[1] - a[1]);
}
