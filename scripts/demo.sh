#!/usr/bin/env bash
# End-of-session demo against a running `pnpm dev`: create a short link, click it five times
# with curl under different Referers, then print its stats and the analytics URL to open.
# curl (unlike a browser) does not cache the 301, so every click reaches the server.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TARGET_URL="${TARGET_URL:-https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301}"

body=$(mktemp)
trap 'rm -f "$body"' EXIT

# request <curl args...>: stores the response body in $body and its status in $status;
# fails on anything outside 2xx/3xx.
request() {
  status=$(curl -sS -o "$body" -w '%{http_code}' "$@")
  case "$status" in
    2??|3??) ;;
    *)
      echo "error: HTTP $status — $(cat "$body")" >&2
      return 1
      ;;
  esac
}

# json <expr>: evaluates <expr> against the last body parsed as JSON, bound to `r`.
# Node is a prerequisite of the project; jq is not.
json() {
  node -p "const r = JSON.parse(require('fs').readFileSync(0, 'utf8')); $1" <"$body"
}

if ! curl -sf -o /dev/null "$BASE_URL/api/health"; then
  echo "error: no API answering at $BASE_URL — start it with \`pnpm dev\` first" >&2
  exit 1
fi

echo "==> POST $BASE_URL/api/shorten"
request -X POST "$BASE_URL/api/shorten" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"$TARGET_URL\"}"
short_code=$(json 'r.shortCode')
short_url=$(json 'r.shortUrl')
echo "    HTTP $status — $short_url -> $TARGET_URL"

echo "==> GET $BASE_URL/$short_code x5"
referers=(
  'https://twitter.com/'
  'https://news.ycombinator.com/'
  'https://github.com/'
  ''
  'https://twitter.com/'
)
for referer in "${referers[@]}"; do
  if [ -n "$referer" ]; then
    request -H "Referer: $referer" "$BASE_URL/$short_code"
  else
    request "$BASE_URL/$short_code"
  fi
  printf '    HTTP %s  Referer: %s\n' "$status" "${referer:-(none)}"
done

echo "==> GET $BASE_URL/api/stats/$short_code"
request "$BASE_URL/api/stats/$short_code"
json 'JSON.stringify(r, null, 2)'

echo
echo "Short URL:     $short_url"
echo "Analytics URL: $BASE_URL/analytics/$short_code"
