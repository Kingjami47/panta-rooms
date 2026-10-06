#!/usr/bin/env bash
# v2 re-records: s3v2 (explore+filters+search), s8v2 (create w/ healthy AI), s9v2 (trade new demo room)
# Usage: rec_v2.sh <s3v2|s8v2|s9v2>
set -uo pipefail
AB="agent-browser"
dismiss() { $AB press Escape >/dev/null 2>&1; $AB wait 900 >/dev/null; }
fresh() { $AB reload >/dev/null; $AB wait --load networkidle >/dev/null; $AB wait 1400 >/dev/null; dismiss; }

click() {
  local name="$1" out i
  for i in 1 2 3; do
    out=$($AB find role button click --name "$name" --exact 2>&1)
    if echo "$out" | grep -q "Done"; then echo "  [click OK] $name"; return 0; fi
    echo "  [retry $i] $name :: $(echo "$out" | head -3 | tr '\n' ' ')"
    sleep 0.7
  done
  echo "  [click FAIL] $name"; return 1
}

case "$1" in
  s3v2)
    $AB open "${BASE:-https://panta-rooms.vercel.app}/#discover" >/dev/null && $AB wait --load networkidle && $AB wait 2400 && fresh
    $AB record start "/tmp/video/s3v2.webm"
    $AB wait 3600
    click "Sports"; $AB wait 1200
    click "Crypto"; $AB wait 1100
    click "Politics"; $AB wait 1800
    click "All"; $AB wait 800
    click "Resolved"; $AB wait 1400
    click "Open"; $AB wait 1100
    click "Any status"; $AB wait 900
    $AB press Escape >/dev/null 2>&1; $AB wait 400
    $AB find role textbox fill --name "Search markets…" "bitcoin" 2>&1 | grep -q Done || echo "  [SEARCH FILL FAILED]"
    $AB wait 3200
    $AB record stop
    ;;
  s8v2)
    BASE="${BASE:-https://panta-rooms.vercel.app}"
    # Pre-step (off camera): ensure Demo env (skip if the session is already demo).
    $AB open "$BASE/#community" >/dev/null && $AB wait --load networkidle && $AB wait 2000
    if ! $AB snapshot 2>/dev/null | grep -q '"DEMO DATA"'; then
      $AB find role button click --name "LIVE · MAINNET" --exact && $AB wait 1800
      $AB find text "Demo — sample data" click && $AB wait 1500
    fi
    dismiss
    $AB open "$BASE/#create" >/dev/null && $AB wait --load networkidle && $AB wait 2000 && fresh
    $AB record start "/tmp/video/s8v2.webm"
    $AB wait 1600
    $AB find role textbox fill --name "What do you want people to predict?" 'Will Solana flip \$500 on CoinGecko by 1 March 2027?' && $AB wait 1400
    $AB find role button click --name "Structure with AI" --exact
    # AI roundtrip can be slow locally — poll for the review CTA (up to ~30s)
    for i in 1 2 3 4 5 6 7 8 9 10; do
      if $AB find role button click --name "Review details" --exact 2>/dev/null | grep -q Done; then echo "  [AI done after ~$((i*3))s]"; break; fi
      $AB wait 3000
    done
    $AB wait 2200
    $AB find role button click --name "Continue to creation" --exact && $AB wait 1600
    $AB find role button click --name "Create Market" --exact && $AB wait 4500
    $AB record stop
    $AB url 2>/dev/null | tail -1 > /tmp/video/newroom_url.txt || true
    ;;
  s9v2)
    ROOM_URL=$(cat /tmp/video/newroom_url.txt 2>/dev/null)
    [ -n "$ROOM_URL" ] || ROOM_URL="${BASE:-https://panta-rooms.vercel.app}/#discover"
    $AB open "$ROOM_URL" >/dev/null && $AB wait --load networkidle && $AB wait 2400 && fresh
    $AB record start "/tmp/video/s9v2.webm"
    $AB wait 1800
    $AB find role button click --name "Trade NO" --exact && $AB wait 1500
    $AB find role button click --name "Trade YES" --exact && $AB wait 1000
    $AB find role button click --name "10" >/dev/null 2>&1 || true
    $AB wait 600
    $AB find role button click --name "Get quote" --exact && $AB wait 2000
    $AB find role button click --name "Confirm demo trade" --exact && $AB wait 2800
    $AB record stop
    ;;
  *) echo "unknown scene: $1"; exit 1 ;;
esac

echo "== clip check =="
OUT="/tmp/video/$1.webm"
[ -f "$OUT" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" || echo "MISSING CLIP: $OUT"
