/* ---------- face illustration: faceSvg + adaptDiagram, driven by the profile's geometry and rules ---------- */
const faceSVG = (function () {
  var faceSeq = 0;
  // Words for the drawing's alt text; they follow the language switch.
  var BROW_SHAPE = LV({ "straight": ["mày ngang", "straight brows"], "soft-arch": ["mày cong nhẹ", "softly arched brows"], "arched": ["mày cong", "arched brows"] });
  var LINER_STYLE = LV({ "tightline": ["kẻ lấp chân mi", "tightlined"], "short-wing": ["kẻ đuôi ngắn", "short wing"], "long-wing": ["kẻ đuôi dài", "long wing"], "puppy": ["kẻ đuôi rủ (mắt cún)", "puppy liner"] });
  var BLUSH_SHAPE = LV({ "apple-round": ["má tròn ở táo má", "round blush on the apples"], "horizontal-under-eye": ["má ngang dưới mắt", "horizontal blush under the eye"], "diagonal-cheekbone": ["má chéo theo gò má", "diagonal blush along the cheekbone"], "horizontal-mid-cheek": ["má ngang giữa má", "horizontal mid-cheek blush"], "nose-bridge-sunkissed": ["má sunkissed qua sống mũi", "sunkissed blush across the nose"] });
  var HL_FINISH = LV({ matte: ["lì", "matte"], glow: ["căng bóng", "glow"], blink: ["nhũ", "shimmer"] });
  var LIP_STYLE = LV({ full: ["tô đầy", "filled"], gradient: ["gradient", "gradient"], overlined: ["tô tràn viền", "overlined"], blurred: ["mờ viền", "blurred"] });

  // The profile's face rules bend a look's diagram to this face (shapes only, never colours); no rules, no changes.
  // The left half is drawn in x < 120 and mirrored for the right, so the face is symmetric by construction.
  function adaptDiagram(d) {
    d = d || {};
    var R = G.rules || {}, o = Object.assign({}, d);
    var br = Object.assign({}, d.brow || {});
    if (R.brow) {
      if (R.brow.shape && R.brow.shape[br.shape]) br.shape = R.brow.shape[br.shape];
      if (R.brow.thickness && R.brow.thickness[br.thickness]) br.thickness = R.brow.thickness[br.thickness];
    }
    o.brow = br;
    var ln = Object.assign({}, d.liner || {});
    if (R.liner && R.liner.style && R.liner.style[ln.style]) ln.style = R.liner.style[ln.style];
    o.liner = ln;
    var bl = Object.assign({}, d.blush || {});
    var bi = Number(bl.intensity);
    if (!isFinite(bi)) bi = .3;
    if (R.blush) {
      if (R.blush.scale && R.blush.scale[bl.shape]) bl.intensity = bi * R.blush.scale[bl.shape];
      // Shapes outside `keep` are redrawn as `force`, e.g. a long face never gets a diagonal blush up to the temple.
      if (R.blush.force && bl.shape && (R.blush.keep || []).indexOf(bl.shape) === -1) bl.shape = R.blush.force;
    }
    o.blush = bl;
    var hl = Object.assign({}, d.highlight || {});
    var HR = R.highlight || {};
    if (HR.glow && Array.isArray(hl.areas) && (hl.finish === "glow" || hl.finish === "blink")) {
      hl.areas = hl.areas.filter(function (a) { return (HR.glow.drop || []).indexOf(a) === -1; });
      (HR.glow.add || []).forEach(function (a) { if (hl.areas.indexOf(a) === -1) hl.areas.push(a); });
    }
    // Skipped for the bare face: areas to drop, a matte brightening on the temples, soft shading in the look's contour colour or a neutral one.
    if (Object.keys(d).length) {
      if (Array.isArray(hl.areas) && HR.drop) hl.areas = hl.areas.filter(function (a) { return HR.drop.indexOf(a) === -1; });
      if (HR.temple) hl.temple = normHex(hl.hex) || HR.temple;
      var CR = R.contour;
      if (CR) {
        var ctr = Object.assign({}, d.contour || {});
        ctr.areas = (Array.isArray(ctr.areas) ? ctr.areas : []).filter(function (a) { return (CR.drop || []).indexOf(a) === -1; });
        if (CR.shade) ctr.shade = { hex: normHex(ctr.hex) || CR.shade.hex, areas: CR.shade.areas };
        o.contour = ctr;
      }
    }
    o.highlight = hl;
    var lid = Object.assign({}, d.lid || {});
    if (R.lid && R.lid.creaseLift && lid.depthArea === "full-crease") lid.creaseLift = true;
    o.lid = lid;
    return o;
  }

  // Colours the drawing takes from the profile; refreshed on every call because the person can edit them.
  var MEAS = {};
  function refreshMeas() {
    var gc = G.colors;
    MEAS.skinRedness = gc.redness || mixHex(PC.skin.hex, "#b84a38", .34);
    MEAS.hair = gc.hairTones || [.05, .09, .13].map(function (f) { return mixHex(PC.hair.hex, "#ffffff", f); });
    MEAS.irisStops = gc.irisStops || [mixHex(PC.iris.hex, "#8a6a50", .16), darken(PC.iris.hex, .1), darken(PC.iris.hex, .4), darken(PC.iris.hex, .55)];
    MEAS.brow = [PC.brow.head || PC.brow.hex, PC.brow.hex, PC.brow.dark || PC.brow.hex];
    MEAS.lipFill = PC.lip.hex; MEAS.lipRim = PC.lip.rim || PC.lip.hex;
  }

  // One decimal is below the visible resolution and keeps each face SVG small.
  function f1(v, dp) { var k = dp === 0 ? 1 : 10; return String(Math.round(v * k) / k).replace(/^(-?)0\./, "$1."); }
  function pt(p, dp) { return f1(p[0], dp) + " " + f1(p[1], dp); }
  // Catmull-Rom spline through pts as cubic Béziers; move=false continues the current subpath.
  function crv(pts, closed, move, dp) {
    var n = pts.length, s = move === false ? "" : "M" + pt(pts[0], dp);
    var at = function (i) { return closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; };
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var a = at(i - 1), b = at(i), c = at(i + 1), e = at(i + 2);
      s += "C" + pt([b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], dp) + " " + pt([c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6], dp) + " " + pt(c, dp);
    }
    return s + (closed ? "Z" : "");
  }
  // Point and unit tangent at t in [0,1] along the same spline (uniform per segment).
  function crAt(pts, t) {
    var n = pts.length - 1, u = Math.min(n - 1e-6, Math.max(0, t * n)), i = Math.floor(u), k = u - i;
    var a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], e = pts[Math.min(n, i + 2)];
    var p = [0, 1].map(function (j) {
      return .5 * (2 * b[j] + (c[j] - a[j]) * k + (2 * a[j] - 5 * b[j] + 4 * c[j] - e[j]) * k * k + (3 * b[j] - a[j] - 3 * c[j] + e[j]) * k * k * k);
    });
    var d = [0, 1].map(function (j) {
      return .5 * ((c[j] - a[j]) + 2 * (2 * a[j] - 5 * b[j] + 4 * c[j] - e[j]) * k + 3 * (3 * b[j] - a[j] - 3 * c[j] + e[j]) * k * k);
    });
    var l = Math.hypot(d[0], d[1]) || 1;
    return { p: p, t: [d[0] / l, d[1] / l] };
  }
  // Fixed seed: every render draws the same brow hairs and hair strands.
  function prng(seed) { return function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
  // Shortest equivalent path data: a separator is only needed before a number that could otherwise merge with the previous one.
  function minD(dd) {
    var tk = dd.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)/g) || [], o = "", prev = "";
    tk.forEach(function (t) {
      var isNum = /\d/.test(t);
      if (isNum && /\d/.test(prev) && t[0] !== "-" && !(t[0] === "." && prev.indexOf(".") !== -1)) o += " ";
      o += t; prev = t;
    });
    return o;
  }
  function mirror(pts) { return pts.map(function (p) { return [240 - p[0], p[1]]; }); }
  // <ellipse> from [cx, cy, rx, ry, rotation?]
  function ell(a, attrs) {
    return '<ellipse cx="' + a[0] + '" cy="' + a[1] + '" rx="' + a[2] + '" ry="' + a[3] + '"' + (a[4] ? ' transform="rotate(' + a[4] + " " + a[0] + " " + a[1] + ')"' : "") + (attrs || "") + "/>";
  }

  function faceSvg(d, name, raw) {
    d = raw ? (d || {}) : adaptDiagram(d);
    var id = "fc" + (++faceSeq) + "-";
    var defs = [], seen = {};
    var hx = function (v) { return normHex(v); };
    var num = function (v, lo, hi, fb) { v = v == null ? NaN : Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb; };
    var blur = function (sd) {
      sd = [.3, .6, .9, 1.2, 1.6, 2.2, 3.5, 5, 7].reduce(function (a, b) { return Math.abs(b - sd) < Math.abs(a - sd) ? b : a; });
      var k = "b" + String(sd).replace(".", "_");
      if (!seen[k]) {
        seen[k] = 1;
        defs.push('<filter id="' + id + k + '" filterUnits="userSpaceOnUse" x="0" y="0" width="240" height="300"><feGaussianBlur stdDeviation="' + sd + '"/></filter>');
      }
      return ' filter="url(#' + id + k + ')"';
    };
    var pair = function (s) { return "<g>" + s + '</g><g transform="translate(240 0) scale(-1 1)">' + s + "</g>"; };
    // Same as pair() but the mirrored copy is a <use>, so large groups are not emitted twice.
    var pairU = function (k, s) { return '<g id="' + id + k + '">' + s + '</g><use href="#' + id + k + '" transform="translate(240 0) scale(-1 1)"/>'; };
    var HAIR = "fill:var(--hair)", WHITE = "fill:var(--face-white)";
    var path = function (dd, attrs) { return '<path d="' + dd + '"' + (attrs || "") + "/>"; };
    var def = function (k, dd) { defs.push('<path id="' + id + k + '" d="' + dd + '"/>'); };
    var use = function (k, attrs) { return '<use href="#' + id + k + '"' + (attrs || "") + "/>"; };
    var clip = function (k, inner) { defs.push('<clipPath id="' + id + k + '">' + inner + "</clipPath>"); };

    refreshMeas();
    var skin = hx(d.skin) || PC.skin.hex;
    // outline, body and hair come from the profile geometry (see docs/profile.md)
    var FPATH = crv(G.outline, true);
    var NECK = G.body.neck, SHOULD = G.body.shoulders, TOP = G.body.top;
    // The front cap runs from the part over the hairline to the temples and back over the top of each ear; behind the ears the
    // long hair falls behind the neck and shoulders (BACK, drawn before the face). The right half mirrors the left.
    var HL_L = G.hair.line, IN_L = HL_L.concat(G.hair.wrap), OUT_L = G.hair.outer, BOUT_L = OUT_L.concat(G.hair.back);
    var IN_R = mirror(IN_L), OUT_R = mirror(OUT_L), HL_R = mirror(HL_L);
    var CAP_L = crv(OUT_L) + crv(IN_L.slice().reverse(), false, false) + "Z", CAP_R = crv(OUT_R) + crv(IN_R.slice().reverse(), false, false) + "Z";
    var BACK = crv(BOUT_L.slice().reverse()) + crv(mirror(BOUT_L), false, false) + "Z";
    // strands down the visible back hair beside the neck: between the ear's back edge and the outer silhouette
    var BIN_L = G.hair.backInner, BOUT_LO = BOUT_L.slice(OUT_L.length - 1);
    // a strand between two edge curves, sampled at the same parameter on both
    var between = function (inner, outer, f, t0, t1, n, jit) {
      var o = [];
      for (var j = 0; j <= n; j++) {
        var t = t0 + (t1 - t0) * j / n, A = crAt(inner, t).p, B = crAt(outer, t).p;
        o.push([A[0] + (B[0] - A[0]) * f + (jit ? jit() : 0), A[1] + (B[1] - A[1]) * f]);
      }
      return o;
    };

    // forehead/temple skin up to the hairline; also part of the face clip, so face shading reaches the hair edge
    var shift = function (pts, dx) { return pts.map(function (p) { return [p[0] + dx, p[1]]; }); };
    var upper = function (pts) { return pts.filter(function (p) { return p[1] <= 141; }); };
    def("fu", crv(shift(HL_L, -1.5).concat(shift(HL_R.slice(1), 1.5).reverse()), 0, 1, 0) + "Z");
    def("fp", FPATH); clip("face", use("fp") + use("fu")); def("cL", CAP_L); def("cR", CAP_R); def("bk", BACK);
    defs.push('<clipPath id="' + id + 'neck"><path d="' + NECK + '"/></clipPath>');
    clip("hr", use("cL") + use("cR")); clip("hb", use("bk"));
    defs.push('<radialGradient id="' + id + 'fs" cx=".5" cy=".45" r=".62"><stop offset=".84" style="stop-color:var(--hair)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--hair)" stop-opacity=".05"/></radialGradient>');

    var s = "";
    // back hair, neck, shoulders, top, then the face
    var hr = prng(G.hair.seed), jit = function () { return (hr() - .5) * 1.6; }, gaps = "", lite = ["", "", ""], bg = "", bl = ["", ""];
    [.35, .7].forEach(function (f) { bg += crv(between(BIN_L, BOUT_LO, f + (hr() - .5) * .08, .02, 1, 5, jit), 0, 1, 0); });
    [.2, .5, .85].forEach(function (f, i) { bl[i % 2] += crv(between(BIN_L, BOUT_LO, f + (hr() - .5) * .1, .03 + hr() * .1, 1, 5, jit), 0, 1, 0); });
    s += use("bk", ' style="' + HAIR + '"') + '<g fill="none" stroke-linecap="round" clip-path="url(#' + id + 'hb)">' +
      pair(path(bg, ' stroke="#0c0c0c" stroke-width="1.5" opacity=".6"' + blur(.5)) + path(bl[0], ' stroke="' + MEAS.hair[0] + '" stroke-width="1.2" opacity=".85"') +
        path(bl[1], ' stroke="' + MEAS.hair[2] + '" stroke-width=".5" opacity=".75"') +
        path(G.hair.backStrands, ' style="stroke:var(--hair)" stroke-width=".6" opacity=".6"')) + "</g>";
    s += '<path d="' + SHOULD + '" fill="' + skin + '"/><path d="' + NECK + '" fill="' + skin + '"/>';
    s += '<ellipse cx="120" cy="258" rx="30" ry="6.5" style="' + HAIR + '" opacity=".07"' + blur(4) + ' clip-path="url(#' + id + 'neck)"/>';
    s += '<path d="' + TOP + '" fill="' + G.colors.garment + '"/>';
    var earSh = darken(skin, .2);
    var E = G.ear;
    clip("ez", '<rect x="' + E.clip[0] + '" y="' + E.clip[1] + '" width="' + E.clip[2] + '" height="' + E.clip[3] + '"/>');
    // Soft skin-tone modelling only: a rim a little deeper than the face, a groove just inside it, a lit ridge, the concha shadow
    // by the face and a soft lobe. Only ~10 units of ear show beside the face.
    var ear = path(E.path, ' fill="' + darken(skin, .04) + '"') + path(E.path, ' fill="' + MEAS.skinRedness + '" opacity=".2"') +
      '<g fill="none" stroke-linecap="round">' +
      path(E.rim[0], ' stroke="' + earSh + '" stroke-opacity=".55" stroke-width="1.3"' + blur(.45)) +
      path(E.rim[1], ' stroke="' + skin + '" stroke-opacity=".7" stroke-width=".8"' + blur(.3)) +
      path(E.rim[2], ' stroke="' + skin + '" stroke-opacity=".7" stroke-width="1.1"' + blur(.4)) + "</g>" +
      ell(E.concha, ' fill="' + earSh + '" opacity=".45"' + blur(1)) +
      ell(E.lobe, ' fill="' + MEAS.skinRedness + '" opacity=".18"' + blur(1)) +
      path(E.lobeLine, ' fill="none" stroke="' + earSh + '" stroke-opacity=".4" stroke-width=".8"' + blur(.4));
    // the ear sits behind the cheek: ~2.5 further out and 15% narrower, so only rim and lobe show beside the face, with a soft shadow
    // cast by the cheek; the face fill drawn next covers the join and keeps the cheekbone edge in front
    defs.push('<clipPath id="' + id + 'nf"><path clip-rule="evenodd" d="M0 0H240V300H0Z' + FPATH + '"/></clipPath>');
    s += pairU("ear", '<g clip-path="url(#' + id + 'nf)"><g transform="' + E.fit + '">' + ear + "</g>" +
      '<g clip-path="url(#' + id + 'ez)">' + use("fp", ' fill="none" stroke="' + earSh + '" stroke-width="2.6" stroke-opacity=".45"' + blur(1)) + "</g></g>");
    // skin fills up to the hair's inner edge; the face outline is drawn below the cheekbones, as before the ears were added

    clip("lf", '<rect x="0" y="140" width="240" height="160"/>');
    s += use("fp", ' fill="' + skin + '"') + use("fp", ' fill="url(#' + id + 'fs)"') + use("fp", ' fill="none" stroke="currentColor" stroke-opacity=".2" clip-path="url(#' + id + 'lf)"');
    // skin up to the hairline, over the face's rim shading so the old dome outline never shows on the forehead
    s += use("fu", ' fill="' + skin + '"');

    // baseline redness (nose tip, alae, mid-cheek) and chin shade, hair shadow, then contour, blush, highlight; clipped so blur stays on the face
    var A = G.anchors;
    var layer = '<g fill="' + MEAS.skinRedness + '"' + blur(5) + '>' + ell(A.red.tip, ' opacity=".55"') +
      pair(ell(A.red.cheek, ' opacity=".6"')) +
      ell(A.red.chin, ' opacity=".34"') + "</g>" +
      ell(A.hairShadow, ' style="' + HAIR + '" opacity=".1"' + blur(5)) +
      '<g fill="none" style="stroke:var(--hair)" stroke-width="5" opacity=".16"' + blur(2.2) + ">" + path(crv(HL_L.slice(1), 0, 1, 0)) + path(crv(HL_R.slice(1), 0, 1, 0)) + "</g>";
    var ct = d.contour || {}, cc = hx(ct.hex), cAreas = Array.isArray(ct.areas) ? ct.areas : [];
    if (cc && cAreas.length) {
      var cHalf = "";
      if (cAreas.indexOf("jaw") !== -1) cHalf += path(crv(A.contourJaw), ' stroke-width="7" stroke-opacity=".55"');
      if (cAreas.indexOf("nose-side") !== -1) cHalf += '<path d="' + A.contourNose + '" stroke-width="4.5"/>';
      layer += '<g fill="none" stroke="' + cc + '" stroke-linecap="round" opacity=".3"' + blur(3.5) + ">" + pair(cHalf) + "</g>";
    }
    // face-shaping shade from adaptDiagram: the cheekbone apex's outer part, a band along the hairline, the chin tip
    var sh = ct.shade, shc = sh && hx(sh.hex);
    if (shc) {
      var shH = "", shC = "", sa = sh.areas || [];
      if (sa.indexOf("cheekbone-outer") !== -1) shH += ell(A.shade.cheek);
      if (sa.indexOf("hairline") !== -1) shC += '<g fill="none" stroke="' + shc + '" stroke-width="9" stroke-linecap="round">' + path(crv(IN_L.slice(0, HL_L.length - 1), 0, 1, 0)) + path(crv(IN_R.slice(0, HL_L.length - 1), 0, 1, 0)) + "</g>";
      if (sa.indexOf("chin-tip") !== -1) shC += ell(A.shade.chin);
      layer += '<g fill="' + shc + '" opacity=".22"' + blur(3.5) + ">" + pair(shH) + shC + "</g>";
    }
    var bl = d.blush || {}, bc = hx(bl.hex);
    if (bc) {
      var bo = num(bl.intensity, .05, 1, .3), bs = bl.shape, bh, bctr = "";
      if (bs === "horizontal-under-eye") bh = ell(A.blush.under);
      else if (bs === "nose-bridge-sunkissed") { bh = ell(A.blush.sun); bctr = ell(A.blush.sunMid); }
      else bh = ell(A.blush.mid);
      layer += '<g fill="' + bc + '" opacity="' + bo + '"' + blur(7) + ">" + pair(bh) + bctr + "</g>";
    }
    var hl = d.highlight || {}, hc = hx(hl.hex), hAreas = Array.isArray(hl.areas) ? hl.areas : [];
    var fin = hl.finish === "glow" || hl.finish === "blink" ? hl.finish : "matte";
    if (hc && hAreas.length) {
      var F = { matte: { sd: 1.1, op: .55, grow: 0 }, glow: { sd: 4, op: .75, grow: 5 }, blink: { sd: 1.8, op: .9, grow: 1.5 } }[fin];
      var has = function (a) { return hAreas.indexOf(a) !== -1; };
      var hh = "", hcen = "", H = A.hl;
      if (has("cheekbone-top")) hh += ell(H.cheekTop);
      if (has("inner-corner")) hh += ell(H.inner);
      if (has("brow-bone")) hh += ell(H.brow);
      if (has("under-eye-triangle")) hh += '<path d="' + H.triangle + '"/>';
      if (has("nose-bridge")) hcen += ell(H.nose);
      if (has("cupid-bow")) hcen += ell(H.cupid);
      layer += '<g fill="' + hc + '" stroke="' + hc + '" stroke-width="' + F.grow + '" stroke-linejoin="round" opacity="' + F.op + '"' + blur(F.sd) + ">" + pair(hh) + hcen + "</g>";
      if (fin === "blink") {
        var SPH = H.sparkH, SPC = H.sparkC, GEN = H.sparkGen;
        var hd = [], cd = [];
        hAreas.forEach(function (a) { if (SPH[a]) hd = hd.concat(SPH[a]); if (SPC[a]) cd = cd.concat(SPC[a]); });
        GEN.forEach(function (p) { if (hd.length * 2 + cd.length < 6 && hd.indexOf(p) < 0) hd.push(p); });
        hd = hd.slice(0, Math.floor((10 - cd.length) / 2));
        var dot = function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" style="' + WHITE + '" opacity=".95"/>'; };
        layer += pair(hd.map(dot).join("")) + cd.map(dot).join("");
      }
    }
    // matte brightening on the temples, whatever the look's finish; only when the profile's rules ask for it
    var tmp = hx(hl.temple);
    if (tmp) layer += '<g fill="' + tmp + '" opacity=".45"' + blur(3.5) + ">" + pair(ell(A.temple)) + "</g>";
    var frk = hx(d.freckles);
    if (frk) {
      var FR = A.freckles, fr = prng(FR.seed), fd = "";
      for (var fi = 0; fi < FR.n; fi++) {
        var fx = FR.x + fr() * FR.w, fy = FR.y + fr() * FR.h - Math.max(0, fx - FR.slopeFrom) * FR.slope, frr = f1(.3 + fr() * .25);
        fd += '<circle cx="' + f1(fx) + '" cy="' + f1(fy) + '" r="' + frr + '"/>';
      }
      layer += '<g fill="' + frk + '" opacity=".42">' + pair(fd) + "</g>";
    }
    s += '<g clip-path="url(#' + id + 'face)">' + layer + "</g>";

    // nose: soft shading, no hard outline
    var NO = G.nose;
    s += '<g transform="translate(0 ' + NO.dy + ')">' + pairU("n", '<path d="' + NO.bridge + '" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width="1.4" stroke-linecap="round"' + blur(.4) + "/>" +
      '<path d="' + NO.ala + '" fill="none" stroke="currentColor" stroke-opacity=".26" stroke-width="1.2" stroke-linecap="round"' + blur(.3) + "/>" +
      ell(NO.nostril, ' style="' + HAIR + '" opacity=".28"'));
    s += '<path d="' + NO.base + '" fill="none" stroke="currentColor" stroke-opacity=".24" stroke-width="1.1" stroke-linecap="round"' + blur(.3) + "/></g>";

    // Each side keeps its own shape when the profile gives one (R); otherwise the right eye mirrors the left. EU runs outer -> inner
    // along the upper lid margin, EL inner -> outer along the lower.
    var EYES = { L: G.eyes.L, R: G.eyes.R || G.eyes.L };
    var lid = d.lid || {}, lb = hx(lid.base), lm = hx(lid.main), ld = hx(lid.depth), ls = hx(lid.shimmer);
    var ln = d.liner || {}, lc = hx(ln.hex), lstyle = ln.style, hlAegyo = hx(hl.hex);
    var nUp = function (pts, i) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      return [dy / l, -dx / l];
    };
    var add = function (p, v, k) { return [p[0] + v[0] * (k == null ? 1 : k), p[1] + v[1] * (k == null ? 1 : k)]; };
    var lash = function (b, tp, w) {
      var dx = tp[0] - b[0], dy = tp[1] - b[1], l = Math.hypot(dx, dy), nx = -dy / l * w, ny = dx / l * w;
      return "M" + pt([b[0] + nx, b[1] + ny]) + "Q" + pt([b[0] + dx * .55 - ny * .5, b[1] + dy * .55 + nx * .5]) + " " + pt(tp) + "Q" + pt([b[0] + dx * .5 - nx, b[1] + dy * .5 - ny]) + " " + pt([b[0] - nx, b[1] - ny]) + "Z";
    };
    var eyeSide = function (k, T) {
      var EU = T.EU, EL = T.EL, EO = EU[0], EI = EU[EU.length - 1], n = EU.length, W = EI[0] - EO[0];
      var N = EU.map(function (p, i) { return nUp(EU, i); });
      // a curve above the upper lid at height h(u), u = 0 at the outer corner .. 1 at the inner
      var above = function (h, from, to) { var o = []; for (var i = from || 0; i <= (to == null ? n - 1 : to); i++) o.push(add(EU[i], N[i], h(i / (n - 1)))); return o; };
      var arch = function (lo, hi) { return function (u) { return lo + hi * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), .7); }; };
      var apexI = 0; EU.forEach(function (p, i) { if (p[1] < EU[apexI][1]) apexI = i; });
      var AP = EU[apexI], dir = [(EO[0] - EI[0]) / W, (EO[1] - EI[1]) / W];   // unit vector inner -> outer along the eye
      // lash line: thickest over the outer third, tapering to a hairline at the inner corner
      var LW = [.75, 1.15, 1.3, 1.25, 1.1, .9, .65, .4, .15];
      var LT = EU.map(function (p, i) { return add(p, N[i], LW[i]); }), LM = EU.map(function (p, i) { return add(p, N[i], LW[i] * .5); });
      // the lash band ends just past the corner in a soft rounded tip, not a knife point
      var TIP = add(add(EO, dir, .55), [0, -.35]);
      // the opening: one closed smooth loop, so the inner corner is rounded (a small caruncle shows there)
      var EYE = crv(EU.concat(EL.slice(1, -1)), true);
      var LASH = crv([TIP].concat(LT)) + "L" + pt(EI) + crv(EU.slice().reverse(), false, false) + "Q" + pt(add(EO, dir, .5)) + " " + pt(TIP) + "Z";
      var UPL = crv([TIP].concat(LM)), UPZ = crv(EU.slice().reverse(), false, false);
      var BASE = crv([add(EO, dir, 2.6)].concat(above(arch(2.5, 9.5), 1, n - 2), [add(EI, [0, -1.5])])) + "L" + pt(EI) + UPZ + "Z";
      var MAIN = crv([add(EO, dir, 1.4)].concat(above(arch(1.6, 6), 1, n - 2), [add(EI, [0, -.8])])) + "L" + pt(EI) + UPZ + "Z";
      var CREASE = crv(above(arch(0, 5.2), 1, n - 2));
      // in-fold double lid: a fine line ~1.2 above the top of the lash line over the middle and outer part, merging into the inner corner
      var FOLD = crv(above(function (u) { return (1.2 + [.75, 1.15, 1.3, 1.25, 1.1, .9, .65, .4, .15][Math.round(u * 8)]) * Math.min(1, (1 - u) / .35); }));
      var LOWLASH = crv(EL.slice(3));
      var IRC = T.IRC, IRR = T.IRR, ic = function (dx, dy) { return ' cx="' + f1(IRC[0] + dx) + '" cy="' + f1(IRC[1] + dy) + '"'; };
      def("ey" + k, EYE); clip("eye" + k, use("ey" + k)); def("el" + k, crv(EL));
      if (ld || lb) { def("ba" + k, BASE); clip("lid" + k, use("ba" + k)); }
      defs.push('<radialGradient id="' + id + 'ir' + k + '" gradientUnits="userSpaceOnUse" cx="' + IRC[0] + '" cy="' + IRC[1] + '" r="' + IRR + '"><stop offset=".2" stop-color="' + MEAS.irisStops[0] + '"/><stop offset=".6" stop-color="' + MEAS.irisStops[1] + '"/><stop offset=".9" stop-color="' + MEAS.irisStops[2] + '"/><stop offset="1" stop-color="' + MEAS.irisStops[3] + '"/></radialGradient>');
      defs.push('<linearGradient id="' + id + 'sc' + k + '" gradientUnits="userSpaceOnUse" x1="' + EO[0] + '" y1="0" x2="' + EI[0] + '" y2="0"><stop offset="0" stop-color="#c7aea5"/><stop offset=".2" stop-color="#e8ddd7"/><stop offset=".55" stop-color="#eee5e0"/><stop offset=".85" stop-color="#e2d2cb"/><stop offset="1" stop-color="#c2a39a"/></linearGradient>');
      defs.push('<linearGradient id="' + id + 'cr' + k + '" gradientUnits="userSpaceOnUse" x1="' + EI[0] + '" y1="0" x2="' + f1(EO[0] - .3) + '" y2="0"><stop offset="0" stop-color="#5e3f37" stop-opacity=".15"/><stop offset=".3" stop-color="#5e3f37" stop-opacity=".5"/><stop offset=".85" stop-color="#5e3f37" stop-opacity=".45"/><stop offset="1" stop-color="#5e3f37" stop-opacity="0"/></linearGradient>');
      defs.push('<linearGradient id="' + id + 'll' + k + '" gradientUnits="userSpaceOnUse" x1="' + f1(EO[0] + .7 * W) + '" y1="0" x2="' + f1(EO[0] + .2 * W) + '" y2="0"><stop offset="0" style="stop-color:var(--hair)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--hair)" stop-opacity=".26"/></linearGradient>');
      var e = '<ellipse' + ' cx="' + f1(AP[0]) + '" cy="' + f1(AP[1] - 6) + '" rx="12" ry="4.4" fill="#a8735f" opacity=".13"' + blur(1.6) + "/>" +
        use("ey" + k, ' fill="url(#' + id + 'sc' + k + ')"') +
        '<g clip-path="url(#' + id + 'eye' + k + ')"><ellipse cx="' + f1(EI[0] - 1.1) + '" cy="' + f1(EI[1] - .1) + '" rx="1.1" ry=".7" fill="#cf968c" opacity=".7"/>' +
        '<circle cx="' + IRC[0] + '" cy="' + IRC[1] + '" r="' + IRR + '" fill="url(#' + id + 'ir' + k + ')"/>' +
        '<ellipse' + ic(0, 3.3) + ' rx="4.2" ry="2.2" fill="#8d7166" opacity=".3"' + blur(.8) + "/>" +
        '<circle cx="' + IRC[0] + '" cy="' + IRC[1] + '" r="' + f1(IRR - .25) + '" fill="none" stroke="#211a18" stroke-opacity=".5" stroke-width=".5"/>' +
        '<circle cx="' + IRC[0] + '" cy="' + IRC[1] + '" r="3" fill="#141010"' + blur(.35) + "/>" +
        path(crv(EU), ' fill="none" stroke="#2a1d19" stroke-opacity=".5" stroke-width="3.8"' + blur(.9)) +
        '<circle' + ic(1.9, -2.1) + ' r=".8" style="' + WHITE + '" opacity=".85"/><circle' + ic(-2, 2.6) + ' r=".4" style="' + WHITE + '" opacity=".35"/></g>' +
        use("el" + k, ' fill="none" stroke="#8a5e52" stroke-opacity=".22" stroke-width=".45"') +
        use("el" + k, ' fill="none" stroke="#fae7d7" stroke-opacity=".4" stroke-width=".5" transform="translate(0 .7)"');
      if (lb) e += use("ba" + k, ' fill="' + lb + '" opacity=".5"' + blur(1.4));
      if (lm) e += path(MAIN, ' fill="' + lm + '" opacity=".8"' + blur(.6));
      if (ld) {
        var area = lid.depthArea, dpt = "", oc = add(EU[2], N[2], 4);
        if (area === "lashline") dpt = path(UPL, ' fill="none" stroke="' + ld + '" stroke-width="3.6" stroke-linecap="round"' + blur(.7));
        else if (area === "full-crease") dpt = path(CREASE, (lid.creaseLift ? ' transform="translate(0 -2)"' : "") + ' fill="none" stroke="' + ld + '" stroke-width="5.2" stroke-linecap="round"' + blur(1.2));
        else dpt = '<ellipse cx="' + f1(oc[0]) + '" cy="' + f1(oc[1]) + '" rx="7.5" ry="6.2" transform="rotate(-18 ' + f1(oc[0]) + " " + f1(oc[1]) + ')" fill="' + ld + '"' + blur(1) + "/>";
        e += '<g clip-path="url(#' + id + 'lid' + k + ')" opacity=".85">' + dpt + "</g>";
        if (area === "wing") e += path("M" + pt(add(EO, [.8, 1.6])) + "Q" + pt(add(EO, [-3, .4])) + " " + pt(add(EO, [-6.2, -1.6])) + "Q" + pt(add(EO, [-1.6, -3.4])) + " " + pt(add(EU[3], N[3], 2.6)) + "Z", ' fill="' + ld + '" opacity=".85"' + blur(.8));
      }
      if (ls) {
        defs.push('<radialGradient id="' + id + 'sh' + k + '"><stop offset="0" stop-color="' + ls + '" stop-opacity=".95"/><stop offset=".6" stop-color="' + ls + '" stop-opacity=".6"/><stop offset="1" stop-color="' + ls + '" stop-opacity="0"/></radialGradient>');
        e += '<ellipse cx="' + f1(AP[0] + .8) + '" cy="' + f1(AP[1] - 4.2) + '" rx="7.8" ry="3.2" fill="url(#' + id + 'sh' + k + ')"/>';
      }
      var low = lid.lowerLash, lowCol = ld || lm;
      if ((low === "outer-third" || low === "full") && lowCol) {
        // both variants fade out before the inner corner
        defs.push('<linearGradient id="' + id + 'lw' + k + '" gradientUnits="userSpaceOnUse" x1="' + EO[0] + '" y1="0" x2="' + f1(low === "outer-third" ? EO[0] + .55 * W : EI[0]) + '" y2="0"><stop offset="0" stop-color="' + lowCol + '"/>' +
          (low === "outer-third" ? "" : '<stop offset=".72" stop-color="' + lowCol + '"/>') + '<stop offset="1" stop-color="' + lowCol + '" stop-opacity="0"/></linearGradient>');
        e += use("el" + k, ' transform="translate(0 1.4)" fill="none" stroke="url(#' + id + 'lw' + k + ')" stroke-width="2.2" stroke-linecap="round" opacity=".8"');
      }
      if (lid.aegyo && hlAegyo) {
        e += use("el" + k, ' transform="translate(0 5)" fill="none" stroke="' + hlAegyo + '" stroke-width="4.2" stroke-linecap="round" opacity=".9"' + blur(.7)) +
          use("el" + k, ' transform="translate(0 8.2)" fill="none" style="stroke:var(--hair)" stroke-width="1" stroke-linecap="round" opacity=".18"' + blur(.5));
      }
      // crease, then lower lashes (outer two thirds, fading in), then the soft dark lash line on top
      e += path(FOLD, ' fill="none" stroke="#5e3f37" stroke-opacity=".1" stroke-width="1.3" transform="translate(0 .4)"' + blur(.5)) +
        path(FOLD, ' fill="none" stroke="url(#' + id + 'cr' + k + ')" stroke-width=".5" stroke-linecap="round"');
      e += path(LOWLASH, ' fill="none" stroke="url(#' + id + 'll' + k + ')" stroke-width=".45" stroke-linecap="round"');
      def("la" + k, LASH);
      e += use("la" + k, ' fill="#2b2220" opacity=".55"' + blur(.3)) + use("la" + k, ' fill="#241d1b" opacity=".85"');
      // fine natural lashes: 12 along the outer two thirds of the upper lash line, short inside and longer toward the outer corner,
      // curving up then out (never down); a few very short, sparse lower lashes on the outer third
      var lr = prng(k === "L" ? G.eyes.seeds[0] : G.eyes.seeds[1]), sliver = function (b, c, tp, w) {
        var dx = tp[0] - b[0], dy = tp[1] - b[1], l = Math.hypot(dx, dy) || 1, px = -dy / l * w / 2, py = dx / l * w / 2;
        return "M" + pt([b[0] + px, b[1] + py]) + "Q" + pt([c[0] + px * .5, c[1] + py * .5]) + " " + pt(tp) + "Q" + pt([c[0] - px * .5, c[1] - py * .5]) + " " + pt([b[0] - px, b[1] - py]) + "Z";
      };
      var normAt = function (P, t, down) { var q = crAt(P, t), nv = [q.t[1], -q.t[0]]; if ((nv[1] > 0) !== !!down) nv = [-nv[0], -nv[1]]; return { p: q.p, n: nv }; };
      var ups = "", lows = "";
      for (var li = 0; li < 12; li++) {
        var tt = .02 + li * .058 + (lr() - .5) * .02, q = normAt(LT, tt), f = 1 - tt / .7;
        var Ll = (1.2 + 1.9 * f) * (.85 + lr() * .3), out = [dir[0] * (.3 + .4 * f), dir[1] * (.3 + .4 * f)];
        var tip = [q.p[0] + q.n[0] * Ll * .8 + out[0] * Ll, q.p[1] + q.n[1] * Ll * .8 + out[1] * Ll - Ll * (.2 + .45 * f)];
        ups += sliver(add(q.p, q.n, -.2), [q.p[0] + q.n[0] * Ll * .75 + out[0] * Ll * .2, q.p[1] + q.n[1] * Ll * .75 + out[1] * Ll * .2], tip, .34 + .1 * f);
      }
      for (var lj = 0; lj < 4; lj++) {
        var q2 = normAt(EL, .74 + lj * .065 + (lr() - .5) * .015, true), L2 = .8 + lr() * .5;
        lows += sliver(q2.p, add(q2.p, q2.n, L2 * .6), [q2.p[0] + q2.n[0] * L2 + dir[0] * L2 * .5, q2.p[1] + q2.n[1] * L2 + dir[1] * L2 * .5], .22);
      }
      e += path(ups, ' fill="#241d1b" opacity=".52"') + path(lows, ' fill="#2b2220" opacity=".5"');
      if (lc) {
        e += path(UPL, ' fill="none" stroke="' + lc + '" stroke-width="' + (lstyle === "tightline" ? 1.2 : 2.1) + '" stroke-linecap="round"');
        // wings start at the outer corner and run out nearly level, a touch upward with the eye
        var wl = lstyle === "long-wing" ? 9.5 : 6.5;
        if (lstyle === "short-wing" || lstyle === "long-wing" || lstyle === "puppy")
          e += path("M" + pt(add(EO, [1, .6])) + "Q" + pt(add(EO, [-wl * .45, .2])) + " " + pt(add(EO, [-wl, -wl * .22])) + "Q" + pt(add(EO, [-wl * .4, -1.5])) + " " + pt(LT[2]) + "Z",
            ' fill="' + lc + '" stroke="' + lc + '" stroke-width=".7" stroke-linejoin="round"');
      }
      return e;
    };
    s += "<g>" + eyeSide("L", EYES.L) + '</g><g transform="translate(240 0) scale(-1 1)">' + eyeSide("R", EYES.R) + "</g>";

    // brows: tapered hairs, no solid base: a sparse upright head, a layered body slanting toward the tail, a flat tail converging to a point.
    // Both brows share one path (geometry.brows) mirrored to the other side; brows.asym can give each side its own rise and tail.
    var GB = G.brows, AS = GB.asym;
    var br = d.brow || {}, bt = { thin: .85, thick: 1.22 }[br.thickness] || 1;
    var brHex = hx(br.hex), brc = brHex || MEAS.brow[1];
    var brT = brHex ? [brHex, darken(brHex, .1), darken(brHex, .28)] : [MEAS.brow[0], MEAS.brow[1], MEAS.brow[2]];
    // Gradients run along x in the brow's own (left-half) frame, from brows.grad[0] to brows.grad[1].
    var mixHex = function (a, b, f) {
      var p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
      return toHex((p >> 16 & 255) * (1 - f) + (q >> 16 & 255) * f, (p >> 8 & 255) * (1 - f) + (q >> 8 & 255) * f, (p & 255) * (1 - f) + (q & 255) * f);
    };
    var bgrad = function (k, c) {
      defs.push('<linearGradient id="' + id + k + '" gradientUnits="userSpaceOnUse" x1="' + GB.grad[0] + '" y1="0" x2="' + GB.grad[1] + '" y2="0"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="' + mixHex(c, brT[0], .5) + '"/></linearGradient>');
      return "url(#" + id + k + ")";
    };
    var brG = [bgrad("bt1", brT[1]), bgrad("bt2", brT[2]), bgrad("bt0", brc)];
    var BC0 = (br.shape === "straight" ? GB.straight : GB.curve).map(function (p) { return [p[0], p[1] + GB.dy]; });
    var BWv = GB.widths;
    var bwAt = function (t) {
      for (var i = 1; i < BWv.length; i++) if (t <= BWv[i][0]) { var a = BWv[i - 1], b = BWv[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
      return BWv[BWv.length - 1][1];
    };
    var rot = function (u, v, deg) { var r = deg * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r); return [u[0] * c + v[0] * sn, u[1] * c + v[1] * sn]; };
    var browSide = function (sg, seed) {
      var BC = BC0.map(function (p, i) { return [p[0], p[1] - (AS ? sg * AS.rise * AS.riseW[i] : 0) + (AS && sg < 0 ? AS.tail[i] : 0)]; });
      var wAt = function (t) {
        var wh = Math.max(0, 1 - t / .3), wb = Math.max(0, 1 - Math.abs(t - .5) / .25), wt = t < .6 ? 0 : t < .85 ? (t - .6) / .25 : 1 - (t - .85) / .15 * .6;
        return Math.max(.3, (bwAt(t) + (AS ? sg * (AS.head * wh + AS.body * wb + AS.tailW * wt) : 0)) * bt);
      };
      var rnd = prng(seed), lay = ["", "", ""], last = [null, null, null], k = 0;
      // one hair: a long thin sliver, fullest just past the root and tapering to a fine tip, bowed sideways by `bend`;
      // relative coordinates keep the path small
      var hair = function (p, a, L, w, bend, g) {
        var n = [-a[1], a[0]], s0 = [p[0] + n[0] * w * .25, p[1] + n[1] * w * .25], tip = [p[0] + a[0] * L, p[1] + a[1] * L];
        var m = [p[0] + a[0] * L * .4 + n[0] * bend, p[1] + a[1] * L * .4 + n[1] * bend], e1 = [p[0] - n[0] * w * .25, p[1] - n[1] * w * .25];
        var rel = function (q, o) { return pt([q[0] - o[0], q[1] - o[1]]); };
        s0 = s0.map(function (c) { return Math.round(c * 10) / 10; });  // on the 0.1 grid, so relative moves never drift
        // after "z" the pen is back at the previous root, so each hair starts with a short relative move
        lay[g] += (last[g] ? "m" + rel(s0, last[g]) : "M" + pt(s0)) + "q" + rel([m[0] + n[0] * w * .6, m[1] + n[1] * w * .6], s0) + " " + rel(tip, s0) + "q" + rel([m[0] - n[0] * w * .6, m[1] - n[1] * w * .6], tip) + " " + rel(e1, tip) + "z";
        last[g] = s0;
      };
      // stratified t and a golden-ratio v keep the coverage even without a visible pattern
      var zone = function (n, lo, hi, fn) {
        for (var i = 0; i < n; i++, k++) {
          var t = lo + (hi - lo) * (i + rnd()) / n, v = ((k * .618 + rnd() * .35) % 1) * 2 - 1, q = crAt(BC, t), w = wAt(t), tg = q.t, nu = [tg[1], -tg[0]];
          if (nu[1] > 0) nu = [-nu[0], -nu[1]];
          fn([q.p[0] + nu[0] * v * w * .9, q.p[1] + nu[1] * v * w * .9], tg, nu, v, w, t);
        }
      };
      var sw = Math.sqrt(bt);
      // hair angle above the brow line, smooth along the brow so neighbours stay near-parallel: upright head, ~14° body, flat tail
      var headA = 50, bendK = function (t) { return t < .55 ? .45 : 1; };
      var angAt = function (t) { return t < .18 ? headA - t / .18 * (headA - 26) : t < .4 ? 26 - (t - .18) / .22 * 16 : t < .75 ? 10 : 10 - (t - .75) / .25 * 16; };
      var jit = function () { return (rnd() - .5) * 10; };
      zone(Math.round(24 * bt), 0, .2, function (p, tg, nu, v, w, t) {
        hair(p, rot(tg, nu, angAt(t) + jit()), (2.4 + rnd() * 1.3) * Math.min(1.2, w / 3), (.55 + rnd() * .2) * sw, (rnd() - .5) * .3 * bendK(t), 0);
      });
      zone(Math.round(80 * bt), .14, .8, function (p, tg, nu, v, w, t) {
        hair(p, rot(tg, nu, angAt(t) + jit() * .8 - v * 3), 5.6 + rnd() * 2.6, (.7 + rnd() * .35) * sw, (rnd() - .5) * .3 * bendK(t), k % 3 ? 1 : 2);
      });
      zone(Math.round(20 * bt), .74, .97, function (p, tg, nu, v, w, t) {
        hair(p, rot(tg, nu, angAt(t) + jit() * .6 - v * 3), (3 + rnd() * 1.5) * (1.2 - t * .6), (.45 + rnd() * .15) * sw, (rnd() - .5) * .3, k % 2 ? 1 : 2);
      });
      // faint base so gaps between hairs read as skin under brow, never as a block
      var oU = [], oL = [];
      for (var oi = 0; oi <= 8; oi++) {
        var q3 = crAt(BC, oi / 8), w3 = wAt(oi / 8) * .85, n3 = [q3.t[1], -q3.t[0]];
        if (n3[1] > 0) n3 = [-n3[0], -n3[1]];
        oU.push([q3.p[0] + n3[0] * w3, q3.p[1] + n3[1] * w3]); oL.unshift([q3.p[0] - n3[0] * w3, q3.p[1] - n3[1] * w3]);
      }
      return path(crv(oU.concat(oL), true), ' fill="' + brG[2] + '" opacity=".12"' + blur(.9)) +
        path(lay[0], ' fill="' + brT[0] + '" opacity=".6"') + path(lay[1], ' fill="' + brG[0] + '" opacity=".88"') + path(lay[2], ' fill="' + brG[1] + '" opacity=".92"') +
        // a light ash-grey sheen over the body of the bare brow
        (brHex ? "" : path(lay[1], ' fill="#7a7678" opacity=".16" transform="translate(.3 -.35)"'));
    };
    s += "<g>" + browSide(AS ? -1 : 0, GB.seeds[0]) + '</g><g transform="translate(240 0) scale(-1 1)">' + browSide(AS ? 1 : 0, GB.seeds[AS ? 1 : 0]) + "</g>";

    // mouth: the upper border runs straight from each corner up to a bow peak and down into a soft notch, rounded only at the
    // junctions; the lower lip is a depth table under a level meeting line. Detail ellipses are placed by the profile (lips.detail).
    var LG = G.lips, BX = 120, HW = LG.halfWidth, LD = LG.detail;
    s += '<g transform="translate(0 ' + LG.dy + ')">';
    var ME = LG.meet;
    var meY = function (u) {
      for (var i = 1; i < ME.length; i++) if (u <= ME[i][0]) { var a = ME[i - 1], b = ME[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; }
      return ME[ME.length - 1][1];
    };
    var CORNER = LG.corner, PEAK = LG.peak, NOTCH = LG.notch;
    var toward = function (a, b, dist) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [a[0] + dx / l * dist, a[1] + dy / l * dist]; };
    var mx = function (p) { return [240 - p[0], p[1]]; };
    var pkO = toward(PEAK, CORNER, LG.round[0]), pkI = toward(PEAK, NOTCH, LG.round[0]), ntL = toward(NOTCH, PEAK, LG.round[1]);
    var UPPER = "M" + pt(CORNER) + "L" + pt(pkO) + "Q" + pt(PEAK) + " " + pt(pkI) + "L" + pt(ntL) + "Q" + pt(NOTCH) + " " + pt(mx(ntL)) +
      "L" + pt(mx(pkI)) + "Q" + pt(mx(PEAK)) + " " + pt(mx(pkO)) + "L" + pt(mx(CORNER));
    var halfLo = function (sg) { return LG.lower.map(function (q) { return [120 + sg * q[0] * HW, q[1]]; }); };
    var LLOW = halfLo(1).reverse().concat([[120, LG.bottom]], halfLo(-1));
    var LIP = UPPER + crv(LLOW, false, false) + "Z";
    // the line itself is a band: thicker at the centre parting and near the corners, thin between, stopping short of the corners
    var mw = function (u) { return u < .3 ? .55 - u : u < .7 ? .25 - (u - .3) * .2 : u < .9 ? .17 + (u - .7) * .9 : .35 * (1 - (u - .9) / .08); };
    var mTop = [], mBot = [];
    for (var mi = -12; mi <= 12; mi++) {
      var mu = Math.min(.98, Math.abs(mi) / 12 * .98), mxx = BX + (mi < 0 ? -1 : 1) * mu * HW, my = meY(mu), mt = Math.max(0, mw(mu));
      mTop.push([mxx, my - mt * .45]); mBot.unshift([mxx, my + mt * .55]);
    }
    var MEETB = crv(mTop) + crv(mBot, false, false) + "Z";
    var GAP = "M" + pt([BX - 4, LG.gap[0]]) + "Q" + pt([BX, LG.gap[1]]) + " " + pt([BX + 4, LG.gap[0]]) + "Q" + pt([BX, LG.gap[2]]) + " " + pt([BX - 4, LG.gap[0]]) + "Z";
    def("LP", LIP);
    // one vertical gradient darkens the upper lip and the band just under the level meeting line
    defs.push('<radialGradient id="' + id + 'ls" cx=".5" cy=".55" r=".62"><stop offset=".45" stop-color="#3a1f22" stop-opacity="0"/><stop offset="1" stop-color="#3a1f22" stop-opacity=".24"/></radialGradient>');
    defs.push('<linearGradient id="' + id + 'lu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1f22" stop-opacity=".06"/><stop offset=".43" stop-color="#3a1f22" stop-opacity=".2"/><stop offset=".49" stop-color="#3a1f22" stop-opacity=".14"/><stop offset=".58" stop-color="#3a1f22" stop-opacity="0"/><stop offset="1" stop-color="#3a1f22" stop-opacity=".1"/></linearGradient>');
    var lp = d.lips || {}, pc = hx(lp.color), ls2 = lp.style;
    var RIM = MEAS.lipRim, BARE = MEAS.lipFill;
    var covered = pc && (ls2 === "full" || ls2 === "overlined" || !ls2);
    // philtrum: a soft groove above the bow
    s += '<g fill="none" stroke="#a9705f" stroke-linecap="round"' + blur(.7) + '><path d="' + LG.philtrum[0] + '" stroke-width="1" opacity=".2"/><path d="' + LG.philtrum[1] + '" stroke-width="2.6" opacity=".09"/></g>';
    s += use("LP", ' fill="' + BARE + '"');
    if (!covered) s += use("LP", ' fill="none" stroke="' + RIM + '" stroke-width="1.1" stroke-linejoin="round" opacity="' + (pc ? ".25" : ".45") + '"' + blur(.6));
    if (pc) {
      var fill = '"' + pc + '"', extra = "", edge = "";
      if (ls2 === "gradient") {
        defs.push('<radialGradient id="' + id + 'lg" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="' + pc + '"/><stop offset=".45" stop-color="' + pc + '" stop-opacity=".88"/><stop offset=".85" stop-color="' + pc + '" stop-opacity=".22"/><stop offset="1" stop-color="' + pc + '" stop-opacity="0"/></radialGradient>');
        fill = '"url(#' + id + 'lg)"';
      } else if (ls2 === "blurred") extra = blur(1.4) + ' opacity=".9"';
      else if (ls2 === "overlined") edge = ' stroke="' + pc + '" stroke-width="3" stroke-linejoin="round"';
      else edge = ' stroke="' + pc + '" stroke-width=".5" stroke-linejoin="round"';
      s += use("LP", " fill=" + fill + edge + extra);
      // overlined: the liner sits on the widened edge, ~1.5 outside the natural border
      if (lp.linerProduct && ls2 !== "blurred") s += use("LP", ' fill="none" stroke="' + darken(pc, .15) + '" stroke-width="1" stroke-linejoin="round"' +
        (ls2 === "overlined" ? ' transform="translate(120 214) scale(1.063 1.11) translate(-120 -214)"' : ""));
    }
    // shape shading works over any colour: darker upper lip, a lit tubercle, darker corners, shadow under the upper lip, gloss on the lower lip
    s += use("LP", ' fill="url(#' + id + 'lu)"') + use("LP", ' fill="url(#' + id + 'ls)"') +
      '<g fill="#3a1f22" opacity=".14"' + blur(.9) + '>' + ell(LD.shade) + ell([240 - LD.shade[0], LD.shade[1], LD.shade[2], LD.shade[3]]) + '</g>' +
      ell(LD.tub[0], ' style="' + WHITE + '" opacity=".16"' + blur(.9)) + ell(LD.tub[1], ' style="' + WHITE + '" opacity=".35"' + blur(.3)) +
      ell(LD.gloss[0], ' style="' + WHITE + '" opacity=".12"' + blur(1.2)) + ell(LD.gloss[1], ' style="' + WHITE + '" opacity=".3"' + blur(.9)) +
      ell(LD.gloss[2], ' style="' + WHITE + '" opacity=".42"' + blur(.3)) +
      path(GAP, ' fill="#2a1517" opacity=".45"' + blur(.3)) +
      path(MEETB, ' fill="#4a2628" opacity=".72"' + blur(.3)) +
      pair(ell(LD.corner[0], ' fill="#3a1d1f" opacity=".45"' + blur(.3)) + ell(LD.corner[1], ' fill="#5a2f31" opacity=".18"' + blur(.9)));
    s += ell(LD.under, ' style="' + HAIR + '" opacity=".08"' + blur(1.5)) + "</g>";

    // front hair last: the cap from the part over the hairline and the ear tops, a soft shadow it casts on the ears, strands sweeping
    // back over the ears, a crown sheen; the left half's texture is generated once and mirrored, so both sides match
    var hs = pair(path(crv(IN_L.slice(HL_L.length - 1)), ' fill="none" stroke="#3a2a24" stroke-width="2.4" opacity=".35" transform="translate(.4 1.4)"' + blur(1.1))) +
      '<g style="' + HAIR + '">' + use("cL") + use("cR") + "</g>";
    [.34, .68].forEach(function (f) { gaps += crv(between(IN_L, OUT_L, f + (hr() - .5) * .06, .1, .97, 8, jit), 0, 1, 0); });
    for (var k = 0; k < 7; k++) lite[k % 3] += crv(between(IN_L, OUT_L, (k + .3 + hr() * .4) / 7, .03 + hr() * .1, .9 + hr() * .08, 8, jit), 0, 1, 0);
    hs += '<g fill="none" stroke-linecap="round" clip-path="url(#' + id + 'hr)">' + pair(path(gaps, ' stroke="#0c0c0c" stroke-width="1.5" opacity=".7"' + blur(.5)) +
      path(lite[0], ' stroke="' + MEAS.hair[0] + '" stroke-width="1.4" opacity=".9"') +
      path(lite[1], ' stroke="' + MEAS.hair[1] + '" stroke-width=".8" opacity=".85"') +
      path(lite[2], ' stroke="' + MEAS.hair[2] + '" stroke-width=".5" opacity=".8"') +
      path(crv(between(IN_L, OUT_L, .55, .04, .4, 4), 0, 1, 0), ' stroke="#4d4a48" stroke-width="5" opacity=".5"' + blur(1.8))) + "</g>";
    // a few fine baby hairs along the hairline and one loose strand at each temple (it stays above the cheek)
    hs += pair('<path d="' + G.hair.baby + '" fill="none" stroke="' + MEAS.hair[1] + '" stroke-width=".3" stroke-linecap="round" opacity=".6"/>' +
      '<path d="' + G.hair.strand + '" fill="none" style="stroke:var(--hair)" stroke-width=".45" stroke-linecap="round" opacity=".7"/>');
    // optional headband pushing the hair back
    if (d.hairStyle === "headband") hs += '<path d="' + G.hair.headband[0] + '" fill="none" stroke="#2a2526" stroke-width="4.2" stroke-linecap="round"/>' +
      '<path d="' + G.hair.headband[1] + '" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width=".8"/>';
    // centre part: slight zigzag with a line of scalp showing
    var PART = G.hair.part;
    hs += path(PART, ' fill="none" stroke="' + skin + '" stroke-width="1" stroke-linejoin="round" opacity=".45"' + blur(.3)) +
      path(PART, ' fill="none" stroke="#141413" stroke-width=".35" opacity=".6"');
    hs += '<path d="' + G.hair.crown + '" fill="none" stroke="' + MEAS.hair[2] + '" stroke-width=".28" stroke-linecap="round" opacity=".3" transform="translate(0 9)"/>';
    s += hs;

    var parts = [];
    if (BROW_SHAPE[br.shape]) parts.push(BROW_SHAPE[br.shape]);
    if (LINER_STYLE[lstyle]) parts.push(LINER_STYLE[lstyle]);
    if (BLUSH_SHAPE[bl.shape]) parts.push(BLUSH_SHAPE[bl.shape]);
    if (HL_FINISH[hl.finish]) parts.push(t("face.hl", { finish: HL_FINISH[hl.finish] }));
    if (LIP_STYLE[lp.style]) parts.push(t("face.lips", { style: LIP_STYLE[lp.style] }));
    var label = t("face.label") + (parts.length ? ": " + parts.join(", ") : "");
    var out = "<defs>" + defs.join("") + "</defs>" + s;
    out = out.replace(/ d="([^"]+)"/g, function (m, dd) { return ' d="' + minD(dd) + '"'; });
    return '<svg class="lk-face" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" role="img" aria-label="' + esc(label) + '">' + out + "</svg>";
  }

  // o.raw skips adaptDiagram (the "original" panel); o.label replaces the alt text.
  var draw = function (dg, o) {
    o = o || {};
    var svg = faceSvg(dg, "", o.raw);
    return o.label ? svg.replace(/aria-label="[^"]*"/, function () { return 'aria-label="' + esc(o.label) + '"'; }) : svg;
  };
  draw.adapt = adaptDiagram;
  return draw;
})();

