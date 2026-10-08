/* The judge: one colour against the skin, per product category.
   Notes are message keys (j.*), so they follow the language switch and the season name. */
const SHIFTED = { son: 1, ma: 1, mat: 1, hl: 1 };

// Returns { v: 0 suits | 1 okay | 2 does not suit, notes: [key], hsl, dL, hr }.
// A red-based skin pulls warm colours toward red; the profile's undertone.shift says by how many degrees.
function judge(hex, cat, skinHex, shift) {
  if (shift == null) shift = UNDERTONE_SHIFT();
  const c = hexToHsl(hex), sk = hexToHsl(skinHex);
  const h = c.h, s = c.s, l = c.l, dL = l - sk.l;
  const hr = SHIFTED[cat] ? (h - shift + 360) % 360 : h;
  const issues = [], good = [];
  const bad = (sev, key) => issues.push([sev, key]);

  switch (cat) {
    case "nen":
      if (s < 12) bad(2, "j.nen.grey");
      else if (inHue(h, 330, 15)) bad(s > 35 ? 2 : 1, "j.nen.pink");
      else if (inHue(h, 45, 70)) bad(2, "j.nen.yellow");
      else if (!inHue(h, 15, 45)) bad(2, "j.nen.notSkin");
      else good.push("j.nen.good");
      if (inHue(h, 15, 45) && h - sk.h > 5) bad(s > 65 ? 2 : 1, s > 65 ? "j.nen.warm2" : "j.nen.warm1");
      else if (s > 65) bad(1, "j.nen.vivid");
      else if (s - sk.s > 8) bad(1, "j.nen.satMore");
      else if (sk.s - s > 15) bad(1, "j.nen.satLess");
      if (Math.abs(dL) > 10) bad(2, dL > 0 ? "j.nen.lighter2" : "j.nen.darker2");
      else if (Math.abs(dL) > 9) bad(1, dL > 0 ? "j.nen.lighter1" : "j.nen.darker1");
      else good.push("j.nen.closeL");
      break;
    case "che":
      // Green corrector: only a pale pastel is safe; skin-depth checks do not apply.
      if (inHue(h, 75, 160)) {
        if (l >= 78 && s <= 45) good.push("j.che.mintOk");
        else bad(2, "j.che.mintBad");
        break;
      }
      if (s < 12) bad(2, "j.che.grey");
      else if (inHue(h, 330, 8)) bad(1, "j.che.pink");
      else if (!inHue(h, 8, 50)) bad(2, "j.che.odd");
      else if (h - sk.h > 8) bad(1, "j.che.yellow");
      else good.push(s > 65 && inHue(h, 10, 30) ? "j.che.peach" : "j.che.beige");
      if (dL < -12) bad(2, "j.che.dark2");
      else if (dL < -8) bad(1, "j.che.dark1");
      else if (dL > 14) bad(2, "j.che.light2");
      else if (dL > 9) bad(1, "j.che.light1");
      else if (dL > 2) good.push("j.che.lightOk");
      else good.push("j.che.sameOk");
      break;
    case "ma":
      if (s < 20) bad(2, "j.ma.dull");
      else if (inHue(hr, 335, 9)) good.push("j.ma.good");
      else if (inHue(hr, 9, 35)) bad(1, "j.ma.peach");
      else if (inHue(hr, 290, 335)) bad(s > 55 ? 2 : 1, s > 55 ? "j.ma.fuchsia" : "j.ma.purplish");
      else if (inHue(hr, 35, 55)) bad(1, "j.ma.yellowOrange");
      else bad(2, "j.ma.unnatural");
      if (l > 75) bad(2, "j.ma.pale2");
      else if (l > 66) bad(1, "j.ma.pale1");
      else if (l < 30) bad(1, "j.ma.dark");
      if (s > 70 && l > 45) bad(1, "j.ma.vivid");
      break;
    case "son":
      if (s < 15) bad(2, "j.son.grey");
      else if (inHue(hr, 335, 13)) good.push("j.son.good");
      else if (inHue(hr, 13, 35)) bad(1, "j.son.orange");
      else if (inHue(hr, 290, 335)) bad(s > 50 || l < 35 ? 2 : 1, s > 50 || l < 35 ? "j.son.coolDeep" : "j.son.purplish");
      else if (inHue(hr, 35, 50)) bad(1, "j.son.yellowOrange");
      else bad(2, "j.son.fashion");
      if (l > 72) bad(2, "j.son.pale2");
      else if (l > 62) bad(1, "j.son.pale1");
      else if (l < 50 && inHue(hr, 335, 13) && s >= 25) good.push("j.son.deepOk");
      if (s > 78 && l > 40) bad(1, "j.son.vivid");
      if (l < 12) bad(1, "j.son.black");
      break;
    case "mat":
      if (s < 10 && l < 85) bad(1, "j.mat.coolGrey");
      else if (s < 15 && l >= 85) bad(1, "j.mat.silver");
      else if (l < 20) bad(1, "j.mat.tooDark");
      else if (inHue(hr, 325, 12) && l > 65 && s > 35) bad(1, "j.mat.pinkPuffy");
      else if (l > 85) bad(1, "j.mat.tooLight");
      else if (s > 70) bad(1, "j.mat.vivid");
      else if (inHue(hr, 14, 45) && s > 40 && l >= 35 && l <= 70) bad(1, "j.mat.orange");
      else if (inHue(hr, 45, 75)) good.push("j.mat.olive");
      else if (!inHue(hr, 338, 45)) bad(1, "j.mat.cool");
      else if (l < 35) good.push("j.mat.deepOk");
      else if (l > 70) good.push("j.mat.lightOk");
      else if (s < 15) bad(1, "j.mat.greyish");
      else good.push("j.mat.mainOk");
      break;
    case "khoi":
      if (s < 12) bad(2, "j.khoi.grey");
      else if (!inHue(h, 10, 45)) bad(2, "j.khoi.notShadow");
      else if (s > 50) bad(2, "j.khoi.orange");
      else if (s > 40) bad(1, "j.khoi.warm");
      else good.push("j.khoi.good");
      if (dL > -10) bad(2, "j.khoi.notDeep");
      else if (dL < -45) bad(1, "j.khoi.veryDeep");
      else good.push("j.khoi.deepOk");
      break;
    case "hl":
      if (dL <= 0) bad(2, "j.hl.same");
      else if (dL < 5) bad(1, "j.hl.weak");
      if ((s < 10 && l > 85) || (l > 92 && s < 35)) bad(2, "j.hl.frost");
      else if (!inHue(hr, 330, 45)) bad(2, "j.hl.cool");
      else if (hr > 28 && hr < 45 || (s > 60 && inHue(hr, 20, 45))) bad(1, "j.hl.gold");
      else if (s < 15) bad(1, "j.hl.greyish");
      else if (dL > 0) good.push(dL >= 8 ? "j.hl.good8" : "j.hl.good");
      break;
    case "may":
      if (l > 50) bad(2, "j.may.tooLight");
      if (l < 10) bad(2, "j.may.black");
      else if (s < 8) bad(1, "j.may.ash");
      else if (s > 45) bad(2, "j.may.redOrange");
      else if (inHue(h, 10, 45)) good.push("j.may.good");
      else bad(1, "j.may.odd");
      break;
  }
  let v = 0;
  issues.forEach(i => { if (i[0] > v) v = i[0]; });
  let notes = issues.filter(i => i[0] > 0).sort((a, b) => b[0] - a[0]).map(i => i[1]);
  issues.forEach(i => { if (i[0] === 0) good.push(i[1]); });
  if (!notes.length) notes = good;
  return { v, notes: notes.slice(0, 3), hsl: c, dL, hr: SHIFTED[cat] ? hr : null };
}
// The colour a product turns into on this skin: hue pulled by the undertone shift.
function onSkin(hex, cat) { const r = judge(hex, cat, SKIN()); return r.hr == null ? null : hslHex(r.hr, r.hsl.s, r.hsl.l); }
