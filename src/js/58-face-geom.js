/* Face geometry. The drawing in 60-face.js reads everything about the face from one object, G. A profile can give any part of it
   (face.geometry.outline, .eyes, .lips, ...) or just a few parameters (face.geometry.params) and let the generators below draw
   a neutral, symmetric face. Coordinates live in a 240x300 box: x centred on 120, hairline at the top, chin near y 250. */
const FACE_SHAPES = {
  // Half-width of the outline at each y in SHAPE_Y, from the hairline to the chin.
  oval:   [14, 31, 47, 56, 62, 65, 66, 66, 65, 62, 58, 52, 44, 34, 20],
  round:  [18, 36, 52, 62, 68, 71, 72, 72, 71, 68, 62, 55, 46, 36, 22],
  heart:  [16, 36, 54, 64, 70, 71, 69, 65, 59, 52, 45, 38, 30, 22, 12],
  square: [16, 34, 50, 60, 66, 68, 68, 68, 68, 67, 64, 59, 51, 40, 26],
  long:   [13, 29, 44, 53, 58, 61, 62, 62, 61, 59, 55, 50, 42, 32, 19]
};
const SHAPE_Y = [52.5, 58.5, 68.6, 78.7, 88.7, 98.8, 118.8, 138.9, 159, 179, 199, 220, 235, 245, 251.5];
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const lerp = (a, b, f) => a + (b - a) * f;
// x of the left outline edge at height y, read off the outline points.
function edgeLeft(outline, y) {
  const left = outline.filter(p => p[0] < 120).sort((a, b) => a[1] - b[1]);
  for (let i = 1; i < left.length; i++) if (y <= left[i][1]) { const a = left[i - 1], b = left[i]; return lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1] || 1)); }
  return left.length ? left[left.length - 1][0] : 54;
}

function genOutline(p) {
  const hw = FACE_SHAPES[p.shape] || FACE_SHAPES.oval, k = p.width || 1, jaw = p.jaw || 1, stretch = p.chin || 1;
  const yBottom = r1(SHAPE_Y[SHAPE_Y.length - 1] + 2 * stretch);
  const ys = SHAPE_Y.map((y, i) => i < 11 ? y : r1(199 + (y - 199) * stretch));
  const w = hw.map((v, i) => r1(v * k * (i >= 10 ? jaw : 1)));
  const right = ys.map((y, i) => [r1(120 + w[i]), y]), left = ys.map((y, i) => [r1(120 - w[i]), y]).reverse();
  return [[120, 51]].concat(right, [[120, yBottom]], left);
}

function genEye(e) {
  const inner = [120 - e.gap, e.y], outer = [inner[0] - e.width, r1(e.y - e.width * Math.tan(e.tilt * Math.PI / 180))];
  const EU = [], EL = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8, x = lerp(outer[0], inner[0], u), cy = lerp(outer[1], inner[1], u);
    EU.push([r2(x), r2(cy - e.open * Math.pow(Math.sin(Math.PI * Math.pow(u, .92)), .82))]);
  }
  for (let i = 0; i <= 8; i++) {
    const u = 1 - i / 8, x = lerp(outer[0], inner[0], u), cy = lerp(outer[1], inner[1], u);
    EL.push([r2(x), r2(cy + e.lower * Math.sin(Math.PI * u))]);
  }
  EL[0] = EU[8]; EL[8] = EU[0];
  const mid = (outer[0] + inner[0]) / 2, chord = lerp(outer[1], inner[1], .5);
  return { EU, EL, IRC: [r2(mid), r2(chord - e.open * .4)], IRR: e.iris };
}

function genBrow(b, eyeApexY, headX) {
  const head = [headX, r1(eyeApexY - 11 + (b.lift || 0))], tail = [headX - 42, r1(eyeApexY - 14.2 + (b.lift || 0))];
  // Cubic Bezier from head to tail; `a` lifts the middle into an arch.
  const bez = a => {
    const c1 = [head[0] - 14, head[1] - a * 1.2], c2 = [tail[0] + 20, tail[1] - a * 1.7];
    return [0, .2, .4, .6, .8, 1].map(t => {
      const m = 1 - t, f = i => m * m * m * head[i] + 3 * m * m * t * c1[i] + 3 * m * t * t * c2[i] + t * t * t * tail[i];
      return [r1(f(0)), r1(f(1))];
    });
  };
  const th = b.thickness || 1;
  return {
    curve: bez(b.arch), straight: bez(b.arch * .3), dy: 0, asym: null, seeds: [51, 51],
    widths: [[0, 3], [.15, 3.4], [.45, 3.1], [.65, 2.7], [.85, 1.7], [1, .4]].map(q => [q[0], r2(q[1] * th)]), grad: [r1(headX - 20.5), tail[0]]
  };
}

