/* ---------- screens ---------- */
// What "Today" suggests: the profile's own picks when it has adapted looks, else the best-fitting drawable catalogue layouts.
function todayPicks() {
  const own = P.picks.filter(id => LOOK[id]).map(id => ({ look: LOOK[id] }));
  if (own.length) return own;
  return CATALOG.filter(e => e.kind === "layout" && e.fit in FIT_RANK && catDiagram(e))
    .sort((x, y) => FIT_RANK[x.fit] - FIT_RANK[y.fit] || (x.pop === "high" ? 0 : 1) - (y.pop === "high" ? 0 : 1) || x.id.localeCompare(y.id))
    .slice(0, 8).map(e => ({ entry: e }));
}
const todayHasSteps = w => !!(w.look && w.look.steps);
function routineLine() {
  const M = P.routine.meds || [], day = (new Date().getDay() + 6) % 7;
  const withToday = M.filter(m => m.today);
  if (withToday.length) return withToday.map(m => tx(medOn(m, day) ? m.today.on : m.today.off)).join(" ");
  const sum = ks => ks.reduce((n, k) => n + (P.routine[k] || []).length, 0);
  return t("today.routineLine", { a: sum(["am", "noon"]), b: sum(["pm"]) });
}
const medOn = (m, day) => m.days === "daily" || (Array.isArray(m.days) && m.days.includes(day));

function identityBlock() {
  const I = P.identity, keys = I.key || [OM_PALETTE.name];
  return `<section class="ident" style="grid-area:id" aria-label="${esc(t("id.faceLabel"))}">
    <div class="stagebox">${faceSVG(bareFace(), { label: t("id.faceLabel") })}</div>
    <div>
      <p class="pc">${esc(t("id.profileOf", { name: P.name }))}</p>
      <ul class="traits">${keys.map(k => `<li class="key">${esc(tx(k))}</li>`).join("")}</ul>
      ${I.tone ? `<p class="tone">${esc(tx(I.tone))}</p>` : ""}
      ${I.traits && I.traits.length ? `<ul class="traits">${I.traits.map(k => `<li>${esc(tx(k))}</li>`).join("")}</ul>` : ""}
    </div>
  </section>`;
}
function suggestion() {
  const picks = todayPicks();
  if (!picks.length) return "";
  const w = picks[state.pick % picks.length], se = season();
  if (w.look) {
    const lk = w.look, own = ownedShort(lk), a = adapted(lk), name = titleParts(lk.name)[0].replace(/\s+makeup$/i, "").split(" / ")[0];
    return `<article class="sug" style="grid-area:sug">
    <div class="stagebox">${faceSVG(a, { label: t("today.faceLabel") })}</div>
    <div class="sug-head">
      <p class="eyebrow">${t("today.sug")}</p>
      <h2>${esc(t("today.sugTitle", { name }))}</h2>
      <p class="meta">${esc(lk.time)} · ${esc(lk.level)} · ${esc(occText(lk.occ))}</p>
    </div>
    <div class="sug-body">
      <p>${t("sug." + se.kind)} ${esc(lk.fit.reason)}</p>
      ${adaptedStrip(a)}
      ${own.length ? `<p class="owned-line"><span class="tag own">${t("tag.own")}</span> ${own.map(esc).join(", ")}</p>` : ""}
      <div class="actions"><button type="button" class="btn primary" data-look="${lk.id}">${t("today.how")} ${ic("arrow")}</button>${picks.length > 1 ? `<button type="button" class="link" data-next-pick>${t("today.other")}</button>` : ""}</div>
    </div>
  </article>`;
  }
  const e = w.entry, dg = catDiagram(e), name = titleParts(e.name)[0];
  return `<article class="sug" style="grid-area:sug">
    <div class="stagebox">${faceSVG(dg, { label: t("today.faceLabel") })}</div>
    <div class="sug-head">
      <p class="eyebrow">${t("today.sug")}</p>
      <h2>${esc(name)}</h2>
      <p class="meta">${esc(KIND[e.kind])} · ${esc(e.regions.slice(0, 3).map(r => REG[r] || r).join(", "))}</p>
    </div>
    <div class="sug-body">
      <p>${t("sug." + se.kind)} ${esc(tx(e.fitWhy))}</p>
      ${strip(e.pal.map(p => p[0]))}
      ${GAPS[e.id] ? `<p class="owned-line">${esc(readyLine(GAPS[e.id]))}</p>` : ""}
      <div class="actions"><button type="button" class="btn primary" data-lib="${e.id}">${t("today.how")} ${ic("arrow")}</button>${picks.length > 1 ? `<button type="button" class="link" data-next-pick>${t("today.other")}</button>` : ""}</div>
    </div>
  </article>`;
}
function scrToday() {
  return `<div class="wrap today">
  <header class="scr-head" style="grid-area:head">
    <p class="eyebrow">${esc(todayLabel(season().place))}</p>
    <h1 class="scr-title">${t("nav.today")}</h1>
    <p class="lede">${t("lede." + season().kind)}</p>
  </header>
  ${identityBlock()}
  ${suggestion()}
  <section class="sec" style="grid-area:alerts">
    <div class="sec-h"><h2 class="h2">${t("today.skin")}</h2><button type="button" class="link" data-go="skin">${t("today.routine")} ${ic("arrow")}</button></div>
    <p class="sub">${esc(routineLine())}</p>
  </section>
  <nav class="shortcuts" style="grid-area:short" aria-label="${t("today.shortcuts")}">
    <button type="button" class="sc" data-open="checker">${ic("drop")}<b>${t("sc.check")}</b><span>${t("sc.checkSub")}</span></button>
    <button type="button" class="sc" data-go="palette" data-cat="son">${ic("palette")}<b>${t("sc.lip")}</b><span>${t("sc.lipSub")}</span></button>
    <button type="button" class="sc" data-go="layout">${ic("face")}<b>${t("sc.lib")}</b><span>${t("sc.libSub", { n: CATALOG.length })}</span></button>
    <button type="button" class="sc" data-open="shop">${ic("bag")}<b>${t("shop.title")}</b><span>${t("sc.buySub", { n: shopCount() })}</span></button>
  </nav>
</div>`;
}

