/* Language: Vietnamese by default, English on request. UI text goes through t(key, vars); data words through dx(kind, vi). */
let LANG = "vi";
Object.assign(STR, P.i18n);

const DATA_EN = {
  fit: { "Hợp sẵn": "Natural fit", "Đổi màu là hợp": "Needs colour swaps", "Khó hợp": "Hard to fit", "Tham khảo": "For reference" },
  swatch: {}, step: {},
  // Step labels and areas the catalogue-derived layouts use (see ROLE_STEP); a profile's dataEn adds its own.
  label: { "Màu môi": "Lip colour", "Má hồng": "Blush", "Màu chính": "Main colour", "Màu đậm": "Depth", "Nhũ": "Shimmer", "Kẻ mắt": "Eyeliner", "Highlight": "Highlight", "Tạo khối": "Contour", "Phủ phấn": "Set with powder" },
  area: { "Môi": "Lips", "Má": "Cheeks", "Mắt": "Eyes", "Highlight": "Highlight", "Tạo khối": "Contour" }
};
Object.keys(P.dataEn).forEach(k => { DATA_EN[k] = Object.assign(DATA_EN[k] || {}, P.dataEn[k]); });
const NAME_EN = Object.assign({ "no-makeup": "No-makeup makeup", "cheongsun": "Cheongsun (청순)" }, P.nameEn);

const LANG_KEY = "lang";
// Older builds kept the language under bp.defaultLang.
function readDefaultLang() {
  let v = store.get(LANG_KEY, null);
  if (!v) { try { v = localStorage.getItem("bp.defaultLang"); } catch (e) { v = null; } }
  return v === "en" || v === "vi" ? v : null;
}
function saveDefaultLang(v) { return store.set(LANG_KEY, v); }

function t(k, v) {
  const e = STR[k];
  let s = e ? (LANG === "en" && e[1] ? e[1] : e[0]) : k;
  const vars = Object.assign({ season: seasonName(), name: P.name }, v);
  return s.replace(/\{(\w+)\}/g, (m, n) => vars[n] != null ? vars[n] : m);
}
// Singular variant lives at key + "1".
const tn = (k, n, v) => STR[k + "1"] && n === 1 ? t(k + "1", v) : t(k, v);
const dx2 = pair => (LANG === "en" ? pair[1] : pair[0]);
const dx = (kind, vi) => (LANG === "en" && DATA_EN[kind] && DATA_EN[kind][vi]) || vi;
// Label maps read the current language on every access, so call sites stay unchanged.
const LV = o => new Proxy(o, { get: (x, k) => Array.isArray(x[k]) ? x[k][LANG === "en" ? 1 : 0] : x[k] });
const L2 = p => p[LANG === "en" ? 1 : 0];
const fmtN = n => LANG === "en" ? String(n) : String(n).replace(".", ",");

function applyI18n(root) {
  (root || document).querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  (root || document).querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.documentElement.lang = LANG;
}

const WEEKDAYS = { vi: ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// "Thứ Ba, 6 tháng 10" / "Tuesday, 6 October"
function todayLabel(place) {
  const d = new Date(), l = LANG === "en" ? "en" : "vi";
  return t("today.date", { weekday: WEEKDAYS[l][d.getDay()], day: d.getDate(), month: l === "en" ? MONTHS_EN[d.getMonth()] : d.getMonth() + 1, place });
}