function genLips(l, noseBase) {
  const hw = l.width, f = l.full, my = l.y, U = r1(11.6 * f), D = r1(13.4 * f);
  const corner = [r1(120 - hw), my], peak = [r1(120 - hw * .74), r1(my - U)], notch = [120, r1(my - U + 2.1)];
  const lower = [.2, .3, .45, .58, .72, .85, .93, .97, 1].map(u => [u, r2(my + D * Math.pow(1 - Math.pow(u, 2.5), .62))]);
  return {
    halfWidth: hw, dy: 0, corner, peak, notch, round: [2.2, .5],
    meet: [[0, r2(my + .25)], [.08, r2(my + .2)], [.16, my], [1, my]], lower, bottom: r1(my + D + .2),
    gap: [r2(my + .05), r2(my - .1), r2(my + .9)],
    philtrum: [
      `M${r1(117.6)} ${r1(peak[1] - 11)} Q${r1(116.4)} ${r1(peak[1] - 5.3)} ${r1(peak[0] + .1)} ${r1(peak[1] + .5)}M${r1(122.4)} ${r1(peak[1] - 11)} Q${r1(123.6)} ${r1(peak[1] - 5.3)} ${r1(240 - peak[0] - .1)} ${r1(peak[1] + .5)}`,
      `M120 ${r1(peak[1] - 10.2)} V${r1(peak[1] + 1.5)}`
    ],
    detail: {
      shade: [r1(120 - hw * .3), r1(my - 1.6), 3.6, 1.2],
      tub: [[120, r1(my - U * .31), 4.2, 2.4], [119.5, r1(my - U * .41), 1.5, .5]],
      gloss: [[120, r1(my + D * .58), 9, 3.4], [120, r1(my + D * .55), 2.6, 3.5], [119.3, r1(my + D * .48), .8, 1.8]],
      corner: [[r1(corner[0] + 1), my, 1.2, .8], [r1(corner[0] + 1.6), r1(my + .1), 2.4, 1.4]],
      under: [120, r1(my + D + 3.8), 11, 2]
    }
  };
}

