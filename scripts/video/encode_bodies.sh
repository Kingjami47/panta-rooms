#!/bin/bash
# Encode body segments (video-only). Idempotent: verifies each piece, skips done ones.
# Usage: encode_bodies.sh [N1 N2 ...]  (encode only listed bodies; default all)
VID=/home/z/my-project/public/guide.mp4
DIR=/home/z/my-project/scripts/video/pieces
mkdir -p "$DIR"
FPS=30

# body: name start_frame end_frame  (end exclusive)
BODIES=(
  "b00 0 177"     "b01 189 314"   "b02 320 425"   "b03 437 530"
  "b04 542 582"   "b05 594 1119"  "b06 1125 1411" "b07 1423 1501"
  "b08 1513 1617" "b09 1623 1794" "b10 1800 1906" "b11 1918 2025"
  "b12 2031 2146" "b13 2158 2224" "b14 2236 2422" "b15 2434 2461"
  "b16 2473 2795" "b17 2807 2938" "b18 2950 3104" "b19 3110 3256"
  "b20 3268 3618"
)

count_frames () {  # fast packet count (ultrafast => no b-frames)
  ffprobe -v error -count_packets -select_streams v:0 \
    -show_entries stream=nb_read_packets -of csv=p=0 "$1" 2>/dev/null
}

ONLY="$@"
for B in "${BODIES[@]}"; do
  set -- $B; NAME=$1; S=$2; E=$3
  if [ -n "$ONLY" ] && ! echo " $ONLY " | grep -q " $NAME "; then continue; fi
  N=$((E - S))
  OUT="$DIR/$NAME.mp4"
  if [ -f "$OUT" ]; then
    C=$(count_frames "$OUT")
    if [ "$C" = "$N" ]; then echo "$NAME OK ($N)"; continue; fi
    echo "$NAME BAD ($C != $N) -> re-encode"
    rm -f "$OUT"
  fi
  SS=$(python3 -c "print(f'{$S/$FPS:.6f}')")
  if [ "$NAME" = "b20" ]; then
    timeout 20 ffmpeg -hide_banner -loglevel error -ss "$SS" -i "$VID" \
      -c:v libx264 -preset ultrafast -crf 17 -pix_fmt yuv420p -bf 0 -g 60 \
      -video_track_timescale 15360 -an -y "$OUT" 2>/dev/null
  else
    timeout 20 ffmpeg -hide_banner -loglevel error -ss "$SS" -i "$VID" -frames:v "$N" \
      -c:v libx264 -preset ultrafast -crf 17 -pix_fmt yuv420p -bf 0 -g 60 \
      -video_track_timescale 15360 -an -y "$OUT" 2>/dev/null
  fi
  C=$(count_frames "$OUT")
  if [ "$C" = "$N" ]; then echo "$NAME OK ($N)"; else echo "$NAME FAIL (got $C want $N)"; fi
done
echo "BODIES PASS COMPLETE"
