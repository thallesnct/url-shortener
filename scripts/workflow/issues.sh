#!/usr/bin/env bash
# Helpers for local issue files: docs/issues/<prd-slug>/<id>-<slug>.md
# Frontmatter is flat `key: value`; list values are `[a, b]`.
# bash 3.2 compatible (macOS default).
set -euo pipefail

ROOT="${WORKFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ISSUES_DIR="$ROOT/docs/issues"
PRDS_DIR="$ROOT/docs/prds"

usage() {
  cat <<USAGE
usage: issues.sh <command> [args]
  list <prd-slug>                 all issues: phase|id|status|blockers|parallel|shared|zones|title|file
  ready <prd-slug>                todo issues whose blockers are all done (same columns)
  get <issue-file> <key>          read a frontmatter value
  set <issue-file> <key> <value>  write a frontmatter value in place (adds the key if missing)
  validate <prd-slug>             ids unique, blockers exist, no cycles, blocker phase <= issue phase
  sync-prd <prd-slug>             regenerate the checklist between <!-- issues:start/end --> in the PRD
USAGE
}

fm_get() { # file key
  awk -v k="$2" '
    NR==1 { if ($0 != "---") exit; next }
    /^---$/ { exit }
    index($0, k ":") == 1 { s = substr($0, length(k) + 2); sub(/^[ \t]+/, "", s); sub(/[ \t]+#.*$/, "", s); print s; exit }
  ' "$1"
}

fm_set() { # file key value
  local tmp; tmp="$(mktemp)"
  awk -v k="$2" -v v="$3" '
    NR==1 && $0 == "---" { infm = 1; print; next }
    infm && /^---$/ { if (!done) print k ": " v; infm = 0; print; next }
    infm && index($0, k ":") == 1 && !done { print k ": " v; done = 1; next }
    { print }
  ' "$1" > "$tmp" && mv "$tmp" "$1"
}

list_of() { echo "$1" | tr -d '[]' | tr ',' ' ' | xargs; } # "[a, b]" -> "a b"

issues_dir() {
  local d="$ISSUES_DIR/$1"
  [ -d "$d" ] || { echo "no such issues dir: $d" >&2; exit 1; }
  echo "$d"
}

rows() { # slug -> phase|id|status|blockers|parallel|shared|zones|title|file
  local d; d="$(issues_dir "$1")"
  find "$d" -maxdepth 1 -name 'P*-*.md' | sort | while IFS= read -r f; do
    printf '%s|%s|%s|%s|%s|%s|%s|%s|%s\n' \
      "$(fm_get "$f" phase)" "$(fm_get "$f" id)" "$(fm_get "$f" status)" \
      "$(list_of "$(fm_get "$f" blockers)")" "$(fm_get "$f" parallel)" \
      "$(fm_get "$f" touches-shared)" "$(list_of "$(fm_get "$f" zones)")" \
      "$(fm_get "$f" title)" "$f"
  done | sort -t'|' -k1,1n -k2,2
}

status_of() { echo "$1" | awk -F'|' -v id="$2" '$2 == id { print $3; exit }'; } # rowsdata id

cmd_list() { rows "$1"; }

cmd_ready() {
  local data; data="$(rows "$1")"
  echo "$data" | while IFS='|' read -r phase id status blockers rest; do
    [ "$status" = "todo" ] || continue
    local ok=1 b bs
    for b in $blockers; do
      bs="$(status_of "$data" "$b")"
      if [ -z "$bs" ]; then echo "warn: $id blocker $b not found" >&2; ok=0
      elif [ "$bs" != "done" ] && [ "$bs" != "dropped" ]; then ok=0; fi
    done
    [ "$ok" = 1 ] && echo "$data" | awk -F'|' -v id="$id" '$2 == id'
  done
  return 0
}

cmd_validate() {
  rows "$1" | awk -F'|' '
    {
      n++; id[n] = $2; ph[n] = $1; deps[n] = $4
      if ($2 in seen) { print "error: duplicate id " $2; bad = 1 }
      seen[$2] = n
      if ($3 !~ /^(todo|in-progress|review|done|blocked|dropped)$/) { print "error: " $2 " bad status \"" $3 "\""; bad = 1 }
    }
    END {
      for (i = 1; i <= n; i++) {
        m = split(deps[i], d, " ")
        for (j = 1; j <= m; j++) {
          if (!(d[j] in seen)) { print "error: " id[i] " blocker " d[j] " does not exist"; bad = 1; continue }
          if (ph[seen[d[j]]] + 0 > ph[i] + 0) { print "error: " id[i] " (phase " ph[i] ") blocked by later-phase " d[j]; bad = 1 }
        }
      }
      # Kahn: repeatedly remove nodes whose deps are all removed
      remaining = n
      do {
        progress = 0
        for (i = 1; i <= n; i++) {
          if (removed[i]) continue
          m = split(deps[i], d, " "); free = 1
          for (j = 1; j <= m; j++) if ((d[j] in seen) && !removed[seen[d[j]]]) free = 0
          if (free) { removed[i] = 1; remaining--; progress = 1 }
        }
      } while (progress && remaining > 0)
      if (remaining > 0) {
        printf "error: dependency cycle among:"
        for (i = 1; i <= n; i++) if (!removed[i]) printf " %s", id[i]
        print ""; bad = 1
      }
      if (bad) exit 1
      print "ok: " n " issues"
    }'
}

cmd_sync_prd() {
  local slug="$1" prd="$PRDS_DIR/$1.md"
  [ -f "$prd" ] || { echo "PRD not found: $prd" >&2; exit 1; }
  local block tmp out; block="$(mktemp)"; out="$(mktemp)"
  rows "$slug" | awk -F'|' -v slug="$slug" '
    { n[$1]++; if ($3 == "done" || $3 == "dropped") d[$1]++; L[NR] = $0 }
    END {
      cur = ""
      for (i = 1; i <= NR; i++) {
        split(L[i], f, "|"); base = f[9]; sub(".*/", "", base)
        rel = "../issues/" slug "/" base
        if (f[1] != cur) { if (cur != "") print ""; printf "### Phase %s (%d/%d done)\n", f[1], d[f[1]] + 0, n[f[1]]; cur = f[1] }
        if (f[3] == "done")         printf "- [x] [%s](%s) %s\n", f[2], rel, f[8]
        else if (f[3] == "dropped") printf "- [x] ~~[%s](%s) %s~~ (dropped)\n", f[2], rel, f[8]
        else                        printf "- [ ] [%s](%s) %s `%s`\n", f[2], rel, f[8], f[3]
      }
    }' > "$block"
  if ! grep -q '<!-- issues:start -->' "$prd"; then
    printf '\n## Phases & issues\n<!-- issues:start -->\n<!-- issues:end -->\n' >> "$prd"
  fi
  awk -v blockfile="$block" '
    /<!-- issues:start -->/ { print; while ((getline line < blockfile) > 0) print line; skip = 1; next }
    /<!-- issues:end -->/   { skip = 0 }
    !skip { print }
  ' "$prd" > "$out" && mv "$out" "$prd"
  rm -f "$block"
  echo "synced $prd"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  list)     [ $# -eq 1 ] || { usage; exit 2; }; cmd_list "$1" ;;
  ready)    [ $# -eq 1 ] || { usage; exit 2; }; cmd_ready "$1" ;;
  get)      [ $# -eq 2 ] || { usage; exit 2; }; fm_get "$1" "$2" ;;
  set)      [ $# -eq 3 ] || { usage; exit 2; }; fm_set "$1" "$2" "$3" ;;
  validate) [ $# -eq 1 ] || { usage; exit 2; }; cmd_validate "$1" ;;
  sync-prd) [ $# -eq 1 ] || { usage; exit 2; }; cmd_sync_prd "$1" ;;
  *) usage; exit 2 ;;
esac
