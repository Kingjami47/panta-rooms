#!/bin/bash
# Usage: dump_cuts.sh T1 T2 T3 T4   (dumps 1.2s of 30fps gray video around each cut)
VID=/home/z/my-project/public/guide.mp4
DIR=/home/z/my-project/scripts/video/refine
mkdir -p "$DIR"
for T in "$@"; do
  S=$(python3 -c "print(max(0, $T - 0.6))")
  EXP=$((36 * 14720))   # 36 frames x (160x92 gray)
  if [ -f "$DIR/cut_$T.bin" ] && [ "$(stat -c %s "$DIR/cut_$T.bin")" -ge "$EXP" ]; then
    echo "cut_$T OK (cached)"; continue
  fi
  timeout 15 ffmpeg -hide_banner -loglevel error -ss "$S" -t 1.2 -i "$VID" \
    -s 160x92 -pix_fmt gray -f rawvideo -y "$DIR/cut_$T.bin" 2>/dev/null
  SZ=$(stat -c %s "$DIR/cut_$T.bin" 2>/dev/null || echo 0)
  if [ "$SZ" -ge "$EXP" ]; then echo "cut_$T OK ($SZ)"; else echo "cut_$T SHORT ($SZ)"; fi
done