function scrPalette() {
  const c = CAT[state.cat];
  const best = c.good.filter(g => g[4] === "Best"), good = c.good.filter(g => g[4] !== "Best");
  const dimC = g => state.occ !== "all" && g[2].indexOf(state.occ) < 0 ? " dim" : "";
  const peach = "#e9997a", orange = "#e8732c";
  const guides = [];
  if (c.guide) guides.push([tx(c.guide.title), `<dl>${c.guide.rows.map(r => `<div><dt>${esc(tx(r[0]))}</dt><dd>${esc(tx(r[1]))}</dd></div>`).join("")}</dl>${c.guide.caveat ? `<p class="fine">${esc(tx(c.guide.caveat))}</p>` : ""}`]);
  if (c.extra) guides.push([tx(c.extraTitle), `<p>${esc(tx(c.extra))}</p>`]);
  if (c.finish) guides.push([t("pal.finish"), `<ul class="features">${c.finish.map(f => `<li>${esc(tx(f))}</li>`).join("")}</ul>`]);
  const se = season(), hot = se.kind === "humid" || se.kind === "hot", cold = se.kind === "dry" || se.kind === "cool";
  const now = `<span class="tag own">${t("pal.now")}</span>`;
  guides.push([t("pal.season", { place: se.place }), `${!hot && !cold ? `<p class="fine">${t("pal.both", { season: se.name })}</p>` : ""}<p><b>${t("pal.whenHumid")}</b> ${hot ? now : ""} ${esc(tx(c.summer))}</p><p><b>${t("pal.whenDry")}</b> ${cold ? now : ""} ${esc(tx(c.winter))}</p>`]);
  const own = inventory().filter(it => it.cat === c.id || (c.id === "son" && it.cat === "chi"));
  return `<div class="wrap pal">
  <header class="scr-head">
    <p class="eyebrow">${esc(pcPill())}</p>
    <h1 class="scr-title">${t("nav.palette")}</h1>
    ${UNDERTONE_SHIFT() >= 5 ? `<p class="rule-line">${t("pal.onSkin")}
      <span class="shift"><i class="sw" style="background:${peach}"></i>${ic("arrow")}<i class="sw" style="background:${onSkin(peach, "ma")}"></i> ${t("pal.peach")}</span>
      <span class="shift"><i class="sw" style="background:${orange}"></i>${ic("arrow")}<i class="sw" style="background:${onSkin(orange, "son")}"></i> ${t("pal.orange")}</span>
    </p>` : ""}
  </header>
  <div class="cat-tabs" role="tablist" aria-label="${t("pal.cats")}">${CATS.map(x => `<button type="button" role="tab" class="cat-tab" data-cat="${x.id}" aria-selected="${x.id === c.id}"><i class="sw" style="background:${x.good[0][1]}"></i>${esc(catShort(x))}</button>`).join("")}</div>
  <div class="pal-grid">
    <div class="pal-main">
      <div class="pal-top">
        <p class="lead">${esc(tx(c.lead))}</p>
        <div class="chip-row" role="group" aria-label="${t("pal.occ")}">${[["all", t("pal.allOcc")]].concat(Object.entries(OCC)).map(o => `<button type="button" class="chip" data-occ="${o[0]}" aria-pressed="${state.occ === o[0]}">${o[1]}</button>`).join("")}</div>
      </div>
      <section class="sec">
        <h2 class="eyebrow">${t("pal.best")}</h2>
        <div class="hero-sw">${best.map(g => `<button type="button" class="hsw${dimC(g)}" data-check-hex="${g[1]}" data-check-cat="${c.id}"><span class="chip-c" style="background:${g[1]}"></span><span class="lab"><b>${esc(tx(g[0]))}</b><code>${g[1]}</code></span></button>`).join("")}</div>
      </section>
      <section class="sec">
        <h2 class="eyebrow">${t("pal.good")}</h2>
        <div class="good">${good.map(g => `<button type="button" class="gsw${dimC(g)}" data-check-hex="${g[1]}" data-check-cat="${c.id}"><i style="background:${g[1]}"></i><span><b>${esc(tx(g[0]))}</b><code>${g[1]}</code></span></button>`).join("")}</div>
      </section>
      <details class="avoid">
        <summary><span class="av-l">${t("pal.avoid")} <span>· ${c.avoid.length}</span></span><span class="av-strip">${c.avoid.map(x => `<i class="x" style="background:${x[1]}"></i>`).join("")}</span>${ic("chev", "chev")}</summary>
        <ul class="av-list">${c.avoid.map(x => `<li><i class="x" style="background:${x[1]}"></i><b>${esc(tx(x[0]))}<code>${x[1]}</code></b><p>${esc(tx(x[2]))}</p></li>`).join("")}</ul>
      </details>
    </div>
    <aside class="pal-side">
      ${own.length ? `<section class="sec"><div class="sec-h"><h2 class="eyebrow">${t("pal.own")}</h2><button type="button" class="link" data-shop-tab="inv">${t("tab.inv")}</button></div><ul class="owned-list">${own.map(o => { const p = o.pans || [o], k = p.every(x => x.hex); return `<li><span class="own-sw${k ? "" : " none"}">${k ? p.map(x => `<i style="background:${x.hex}"></i>`).join("") : ""}</span><b>${esc(itemName(o))}</b><small>${k ? (p.some(x => x.est) ? t("tag.est") : p.map(x => x.hex).join(" · ")) : t("inv.noColor")}</small>${k && !p.some(x => x.est) ? "" : `<button type="button" class="link" data-open-inv="${o.id}">${t(k ? "act.realColor" : "act.addColor")}</button>`}</li>`; }).join("")}</ul></section>` : ""}
      <section class="sec" style="gap:0">
        <h2 class="eyebrow" style="margin-bottom:6px">${t("pal.howto")}</h2>
        ${guides.map(g => `<details class="acc"><summary>${esc(g[0])}${ic("chev", "chev")}</summary><div class="acc-body">${g[1]}</div></details>`).join("")}
      </section>
    </aside>
  </div>
</div>`;
}

