# Contributing

Small, focused changes are welcome. Open an issue first for anything that changes the profile format.

## Set up

```sh
git config core.hooksPath .githooks   # runs scripts/check-private.sh before every commit
python3 scripts/build.py              # src/ + demo profile -> app/index.html
node scripts/test.mjs                 # static checks, no browser
node scripts/smoke.mjs app/index.html # every screen in Vietnamese and English (needs Chrome)
```

`app/index.html` is generated: edit `src/`, then rebuild and commit both.

## Rules

- No personal data in git. A real profile lives in `profiles/*.local.json` (ignored). The hook blocks hex colours, names, medication, photos and local paths that match `scripts/check-private.sh`; do not weaken it.
- The engine takes everything about a person from the profile. Do not hard-code a face, a skin colour, a brand or a city in `src/js`.
- UI text is a `[vi, en]` pair in `src/js/03-strings.js`. Vietnamese is the default: plain, modern, with modern tone marks (hòa, khỏe, thủy) and English makeup terms kept as they are.
- The UI never shows a colour-difference number, only words.
- Catalogue entries (`data/layouts-catalog.json`) need at least one source URL and a Vietnamese field for each English one.
- Comments say why, not what.

## Pull requests

Run `node scripts/test.mjs` and the smoke test, and say in the description what you checked by eye. One topic per pull request.
