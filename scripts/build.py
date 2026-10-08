#!/usr/bin/env python3
"""Bakes a profile, the catalogue and a season palette into one self-contained HTML file.

    python3 scripts/build.py                                   # demo profile -> app/index.html
    python3 scripts/build.py --profile profiles/me.local.json --out dist/index.html
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def js_json(value):
    # Compact JSON that is safe inside a <script> element.
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return text.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def check_profile(p, path):
    skin = (p.get("colors") or {}).get("skin", {}).get("hex", "")
    if not re.fullmatch(r"#?[0-9a-fA-F]{6}", str(skin)):
        sys.exit(f"{path}: colors.skin.hex must be a #rrggbb colour")
    if p.get("season", "deep-autumn") != "deep-autumn":
        sys.exit(f"{path}: only the deep-autumn season preset exists (see data/palettes)")


def build(profile_path, out_path, palette_path, catalog_path, expose=False):
    profile = load(profile_path)
    check_profile(profile, profile_path)
    parts = sorted((ROOT / "src" / "js").glob("*.js"))
    data = (
        f"const OM_CATALOG = {js_json(load(catalog_path))};\n"
        f"const OM_PALETTE = {js_json(load(palette_path))};\n"
        f"const OM_PROFILE = {js_json(profile)};\n"
    )
    # --expose-test-api hands the engine to tests as window.__om; the shipped builds never carry it.
    tail = "\nwindow.__om = { judge, onSkin, adapted, original, faceSVG, CATS, CAT, LOOKS, CATALOG, P, PC, SKIN, dE, lab, lch, GAPS, GAP_LOOKS, SHOPST, recompute, plan: () => PLAN };" if expose else ""
    script = '"use strict";\n(function () {\n' + data + "\n".join(p.read_text(encoding="utf-8") for p in parts) + tail + "\n})();"
    html = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
    html = html.replace("/*@CSS*/", (ROOT / "src" / "style.css").read_text(encoding="utf-8"))
    # Splice by position: str.replace would also work, but the script contains backslashes and `$` that must stay as they are.
    head, tail = html.split("/*@SCRIPT*/")
    html = head + script + tail
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"{out}: {len(html) // 1024} KB, profile {profile.get('id') or profile.get('name') or profile_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--profile", default=str(ROOT / "profiles" / "demo.json"))
    ap.add_argument("--out", default=str(ROOT / "app" / "index.html"))
    ap.add_argument("--palette", default=str(ROOT / "data" / "palettes" / "deep-autumn.json"))
    ap.add_argument("--catalog", default=str(ROOT / "data" / "layouts-catalog.json"))
    ap.add_argument("--expose-test-api", action="store_true", help="add window.__om for tests (never for a shipped build)")
    a = ap.parse_args()
    build(a.profile, a.out, a.palette, a.catalog, a.expose_test_api)