function libCard(e) {
  const [main, sub] = titleParts(e.name);
  const fit = FIT[e.fit];
  return `<button type="button" class="lcard" data-lib="${e.id}" data-kind="${e.kind}" data-fit="${fit}" data-pop="${e.vnSrc ? 1 : 0}" data-reg="${e.regions.join("|")}" data-text="${esc((e.name + " " + e.aka.join(" ")).toLowerCase())}">
  ${strip(e.pal.map(p => p[0]))}
  <span class="lc-body"><b>${esc(main)}</b><span class="aka">${esc(sub || e.aka[1] || "")}</span>
  <span class="lc-meta"><span class="fit f${fit}" title="${esc(t("fit.tip"))}">${t("fit.prefix")}: ${esc(dx("fit", e.fit))}</span>${e.vnSrc ? `<span class="vn">${t("lib.popVn")}</span>` : ""}</span>
  <span class="lc-meta" style="margin-top:0">${e.regions.slice(0, 3).map(r => REG[r] || r).join(" · ")}</span>${GAPS[e.id] ? `<span class="lc-meta lc-ready">${SHOPST.starred.has(e.id) ? "★ " : ""}${readyBadge(GAPS[e.id])}</span>` : ""}</span></button>`;
}
function scrLayout() {
  const kinds = [["all", t("lib.all"), CATALOG.length]].concat(Object.keys(KIND).map(k => [k, KIND[k], KIND_COUNT[k] || 0]));
  const fits = [["0", dx("fit", "Hợp sẵn")], ["1", dx("fit", "Đổi màu là hợp")], ["2", dx("fit", "Khó hợp")], ["3", dx("fit", "Tham khảo")]];
  // The six main regions first, then the rest by how many entries they hold.
  const first = ["Korean", "Chinese", "Japanese", "Vietnamese", "Thai", "Western"], cnt = {};
  CATALOG.forEach(e => e.regions.forEach(r => { cnt[r] = (cnt[r] || 0) + 1; }));
  const regs = first.concat(Object.keys(cnt).filter(r => first.indexOf(r) < 0).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b)));
  const on = k => state.filters.has(k);
  return `<div class="wrap lib">
  <header class="scr-head">
    <p class="eyebrow">${t("lib.count", { n: CATALOG.length })}</p>
    <h1 class="scr-title">${t("nav.layout")}</h1>
    <p class="lede">${t("lib.lede")}</p>
  </header>
  <div class="lib-tools">
    <label class="search">${ic("search")}<input id="lib-q" type="search" placeholder="${t("lib.search")}" value="${esc(state.q)}" autocomplete="off"></label>
    <div class="kind-tabs" role="tablist" aria-label="${t("lib.kind")}">${kinds.map(k => `<button type="button" role="tab" data-kind="${k[0]}" aria-selected="${state.kind === k[0]}">${k[1]}<span>${k[2]}</span></button>`).join("")}</div>
    <div class="filter-row" role="group" aria-label="${t("lib.filters")}">
      <button type="button" class="chip" data-filter="pop" aria-pressed="${on("pop")}">${t("lib.popVn")}</button>
      <span class="grp" title="${esc(t("fit.tip"))}">${t("lib.fit")}</span>${fits.map(f => `<button type="button" class="chip" data-filter="fit:${f[0]}" aria-pressed="${on("fit:" + f[0])}">${f[1]}</button>`).join("")}
      <span class="grp">${t("lib.region")}</span>${regs.map(r => `<button type="button" class="chip" data-filter="reg:${r}" aria-pressed="${on("reg:" + r)}">${REG[r]}</button>`).join("")}
    </div>
  </div>
  <p class="lib-count" id="lib-count"></p>
  <div class="lib-grid" id="lib-grid">${CATALOG.map(libCard).join("")}<p class="lib-empty" hidden>${t("lib.empty")}</p></div>
</div>`;
}
function applyLib() {
  const grid = $("#lib-grid"); if (!grid) return;
  const q = state.q.trim().toLowerCase(), f = state.filters;
  const fits = [...f].filter(x => x.startsWith("fit:")).map(x => x.slice(4));
  const regs = [...f].filter(x => x.startsWith("reg:")).map(x => x.slice(4));
  let n = 0;
  grid.querySelectorAll(".lcard").forEach(c => {
    const ok = (state.kind === "all" || c.dataset.kind === state.kind)
      && (!f.has("pop") || c.dataset.pop === "1")
      && (!fits.length || fits.includes(c.dataset.fit))
      && (!regs.length || regs.some(r => c.dataset.reg.split("|").includes(r)))
      && (!q || c.dataset.text.includes(q));
    c.hidden = !ok; if (ok) n++;
  });
  grid.querySelector(".lib-empty").hidden = n > 0;
  $("#lib-count").textContent = t("lib.showing", { n, m: CATALOG.length });
}

