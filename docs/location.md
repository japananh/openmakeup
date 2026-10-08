# Location and season

Seasonal makeup tips follow the climate the profile names, not a fixed city. The code is in `src/js/35-season.js`.

- [Setting](#setting)
- [Climate models](#climate-models)
- [Where the season is used](#where-the-season-is-used)
- [Testing another month](#testing-another-month)
- [Where it is stored](#where-it-is-stored)

## Setting

The person chooses where they live in Profile, Settings. The choice is a preset and, for `other`, a climate type.

| Preset `id` | Label | Climate model |
|---|---|---|
| `hanoi` | `Hà Nội / miền Bắc` | `north` |
| `hcm` | `TP.HCM / miền Nam` | `south` |
| `danang` | `Đà Nẵng / miền Trung` | `central` |
| `dalat` | `Đà Lạt` | `highland` |
| `other` | `Khác` | The person picks `humid`, `cold` or `mild` |

There is no default city. A profile with no `location` is `{ "id": "other", "climate": "mild" }`: mild, all year. A city is one preset among five, chosen by the profile or the person.

For a preset, the model comes from the preset and any `climate` in the profile is ignored. For `other`, `climate` selects the model and shows as buttons in Settings: `humid` (hot and humid), `cold` (cold and dry) and `mild`.

## Climate models

Each model maps the month (1 to 12) to a season. Each season has a weather kind, and the kind selects the tips: `humid`, `hot`, `dry`, `mixed` (dry mornings and evenings, hot noon) or `cool`.

| Model | Months and season | Kind |
|---|---|---|
| `north` | 12 to 2: dry winter<br>3 to 4: humid spring<br>5 to 8: hot, humid summer<br>9 to 11: autumn, changing season | `dry`<br>`humid`<br>`humid`<br>`mixed` |
| `south` | 5 to 11: rainy season<br>12 to 4: dry season | `humid`<br>`hot` |
| `central` | 9 to 12: rainy and storm season<br>1 to 4: dry, mild spring<br>5 to 8: hot, sunny summer | `humid`<br>`mixed`<br>`hot` |
| `highland` | 12 to 3: dry, chilly season<br>4 to 11: rainy, cool season | `dry`<br>`cool` |
| `humid` | All year | `humid` |
| `cold` | 11 to 3: cold and dry<br>4 to 10: mild | `dry`<br>`mixed` |
| `mild` | All year | `mixed` |

The place name shown in the interface is the preset's label, or for `other` a phrase for the climate type such as `khí hậu ôn hòa` or `mild climate`.

## Where the season is used

| Surface | What it uses |
|---|---|
| Today, header | The date and the place name. |
| Today, intro line | `lede.<kind>`, one line for the kind of weather. |
| Today, suggestion | `sug.<kind>`, placed before the layout's fit reason. |
| Palette, season card | `pal.season` with the place. Each category has two tips: one for hot, humid weather and one for dry or chilly weather. The card marks the one that applies now. For `humid` and `hot` it marks the first, for `dry` and `cool` the second. For `mixed` it shows both with a note to use both. |

The tips are makeup only. They give no skincare advice. The tips themselves are in the palette file (`summer` and `winter` per category) and in the `lede.`, `sug.` and `sea.` strings.

## Testing another month

The app takes the month from the device clock when it loads. A `month-N` flag in the URL hash overrides it for that session, with `N` from 1 to 12:

```text
app/index.html#today.month-3
```

The flag is read on load only. The app rewrites the hash as you move around and drops it, so it does not survive a reload.

## Where it is stored

- A baked profile carries `location` as part of its JSON. See [profile.md](profile.md).
- Changing the place in Settings saves `{ id, climate }` as an edit under `profile.edits` in `localStorage` (key prefix `openmakeup.v1.`). An edit wins over the baked or imported profile.
- An older build kept the location under `bp.location`. It is read when there is no edit and no imported location, and it then takes precedence over the location baked into the page.
