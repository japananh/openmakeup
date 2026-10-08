/* ---------- sheets ---------- */
function shCheckerSkin() {
  const hex = state.checkHex, cat = CAT[state.checkCat], r = judge(hex, cat.id, SKIN());
  const label = t(["ck.v0", "ck.v1", "ck.v2"][r.v]);
  const on = r.hr == null ? null : hslHex(r.hr, r.hsl.s, r.hsl.l);
  const alts = cat.good.map(g => [dist(g[1], hex), g]).sort((m, n) => m[0] - n[0]).slice(0, 2).map(x => x[1]);
  const exact = cat.good.find(g => g[1] === hex) || cat.avoid.find(g => g[1] === hex);
  return `<header class="sh-head"><h2>${t("nav.checkColor")}</h2><button type="button" class="icon-btn" data-close aria-label="${t("act.close")}">${ic("close")}</button><p>${t("ck.sub")}</p></header>
<div class="sh-body">
  <div class="ck-input">
    <label class="ck-pick" style="background:${hex}"><input type="color" id="ck-color" value="${hex}" aria-label="${t("ck.pick")}"></label>
    <label class="field">${t("ck.hex")}<input id="ck-hex" value="${hex}" maxlength="7" spellcheck="false" autocomplete="off"></label>
      </div>
  <div class="sec" style="gap:6px"><span class="field">${t("ck.for")}</span>
    <div class="chip-row">${CATS.map(c => `<button type="button" class="chip" data-ck-cat="${c.id}" aria-pressed="${c.id === cat.id}">${esc(catShort(c))}</button>`).join("")}</div>
  </div>
  <div class="ck-compare${on ? "" : " two"}">
    <figure><div style="background:${SKIN()}"></div><figcaption>${t("ck.skin")}<br><code>${esc(P.shade || SKIN())}</code></figcaption></figure>
    <figure><div style="background:${hex}"></div><figcaption>${exact ? esc(tx(exact[0])) : t("ck.test")}<br><code>${hex}</code></figcaption></figure>
    ${on ? `<figure><div style="background:${on}"></div><figcaption>${ON_WORD[cat.id]} (${t("tag.est")})<br><code>${on}</code></figcaption></figure>` : ""}
  </div>
  <div class="verdict">
    <span class="pill v${r.v}">${label}</span>
    <p class="v-main">${esc(r.notes[0] ? t(r.notes[0]) : "")}</p>
    ${r.notes.length > 1 ? `<ul>${r.notes.slice(1).map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>` : ""}
  </div>
  <section class="sec" style="gap:8px">
    <h3 class="eyebrow">${t("ck.nearest", { cat: catShort(cat).toLowerCase() })}</h3>
    <div class="alt-list">${alts.map(g => `<button type="button" data-check-hex="${g[1]}" data-check-cat="${cat.id}"><i style="background:${g[1]}"></i><b>${esc(tx(g[0]))}</b><small>${g[4] === "Best" ? t("pal.best") : t("pal.good")} · <code>${g[1]}</code></small><span class="link">${t("act.view")}</span></button>`).join("")}</div>
  </section>
</div>
<footer class="sh-foot"><button type="button" class="btn" data-close>${t("act.done")}</button><button type="button" class="btn primary" data-add="${esc(catShort(cat) + " · " + (exact ? tx(exact[0]) : hex))}" data-add-hex="${hex}" data-add-src="${esc(t("ck.src"))}">${t("ck.addManual")}</button></footer>`;
}
