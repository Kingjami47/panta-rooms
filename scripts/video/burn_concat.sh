#!/usr/bin/env bash
# Burn captions per-scene (short, fast encodes) then stream-copy concat.
# Full-file re-encodes hang on this box; 8-30s slices encode at ~6x realtime.
set -uo pipefail
V=/tmp/video
FINAL=/home/z/my-project/download/panta-rooms-community-guide.mp4
STYLE="FontName=DejaVu Sans,FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&HC8000000,BorderStyle=1,Outline=1,Shadow=1,MarginV=26"
ORDER="s1 s2 s3 s4 s5 s6 s7 s8 s9"

python3 - << 'PYEOF'
import json
d = json.load(open("/tmp/video/durations.json"))
tgt = json.load(open("/tmp/video/targets.json"))
def ts(t):
    h, m = int(t//3600), int(t%3600//60); s = t%60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")
for s in ["s1","s2","s3","s4","s5","s6","s7","s8","s9"]:
    st = 0.7 if s not in ("s1","s9") else 0.4
    en = tgt[s] - 0.3
    open(f"/tmp/video/srt_{s}.srt","w").write(f"1\n{ts(st)} --> {ts(en)}\n{d[s]['caption']}\n")
print("per-scene srt written")
PYEOF

for s in $ORDER; do
  ffmpeg -y -i "$V/enc_$s.mp4" -vf "subtitles=$V/srt_$s.srt:force_style='$STYLE'" \
    -c:v libx264 -preset veryfast -crf 22 -c:a copy "$V/cap_$s.mp4" 2>/dev/null
  echo "cap_$s: $(ffprobe -v error -show_entries format=duration -of csv=p=0 $V/cap_$s.mp4)s"
done

: > "$V/concat_cap.txt"
for s in $ORDER; do echo "file '$V/cap_$s.mp4'" >> "$V/concat_cap.txt"; done
ffmpeg -y -f concat -safe 0 -i "$V/concat_cap.txt" -c copy "$FINAL" 2>/dev/null
echo "FINAL: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")s, $(du -m "$FINAL" | cut -f1) MB"
