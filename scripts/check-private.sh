#!/usr/bin/env bash
# Fails when staged content (or, with --all, every tracked file) carries a personal marker.
# Wired as .githooks/pre-commit; enable once with: git config core.hooksPath .githooks
set -u
# Byte-wise matching: BSD sed and grep reject some multibyte text and binary files otherwise.
export LC_ALL=C

cd "$(git rev-parse --show-toplevel)" || exit 2

# Generic markers only. Personal ones (hexes, names, medication) live in the gitignored
# scripts/private-markers.local: one regex per line, "#" comments, skipped when absent.
# A "case:" prefix makes the line case-sensitive (for a name that is also an ordinary word).
CI='/Users/|/home/[a-z]'
CS=''
MARKERS=scripts/private-markers.local
if [ -f "$MARKERS" ]; then
  extra=$(grep -vE '^[[:space:]]*(#|$|case:)' "$MARKERS" | paste -sd'|' -)
  [ -n "$extra" ] && CI="$CI|$extra"
  CS=$(grep -E '^case:' "$MARKERS" | sed 's/^case://' | paste -sd'|' -)
fi
EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}'
# Paths that must stay untracked: private profiles, photos, scratch and build output.
FILES='(^|/)(\.work|_plans|\.local-shots|dist)/|\.local\.json$|\.(heic|jpe?g)$'
# A default location must stay neutral: Hà Nội may only be one preset option.
HANOI_DEFAULT='(default|mặc định)[^"]{0,40}(Hà Nội|hanoi)|LOC *= *\{ *id: *"hanoi"|"location"[^}]{0,60}hanoi'

# This file lists the markers, so it is the one path the content scan skips.
SELF=scripts/check-private.sh

if [ "${1:-}" = "--all" ]; then
  mode=all
  names() { git ls-files; }
  added() { git ls-files -z -- ":!$SELF" | xargs -0 cat; }
else
  mode=staged
  names() { git diff --cached --name-only --diff-filter=ACMR; }
  added() { git diff --cached -U0 --no-color --diff-filter=ACMR -- . ":!$SELF" | grep -E '^\+' | grep -vE '^\+\+\+ '; }
fi

fail=0
report() { printf 'check-private: %s\n' "$1" >&2; fail=1; }

bad_names=$(names | grep -E "$FILES" || true)
[ -n "$bad_names" ] && report "path must not be committed:" && printf '  %s\n' $bad_names >&2

# Context window keeps the output short even on one-line JSON.
hits() { added | sed -E 's/[Vv]iolet loose powder//g' | grep -oE "$1" "${@:2}" | cut -c1-120 | sort -u | head -8; }

h=$(hits ".{0,30}($CI).{0,30}" -i); [ -n "$h" ] && report "personal marker:" && printf '  %s\n' "$h" >&2
[ -n "$CS" ] && { h=$(hits ".{0,30}($CS).{0,30}"); [ -n "$h" ] && report "name:" && printf '  %s\n' "$h" >&2; }
h=$(hits ".{0,30}($EMAIL).{0,10}"); [ -n "$h" ] && report "email address:" && printf '  %s\n' "$h" >&2
h=$(hits ".{0,30}($HANOI_DEFAULT).{0,30}" -i); [ -n "$h" ] && report "Hà Nội as a default:" && printf '  %s\n' "$h" >&2

if [ $fail -ne 0 ]; then
  echo "check-private: blocked ($mode). Move the data to profiles/*.local.json." >&2
  exit 1
fi
echo "check-private: clean ($mode)"
