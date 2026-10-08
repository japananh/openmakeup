/* ---------- Cần mua ---------- */
function shopNeed() {
  const starred = GAP_LOOKS.filter(l => SHOPST.starred.has(l.id)), ready = starred.filter(l => GAPS[l.id].state === "ready");
  const unkInv = inventory().filter(it => !it.noColor && !(it.pans || [it]).every(p => p.hex));
  const stars = SHOPST.editStars ? GAP_LOOKS : starred;
  const buy = PLAN.map((p, i) => {
    const total = starred.length, after = p.readyAfter.length;
    const val = p.done.length
      ? (i === 0 ? t("val.first", { n: p.done.length, names: names(p.done, 3) }) : t("val.more", { i, n: p.done.length, names: names(p.done, 3) }))
      : t("val.fill", { n: p.touched.length });
    const owns = SRCS.some(x => (p.pans || [p]).some(q => q.cat === x.cat) && x.hex);
    const near = p.pans ? (owns ? "" : t("near.none", { cat: catName(p.cat).toLowerCase() })) : p.nearest
      ? `${pair(pickHexes(p)[p.pans ? 1 % p.pans.length : 0], p.nearest.src.hex)}${t("near.has", { reason: esc(diffWords(p.nearest.src.hex, p.hex, srcName(p.nearest.src), dx("swatch", p.swatch), p.cat)) })}`
      : t("near.none", { cat: catName(p.cat).toLowerCase() });
    const coolWhy = p.coolSkip ? ` <span class="b-why">${esc(dx2(p.coolSkip.coolNote))}</span>` : "";
    const maybe = p.pans ? "" : maybeLine(p.gaps);
    const multi = p.multi === "cream" ? `<p class="b-why">${t("buy.cream")}</p>` : "";
    const top = p.pans ? Math.max(...p.pans.map(x => x.looks.length)) : 0;
    const must = x => x.looks.length >= Math.max(2, Math.ceil(top / 2));
    const req = p.pans ? `<p class="b-why"><b>${t("req." + p.group)}</b></p><ul class="req">${p.pans.slice().sort((a, b) => b.looks.length - a.looks.length).map(x => `<li><i class="sw" style="background:${x.hex}"></i><span><b>${esc(panWords(x))}</b><span class="tag ${must(x) ? "must" : "nice"}">${t(must(x) ? "req.must" : "req.nice")}</span><small>${t("req.for", { n: x.looks.length, names: esc(names(x.looks, 3)) })}</small>${panNear(x)}${maybeLine(x.gaps)}</span></li>`).join("")}</ul><p class="hint">${t("req.more")}</p>${p.group === "eye" && STR["req.refs"] ? `<details class="refs"><summary>${t("req.refsT")} ${ic("chev", "chev")}</summary><p class="hint">${t("req.refs")}</p></details>` : ""}` : "";
    return `<li><span class="n">${i + 1}</span><span class="b-sw${p.pans ? " multi" : ""}">${pickHexes(p).map(h => `<i style="background:${h}"></i>`).join("")}</span>
    <div class="b-main"><p class="b-name"><b>${esc(pickName(p))}</b></p>
    <p class="b-val${p.done.length ? "" : " soft"}">${val}</p>
    ${p.pans ? req : `<p class="b-why">${t("why.miss", { names: esc(names(p.touched, 5)) })}</p>`}${multi}
    ${near ? `<p class="b-near">${near}${coolWhy}</p>` : coolWhy ? `<p class="b-near">${coolWhy}</p>` : ""}${maybe ? `<p class="b-near">${maybe}</p>` : ""}
    <div class="b-acts"><button type="button" class="btn" data-buy="${i}">${ic("check")} ${t("act.bought")}</button>${p.hex ? `<button type="button" class="link" data-check-hex="${p.hex}" data-check-cat="${p.cat}">${t("act.check")}</button>` : ""}<span class="cum"><span class="meter" aria-hidden="true">${starred.map((l, k) => `<i class="${k < after ? "on" : ""}"></i>`).join("")}</span> ${t("cum", { a: after, b: total })}</span></div>
    ${SHOPST.form === "buy" + i ? buyForm(p, i) : ""}</div></li>`;
  }).join("");
  return `<div class="sh-body">
  <section class="stars">
    <div class="inv-h"><h3 class="eyebrow">${t("need.stars", { n: starred.length })}</h3><button type="button" class="link" data-edit-stars>${t(SHOPST.editStars ? "act.done" : "act.edit")}</button></div>
    <div class="chip-row">${stars.map(l => `<button type="button" class="chip${SHOPST.starred.has(l.id) ? "" : " off"}" ${SHOPST.editStars ? `data-star="${l.id}" aria-pressed="${SHOPST.starred.has(l.id)}"` : `data-lib="${l.id}"`}>${SHOPST.editStars ? (SHOPST.starred.has(l.id) ? "★ " : "☆ ") : ""}${esc(lkName(l.id))} ${readyBadge(GAPS[l.id])}</button>`).join("")}</div>
    ${SHOPST.editStars ? "" : `<p class="hint">${t("need.default")}</p>`}
    <p class="sub">${!starred.length ? t("need.none") : PLAN.length ? t("need.sum", { r: ready.length, n: starred.length, k: PLAN.length }) : t("need.sumDone", { r: ready.length, n: starred.length })}</p>
  </section>
  ${skippedCats() ? `<div class="notice"><span>${t("scope.note", { cats: esc(skippedCats()) })}</span><button type="button" class="link" data-shop-tab="inv">${t("tab.inv")}</button></div>` : ""}
  ${unkInv.length ? `<div class="notice"><span><b>${tn("note.unkAll", unkInv.length, { n: unkInv.length, names: esc(unkInv.map(itemShort).join(", ")) })}</b></span><button type="button" class="link" data-shop-tab="inv">${t("act.addColor")}</button></div>` : ""}
  <section class="sec" style="gap:6px">
    <div class="inv-h"><h3 class="eyebrow">${t("need.makeup")}</h3><span class="hint">${t("need.order")}</span></div>
    ${PLAN.length ? `<ol class="buy">${buy}</ol>` : `<p class="sub">${t(starred.length ? "need.allSet" : "need.none")}</p>`}
  </section>
  <section class="sec" style="gap:6px">
    <div class="inv-h"><h3 class="eyebrow">${t("need.manual")}</h3></div>
    ${SHOPST.manual.length ? `<ul class="inv">${SHOPST.manual.map((m, i) => `<li><span class="own-sw" style="background:${m.hex || "var(--fill)"}"></span><b>${esc(m.name)}</b><small>${esc(m.src)}</small><span class="acts"><button type="button" class="link" data-remove="${i}">${t("act.remove")}</button></span></li>`).join("")}</ul>` : ""}
    <p class="sub">${t("need.manualHint")}</p>
  </section>
</div>
<footer class="sh-foot"><button type="button" class="btn" data-shop-tab="inv">${t("tab.inv")}</button><button type="button" class="btn primary" data-copy-list>${t("act.copyList")}</button></footer>`;
}
function colorField(hex, attr, label) {
  return `<span class="pan"><label class="ck-pick" style="background:${hex}"><input type="color" ${attr} value="${hex}" aria-label="${esc(label)}"></label>${esc(label)}</span>`;
}
function buyForm(p, i) {
  const pans = p.pans ? p.pans.map(x => [x.hex, panWords(x)]) : [[p.hex, dx("swatch", p.swatch)]];
  return `<div class="buy-form"><p>${t("form.buy")}</p><div class="pans">${pans.map((x, k) => colorField(x[0], `data-fcolor="${k}"`, x[1])).join("")}</div>
  <div class="row"><button type="button" class="btn primary" data-buy-save="${i}">${t("act.saveInv")}</button><button type="button" class="link" data-form-close>${t("act.cancel")}</button></div></div>`;
}