const gapRow = (id, it) => GAPS[id] && GAPS[id].rows.find(x => x.st.ref === it);
function scrDetail() {
  const lk = LOOK[state.lookId] || LOOKS[0];
  const [main, sub] = titleParts(lk.name);
  const a = adapted(lk), o = original(lk), sw = swaps(lk);
  const fit = FIT[lk.fit.label];
  const keep = lk.adaptation.find(s => /^Giữ/.test(s));
  const cat = CATALOG.find(c => c.id === lk.id);
  let n = 0;
  const total = lk.steps.reduce((t, s) => t + s.items.filter(it => it.label !== "Lưu ý").length, 0);
  const steps = lk.steps.map(s => {
    const items = s.items.map(it => {
      if (it.label === "Lưu ý") return `<li class="step" style="grid-template-columns:1fr"><p class="st-how"><b>${t("det.note")}</b> ${esc(it.how)}</p></li>`;
      const i = n++, done = state.done.has(i), owned = it.product && (ownedItem(it.product) || isGlossTint(it.product));
      return `<li class="step${done ? " done" : ""}"><button type="button" class="tick" data-done="${i}" aria-pressed="${done}" aria-label="${t("det.stepDone", { n: i + 1 })}">${ic("check")}</button>
      <div class="st-body"><p class="st-title"><span class="n">${String(i + 1).padStart(2, "0")}</span><b>${esc(dx("label", it.label))}</b></p>
      ${it.product ? `<p class="st-prod${owned ? " own" : ""}">${owned ? `<span class="p">${esc(it.product)}</span><span class="tag own" style="background:none;padding:0">${t("tag.own")}</span>` : esc(it.product)}</p>` : ""}
      ${it.hex ? `<p class="st-sw"><i class="sw" style="background:${it.hex}"></i>${esc(dx("swatch", it.swatch))} <code>${it.hex}</code>${gapRow(lk.id, it) ? stChip(gapRow(lk.id, it).r.s) : ""}</p>` : ""}
      <p class="st-how">${esc(it.how)}</p></div></li>`;
    }).join("");
    return `<section class="st-area"><h3>${esc(dx("area", s.area))}</h3><ol>${items}</ol></section>`;
  }).join("");
  const origin = cat ? `${KIND[cat.kind]} · ${cat.regions.map(r => REG[r] || r).join(", ")}` : "Layout";
  return `<div class="wrap det">
  <button type="button" class="back" data-go="layout">${ic("back")} ${t("nav.layout")}</button>
  <header class="scr-head det-head">
    <p class="eyebrow">${esc(origin)}</p>
    <h1 class="scr-title">${esc(main)}${sub ? `<span class="aka">${esc(sub)}</span>` : ""}</h1>
    <p class="lede">${esc(lk.vibe)}</p>
    <div class="meta-row"><span class="fit-pill f${fit}" title="${esc(t("fit.tip"))}">${t("fit.prefix")}: ${esc(dx("fit", lk.fit.label))}</span><span>${esc(lk.time)}</span><span>${esc(lk.level)}</span><span>${esc(occText(lk.occ))}</span></div>
    <p class="fit-why">${esc(lk.fit.reason)}</p>
    <p class="hint">${t("fit.tip")}</p>
  </header>
  <section class="pair" aria-label="${t("det.pair")}">
    <figure class="face-card"><figcaption><b>${t("det.orig")}</b><span>${t("det.origSub")}</span></figcaption><div class="stagebox">${faceSVG(o, { raw: true, label: t("det.origLabel") })}</div>${strip(lk.originalPalette.map(p => p.hex))}</figure>
    <figure class="face-card mine"><figcaption><b>${t("det.mine")}</b><span>${t("det.mineSub")}</span></figcaption><div class="stagebox">${faceSVG(a, { label: t("det.mine") })}</div>${strip(sw.map(s => s.to))}</figure>
  </section>
  <div class="det-grid">
    <div class="det-left">
      ${mineBlock(lk.id)}
      <section class="sec">
        <h2 class="h2">${t("det.swapped")}</h2>
        ${keep ? `<p class="keep"><b>${t("det.keep")}</b> ${esc(keep.replace(/^Giữ:\s*/, ""))}</p>` : ""}
        <ul class="swaps">${sw.map(s => `<li class="swap"><span class="end from"><i style="background:${s.from}"></i><b>${esc(s.fromName)}</b><code>${s.from}</code></span>${ic("arrow")}<span class="end">${s.to ? `<i style="background:${s.to}"></i>` : `<i class="x" style="background:var(--fill)"></i>`}<b>${esc(dx("swatch", s.toName) || t("det.goodColour"))}</b><code>${s.to || ""}</code></span>${s.why ? `<p class="why">${esc(s.why)}</p>` : ""}</li>`).join("")}</ul>
      </section>
      <section class="sec">
        <h2 class="h2">${t("det.faceNotes")}</h2>
        <ul class="notes-list">${faceNotes(lk).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      </section>
      <section class="sec">
        <h2 class="h2">${t("det.features")}</h2>
        <ul class="features">${lk.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        ${lk.vs ? `<p class="vs">${esc(lk.vs)}</p>` : ""}
      </section>
    </div>
    <section class="sec">
      <div class="sec-h"><h2 class="h2">${t("det.steps")}</h2><span class="progress">${t("det.progress", { a: state.done.size, b: total })}</span></div>
      <p class="sub">${t("det.stepsSub")}</p>
      <div class="steps">${steps}</div>
    </section>
  </div>
</div>`;
}

