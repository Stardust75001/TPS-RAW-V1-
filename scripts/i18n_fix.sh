#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

EN="locales/en.default.json"
SCHEMA_GLOB="en.default.schema.json"

# jq-in-place helper
jqp() { local f="$1"; shift; local tmp="${f}.tmp"; jq -c "$@" "$f" >"$tmp" && mv "$tmp" "$f"; }

echo "1) Rebuild EN with union of all keys…"
tmp_union=/tmp/i18n.union.keys; : > "$tmp_union"
for f in locales/*.json; do [[ "$f" == *"$SCHEMA_GLOB" ]] && continue; jq -r 'paths(type=="string")|join(".")' "$f"; done \
  | sort -u > "$tmp_union"

# Inject any missing keys into EN (use a human-ish placeholder from the last segment)
while IFS= read -r key; do
  jq -e --arg k "$key" 'getpath(($k|split(".")))' "$EN" >/dev/null 2>&1 && continue
  base=$(awk -F. '{print $NF}' <<<"$key" | sed -E 's/_/ /g;s/\b([a-z])/\U\1/g')
  jqp "$EN" --arg k "$key" --arg v "$base" 'setpath(($k|split(".")); $v)'
done < "$tmp_union"

echo "2) Backfill locales from EN for empty/placeholder values…"
for L in locales/*.json; do
  [[ "$L" == "$EN" || "$L" == *"$SCHEMA_GLOB" ]] && continue
  while IFS= read -r key; do
    cur=$(jq -r --arg k "$key" 'getpath(($k|split("."))) // empty' "$L")
    [[ -z "${cur:-}" || "$cur" == "$key" ]] || continue
    val=$(jq -r --arg k "$key" 'getpath(($k|split(".")))' "$EN")
    jqp "$L" --arg k "$key" --arg v "$val" 'setpath(($k|split(".")); $v)'
  done < "$tmp_union"
done

echo "3) Opinionated Danish fixes (high-visibility strings)…"
DA="locales/da.json"
if [[ -f "$DA" ]]; then
jqp "$DA" '
(.general //= {}) | (.general.contact //= {}) | (.general.countdown_timer //= {}) |
(.newsletter //= {}) |

.general.map_address              = "Adresse" |
.general.map_phone                = "Telefon" |
.general.map_email                = "E-mail" |
.general.map_hours                = "Åbningstider" |
.general.map_api_key_missing      = "Google Maps API-nøgle mangler" |

.newsletter.confirmation_text     = "Tak for din tilmelding!" |

.general.contact.message          = "Besked" |
.general.contact.name             = "Navn" |
.general.contact.phone            = "Telefon" |
.general.contact.send             = "Send besked" |
.general.contact.success          = "Tak for din besked. Vi vender tilbage snarest." |

.general.countdown_timer.d        = "d" |
.general.countdown_timer.h        = "t" |
.general.countdown_timer.m        = "m" |
.general.countdown_timer.days     = "dage" |
.general.countdown_timer.hours    = "timer" |
.general.countdown_timer.minutes  = "minutter" |
.general.countdown_timer.seconds  = "sekunder" |
.general.countdown_timer.expires  = "Tilbuddet udløber om"
'
fi

echo "4) Validate JSON"
for f in locales/*.json; do jq . "$f" >/dev/null || { echo "❌ $f invalid"; exit 1; }; done

echo "5) Reports"
jq -r 'paths(type=="string")|join(".")' "$EN" | sort -u > /tmp/en.keys
ANY=0
for L in locales/*.json; do
  [[ "$L" == *"$SCHEMA_GLOB" ]] && continue
  comm -23 /tmp/en.keys <(jq -r 'paths(type=="string")|join(".")' "$L" | sort -u) | sed -e "s/^/Missing in $(basename "$L"): /" && ANY=1 || true
done
for L in locales/*.json; do
  [[ "$L" == *"$SCHEMA_GLOB" ]] && continue
  jq -r '
    paths(type=="string") as $p | {k:($p|join(".")), v:getpath($p)}
    | select(.v=="" or .v==.k) | .k
  ' "$L" | sed "s/^/Empty or placeholder in $(basename "$L"): /" && ANY=1 || true
done
[[ ${ANY:-0} -eq 0 ]] && echo "✅ All locales in sync; no empties/placeholders."

echo "6) Commit & push"
git add locales/
git commit -m "i18n: rebuild EN union; backfill empties from EN; Danish fixes for common strings" || true
git push || true