/* ---------- Đồ đang có ---------- */
function usage(it) {
  let used = 0, blocks = 0;
  GAP_LOOKS.forEach(l => { const g = GAPS[l.id]; if (g.rows.some(x => x.r.src && x.r.src.item === it)) used++; if (g.unkItems.includes(it)) blocks++; });
  return { used, blocks };
}
function invRow(it) {
  const u = usage(it), pans = it.pans || [it], known = pans.every(p => p.hex), est = pans.some(p => p.est);
  const used = u.used ? t("inv.used", { n: u.used }) : "";
  if (it.noColor) return `<li><span class="own-sw care">${ic("check")}</span><b>${esc(itemName(it))}</b><small>${[catName(it.cat), t(it.clear ? "inv.clear" : "inv.noNeed"), used].filter(Boolean).join(" · ")}</small></li>`;
  const fins = [...new Set(pans.map(p => p.fin).filter(Boolean))].map(k => t(k));
  const meta = [catName(it.cat), fins.join(" / "), it.cheek ? t("inv.cheek") : "", it.unv ? t("inv.brandUnv") : ""].filter(Boolean);
  if (est) meta.push(`<span class="tag s1">${t("tag.estHint")}</span>`);
  if (it.buy) meta.push(t("inv.bought"));
  const sw = known ? `<span class="own-sw">${pans.map(p => `<i style="background:${p.hex}"></i>`).join("")}</span>` : `<span class="own-sw none"></span>`;
  const line = known ? `<small>${meta.join(" · ")}${used ? " · " + used : ""}</small>` : `<small>${meta.join(" · ")}</small><small class="unk"><strong>${t("inv.noColor")}</strong>${u.blocks ? t("inv.blocks", { n: u.blocks }) : t("inv.noBlock")}</small>`;
  const act = !known ? `<button type="button" class="link" data-edit="${it.id}">${t("act.addColor")}</button>` : est ? `<button type="button" class="link" data-edit="${it.id}">${t("act.realColor")}</button>` : "";
  const panList = it.pans && known ? `<ul class="pans-l${it.pans.length > 4 ? " cols" : ""}">${it.pans.map(p => `<li><i class="sw" style="background:${p.hex}"></i>${esc(panName(p))}${p.fin && p.fin !== it.pans[0].fin ? ` <span>· ${esc(t(p.fin))}</span>` : ""}${p.cat && p.cat !== it.cat ? ` <span>· ${esc(catName(p.cat).toLowerCase())}</span>` : ""}</li>`).join("")}</ul>` : "";
  return `<li${!known ? '' : ""}>${sw}<b>${esc(itemName(it))}</b>${line}<span class="acts">${act}</span>${panList}${SHOPST.form === "edit" + it.id ? editForm(it) : ""}</li>`;
}
function editForm(it) {
  const pans = it.pans ? it.pans.map(p => [p.hex, panName(p)]) : [[it.hex || "#b0706a", it.multi ? t("form.oneTint") : itemName(it)]];
  return `<div class="buy-form"><p>${t(it.multi ? "form.tint" : "form.edit")}</p><div class="pans">${pans.map((x, k) => colorField(x[0], `data-fcolor="${k}"`, x[1])).join("")}</div>
  <div class="row"><button type="button" class="btn primary" data-edit-save="${it.id}">${t("act.saveColor")}</button><button type="button" class="link" data-form-close>${t("act.cancel")}</button></div></div>`;
}
const ADD_CATS = ["nen", "che", "phu", "khoa", "mat", "liner", "ma", "khoi", "hl", "may", "son", "chi"];
function addForm() {
  return `<div class="buy-form" id="add-form"><p>${t("inv.addTitle")}</p>
  <label class="field">${t("inv.fType")}<select class="sel" id="add-type">${ADD_CATS.map(c => `<option value="${c}">${esc(catName(c))}</option>`).join("")}</select></label>
  <label class="field">${t("inv.fName")}<input id="add-name" maxlength="60" autocomplete="off"></label>
  <div class="pans">${colorField("#a0645e", 'data-fcolor="0"', t("inv.fColor"))}</div>
  <div class="row"><button type="button" class="btn primary" data-add-save>${t("act.saveItem")}</button><button type="button" class="link" data-form-close>${t("act.cancel")}</button></div></div>`;
}
function shopInv() {
  const inv = inventory(), groups = {};
  inv.forEach(it => (groups[it.cat] = groups[it.cat] || []).push(it));
  const order = ["nen", "che", "phu", "khoa", "mat", "liner", "ma", "khoi", "hl", "may", "son", "chi"].filter(c => groups[c]);
  const unknown = inv.filter(it => !it.noColor && !(it.pans || [it]).every(p => p.hex)).length;
  return `<div class="sh-body">
  <p class="sub">${t("inv.lede", { n: inv.length, m: unknown })}</p>
  ${SHOPST.form === "add" ? addForm() : ""}
  ${order.map((c, k) => `<section class="sec" style="gap:4px"${k === 0 ? '' : ""}><h3 class="eyebrow">${catName(c)}</h3><ul class="inv">${groups[c].map(invRow).join("")}</ul></section>`).join("")}
</div>
<footer class="sh-foot"><button type="button" class="btn" data-add-item>${t("act.addItem")}</button><button type="button" class="btn primary" data-shop-tab="need">${t("tab.need")} · ${shopCount()}</button></footer>`;
}
function shShop() {
  const tab = SHOPST.tab;
  return `<header class="sh-head"><h2>${t("shop.title")}</h2><button type="button" class="icon-btn" data-close aria-label="${t("act.close")}">${ic("close")}</button><p>${t(tab === "need" ? "shop.subNeed" : "shop.subInv")}</p>
  <div class="sh-tabs" role="tablist"><button type="button" role="tab" data-shop-tab="need" aria-selected="${tab === "need"}">${t("tab.need")}<span>${shopCount()}</span></button><button type="button" role="tab" data-shop-tab="inv" aria-selected="${tab === "inv"}">${t("tab.inv")}<span>${inventory().length}</span></button></div></header>
${tab === "need" ? shopNeed() : shopInv()}`;
}

