#!/bin/bash
# Chunked scene-cut detection on the final guide.mp4 (avoids OOM kill on full decode)
VID=/home/z/my-project/public/guide.mp4
OUT=/home/z/my-project/scripts/video/cuts.txt
> "$OUT"
CHUNK=25
DUR=120.65
for ((s=0; s<121; s+=CHUNK)); do
  ffmpeg -hide_banner -ss "$s" -t "$CHUNK" -i "$VID" \
    -vf "scale=320:-2,select='gt(scene,0.18)',showinfo" -f null - 2>&1 \
    | grep -oP 'pts_time:\K[0-9.]+' | while read t; do
      echo "$t" | awk -v off="$s" '{printf "%.3f\n", $1+off}' >> "$OUT"
    done
done
sort -n "$OUT" -o "$OUT"
echo "=== Detected cuts (scene>0.18) ==="
cat "$OUT"
