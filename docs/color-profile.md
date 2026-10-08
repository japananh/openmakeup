# Màu của bạn: colour profile and checks

The colour profile is the set of colours the app compares products against: skin, lips, brows, hair and iris. It lives on the Profile screen as `Màu của bạn` ("Your colours"). The lip and brow checkers in `Kiểm tra màu` ("Check a colour") use it. The code is in `src/js/90-colors.js`.

- [The colour rows](#the-colour-rows)
- [Changing a colour](#changing-a-colour)
- [Preview strip](#preview-strip)
- [How a product is layered](#how-a-product-is-layered)
- [Lip checker](#lip-checker)
- [Brow and liner checker](#brow-and-liner-checker)
- [Other categories](#other-categories)
- [Engine constants](#engine-constants)

The interface only ever shows words and colour swatches. It never shows a Lab or LCh value or a colour-difference number. The numbers in this page are the thresholds the code uses internally.

## The colour rows

The profile's `colors` object (see [profile.md](profile.md#colors)) gives one row per feature:

| Row | Parts | Role in the app |
|---|---|---|
| Skin (bare) | main | The reference for base, concealer, blush, eyes, highlight and contour. |
| Foundation | main | The base in use, compared with skin. Reference only. The row is hidden when the profile has none. |
| Natural lips | main, rim | The reference for lip colour. The `rim` is the optional darker edge of the lip. |
| Brows | main, head, dark | The reference for brow pencil, brow powder and liner. `head` is the lighter start of the brow and `dark` the deepest tone. |
| Hair | main | A reference for brow and liner colour only. The app gives no hair-colour advice. |
| Eyes (iris) | main | Eye drawing. |

Each row shows a swatch, a name, one line saying what the colour is the reference for, a collapsed "Mã màu" ("colour code") list and an edit button. The lip swatch has a ring in the rim colour. The brow swatch has three bands for head, body and darkest tone.

A colour's name is the profile's own words (`nm`) until the colour is edited. After that the app suggests a name from the colour itself and marks it as an automatic name. A missing optional part (no rim, no head) skips the check that needs it instead of failing.

## Changing a colour

Edit opens a sheet with:

- A part switch when the feature has more than one part (lip: main and rim; brow: main, head and darkest).
- Before and after swatches, each with its name.
- The preview strip, with the tiles the edit changes outlined.
- Three tabs: Pick, Photo and Presets.

**Pick.** A native colour input, plus six fine-tuning buttons:

| Pair | Change |
|---|---|
| Lighter, deeper | Lightness up or down by 2.5 L* units. |
| Warmer, cooler | The yellow-blue axis up or down by 2 units; cooler also shifts the red-green axis slightly. |
| Richer, softer | Chroma multiplied or divided by 1.15. Richer on a near-grey adds some colour. |

A "back to original" link appears once the colour has changed.

**Photo.** The tab advises daylight, shows a drawn stand-in image until a photo is added, and samples a colour when the person taps the image (or moves with the arrow keys, two pixels at a time, ten with Shift, and presses Enter or Space). A loupe shows an 11 by 11 pixel patch, and the sampled colour is the average of the 5 by 5 pixels around the point, averaged in linear light. The photo stays in the browser. The sampled colour's name and a status line update as the point moves.

**Presets.** Named tones for the feature: nine for skin, the foundation shades of the palette for foundation, eleven for lips, six for the rim, ten for brows, eight for hair and six for the iris. The selected one is outlined.

Saving stores the change as a profile edit (see [profile.md](profile.md#where-state-is-stored)). A preset brings its own name; any other colour clears the old name so a suggestion replaces it.

Edits apply at once to the judge, the checkers and the face drawing. The foundation and concealer shades in Palette and the fit of catalogue entries are computed when the page loads, so they follow a changed skin colour after a reload.

## Preview strip

Four small tiles show how the colours sit together:

1. Skin beside lip colour (lip with rim).
2. Lips drawn on the skin.
3. Brows drawn on the skin, in head, body and dark tones.
4. Hair beside the skin.

In the picker, the tiles the edited colour affects are outlined: skin affects all four, lips affect the first two, brow and hair affect their own tile.

## How a product is layered

A product does not replace the colour under it. Each finish covers a share of what lies underneath, and the app mixes the product over the lip (or over the rim) by that share, in linear light, where pigment layers add up.

| Finish | Coverage | Shine | Used for |
|---|---|---|---|
| Tint | 55% | no | Lips |
| Gloss tint | 45% | yes | Lips |
| Velvet | 85% | no | Lips |
| Matte | 95% | no | Lips |
| Lip liner | 90% | no | Lips, judged as a liner |
| Brow pencil | 90% | no | Brows |
| Brow powder | 50% | no | Brows, soft fill |
| Eye pencil | 90% | no | Brows, as a liner |

The checker defaults to tint for lips and pencil for brows, and the person picks a finish with chips that show the coverage. A profile's `checker.samples` can set a finish per quick test.

One step is 6 L* units, about the smallest lightness change the eye reads as a different depth. Depth is measured in steps and shown to the nearest half step.

## Lip checker

The checker compares the product with the natural lip (depth and rim) and with the skin (undertone).

Inputs: a colour (picker or hex code), a finish, and optionally the profile's quick tests. When the profile has a lip `rim` and a `checker.liner`, a toggle "Line the lips first" adds the liner under the product. The result shows the skin, the natural lip with its rim, the product, and bare lips beside lips with the product on.

### Depth against the natural lip

The product is layered over the natural lip by its coverage. Depth is how many steps deeper that result is than the bare lip. The target is one to two steps deeper, which keeps the lips in balance with the brows and the rest of the face.

| Depth | Result | Meaning |
|---|---|---|
| More than half a step paler | Fail | Lips look washed out. |
| Within half a step | Note | Adds no weight. A sheer product that lands close to the lip suits a base layer better than lip colour. |
| Half to one step deeper | Note | A little light; two layers reach the target. |
| One to 2.2 steps deeper | Pass | On target. |
| 2.2 to 3.5 steps deeper | Note | Past the target; by day use one thin layer or a gradient. |
| More than 3.5 steps deeper | Note | Evenings or parties only. |

### Undertone against the skin

The product's hue is shifted by the profile's `undertone.shift` first, then read against these bands (the hue angle of the colour wheel):

| Hue band | Result |
|---|---|
| 335 to 13 (reds and rose browns) | Pass, unless the colour leans yellow in the Lab hue, which is a note. |
| 13 to 35 | Note: leans orange. |
| 35 to 50 | Note: leans yellow. |
| 290 to 335 | Cool purple-pink: fail when saturated (above 50) or dark (lightness below 35), otherwise a note. |
| Saturation under 15 | Fail: greyish, makes the lips pale. |
| Anything else | Fail: a fashion shade, not an everyday lip colour. |

### Rim

Skipped when the profile has no `rim`. Otherwise the rim is layered the same way. If the product covers less than 75% and the lip and the rim still differ visibly under it, the rim shows. The checker then says to line the lips or dab a thin concealer first and tags the result "Line the rim". This is a step to take, not a failure: it does not lower the verdict. A product that covers enough reports that the rim stays hidden.

### Lip liner

A lip liner is judged as a liner, not as a lip colour. The verdict pill reads "Kẻ viền môi" ("Liner"). If it is more than half a step deeper than the lip, it suits an ombré edge or a slight overline and will not hide the rim. Otherwise it is close to the natural lip and is for lining, not for the main colour. Its undertone passes when it is clearly warmer than the rim (the Lab hue 15 degrees warmer, with some chroma), because it neutralises a cool rim; a cool or grey liner is a note. For the rim, a liner passes when, after lining, the edge matches the centre.

### Verdict

The overall verdict is the worse of depth and undertone: `Hợp` ("Suits"), `Tạm được` ("Okay") or `Không hợp` ("Doesn't suit"). The headline is "right depth, right undertone" when both pass, or the text of the worst criterion. Tags add the rim note and, for a liner or a sheer product close to the lip, the liner tag. A list of criteria follows, each marked pass, note, fail, needs a step or info. The nearest palette colours are offered as alternatives, and an "add to list" button puts the colour on the shopping list by hand.

## Brow and liner checker

The checker compares the product with the brow's three tones and with the hair.

Inputs: a colour, a finish (brow pencil, brow powder or eye pencil), the profile's quick tests, and a "Cool-tone layout" toggle. The result shows the brow bands, the hair, the product, and the brows bare beside the brows with the product filled in.

### Lightness against the brows and hair

Each limit is in L* units, measured from the brow's own lightness (body, head) and the hair's.

| Product lightness | Result |
|---|---|
| Less than 3 units above the hair | Note: as dark as the hair; brows turn harsh and heavy. |
| Up to 4 above the brow body | Pass: matches the brow. |
| Up to 5 above the brow head | Pass, tagged for the brow head: use it for the head and gaps; body and tail need a deeper colour. |
| Up to 30 above the brow body | Note: lighter than the brow, even than the head. Tagged for light looks. |
| More than 30 above the brow body | Fail: far too light, the brows lose definition. |

### Warmth

The warmth check uses the product's chroma and Lab hue:

| Product | Result |
|---|---|
| Cool grey: chroma 9 or less, Lab hue between 70 and 200 degrees (the olive-green side), and not redder than the profile's brow | Fail, with the pill `Không hợp với mặt bạn` ("Doesn't suit your face") and the tag "off cool". The grey detaches from the face. With the cool-tone layout toggle on, it passes with a note. |
| Chroma 9 or less (otherwise) | Pass: neutral, close to the brow's cast. |
| Chroma 9 to 16 | Note: warmer than the brow. |
| Chroma above 16 and Lab hue under 45 | Fail: leans red-brown. |
| Chroma above 16 (otherwise) | Note: clearly warm brown. |

Cool-grey products in the kit follow the same idea: a kit item with `tone: cool` is only used for cool-tone layouts (see [shopping-gap.md](shopping-gap.md#cool-grey-items)).

### Verdict

The verdict is the worse of lightness and warmth. A last line says how to use the product: an eye pencil is softer than a brow pencil and smudges on oily skin; a product that reads as a light look is for light layouts, sheer and brushed through with gel; otherwise fill gaps only and do not go deeper than the real brows.

## Other categories

The checker also judges base, concealer, blush, eyeshadow, contour and highlight against the skin colour, one set of hue, saturation and lightness rules per category (`src/js/02-judge.js`). The result is `Hợp`, `Tạm được` or `Không hợp` with up to three short reasons. For categories where the product turns redder on a red-based skin (lips, blush, eyeshadow, highlight), a third swatch shows the colour as it will look on this skin, using `undertone.shift`.

## Engine constants

| Constant | Value | Where |
|---|---|---|
| `STEP_L` | 6 L* units per step | Depth in steps. |
| Rim shows | coverage under 75% and a visible difference between lip and rim under the product (5 or more CIEDE2000 units) | Lip checker. |
| Liner hides the rim | less than 3 CIEDE2000 units between lip and rim after lining | Lip checker. |
| Sheer and close to the lip | coverage under 75% and less than 6 CIEDE2000 units from the natural lip | Lip checker. |
| Lightness limits | hair +3, brow +4, head +5, brow +30 | Brow checker. |
| Cool grey | chroma at most 9, Lab hue 70 to 200, a\* at most the brow's a\* plus 0.5 | Brow checker. |
| Warm bands | chroma 9, 16; hue 45 | Brow checker. |
