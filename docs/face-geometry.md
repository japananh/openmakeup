# Face geometry

The app draws the profile's face as one SVG in a 240 by 300 box. Everything the drawing needs about the face sits in one object, `G`, built by `src/js/58-face-geom.js` from `face.geometry` in the profile. The drawing code in `src/js/60-face.js` only reads `G`.

- [Coordinate system](#coordinate-system)
- [Generated face](#generated-face)
- [Explicit overrides](#explicit-overrides)
- [Face rules](#face-rules)
- [Look diagrams](#look-diagrams)
- [Tracing your own face](#tracing-your-own-face)

## Coordinate system

- The SVG `viewBox` is `0 0 240 300`. One unit is 1/240 of the drawing's width. All coordinates and sizes below are in these units.
- `x` runs left to right and is centred on `120`. `y` runs top to bottom.
- The top of the head (hair apex) is near `y 49`, the hairline at the centre near `y 51`, the eyes near `y 137` and the mouth near `y 214`. The chin of the default face ends near `y 253`.
- The left half of the face (`x` below `120`) is the source of truth. The right half is the mirror image, so the generated face is symmetric by construction. Only the outline, the eyes (`eyes.R`) and the brows (`brows.asym`) can break the symmetry.
- A point is `[x, y]`. An ellipse is `[cx, cy, rx, ry]`, with an optional fifth value for rotation in degrees: `[cx, cy, rx, ry, rotation]`.
- A path is an SVG path-data string (`"M82 222 C..."`). A curve through points is drawn as a smooth Catmull-Rom spline.

## Generated face

`face.geometry.params` is all a profile needs to get a neutral, symmetric face. Give only the values that differ; the rest keep the defaults.

```json
"params": {
  "shape": "round", "width": 1, "jaw": 1, "chin": 1,
  "eye": { "gap": 22, "width": 29, "y": 137, "tilt": 3, "open": 8.6, "lower": 3.2, "iris": 6.4 },
  "brow": { "arch": 3, "thickness": 1.1 },
  "lips": { "width": 21.5, "full": 1.1, "y": 214 },
  "nose": { "width": 15 }
}
```

| Param | Default | Meaning |
|---|---|---|
| `shape` | `"oval"` | Preset outline: `oval`, `round`, `heart`, `square` or `long`. An unknown name falls back to `oval`. |
| `width` | `1` | Scales the half-width of the whole outline. |
| `jaw` | `1` | Scales the half-width from the lower cheek down (from `y 199`). |
| `chin` | `1` | Stretches the part of the face below `y 199` vertically. Above 1 gives a longer chin. |
| `eye.gap` | `21` | Distance from the centre line to the inner corner of the eye. |
| `eye.width` | `30` | Length of the eye, inner corner to outer corner. |
| `eye.y` | `137` | Height of the inner corner. |
| `eye.tilt` | `5` | Degrees the outer corner sits higher than the inner corner. |
| `eye.open` | `9.4` | Height of the upper lid at its highest. |
| `eye.lower` | `3.4` | Depth of the lower lid. |
| `eye.iris` | `6.6` | Iris radius. |
| `brow.arch` | `2.6` | How much the middle of the brow lifts into an arch. |
| `brow.thickness` | `1` | Multiplies the brow width. |
| `brow.lift` | `0` | Added to the brow's `y`. A positive value moves the brow down toward the eye. |
| `lips.width` | `22.5` | Half-width of the mouth. |
| `lips.full` | `1` | Multiplies the lip height. |
| `lips.y` | `214` | Height of the line where the lips meet. |
| `nose.width` | `16` | Half-width of the nose at the base. |

The brow is placed relative to the eye, so moving `eye.y` moves the brow with it. The outline presets are half-widths sampled at fifteen heights between the hairline and the chin.

## Explicit overrides

Every other key of `face.geometry` replaces a part of the generated face. An override merges with the generated value key by key: objects merge, arrays and strings replace as a whole. So you can override one inner value (say `anchors.blush.mid`) and keep the rest.

| Key | Controls | Shape and units |
|---|---|---|
| `outline` | The face contour. | Closed list of points. First `[120, 51]` at the top, then the right side down, `[120, chinY]` at the chin, then the left side back up. Drawn as a smooth closed curve. |
| `body` | Neck and clothes. | `{ neck, shoulders, top }`, each a path string. |
| `colors` | Colours the drawing cannot derive. | `{ garment, redness, hairTones, irisStops }`. `garment` is a hex. The others are `null` by default and are then derived from the skin, hair and iris colours; `hairTones` is three hexes and `irisStops` four. |
| `hair` | Hair cap, back hair and details. | `line` (hairline points from the apex to the temple), `wrap` (points that carry the hair over the top of the ear), `outer` (outer silhouette), `back` and `backInner` (hair behind the neck), `seed` (integer for the strand texture), and path strings `backStrands`, `baby`, `strand`, `headband` (two paths), `part`, `crown`. |
| `ear` | The visible ear. | `path` (outline), `clip` as `[x, y, width, height]`, `rim` (three path strings), `concha` and `lobe` as ellipses, `lobeLine` (path), `fit` (an SVG transform that tucks the ear behind the cheek). |
| `eyes` | The two eyes. | `{ L, R, seeds }`. `L` and optional `R` are `{ EU, EL, IRC, IRR }`: `EU` nine points along the upper lid from the outer corner to the inner corner, `EL` nine points along the lower lid from inner to outer (its ends equal the ends of `EU`), `IRC` the iris centre, `IRR` the iris radius. `R` is given in the left-half frame and mirrored; without `R`, the right eye copies `L`. `seeds` are two integers for the lash randomness. |
| `brows` | The brows. | `curve` (six points from head to tail, left half), `straight` (the same, used when a look asks for straight brows), `dy` (vertical offset), `widths` (pairs `[t, halfWidth]`, `t` from 0 at the head to 1 at the tail), `grad` (`[x0, x1]` range of the colour gradient), `seeds` (two integers) and optional `asym`. |
| `nose` | The nose shading. | `dy` (vertical offset), path strings `bridge`, `ala` and `base`, and `nostril` as `[cx, cy, rx, ry, rotation]`. |
| `lips` | The mouth. | See below. |
| `anchors` | Where the makeup layers sit. | See below. |

Brow `asym` gives each side its own rise and tail: `{ rise, riseW, tail, head, body, tailW }`. `riseW` and `tail` have one entry per `curve` point; the others are width adjustments in units.

`lips` holds `halfWidth`, `dy`, the key points `corner`, `peak` and `notch` as `[x, y]`, `round` (two corner-rounding distances), `meet` (pairs `[u, y]` for the meeting line, `u` being the fraction of the half-width from the centre), `lower` (pairs `[u, y]` for the lower-lip depth, same `u`), `bottom` (lowest `y`), `gap` (three `y` values for the parting at the centre), `philtrum` (two path strings) and `detail`: ellipses named `shade`, `tub`, `gloss`, `corner` and `under` that place the shading and shine.

`anchors` are ellipses and points where colour is laid on:

| Anchor | Use |
|---|---|
| `red` | `tip`, `cheek`, `chin`: the natural redness of nose, cheek and chin. |
| `hairShadow` | Shadow cast by the hair on the forehead. |
| `contourJaw`, `contourNose` | A point list along the jaw and a path along the nose side, for contour. |
| `shade` | `cheek` and `chin` ellipses for face-shaping shade. |
| `blush` | `mid`, `under`, `sun`, `sunMid`: the ellipses that blush shapes use. |
| `hl` | Highlight areas: `cheekTop`, `inner`, `brow`, `triangle` (a path), `nose`, `cupid`, and the sparkle points `sparkH`, `sparkC` and `sparkGen`. |
| `temple` | The temple brightening ellipse. |
| `freckles` | `{ x, w, y, h, slope, slopeFrom, seed, n }`: the box where `n` freckles are scattered. |

> [!NOTE]
> Hair, ear and anchors are computed from the generated outline and params. If you override only `outline`, they keep following the generated face. Set `shape`, `width`, `jaw` and `chin` close to your outline first, or override the dependent parts as well.

## Face rules

`face.rules` bends a look's diagram to this face. Rules change shapes, never colours, so the same rules fit any look. With no rules nothing changes. They run in `adaptDiagram` in `src/js/60-face.js`.

| Rule | Keys | Effect |
|---|---|---|
| `brow` | `shape`, `thickness` | Maps a look's brow shape or thickness to another. `{ "arched": "soft-arch" }` softens arched brows. |
| `liner` | `style` | Maps a liner style to another, for example `{ "puppy": "short-wing" }`. |
| `blush` | `scale`, `force`, `keep` | `scale` multiplies the intensity per shape. A shape not listed in `keep` is redrawn as `force`. |
| `highlight` | `glow`, `drop`, `temple` | `glow` is `{ drop, add }` and edits the highlight areas when the finish is glow or shimmer. `drop` removes areas for every finish. `temple` is a hex for a matte brightening of the temples; a look's own highlight colour wins. |
| `contour` | `drop`, `shade` | `drop` removes contour areas. `shade` is `{ hex, areas }`: soft shading on `cheekbone-outer`, `hairline` or `chin-tip`, in the look's contour colour or `hex` when the look has none. |
| `lid` | `creaseLift` | When true, a full-crease depth colour is drawn two units higher. |

The highlight `temple`, `drop` and the contour rules apply to a look's diagram, not to the bare face.

### Worked example

Rules:

```json
"rules": {
  "brow": { "shape": { "arched": "soft-arch" }, "thickness": { "thick": "medium" } },
  "liner": { "style": { "puppy": "short-wing" } },
  "blush": { "scale": { "diagonal-cheekbone": 0.8 }, "force": "apple-round", "keep": ["apple-round", "horizontal-mid-cheek"] },
  "highlight": { "glow": { "drop": ["nose-bridge"], "add": ["inner-corner"] }, "temple": "#fbeadb" },
  "contour": { "drop": ["cheek-hollow"], "shade": { "hex": "#8d6e5f", "areas": ["cheekbone-outer", "chin-tip"] } },
  "lid": { "creaseLift": true }
}
```

A look's diagram, before and after the rules:

| Part | Look says | Drawn |
|---|---|---|
| Brow | `shape: arched`, `thickness: thick` | `soft-arch`, `medium` (a thick brow is 1.22 times wide, medium is 1) |
| Liner | `style: puppy` | `short-wing` |
| Blush | `shape: diagonal-cheekbone`, `intensity: 0.4` | intensity `0.32`; the shape is not in `keep`, so it is drawn as `apple-round` |
| Highlight | `finish: glow`, areas `cheekbone-top`, `nose-bridge`, colour `#f3dcc8` | areas `cheekbone-top`, `inner-corner`; the temples brightened in the look's `#f3dcc8` |
| Contour | areas `cheek-hollow`, `jaw`, colour `#8a6a5a` | areas `jaw`; shade on `cheekbone-outer` and `chin-tip` in `#8a6a5a` |
| Lid | `depthArea: full-crease` | crease colour lifted by two units |

## Look diagrams

A look's `diagram` (see [profile.md](profile.md#looks-catalogfit-picks)) says what to draw. The app builds one for every catalogue entry from the entry's own palette. Keys the drawing reads:

| Key | Fields |
|---|---|
| `skin` | Skin hex. Defaults to the profile skin. |
| `brow` | `shape` (`straight`, `soft-arch`, `arched`), `thickness` (`thin`, `thick`, anything else is medium), `hex`. |
| `lid` | `base`, `main`, `depth`, `shimmer` (hexes); `depthArea` (`lashline`, `full-crease`, `wing`, or the outer corner by default); `lowerLash` (`outer-third`, `full`); `aegyo` (boolean). |
| `liner` | `hex`, `style` (`tightline`, `short-wing`, `long-wing`, `puppy`). |
| `blush` | `hex`, `intensity` (0.05 to 1), `shape` (`apple-round`, `horizontal-under-eye`, `diagonal-cheekbone`, `horizontal-mid-cheek`, `nose-bridge-sunkissed`). Under-eye and sunkissed have their own ellipses; every other shape uses the middle one. |
| `contour` | `hex`, `areas` (`jaw`, `nose-side` are drawn). |
| `highlight` | `hex`, `finish` (`matte`, `glow`, `blink` for shimmer), `areas` (`cheekbone-top`, `inner-corner`, `brow-bone`, `under-eye-triangle`, `nose-bridge`, `cupid-bow`). |
| `lips` | `color`, `style` (`full`, `gradient`, `overlined`, `blurred`), `linerProduct` (boolean, adds a liner line). |
| `freckles` | Hex. |
| `hairStyle` | `headband` pushes the hair back. |

An empty diagram `{}` draws the bare face with the profile's natural brow, eye and lip colours.

## Tracing your own face

You do not need to trace anything for a good result: start with `params` and adjust by eye. Trace only when you want the contour or the eyes to match a photo.

1. Take a straight-on photo in even light, head level, neutral expression.
2. Get landmarks: the pupils, the inner and outer eye corners, the mouth corners, the hairline centre, the chin point and a few points along the jaw. Any face-landmark tool or hand-placed points work.
3. Map the photo into the box. Put the face's centre line at `x 120` and scale uniformly so the hairline centre lands near `y 51` and the chin near `y 253`. The mapping is `x' = 120 + (x - xc) * s` and `y' = 51 + (y - yHairline) * s`, with `s = 202 / (yChin - yHairline)`.
4. Fill `params` first. Read `eye.gap`, `eye.width`, `eye.y` and `eye.tilt` straight from the mapped corners, and pick the nearest `shape`, then tune `width`, `jaw` and `chin`. Build, open Profile and compare.
5. For the contour, sample the jaw and cheek edge at the heights of the preset (`y 52.5` to `251.5`) and write the right side top to bottom, the chin point, then the left side bottom to top into `outline`. You can average the two sides to keep the face symmetric, or keep them different. Then check that the hair cap and ear still line up; override them if not.
6. For asymmetric eyes, give an `eyes.R`. For brows with a different rise or tail on each side, give `brows.asym`.

Keep the personal photo and the measurements out of any file you commit. Only the resulting numbers belong in the profile, and a profile with a real face belongs in `profiles/*.local.json`.
