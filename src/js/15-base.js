/* Small shared maps, icons and the app state. */
const OCC = LV({ d: ["Hằng ngày", "Everyday"], w: ["Đi làm", "Work"], h: ["Hẹn hò", "Date"], p: ["Tiệc", "Party"] });
const REG = LV({ Western: ["Âu Mỹ", "Western"], Korean: ["Hàn", "Korean"], Chinese: ["Trung", "Chinese"], Japanese: ["Nhật", "Japanese"], Vietnamese: ["Việt", "Vietnamese"], Thai: ["Thái", "Thai"], Filipino: ["Philippines", "Filipino"], Malaysian: ["Malaysia", "Malaysian"], Indonesian: ["Indonesia", "Indonesian"], Burmese: ["Myanmar", "Burmese"], "South Asian": ["Nam Á", "South Asian"], "Central Asian": ["Trung Á", "Central Asian"], "Middle Eastern": ["Trung Đông", "Middle Eastern"], "North African": ["Bắc Phi", "North African"], African: ["Châu Phi", "African"], European: ["Châu Âu", "European"], "Latin American": ["Mỹ Latinh", "Latin American"], Caribbean: ["Caribe", "Caribbean"], Global: ["Toàn cầu", "Global"] });
const KIND = LV({ layout: ["Layout", "Layout"], technique: ["Kỹ thuật", "Technique"], finish: ["Finish da", "Skin finish"], occasion: ["Dịp", "Occasion"], traditional: ["Truyền thống", "Traditional"] });
const catShort = c => tx(c.short);
const FIT = { "Hợp sẵn": 0, "Đổi màu là hợp": 1, "Khó hợp": 2, "Tham khảo": 3 };
const ON_WORD = LV({ son: ["Lên môi", "On lips"], ma: ["Lên má", "On cheeks"], mat: ["Lên mí", "On lids"], hl: ["Lên da", "On skin"] });

const I = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  palette: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  drop: '<path d="m14 5.5 1.3-1.3a2.1 2.1 0 0 1 3 0l1.5 1.5a2.1 2.1 0 0 1 0 3L18.5 10"/><path d="m12.5 7 4.5 4.5"/><path d="M14.5 9 6 17.5V20h2.5L17 11.5"/>',
  face: '<path d="M12 3.2c-3.9 0-6.4 2.9-6.4 7.2 0 4.9 3 9.2 6.4 10.4 3.4-1.2 6.4-5.5 6.4-10.4 0-4.3-2.5-7.2-6.4-7.2z"/><path d="M9 10.2h1.4M13.6 10.2H15M10.2 15.4c1.1.7 2.5.7 3.6 0"/>',
  skin: '<path d="M12 3.5s6 6.3 6 10.6a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5z"/><path d="M9.4 14.6a2.7 2.7 0 0 0 2.4 2.6"/>',
  bag: '<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 10V6.8a3 3 0 0 1 6 0V10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  shield: '<path d="M12 3.5 5 6.5v5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9v-5z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'
};
const ic = (n, cls) => `<svg class="i ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

/* ---------- state ---------- */
const state = {
  screen: "today", overlay: null, cat: "son", occ: "all", lookId: null, catId: null, pick: 0,
  kind: "all", filters: new Set(), q: "",
  checkHex: "#a0645e", checkCat: "son",
  done: new Set()
};