function genGeometry(p) {
  p = deepMerge({
    shape: "oval", width: 1, jaw: 1, chin: 1,
    eye: { gap: 21, width: 30, y: 137, tilt: 5, open: 9.4, lower: 3.4, iris: 6.6 },
    brow: { arch: 2.6, thickness: 1, lift: 0 }, lips: { width: 22.5, full: 1, y: 214 }, nose: { width: 16 }
  }, p || {});
  const outline = genOutline(p), eye = genEye(p.eye), hasUpper = eye.EU.reduce((m, q) => Math.min(m, q[1]), 999);
  const yBottom = outline[Math.floor(outline.length / 2)][1];
  const edge = y => edgeLeft(outline, y);
  const lips = genLips(p.lips), w = p.nose.width, x0 = r1(120 - w), eyeMidX = (eye.EU[0][0] + eye.EU[8][0]) / 2;
  const eyeY = eye.IRC[1], lowerY = eye.EL[3][1];

  // hair: the cap hugs the outline from the apex to the temple, wraps over the top of the ear and ends behind it
  const apexY = 49, T = [r1(edge(108.8) + 1), 108.8];
  const line = [[120, apexY], [r1(116.2), r1(apexY + 1.3)], [r1(107), r1(apexY + 4.4)]].concat(SHAPE_Y.slice(1, 6).map(y => [r1(edge(y) + 1), y]), [T]);
  const wrap = [[-1.5, 4.5], [-5, 8.5], [-10, 11], [-15.5, 11.5], [-19.5, 9.5], [-21, 5.5]].map(o => [r1(T[0] + o[0]), r1(T[1] + o[1])]);
  const end = wrap[wrap.length - 1], rx = 120 - end[0], yc = end[1];
  const outer = [0, 12, 24, 36, 48, 60, 74, 90].map(a => [r1(120 - rx * Math.sin(a * Math.PI / 180)), r1(yc - (yc - 21) * Math.cos(a * Math.PI / 180))]);
  outer[outer.length - 1] = [end[0], end[1]];
  const back = [[1.8, 23], [3.4, 48], [3.6, 73], [2.6, 103], [.4, 143], [-1.8, 189]].map(o => [r1(end[0] + o[0]), r1(end[1] + o[1])]);
  const neckX = 74, bi = [120, 150, 186, 214, 240, 270, 306].map((y, i) => [r1(end[0] + 4.8 + (neckX - end[0] - 4.8) * Math.pow((y - 120) / 186, 1.7)), y]);
  const ex = r1(edge(150)), y0 = 122, earH = 56, earW = 10.5;
  return {
    outline,
    body: {
      neck: "M84 222 C84 244 83 262 78 276 L162 276 C157 262 156 244 156 222 Z",
      shoulders: "M12 300 C20 286 54 279 82 273 L158 273 C186 279 220 286 228 300 Z",
      top: "M10 300 C18 289 54 282 78 275 C86 285 101 291 120 291 C139 291 154 285 162 275 C186 282 222 289 230 300 Z"
    },
    // redness, hairTones and irisStops stay null unless the profile fixes them; the drawing then derives them from the colours
    // the person edits (skin, hair, iris).
    colors: { garment: "#4a5a68", redness: null, hairTones: null, irisStops: null },
    hair: {
      line, wrap, outer, back, backInner: bi, seed: 61,
      backStrands: `M${r1(end[0] + 1)} 246q-2.4 10-4.6 20M${r1(end[0] + .4)} 266q-2 7-4.2 12M${r1(end[0] - .2)} 278q-2.8 5-4.4 12`,
      baby: [1, 2, 4, 5].map(i => { const q = line[i + 1]; return `M${r1(q[0])} ${r1(q[1] + .6)}q-1.5 1.3-2.1 3.1`; }).join(""),
      strand: `M${r1(T[0] + 3)} ${T[1] - 6}C${r1(T[0] - .6)} ${T[1] + 2} ${r1(T[0] - 1.8)} ${T[1] + 12} ${r1(T[0] - .2)} ${T[1] + 21}`,
      headband: [`M${r1(end[0] + 5)} 84C${r1(end[0] + 11)} 46 82 30 120 30C158 30 ${r1(240 - end[0] - 11)} 46 ${r1(240 - end[0] - 5)} 84`, `M${r1(end[0] + 6.4)} 82C${r1(end[0] + 12)} 47 83 32.4 120 32.4C157 32.4 ${r1(240 - end[0] - 12)} 47 ${r1(240 - end[0] - 6.4)} 82`],
      part: `M120 26L119.5 31L120.5 36L119.6 41L120.4 45L120 ${apexY - .5}`,
      crown: "M107 13.6q-6-3.6-13.4-2.6M133.4 13q7-4 14.6-2.2"
    },
    // A half-ellipse ear tucked behind the cheek: rim groove, ridge, concha shade and lobe are smaller arcs inside it.
    ear: {
      path: `M${r1(ex + 1)} ${y0}A${r1(earW + 1)} ${earH / 2} 0 0 0 ${r1(ex + 1)} ${y0 + earH}L${r1(ex + 3.2)} ${y0 + earH - 2}L${r1(ex + 3.2)} ${y0 - 1}Z`,
      clip: [0, y0 - 4, r1(ex + 5), earH + 14],
      rim: [
        `M${r1(ex)} ${y0 + 3}A${r1(earW - 1.4)} ${earH / 2 - 3} 0 0 0 ${r1(ex)} ${y0 + earH - 3}`,
        `M${r1(ex)} ${y0 + 1.4}A${r1(earW)} ${r1(earH * .2)} 0 0 0 ${r1(ex - earW + 1)} ${r1(y0 + earH * .2)}`,
        `M${r1(ex - earW * .5)} ${r1(y0 + earH * .16)}Q${r1(ex - earW * .62)} ${r1(y0 + earH * .5)} ${r1(ex - earW * .3)} ${r1(y0 + earH * .8)}`
      ],
      concha: [r1(ex - 2), r1(y0 + earH * .45), 1.9, r1(earH * .19)], lobe: [r1(ex - 2.2), r1(y0 + earH - 6.4), 2.6, 3.2],
      lobeLine: `M${r1(ex + .4)} ${r1(y0 + earH - 8)}Q${r1(ex - 2)} ${r1(y0 + earH - 7)} ${r1(ex - 2.8)} ${r1(y0 + earH - 10.6)}`,
      fit: `matrix(.85 0 0 1 ${r2(.15 * ex - 4.4)} 0)`
    },
    eyes: { L: eye, seeds: [211, 211] },
    brows: genBrow(p.brow, hasUpper, r1(eye.EU[8][0] + 5.6)),
    nose: {
      dy: 0,
      bridge: `M${r1(120 - w * .55)} 137 C${r1(120 - w * .54)} 151 ${r1(120 - w * .65)} 163.4 ${x0} 172`,
      ala: `M${x0} 172 C${r1(x0 - 5)} 177 ${r1(x0 - 4.8)} 183.4 ${r1(x0 + 1)} 186 C${r1(x0 + 4)} 187.4 ${r1(x0 + 8.4)} 187.4 ${r1(x0 + 11.6)} 186.4`,
      nostril: [r1(x0 + 5), 184.2, 3, 1.3, -8], base: `M${r1(115.2)} 187.4 Q120 189.4 ${r1(124.8)} 187.4`
    },
    lips,
    anchors: {
      red: { tip: [120, 186, 7, 6, 0], cheek: [r1(104), 184, 6, 5.5, 0], chin: [120, r1(yBottom - 11), 22, 9.5, 0] },
      hairShadow: [120, apexY + 11, 56, 11],
      contourJaw: SHAPE_Y.slice(10).map((y, i) => [r1(edge(y) + 3 + i * .6), y]),
      contourNose: `M${r1(120 - w * .55 - .2)} 140 C${r1(120 - w * .55 - .2)} 155 ${r1(120 - w * .65 + 2)} 166 ${r1(x0 + 1.2)} 177`,
      shade: { cheek: [r1(edge(152) + 6), 152, 8.5, 6, -12], chin: [120, r1(yBottom - 3.5), 13, 5] },
      blush: {
        mid: [r1(edge(163) + 18), r1(eyeY + 32), 16, 8], under: [r1(edge(155) + 24), r1(eyeY + 23), 23, 8],
        sun: [r1(edge(163) + 19.5), r1(eyeY + 31), 16, 7.5], sunMid: [120, r1(eyeY + 29), 17, 6.5]
      },
      hl: {
        cheekTop: [r1(edge(147) + 11.5), 147.5, 11.5, 3.8, 22], inner: [r1(eye.EU[8][0] + 2.5), r1(eye.EU[8][1] - .3), 2.6, 2.3],
        brow: [r1(eyeMidX - 3), r1(hasUpper - 10), 9, 1.8], triangle: `M${r1(eye.EU[0][0] + 4)} ${r1(lowerY + 7.5)} L${r1(eye.EU[8][0] + 1.6)} ${r1(lowerY + 7.5)} L${r1(eyeMidX + 5.6)} ${r1(lowerY + 28)} Z`,
        nose: [120, 156, 2.6, 21], cupid: [120, r1(lips.peak[1] + 1.6), 5.6, 1.1],
        sparkH: {
          "cheekbone-top": [[r1(edge(147) + 4.8), 151.6, 1.3], [r1(edge(147) + 11.5), 146.6, 1], [r1(edge(147) + 19), 144.6, 1.2]],
          "inner-corner": [[r1(eye.EU[8][0] + 2.5), r1(eye.EU[8][1] - .3), 1.1]],
          "under-eye-triangle": [[r1(eyeMidX), r1(lowerY + 9.5), .9], [r1(eyeMidX + 7), r1(lowerY + 18.5), 1.1]], "brow-bone": [[r1(eyeMidX - 1.5), r1(hasUpper - 10), 1]]
        },
        sparkC: { "nose-bridge": [[120, 149.5, 1.1], [120, 168, .9]], "cupid-bow": [[120, r1(lips.peak[1] + 1.6), .9]] },
        sparkGen: [[r1(eyeMidX), r1(lowerY + 9.5), .9], [r1(eyeMidX + 7), r1(lowerY + 18.5), 1.1], [r1(eyeMidX - 5.5), r1(lowerY + 12.5), .9]]
      },
      temple: [r1(edge(93) + 8), 93, 6.5, 10, -12],
      freckles: { x: r1(eye.EU[0][0] + 4), w: 33, y: r1(lowerY + 8), h: 14, slope: .8, slopeFrom: r1(eye.EU[8][0] + 1.2), seed: 91, n: 14 }
    }
  };
}

// The profile's geometry: generated defaults, with any explicit part of face.geometry replacing the generated one.
function resolveGeometry(g) {
  g = g || {};
  const base = genGeometry(g.params);
  const out = deepMerge(base, Object.keys(g).reduce((o, k) => (k !== "params" && (o[k] = g[k]), o), {}));
  out.rules = P.face.rules;
  return out;
}
const G = resolveGeometry(P.face.geometry);
