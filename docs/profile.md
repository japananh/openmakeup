# Profile

A profile is one JSON document that describes the person the app is drawn for: skin, lip, brow, hair and iris colours, face geometry, the makeup kit they own, their skincare routine and their language and climate. Nothing about a person lives in the code. The same build serves any profile.

- [Overview](#overview)
- [Minimal profile](#minimal-profile)
- [How pairs work](#how-pairs-work)
- [Top-level fields](#top-level-fields)
- [colors](#colors)
- [undertone, location, identity](#undertone-location-identity)
- [face](#face)
- [inventory](#inventory)
- [routine](#routine)
- [looks, catalogFit, picks](#looks-catalogfit-picks)
- [checker](#checker)
- [i18n, dataEn, nameEn](#i18n-dataen-nameen)
- [Import, bake and storage](#import-bake-and-storage)

## Overview

Only `colors.skin.hex` is required. Every other field is optional and falls back to a neutral default, so a profile can start tiny and grow. The app reads the profile through `normaliseProfile` in `src/js/05-profile.js`, which fills the defaults listed below.

The reference profile is `profiles/demo.json`, a fictional person used for illustration.

## Minimal profile

This is a complete, valid profile. It builds and passes the smoke test.

```json
{
  "schema": 1,
  "name": "Sam",
  "colors": { "skin": { "hex": "#d4a37b" } }
}
```

With no other fields the app shows the whole catalogue, a bare default face, neutral lip, brow, hair and iris colours, an empty kit (so the shopping list counts nothing), and an empty skincare screen.

## How pairs work

Text that the app shows in both languages is written as a `[vi, en]` pair: the Vietnamese text first, the English text second.

```json
"tone": ["Da trung bình, ấm trung tính", "Medium skin, warm-neutral"]
```

- In Vietnamese mode the app shows index 0. In English mode it shows index 1, and falls back to index 0 when index 1 is empty.
- Most pair fields also accept a plain string. A plain string is shown unchanged in both languages.
- Colour names (`colors.*.nm`) must be pairs. A plain string there would show only its first character.
- Single-language fields are plain strings: brand, product and shade names, routine `product`, `care[].name`, `meds[].name` and the text inside `looks`.

The full list of pair fields is in the tables below; the language rules are in [i18n.md](i18n.md).

## Top-level fields

| Field | Type | Default | Meaning |
|---|---|---|---|
| `schema` | number | `1` | Format version. Informational. |
| `id` | string | none | Free label. `scripts/build.py` prints it; the app ignores it. |
| `name` | string | `""` | Display name, at most 30 characters when edited in the app. Fills the `{name}` placeholder and the profile heading. |
| `shade` | string | `""` | Short skin or foundation shade label such as `"Medium"`. Shown in the header pill next to the season and in the colour checker. |
| `brand` | `{ name, tag }` | `{ "name": "openmakeup", "tag": "" }` | Wordmark and page title. Both parts are optional. |
| `season` | string | `"deep-autumn"` | Personal-colour season. `scripts/build.py` accepts only `deep-autumn` today, the one palette in `data/palettes`. The app itself takes the season name and colours from the baked palette. |
| `colors` | object | skin required | See [colors](#colors). |
| `undertone` | `{ shift }` | `{ "shift": 0 }` | See [undertone, location, identity](#undertone-location-identity). |
| `location` | `{ id, climate }` | `{ "id": "other", "climate": "mild" }` | Climate for season-aware tips. See [location.md](location.md). |
| `identity` | object | `{}` | Summary shown on Today and Profile. |
| `face` | object | see below | Analysis text, drawing rules and geometry. |
| `inventory` | object | `{ rows: [], names: {}, care: [] }` | The makeup kit and skincare products. |
| `routine` | object | `{ am: [], noon: [], pm: [], meds: [] }` | Skincare steps. |
| `looks` | array | `[]` | Optional looks adapted by hand. |
| `catalogFit` | object | `{}` | Optional hand-set fit for catalogue entries. |
| `picks` | array | `[]` | Look ids suggested on Today. |
| `checker` | object | `{ samples: { son: [], may: [] }, liner: null }` | Quick tests and a lip liner for the colour checker. |
| `i18n` | object | `{}` | Extra or overriding UI strings. |
| `dataEn` | object | `{}` | English names for data words. |
| `nameEn` | object | `{}` | English names for layouts. |

Objects merge key by key with the defaults. Arrays and scalars you provide replace the default.

## colors

One object per feature. Missing features get a neutral stand-in, except `found`, which is simply hidden when absent.

| Key | Parts | Fallback | Used by |
|---|---|---|---|
| `skin` | `hex` | `#dfb593` | Reference for base, concealer, blush, eyes, highlight and contour, the face drawing and the whole judge. Required. |
| `found` | `hex` | none (row hidden) | Foundation in use, compared with skin. Reference only. |
| `lip` | `hex`, `rim` | `#c98f84` | Natural lip colour for the lip checker; the optional `rim` is the darker lip edge. |
| `brow` | `hex`, `head`, `dark` | `#4a3c34` | Brow checker and drawing; `head` is the lighter start of the brow, `dark` the deepest tone. |
| `hair` | `hex` | `#2a2220` | Brow and liner checks, and the drawing. |
| `iris` | `hex` | `#4a3a30` | Eye drawing. |

Every colour object also takes `nm`, a map from part name to a `[vi, en]` pair that names that colour. Parts are `hex`, `rim`, `head` and `dark`.

```json
"brow": {
  "hex": "#4a3a30", "head": "#6b5546", "dark": "#352a23",
  "nm": {
    "hex": ["nâu đậm", "dark brown"],
    "head": ["nâu vừa", "mid brown"],
    "dark": ["nâu rất đậm", "very deep brown"]
  }
}
```

Rules:

- A hex is `#rrggbb`, `rrggbb` or the three-digit form. The app normalises it to lowercase `#rrggbb`. An invalid `rim`, `head` or `dark` is dropped.
- A part with no name in `nm` gets a suggested name from the colour itself and is marked as an automatic name. After the person edits a colour in the app, the old name is cleared and a suggestion replaces it.
- A missing optional part (no `rim`, no `head`) skips the check that needs it instead of failing.

How the colours are used is in [color-profile.md](color-profile.md).

## undertone, location, identity

`undertone.shift` is a number of hue degrees, default `0`. On a red-based skin, warm colours read redder than they are. The judge subtracts the shift from the hue of lip colours, blushes, eyeshadows and highlights before it compares them with its hue bands, and the Palette and Profile screens show how a peach and an orange change on this skin when the shift is above zero. Leave it at `0` for no correction.

`location` is `{ "id": "<preset>", "climate": "<model>" }`. Presets are `hanoi`, `hcm`, `danang`, `dalat` and `other`; `climate` matters only for `other` and is `humid`, `cold` or `mild`. See [location.md](location.md).

`identity` is shown on Today and Profile. Every field is optional.

| Field | Type | Meaning |
|---|---|---|
| `key` | array of pairs | Short headline tags. Defaults to the season name. |
| `tone` | pair | One-line skin tone summary. |
| `toneLong` | pair | Longer tone text for Profile; falls back to `tone`. |
| `type` | pair | Skin type, such as combination. |
| `pcLong` | pair | Longer personal-colour text; falls back to the season name. |
| `traits` | array of pairs | Short feature chips. |

## face

| Field | Type | Meaning |
|---|---|---|
| `analysis` | object or `null` | Profile screen text: `contrast` (pair), `items` (array of `{ k, v }` pairs, the first seven are shown), `rules` (array of pairs) and `note` (pair). |
| `rules` | object | How the drawing bends a look to this face: brow, liner, blush, highlight, contour, lid. See [face-geometry.md](face-geometry.md). |
| `hints` | object | One sentence per feature, shown on a catalogue entry that uses that feature. Keys: `brow`, `liner`, `blush`, `contour`, `hl`. Each value is a pair. |
| `notes` | object | Shape notes shown on an adapted look. Keys: `linerPuppy`, `linerDefault`, `lid`, `aegyo`, `blush`. Each value is a pair. |
| `weight` | object or `null` | Visual weight, see below. The section is hidden when absent. |
| `geometry` | object | The 240x300 face drawing. See [face-geometry.md](face-geometry.md). |

`face.weight` rates how heavy each feature reads on this face, from 1 to 5:

```json
"weight": {
  "level": ["Trung bình", "Medium"],
  "sub": ["Tóc và mày đậm nhất.", "Hair and brows carry the most weight."],
  "rows": { "hair": { "n": 4, "note": ["nâu đen, dày", "brown-black, thick"] }, "brows": { "n": 3 } },
  "implications": [["Trang điểm vừa phải là đủ cân.", "A medium level of makeup balances this."]]
}
```

`rows` accepts `hair`, `brows`, `eyes`, `lips` and `jaw`; each has `n` (1 to 5) and an optional `note` pair. `level`, `sub` and each `implications` entry are pairs.

## inventory

The kit drives the shopping list; see [shopping-gap.md](shopping-gap.md) for what the fields mean to the matcher.

```json
"inventory": { "rows": [], "names": {}, "care": [] }
```

### rows

One row per product, or one row per pan when a product holds several colours. Rows with the same `brand` and `product` merge into one item with one pan per row.

| Field | Type | Meaning |
|---|---|---|
| `brand` | string | Brand. A trailing parenthesis is removed from the display name; if it says `unverified`, the item is flagged as unverified. |
| `product` | string | Product name. |
| `shade` | string | Shade name. When all rows of a product share one shade, it joins the display name. |
| `cat` | string | Category code. Always write it; `""` means eyeshadow. See below. |
| `finish` | string | Free text such as `matte` or `glossy tint`. Matches decide the finish label; `clear` makes the item colourless. |
| `hex` | `#rrggbb` or `""` | The colour. Empty means unknown: it is never guessed and never matched. |
| `confidence` | string | `low` with a `hex` marks the colour as an estimate. |
| `pan` | string | Pan number, for multi-row products. A single-row product ignores it. |
| `role` | string | Decides cross-use, see [shopping-gap.md](shopping-gap.md). |
| `tone` | string | `cool` marks a cool grey, set aside outside cool-tone layouts. |
| `cheek_ok` | boolean | A lip product that also works on the cheeks. |

Category codes:

| Code | Product |
|---|---|
| `nen` | Foundation or cushion |
| `che` | Concealer |
| `phu` | Setting powder (no colour needed) |
| `khoa` | Setting spray (no colour needed) |
| `mat` | Eyeshadow |
| `liner` | Eyeliner |
| `ma` | Blush |
| `khoi` | Contour |
| `hl` | Highlight |
| `may` | Brow product |
| `son` | Lip colour |
| `chi` | Lip liner |

Longer Vietnamese aliases for `chi` and `khoa` are also accepted; use the codes. A pan inside a multi-row product may carry its own `cat`, for example a contour pan in a face palette.

> [!WARNING]
> Colours a person records in the app are tied to the item's position in `rows` and to the pan order inside it. Add new products at the end, or recorded colours attach to the wrong product.

### names

Optional overrides for names the rows cannot derive. The key is `"brand|product"` with the brand exactly as written in `rows`.

```json
"names": { "Sample Co|Cream Blush": { "name": ["Má kem Sample", "Sample cream blush"], "short": "Sample blush", "alias": "sample blush" } }
```

`name` and `short` are a string or a pair. `alias` is lowercase text that lets a look step such as `"Sample Co blush"` find this item.

### care

Skincare products listed on Profile, not compared with colours: `[{ "id": "cleanser", "name": "Gentle cleanser", "note": ["Sữa rửa mặt", "Cleanser"] }]`.

## routine

```json
"routine": {
  "am": [{ "key": "am-clean", "step": ["Sữa rửa mặt", "Cleanser"], "product": "Gentle cleanser" }],
  "noon": [], "pm": [], "pmSub": ["Tối", "Evening"], "meds": []
}
```

| Field | Type | Meaning |
|---|---|---|
| `am`, `noon`, `pm` | array of steps | A step is `{ key, step, product }`. `step` is a pair or a plain string; `product` is a plain string. A step with a `key` gets a tick button and its progress is stored per day. |
| `pmSub` | pair | Subtitle under the evening heading. |
| `meds` | array | Optional scheduled treatments. |

Morning steps whose key is one of `am-base`, `am-conc`, `am-hl`, `am-powder`, `am-eye` or `am-lip` are grouped as a collapsed makeup group. With no steps at all the Skin screen shows an empty state.

A `meds` entry:

| Field | Meaning |
|---|---|
| `name` | Plain string. |
| `route` | `"oral"`; any other value reads as topical. |
| `days` | `"daily"` or an array of weekday numbers, Monday is `0`. |
| `when` | Pair, shown after the name. |
| `dot` | Pair, tooltip on the week grid. |
| `today` | `{ on, off }` pairs shown in the Today routine line when the treatment is or is not due. |

With no `meds`, the week grid shows how much of the morning and evening routine was ticked off each day.

## looks, catalogFit, picks

By default every catalogue entry is drawn on the profile's bare face with its own colours, and its fit comes from the colours (see [architecture.md](architecture.md#how-fit-is-decided)). These three fields let a profile replace that for chosen entries.

`catalogFit` sets the fit of an entry by id, without any adapted data:

```json
"catalogFit": { "clean-girl": { "level": "Hợp sẵn", "reason": ["Màu nhẹ, hợp da bạn.", "Soft colours that suit your skin."] } }
```

`level` is one of `Hợp sẵn`, `Đổi màu là hợp`, `Khó hợp`, `Tham khảo`. `reason` is a pair or a string.

`looks` is an array of looks adapted by hand for this person. A look's `id` equals a catalogue entry id, and it replaces that entry's drawing, steps and fit. Keys:

| Key | Meaning |
|---|---|
| `id`, `name`, `vibe`, `time`, `level` | Identity and header text, plain strings. |
| `occ` | Occasion letters: `d` everyday, `w` work, `h` date, `p` party. |
| `fit` | `{ label, reason }`; `label` is one of the four fit labels. |
| `adaptation`, `features` | Arrays of text lines. An `adaptation` line starting with `Giữ` is shown as the keep summary; lines starting with `Giữ` or `Đổi` are left out of the face notes. |
| `vs` | Optional comparison sentence. |
| `originalPalette` | `[{ label, hex }]`, the entry's own colours. |
| `diagram` | What to draw on the face. See [face-geometry.md](face-geometry.md#look-diagrams). |
| `steps` | `[{ area, items: [{ label, swatch, hex, cat, how, product }] }]`. An item with `label` `Lưu ý` is a note that shows only `how`. |
| `gap` | `true` makes the shopping list use this look's steps. When at least one look sets it, only those looks are compared. |

`picks` is an array of look ids that Today suggests in turn. Without picks, Today uses the best-fitting drawable catalogue entries.

## checker

```json
"checker": {
  "samples": { "son": [{ "id": "brick", "name": "Sample Co Lip Tint Brick", "short": "Lip Tint Brick", "hex": "#9b4a40", "fin": "gloss" }], "may": [] },
  "liner": { "name": "Sample Co Lip Liner", "hex": "#a85f55" }
}
```

- `samples.son` and `samples.may` are quick tests shown as chips in the lip and brow checkers. `fin` is the finish: for lips `tint`, `gloss`, `velvet`, `matte` or `liner`; for brows `pencil`, `powder` or `eyeliner`.
- `liner` is a lip liner the person owns. When it is set and the profile has a lip `rim`, the lip checker offers a "line the lips first" toggle. Without it the toggle is hidden.

See [color-profile.md](color-profile.md).

## i18n, dataEn, nameEn

| Field | Shape | Meaning |
|---|---|---|
| `i18n` | `{ "key": [vi, en] }` | Adds or overrides UI strings. |
| `dataEn` | `{ "<kind>": { "<vi text>": "<en text>" } }` | English for data words. Kinds: `fit`, `swatch`, `label`, `area`, `step`. |
| `nameEn` | `{ "<layout id>": "<English name>" }` | English layout names. |

Details are in [i18n.md](i18n.md).

## Import, bake and storage

There are two ways to use a profile.

**Import in Settings.** On Profile, Settings, choose Import and pick a JSON file. The app checks that it is an object with a valid `colors.skin.hex`, stores it in the browser, clears the recorded edits and reloads. Export saves the current profile (baked or imported, plus edits) as `openmakeup-profile.json`; importing that file restores the same state. Reset removes the import and the edits and returns to the baked profile.

**Bake into the page.** `scripts/build.py` embeds a profile in a single HTML file:

```bash
python3 scripts/build.py                                            # demo profile, writes app/index.html
python3 scripts/build.py --profile profiles/me.local.json --out dist/index.html
```

The build checks that `colors.skin.hex` is a colour and that `season` is `deep-autumn`. A baked profile is readable in the page source, so share a personal build only with the person it describes.

Keep personal profiles in `profiles/*.local.json` and builds in `dist/`. Both are ignored by git, and the pre-commit hook in `.githooks` blocks personal markers; enable it once with `git config core.hooksPath .githooks`.

### Where state is stored

The effective profile is the imported profile, or the baked one when nothing was imported, with the edits merged on top. Everything lives in the browser's `localStorage` under the prefix `openmakeup.v1.`.

| Key | Holds |
|---|---|
| `profile.import` | The imported profile, whole. |
| `profile.edits` | A partial patch: name, edited colours with their names, location. |
| `lang` | The language the app opens in. |
| `shop` | Starred layouts, bought items, recorded colours, hand-added items. |
| `routine.done` | Ticked routine steps by date. |
| `care.extra` | Skincare products carried over from an older build. |
| `migrated` | Set once the legacy keys have been read. |

Older builds used `bp.profileName`, `bp.defaultLang` and `bp.location` (the prototype) and `tumau.v2.profile`, `tumau.v2.tab`, `tumau.v2.occ` and `tumau.v2.list` (the first app). The current app reads them once, copies what it can into the keys above, and never deletes them, so an old build keeps working. `bp.defaultLang` and `bp.location` are also still read at start-up when the new key is missing.