/* ---------- catalogue-only detail: entries that have no adapted look ---------- */
const CAT_FEAT = ["skin", "brows", "eyes", "liner", "lashes", "blush", "contour_bronzer", "highlight", "lips"];
// Palette roles the face drawing can place; anything else stays in the swatch list only.
const CAT_ROLE = { lip: "lip", lips: "lip", blush: "blush", cheek: "blush", cheeks: "blush", "eye-main": "main", eyes: "main", eye: "main", lid: "main", "eye-depth": "depth", liner: "liner", shimmer: "shimmer", highlight: "hl", bronzer: "contour" };
const catEntry = id => CATALOG.find(e => e.id === id);
const catHex = h => (typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : null);
const featText = v => (v && !/^(not defined|n\/a)$/i.test(v.trim()) ? v.trim() : "");
// Only the first clause counts: later "| Thai: …" clauses are regional variants.
const featOn = v => !!featText(v) && !/^(none|no\b|optional|not defined|n\/a)/i.test(v.trim().split("|")[0].trim());
// Draws the entry's own colours on the profile's bare face. Reference looks and entries with nothing drawable get null.
function catDiagram(e) {
  if (e.fit === "Tham khảo" || e.kind === "traditional") return null;
  const dg = { skin: PC.skin.hex, brow: {}, lid: {}, blush: {}, contour: {}, highlight: {}, lips: {} }, seen = {};
  e.det.p.forEach(p => {
    const h = catHex(p[0]), r = CAT_ROLE[p[2]];
    if (!h || !r || seen[r]) return;
    seen[r] = 1;
    if (r === "main") dg.lid.main = h;
    if (r === "depth") { dg.lid.depth = h; dg.lid.lowerLash = "full"; }
    if (r === "liner") dg.liner = { hex: h, style: "short-wing" };
    if (r === "shimmer") dg.lid.shimmer = h;
    if (r === "hl") dg.highlight = { hex: h, finish: "matte", areas: ["nose-bridge"] };
    if (r === "contour") dg.contour = { hex: h, areas: ["cheek-hollow", "jaw"] };
    if (r === "blush") dg.blush = { hex: h, shape: "horizontal-mid-cheek", intensity: .42 };
    if (r === "lip") { dg.lips.color = h; dg.lips.outer = null; }
  });
  return Object.keys(seen).length ? dg : null;
}
// Shape hints from the profile's face rules, one per feature the entry actually has; never colours.
function catHints(e) {
  const f = e.det.f, on = k => featOn(f[k]);
  return [on("brows") && "brow", on("liner") && "liner", on("blush") && "blush", on("contour_bronzer") && "contour", on("highlight") && "hl"].filter(h => h && P.face.hints[h]);
}
function catSrc(u) {
  if (!/^https?:\/\//i.test(u)) return `<li>${esc(u)}</li>`;
  const s = u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.length > 64 ? s.slice(0, 63) + "…" : s)}</a></li>`;
}
function scrCatDetail() {
  const e = catEntry(state.catId) || CATALOG[0], d = e.det;
  const [main, sub] = titleParts(e.name);
  const ref = e.fit === "Tham khảo", fit = FIT[e.fit];
  // Vietnamese mode shows the *_vi research text; English mode and any missing _vi fall back to the English source.
  const vi = LANG !== "en";
  const feats = CAT_FEAT.map(k => [k, featText(d.f[k]) && ((vi && d.fv && d.fv[k]) || featText(d.f[k]))]).filter(x => x[1]);
  const techs = vi && d.kv ? d.kv : d.k, origin = vi && d.ov ? d.ov : d.o;
  const dg = catDiagram(e);
  const pal = d.p.map(p => [catHex(p[0]), (vi && p[3]) || p[1]]);
  const aka = e.aka.concat(d.a || []).filter(a => a.toLowerCase() !== e.name.toLowerCase());
  const why = [];
  if (d.n === 0) why.push(t("cd.low0")); else if (d.n === 1) why.push(t("cd.low1"));
  if (feats.length < 3) why.push(t("cd.lowThin"));
  const hints = ref ? [] : catHints(e);
  const hexes = dg ? pal.map(p => p[0]) : [];
  return `<div class="wrap det">
  <button type="button" class="back" data-go="layout">${ic("back")} ${t("nav.layout")}</button>
  <header class="scr-head det-head">
    <h1 class="scr-title">${esc(main)}${sub ? `<span class="aka">${esc(sub)}</span>` : ""}</h1>
    ${e.summary ? `<p class="lede">${esc(e.summary)}</p>` : ""}
    ${aka.length ? `<p class="cd-aka"><b>${t("cd.aka")}:</b> ${aka.map(esc).join(" · ")}</p>` : ""}
    <div class="meta-row"><span class="cd-chip">${esc(KIND[e.kind])}</span>${e.regions.map(r => `<span class="cd-chip">${esc(REG[r] || r)}</span>`).join("")}${e.vnSrc ? `<span class="vn">${t("lib.popVn")}</span>` : ""}<span>${d.n ? t("cd.srcN", { n: d.n }) : t("cd.srcZero")}</span></div>
    ${ref ? `<p class="cd-note">${t("cd.ref")}</p>` : `<div class="meta-row"><span class="fit-pill f${fit}" title="${esc(t("fit.tip"))}">${t("fit.prefix")}: ${esc(dx("fit", e.fit))}</span></div>
    ${e.fitWhy ? `<p class="fit-why">${esc(tx(e.fitWhy))}</p>` : ""}
    <p class="hint">${t("cd.noMine")}</p>`}
    ${why.length ? `<p class="cd-note cd-low">${t("cd.low", { why: why.join(", ") })}</p>` : ""}
  </header>
  <section class="pair one" aria-label="${t("det.orig")}">
    <figure class="face-card"><figcaption><b>${dg ? t("det.orig") : t("cd.bare")}</b><span>${dg ? t("det.origSub") : ref ? t("cd.bareRef") : t("cd.bareSub")}</span></figcaption><div class="stagebox">${faceSVG(dg || bareFace(), { label: dg ? t("det.origLabel") : t("id.faceLabel") })}</div>${dg ? strip(hexes) : ""}</figure>
  </section>
  <div class="det-grid">
    <div class="det-left">
      ${feats.length ? `<section class="sec"><h2 class="h2">${t("det.features")}</h2><dl class="cd-feat">${feats.map(f => `<div><dt>${t("cd.f." + f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join("")}</dl></section>` : ""}
      ${techs.length ? `<section class="sec"><h2 class="h2">${t("cd.tech")}</h2><ul class="features">${techs.map(k => `<li>${esc(k)}</li>`).join("")}</ul></section>` : ""}
      ${GAPS[e.id] ? mineBlock(e.id) : ""}
      ${hints.length ? `<section class="sec"><h2 class="h2">${t("cd.adapt")}</h2><p class="sub">${t("cd.adaptSub")}</p><ul class="notes-list">${hints.map(h => `<li>${esc(tx(P.face.hints[h]))}</li>`).join("")}</ul></section>` : ""}
    </div>
    <div class="det-left">
      ${pal.length ? `<section class="sec"><h2 class="h2">${t("det.orig")}</h2><ul class="cd-pal">${pal.map(p => `<li><i${p[0] ? ` style="background:${p[0]}"` : ` class="none"`}></i><span><b>${esc(p[1])}</b>${p[0] ? `<code>${p[0]}</code>` : `<em>${t("cd.noSample")}</em>`}</span></li>`).join("")}</ul></section>` : ""}
      <section class="sec"><dl class="cd-meta">${e.period ? `<div><dt>${t("cd.period")}</dt><dd>${esc((vi && e.periodVi) || e.period)}</dd></div>` : ""}${origin ? `<div><dt>${t("cd.origin")}</dt><dd>${esc(origin)}</dd></div>` : ""}</dl></section>
      <section class="sec"><h2 class="h2">${t("cd.srcRead")}</h2>${d.v.length ? `<ul class="cd-src">${d.v.map(catSrc).join("")}</ul>` : `<p class="sub">${t("cd.srcNone")}</p>`}
      ${d.s.length ? `<h3 class="cd-h3">${t("cd.srcOther")}</h3><ul class="cd-src">${d.s.map(catSrc).join("")}</ul>` : ""}</section>
    </div>
  </div>
</div>`;
}

const MAKEUP_KEYS = ["am-base", "am-conc", "am-hl", "am-powder", "am-eye", "am-lip"];

/* ---------- routine tracker: ticks per day, kept in this browser ---------- */
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ROUTINE_DONE = store.get("routine.done", {});
const doneOn = date => new Set(ROUTINE_DONE[date] || []);
function toggleStep(key) {
  const date = isoDate(new Date()), set = doneOn(date);
  set.has(key) ? set.delete(key) : set.add(key);
  ROUTINE_DONE[date] = [...set];
  // Keep three weeks of history, no more.
  Object.keys(ROUTINE_DONE).sort().slice(0, -21).forEach(k => delete ROUTINE_DONE[k]);
  store.set("routine.done", ROUTINE_DONE);
}
const stepName = s => Array.isArray(s.step) ? tx(s.step) : dx("step", s.step);
function tstep(s, n) {
  const done = s.key && doneOn(isoDate(new Date())).has(s.key);
  const tick = s.key ? `<button type="button" class="tick" data-rtick="${esc(s.key)}" aria-pressed="${!!done}" aria-label="${esc(t("skin.tick", { name: stepName(s) }))}">${ic("check")}</button>` : "";
  return `<li class="tstep${done ? " done" : ""}"><span class="n">${n}</span><div><p class="t"><b>${esc(stepName(s))}</b></p><p class="prod">${esc(s.product || "")}</p></div>${tick}</li>`;
}
function weekDays() {
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return [0, 1, 2, 3, 4, 5, 6].map(i => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
}
function scrSkin() {
  const R = P.routine, M = R.meds || [];
  if (!R.am.length && !R.noon.length && !R.pm.length) return `<div class="wrap skin"><header class="scr-head"><p class="eyebrow">${t("cat.care")}</p><h1 class="scr-title">${t("nav.skin")}</h1><p class="sub">${t("skin.noRoutine")}</p></header></div>`;
  const am = R.am.filter(s => MAKEUP_KEYS.indexOf(s.key) < 0), mk = R.am.filter(s => MAKEUP_KEYS.indexOf(s.key) >= 0);
  const period = (name, sub, list, extra) => `<li class="period"><div class="p-head"><h2>${name}</h2><span>${sub}</span></div><ol class="p-steps">${list.map((s, i) => tstep(s, i + 1)).join("")}${extra || ""}</ol></li>`;
  const mkGroup = mk.length ? `<li class="tstep"><span class="n">+</span><div><details class="mk-group"><summary><b>${t("skin.makeup")}</b><span class="prod">${t("skin.steps", { n: mk.length })}</span>${ic("chev", "chev")}</summary><ol class="mk-list">${mk.map(s => tstep(s, "·")).join("")}</ol></details></div></li>` : "";
  const dayNames = LANG === "en" ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const week = weekDays(), todayIdx = (new Date().getDay() + 6) % 7;
  const col = i => ` c${i === todayIdx ? " today-col" : ""}`;
  // Without medication the week shows how much of each period was ticked off.
  const rows = M.length
    ? M.map(m => `<span class="lab">${esc(m.name)}</span>${dayNames.map((d, i) => `<span class="c${i === todayIdx ? " today-col" : ""}">${medOn(m, i) ? `<i class="${m.route === "oral" ? "dot-solid" : "dot-ring"}" title="${esc(tx(m.dot || ""))}"></i>` : ""}</span>`).join("")}`).join("")
    : [["am", "skin.weekAm"], ["pm", "skin.weekPm"]].filter(([k]) => R[k].some(s => s.key)).map(([k, lk]) => {
      const keys = R[k].filter(s => s.key).map(s => s.key);
      return `<span class="lab">${t(lk)}</span>${week.map((d, i) => { const ds = doneOn(isoDate(d)), all = keys.every(x => ds.has(x)); return `<span class="c${i === todayIdx ? " today-col" : ""}">${all ? '<i class="dot-ring"></i>' : ""}</span>`; }).join("")}`;
    }).join("");
  const medsHead = M.length ? `<dl class="meds">${M.map(m => `<div><dt>${t(m.route === "oral" ? "skin.oral" : "skin.topical")}</dt><dd>${esc(m.name)}${m.when ? " · " + esc(tx(m.when)) : ""}</dd></div>`).join("")}</dl>` : "";
  return `<div class="wrap skin">
  <header class="scr-head">
    <p class="eyebrow">${t("cat.care")}</p>
    <h1 class="scr-title">${t("nav.skin")}</h1>
    ${medsHead}
  </header>
  <div class="skin-grid">
    <div class="skin-l">
    <ol class="tl">
      ${R.am.length ? period(t("skin.am"), t("skin.amSub", { n: am.length }), am, mkGroup) : ""}
      ${R.noon.length ? period(t("skin.noon"), t("skin.noonSub"), R.noon) : ""}
      ${R.pm.length ? period(t("skin.pm"), R.pmSub ? tx(R.pmSub) : t("skin.amSub", { n: R.pm.length }), R.pm) : ""}
    </ol>
    </div>
    <div class="skin-r">
    ${rows ? `<section class="week" aria-label="${t("skin.week")}">
      <h2 class="eyebrow">${t(M.length ? "skin.week" : "skin.weekDone")}</h2>
      <div class="wk">
        <span></span>${dayNames.map((d, i) => `<span class="d${i === todayIdx ? " today" : ""}">${d}</span>`).join("")}
        ${rows}
      </div>
    </section>` : ""}
    </div>
  </div>
</div>`;
}

const analysisText = v => Array.isArray(v) ? tx(v) : v == null ? "" : v;
function scrProfile() {
  const I = P.identity, an = P.face.analysis, M = P.routine.meds || [];
  const make = inventory().map(it => [itemName(it), catName(it.cat) + (it.noColor ? " · " + t("inv.noNeed") : "") + ((it.pans || [it]).some(p => p.est) ? " · " + t("tag.est") : ""), it.noColor ? undefined : (it.pans || [it]).every(p => p.hex) ? (it.pans || [it]).map(p => p.hex) : null, it.id]);
  const care = CARE0.map(c => [c.name, tx(c.note || "")]);
  const meds = M.map(m => [m.name, t(m.route === "oral" ? "skin.oral" : "skin.topical") + (m.when ? " · " + tx(m.when) : "")]);
  const row = (p, sws) => `<li><span class="own-sw${sws ? "" : " none"}">${(sws || []).map(h => `<i style="background:${h}"></i>`).join("")}</span><b>${esc(p[0])}</b><small>${esc(p[1])}</small>${sws === undefined ? "" : (!sws ? `<button type="button" class="link" data-open-inv="${p[3]}">${t("act.addColor")}</button>` : "")}</li>`;
  const careRow = p => `<li><span class="own-sw none"></span><b>${esc(p[0])}</b><small>${esc(p[1])}</small></li>`;
  const facts = [["prof.tone", tx(I.toneLong || I.tone)], ["prof.type", tx(I.type)], ["prof.pc", tx(I.pcLong) || seasonName()], ["prof.contrast", an ? analysisText(an.contrast) : ""]].filter(f => f[1]);
  const rules = an && an.rules || [];
  return `<div class="wrap prof">
  <header class="scr-head"><div><p class="eyebrow">${t("prof.eyebrow")}</p><h1 class="scr-title">${t("prof.title")}</h1><p class="sub">${t("prof.help")}</p></div></header>
  <div class="prof-grid">
    <div style="display:grid;gap:30px;min-width:0">
      <section class="skin-card">
        <label class="pname"><span>${t("prof.name")}</span><input type="text" data-pname maxlength="30" autocomplete="off" value="${esc(P.name)}"></label>
        <div class="big-chip"><b>${esc(P.shade || "")}</b><span>${esc(pcName("skin"))}</span></div>
        <dl class="facts">${facts.map(f => `<div><dt>${t(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join("")}</dl>
      </section>
      ${pcPanel()}
      <section class="sec">
        <h2 class="h2">${t("prof.shift")}</h2>
        <ul class="shift-rows">
          ${UNDERTONE_SHIFT() >= 5 ? `<li><i class="sw" style="background:#e9997a"></i>${ic("arrow")}<i class="sw" style="background:${onSkin("#e9997a", "ma")}"></i><span>${t("prof.s1")}</span></li>
          <li><i class="sw" style="background:#e8732c"></i>${ic("arrow")}<i class="sw" style="background:${onSkin("#e8732c", "son")}"></i><span>${t("prof.s2")}</span></li>` : ""}
          <li><i class="sw" style="background:#f4b6c8"></i>${ic("arrow")}<i class="sw" style="background:${SKIN()}"></i><span>${t("prof.s3")}</span></li>
        </ul>
      </section>
    </div>
    <section class="sec">
      <h2 class="h2">${t("prof.face")}</h2>
      <div class="face-row">
        <div class="stagebox">${faceSVG(bareFace(), { label: t("prof.faceLabel") })}</div>
        ${an && an.items ? `<dl class="face-dl">${an.items.slice(0, 7).map(f => `<div><dt>${esc(tx(f.k))}</dt><dd>${esc(analysisText(f.v))}</dd></div>`).join("")}</dl>` : ""}
      </div>
      ${visualWeight()}
      ${rules.length ? `<details class="acc"><summary>${t("prof.rules", { n: rules.length })}${ic("chev", "chev")}</summary><div class="acc-body"><ol class="rules-ol">${rules.map(r => `<li>${esc(analysisText(r))}</li>`).join("")}</ol>${an.note ? `<p class="fine">${esc(analysisText(an.note))}</p>` : ""}</div></details>` : ""}
    </section>
    <section class="sec">
      <h2 class="h2">${t("set.title")}</h2>
      <div class="set-row"><b>${t("set.lang")}</b><span class="seg2" role="group" aria-label="${t("set.lang")}"><button type="button" data-deflang="vi" aria-pressed="${state.defLang === "vi"}">Tiếng Việt</button><button type="button" data-deflang="en" aria-pressed="${state.defLang === "en"}">English</button></span><p>${t("set.langHelp")}</p></div>
      <div class="set-row"><b>${t("set.loc")}</b><select class="sel" data-loc aria-label="${t("set.loc")}">${Object.keys(LOCS).map(k => `<option value="${k}"${LOC.id === k ? " selected" : ""}>${t(LOCS[k].k)}</option>`).join("")}</select><p>${t("set.locHelp", { season: season().name })}</p></div>
      ${LOC.id === "other" ? `<div class="set-row"><b>${t("set.clim")}</b><span class="seg2" role="group" aria-label="${t("set.clim")}">${["humid", "cold", "mild"].map(c => `<button type="button" data-clim="${c}" aria-pressed="${LOC.climate === c}">${t("climS." + c)}</button>`).join("")}</span></div>` : ""}
      <div class="set-row"><b>${t("set.data")}</b><span class="seg2" role="group" aria-label="${t("set.data")}"><button type="button" data-export>${t("set.export")}</button><label class="seg-file">${t("set.import")}<input type="file" id="import-file" accept="application/json,.json"></label><button type="button" data-reset>${t("set.reset")}</button></span><p>${t("set.dataHelp")}</p></div>
    </section>
    <section class="sec owned-sec">
      <div class="sec-h"><h2 class="h2">${t("prof.using")}</h2><button type="button" class="link" data-shop-tab="inv">${t("prof.openInv")}</button></div>
      <div class="own-groups">
        <div class="sec" style="gap:10px"><h3 class="eyebrow">${t("skin.makeup")} · ${make.length}</h3><ul class="owned-list">${make.map(p => row(p, p[2])).join("")}</ul></div>
        ${care.length ? `<div class="sec" style="gap:10px"><h3 class="eyebrow">${t("cat.care")} · ${care.length}</h3><ul class="owned-list">${care.map(careRow).join("")}</ul></div>` : ""}
        ${meds.length ? `<div class="sec" style="gap:10px"><h3 class="eyebrow">${t("prof.meds")} · ${meds.length}</h3><ul class="owned-list">${meds.map(careRow).join("")}</ul></div>` : ""}
      </div>
    </section>
  </div>
</div>`;
}
