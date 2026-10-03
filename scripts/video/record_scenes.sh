#!/usr/bin/env bash
# Record one scene clip: rec.sh <scene-id>
# Browser scenes navigate to the scene's startUrl, start recording, perform
# paced actions, stop. Clips land in /tmp/video/<id>.webm.
set -uo pipefail
ID="${1:?usage: rec.sh <scene-id>}"
OUT="/tmp/video/$ID.webm"
AB="agent-browser"

# Dismiss any auto-opened overlay (wallet modal, toasts) after page load.
dismiss() { $AB press Escape >/dev/null 2>&1; $AB wait 900 >/dev/null; }

# Force a full page load: open() on the SAME hash URL does not reload the SPA,
# which leaks wizard/modal state from debugging sessions into the recording.
fresh() { $AB reload >/dev/null; $AB wait --load networkidle >/dev/null; $AB wait 1400 >/dev/null; dismiss; }

# Waits are tuned so each scene's action span >= narration + ~1s breathing.
case "$ID" in
  s2)
    $AB open "https://panta-rooms.vercel.app/" >/dev/null && $AB wait --load networkidle && $AB wait 2500  && fresh
    $AB record start "$OUT"
    $AB wait 4200
    $AB scroll down 420 && $AB wait 3600
    $AB scroll down 380 && $AB wait 3400
    $AB scroll up 800 && $AB wait 3200
    $AB scroll down 300 && $AB wait 3600
    $AB scroll up 300 && $AB wait 3500
    $AB record stop
    ;;
  s3)
    $AB open "https://panta-rooms.vercel.app/#discover" >/dev/null && $AB wait --load networkidle && $AB wait 3000  && fresh
    $AB record start "$OUT"
    $AB wait 2600
    $AB find role button click --name "Sports" && $AB wait 3800
    $AB find role button click --name "Crypto" && $AB wait 3800
    $AB find role button click --name "Politics" && $AB wait 3600
    $AB find role button click --name "Pop Culture" && $AB wait 3400
    $AB find role button click --name "All" && $AB wait 3200
    $AB scroll down 620 && $AB wait 3600
    $AB scroll down 420 && $AB wait 3400
    $AB scroll up 1040 && $AB wait 3400
    $AB record stop
    ;;
  s4)
    $AB open "https://panta-rooms.vercel.app/#discover" >/dev/null && $AB wait --load networkidle && $AB wait 2600  && fresh
    $AB record start "$OUT"
    $AB find role button click --name "Crypto" && $AB wait 2600
    $AB find text 'Will bitcoin hit $100,000 by 31 Dec 2026' click && $AB wait 3800
    $AB scroll down 720 && $AB wait 3200
    $AB find role textbox fill --name "Write a comment" "Watching this one closely. Funding rates still favor the bulls — make your case in the replies." && $AB wait 2400
    $AB find role button click --name "Post comment" && $AB wait 4600
    $AB find role button click --name "Oldest" && $AB wait 2600
    $AB find role button click --name "Newest" && $AB wait 3000
    $AB record stop
    ;;
  s5)
    $AB open "https://panta-rooms.vercel.app/#community" >/dev/null && $AB wait --load networkidle && $AB wait 3200  && fresh
    $AB record start "$OUT"
    $AB wait 3800
    $AB scroll down 260 && $AB wait 2800
    $AB find role button click --name "All time" && $AB wait 3200
    $AB find role button click --name "This week" && $AB wait 3200
    $AB scroll down 220 && $AB wait 3200
    $AB record stop
    ;;
  s6)
    $AB open "https://panta-rooms.vercel.app/#community" >/dev/null && $AB wait --load networkidle && $AB wait 2600  && fresh
    $AB record start "$OUT"
    $AB wait 2400
    $AB find role button click --name "LIVE · MAINNET" && $AB wait 2800
    $AB find text "Demo — sample data" click && $AB wait 3600
    $AB find role button click --name "Close" && $AB wait 2800
    $AB find role button click --name "Explore" && $AB wait 3400
    $AB record stop
    ;;
  s7)
    $AB open "https://panta-rooms.vercel.app/#create" >/dev/null && $AB wait --load networkidle && $AB wait 2200  && fresh
    $AB record start "$OUT"
    $AB wait 1600
    $AB find role textbox fill --name "What do you want people to predict?" "Will our community post 1,000 comments before the hackathon demo day?" && $AB wait 1500
    $AB find role button click --name "Structure with AI" && $AB wait 7000
    $AB find role button click --name "Review details" && $AB wait 2600
    $AB find nth 1 "textarea" fill "A community challenge room — can this community reach 1,000 comments before the hackathon demo day? Post your take and make your case." && $AB wait 1600
    $AB find nth 2 "textarea" fill "Resolves YES if this room's discussion shows 1,000 or more comments before the hackathon demo day; otherwise NO." && $AB wait 1600
    $AB find nth 1 "input" fill "panta-rooms.vercel.app" && $AB wait 1400
    $AB find role button click --name "Continue to creation" && $AB wait 3000
    $AB find role button click --name "Create Market" && $AB wait 5000
    $AB record stop
    ;;
  s8)
    $AB record start "$OUT"
    $AB wait 2600
    $AB scroll down 260 && $AB wait 2000
    $AB find role button click --name "Trade YES" && $AB wait 2600
    $AB find role button click --name "Get quote" && $AB wait 4200
    $AB find role button click --name "Confirm demo trade" && $AB wait 5600
    $AB wait 3200
    $AB record stop
    ;;
  *) echo "unknown scene: $ID"; exit 1 ;;
esac

echo "== clip check =="
[ -f "$OUT" ] && ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" || echo "MISSING CLIP: $OUT"
