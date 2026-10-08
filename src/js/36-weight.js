/* Visual weight: how heavy hair, brows, eyes, lips and jaw read on this face (1-5), with what it means for makeup.
   Entirely profile data (face.weight); the section is hidden when the profile has none. */
const VW_KEYS = ["hair", "brows", "eyes", "lips", "jaw"];
function visualWeight() {
  const w = P.face.weight;
  if (!w || !w.rows) return "";
  const rows = VW_KEYS.filter(k => w.rows[k]);
  return `<div class="vw">
    <div class="sec-h"><h3 class="h2">${t("vw.title")}</h3><span class="pill vu">${esc(tx(w.level) || t("vw.level"))}</span></div>
    ${w.sub ? `<p class="sub">${esc(tx(w.sub))}</p>` : ""}
    <ul class="vw-list">${rows.map(k => { const n = w.rows[k].n; return `<li><b>${t("vw." + k)}</b><span class="vw-m" role="img" aria-label="${n}/5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span><small>${t("vw.l" + n)}${w.rows[k].note ? " · " + esc(tx(w.rows[k].note)) : ""}</small></li>`; }).join("")}</ul>
    ${w.implications && w.implications.length ? `<ul class="notes-list">${w.implications.map(x => `<li>${esc(tx(x))}</li>`).join("")}</ul>` : ""}
  </div>`;
}