/* ---------- layout detail: "Đồ của bạn cho layout này" ---------- */
function mineBlock(id) {
  const g = GAPS[id];
  if (!g) return "";
  const on = SHOPST.starred.has(id);
  const why = x => {
    const r = x.r;
    if (r.plain) return t("mine.have", { name: srcName(r.src) });
    if (r.s === "ok") return t("mine.ok", { name: srcName(r.src) }) + (r.src.est ? " (" + t("tag.est") + ")" : "");
    if (r.s === "near") return (r.rule ? t("mine.cross", { name: srcName(r.src), rule: t(r.rule) }) : t("mine.near", { name: srcName(r.src) })) + " " + nearWords(r.src.hex, x.st.hex, x.st.cat);
    if (r.s === "unk") return t("mine.unk", { name: r.unk.map(u => srcName(u)).join(", ") });
    const cool = r.coolSkip ? dx2(r.coolSkip.coolNote) + ". " : "";
    const twin = !g.need.includes(x) && g.need.find(y => y.st.cat === x.st.cat && dE(y.st.hex, x.st.hex) <= MATCH);
    if (twin) return t("mine.sameAs", { label: dx("label", twin.st.label) });
    return cool + (r.nearest ? diffWords(r.nearest.src.hex, x.st.hex, srcName(r.nearest.src), dx("swatch", x.st.swatch), x.st.cat) : t("mine.missNone", { cat: catName(x.st.cat).toLowerCase() }));
  };
  const own = x => x.r.src ? x.r.src.hex : x.r.s === "miss" && x.r.nearest ? x.r.nearest.src.hex : null;
  const li = x => `<li>${pair(x.st.hex, own(x))}<div><b>${esc(dx("label", x.st.label))}${x.st.swatch ? ` <span>· ${esc(dx("swatch", x.st.swatch))}</span>` : ""}</b>${x.r.plain ? `<span class="stc ok">${t("st.have")}</span>` : stChip(x.r.s)}<small>${esc(why(x))}</small></div></li>`;
  const order = { miss: 0, unk: 1, near: 2, ok: 3 };
  const open = g.rows.filter(x => x.r.s !== "ok").sort((a, b) => order[a.r.s] - order[b.r.s]), ok = g.rows.filter(x => x.r.s === "ok");
  const pill = g.state === "ready" ? "v0" : g.state === "unk" ? "vu" : "v2";
  const unkIt = g.unkItems[0];
  return `<section class="sec mine">
  <div class="mine-h"><h2 class="h2">${t("mine.title")}</h2><button type="button" class="chip" data-star="${id}" aria-pressed="${on}">${on ? "★" : "☆"} ${t("mine.star")}</button></div>
  <p class="mine-sum"><span class="pill ${pill}">${readyLine(g)}</span>${g.state !== "ready" ? `<span>${t("mine.counts", { a: ok.length, b: g.rows.length })}</span>` : ""}</p>
  ${GL[id].skip.length ? `<p class="hint">${t("scope.note", { cats: esc(GL[id].skip.map(c => catName(c).toLowerCase()).join(", ")) })}</p>` : ""}
  ${open.length ? `<ul class="mine-list">${open.map(li).join("")}</ul>` : ""}
  ${ok.length ? `<details><summary>${t("mine.okN", { n: ok.length })} ${ic("chev", "chev")}</summary><ul class="mine-list">${ok.map(li).join("")}</ul></details>` : ""}
  <div class="actions">${g.need.length ? (on ? `<button type="button" class="btn" data-open="shop">${ic("bag")} ${t("mine.inList", { n: g.need.length })}</button>` : `<button type="button" class="btn primary" data-star="${id}" data-star-add>${ic("bag")} ${t("mine.add", { n: g.need.length })}</button>`) : ""}${unkIt ? `<button type="button" class="${g.need.length ? "link" : "btn primary"}" data-open-inv="${unkIt.id}">${t("mine.addColor", { name: itemName(unkIt) })}</button>` : ""}</div>
</section>`;
}

