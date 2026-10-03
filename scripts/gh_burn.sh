#!/usr/bin/env bash
# End-of-session burn for the GitHub session-token mode (--keep on
# gh_device_finish.sh): destroys the stored push token, its credential
# helper, and any leftover device-flow session file. Safe to run any time —
# idempotent, and every removal is verified below.
set -uo pipefail
Z=/home/z/my-project/.zscripts
rm -f "$Z/.gh-push-token" "$Z/.gh-cred-helper.sh" "$Z/.gh-device-session.json"
echo "== post-burn verification =="
MISSING=0
for f in "$Z/.gh-push-token" "$Z/.gh-cred-helper.sh" "$Z/.gh-device-session.json"; do
  if [ -e "$f" ]; then
    echo "STILL PRESENT: $f"
    MISSING=1
  else
    echo "gone: $f"
  fi
done
[ "$MISSING" = "0" ] && echo "BURN OK: no GitHub credentials remain on disk" || { echo "BURN INCOMPLETE"; exit 1; }
