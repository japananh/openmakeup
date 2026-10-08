# openmakeup

**English** | [Tiếng Việt](README.vi.md)

A single-file web app that helps you choose makeup colours for your own skin, lips, brows and face. Vietnamese first, with English.

It answers four questions. Which colours suit me? Does this lipstick or brow pencil work for me? Which look should I try today? What do I still need to buy?

![Today screen](docs/img/today.png)

## Features

- Colour check. Pick any colour and get a verdict in words: suits, okay, or does not suit, with the reason. The maths (Lab, LCh, CIEDE2000) stays behind the scenes and is never shown as a number.
- Lip check. Compares the colour with your natural lips and with your skin, at the coverage of the finish you choose (tint, gloss tint, velvet, matte, liner). The target is one to two steps deeper than your natural lips. A note says when the lip rim needs a liner first.
- Brow and liner check. Compares the colour with your brows and your hair. Cool greys that stand out against warm skin are flagged, unless the layout is cool-toned.
- Season palette. Deep Autumn colours for base, concealer, blush, lips, eyes, contour, highlight and brows, with the colours to avoid and why. Foundation and concealer shades follow your skin.
- Layout library. 169 makeup layouts, techniques, finishes, occasions and traditions from Korea, China, Japan, Vietnam, Thailand and the West. Each has its palette, key techniques and the pages it was checked against.
- Shopping list as a gap. Pick the layouts you want to wear. The app works out what to buy, ordered by how many layouts each item completes. It also shows the closest colour you already own and why it is not enough.
- Face drawing. Every layout is drawn on a neutral face that you reshape with profile parameters. Face rules in your profile, for example a short liner wing, adapt the drawing.
- Skin routine tracker and seasonal tips by location.
- Works offline once opened. Everything you enter stays in your browser.

![Lip check on a phone](docs/img/checker.png)

## Run it

Open `app/index.html` in a browser. It is one file with no server and no build step. The only network request is the web fonts, and the app works without them.

To serve it locally instead:

```sh
python3 -m http.server 8000   # then open http://localhost:8000/app/
```

## Use your own profile

The demo shows a fictional person. Replace it in one of three ways:

1. In the app, open Profile, then Settings, and use Import profile (JSON). The profile is stored in your browser (localStorage). Export saves it again as a file, and Back to the built-in profile undoes it.
2. Edit your name, colours and location directly on the Profile screen. The colour picker can sample a photo.
3. Bake a profile into your own single file:

```sh
python3 scripts/build.py --profile profiles/me.local.json --out dist/index.html
```

Files named `profiles/*.local.json` and the `dist/` folder are ignored by git, so a personal profile never gets committed. The format is in [docs/profile.md](docs/profile.md). [docs/face-geometry.md](docs/face-geometry.md) explains how to shape the face drawing.

## Keep personal data out of git

`scripts/check-private.sh` scans what is staged for personal markers: colour codes, names, medication, local paths, emails and photo names. It fails the commit when it finds one. Turn the hook on once per clone:

```sh
git config core.hooksPath .githooks
```

Run `scripts/check-private.sh --all` to scan every tracked file.

The script itself only knows generic patterns. Your own markers (hex codes, names, medication, photo names) go in the gitignored `scripts/private-markers.local`, one regex per line; copy `scripts/private-markers.example` to start.

## Develop

```sh
python3 scripts/build.py                # src/ + profiles/demo.json -> app/index.html
node scripts/test.mjs                   # static checks, no browser
node scripts/smoke.mjs app/index.html   # walks every screen in both languages, needs Chrome
```

`app/index.html` is generated from `src/`. See [docs/architecture.md](docs/architecture.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Data, sources and credits

- Code: MIT, see [LICENSE](LICENSE).
- Data: CC BY 4.0, see [DATA_LICENSE](DATA_LICENSE). This covers the catalogue (`data/layouts-catalog.json`), the season palettes (`data/palettes/`) and the demo profile.
- The catalogue paraphrases and cites public web pages. Each entry lists its `sources` and, under `evidence`, the pages that were actually read. The pages belong to their authors.
- Colour values in the catalogue are estimates read from those pages. Treat them as a starting point and swatch in daylight before buying.
- Fonts: Archivo, Be Vietnam Pro and JetBrains Mono from Google Fonts (SIL Open Font License).
- The app gives colour guidance, not professional or medical advice.
