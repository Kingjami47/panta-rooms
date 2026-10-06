#!/bin/bash
# Panta Rooms guide — final polish driver (bash; box dislikes python-spawned long ffmpeg)
# Stages: extract | chunks | joins | audio | bedmix | mux | qc
# 21 frame-exact segments, 20 cross-dissolves (0.2s), lo-fi bed at -12.4 dB gain.
set -u
ROOT=/home/z/my-project
SRC=$ROOT/public/guide.mp4
W=$ROOT/scripts/video/polish
VID=$ROOT/scripts/video
mkdir -p "$W"

VENC="-c:v libx264 -preset veryfast -crf 17 -pix_fmt yuv420p -r 30 -threads 4"
F() { timeout -k 5 "$1" ffmpeg -hide_banner -loglevel error -nostats -y "${@:2}"; }

# frame counts + starts (frame-snapped)
FR=(180 137 111 105 52 537 292 90 116 177 112 119 121 78 198 39 334 143 166 152 359)
ST=(0 6.0 10.5667 14.2667 17.7667 19.5 37.4 47.1333 50.1333 54.0 59.9 63.6333 67.6 71.6333 74.2333 80.8333 82.1333 93.2667 98.0333 103.5667 108.6333)

nf() { ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$1" 2>/dev/null; }
vd() { ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$1" 2>/dev/null; }
ad() { ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$1" 2>/dev/null; }

stage_extract() {
  for i in $(seq 0 20); do
    k=$((i+1)); n=${FR[$i]}; s=${ST[$i]}
    f=$(printf "%s/seg%02d.mov" "$W" "$k")
    if [ "$(nf "$f")" = "$n" ]; then echo "seg$k cached (${n}f)"; continue; fi
    echo "encoding seg$k ($n frames @ $s)..."
    F 240 -i "$SRC" -ss "$s" -frames:v "$n" -an $VENC "$f" || { echo "FAIL seg$k"; return 1; }
    [ "$(nf "$f")" = "$n" ] || { echo "FRAME MISMATCH seg$k: $(nf "$f") != $n"; return 1; }
  done
  echo "extract done"
}

seg_inputs() { local a=$1 b=$2 c=""; for k in $(seq "$a" "$b"); do c="$c -i $W/$(printf seg%02d $k).mov"; done; echo "$c"; }

graph_chain() { # n segments -> xfade chain with hardcoded offsets list
  local offs="$1"; local last=v0 i=1
  for o in $offs; do echo -n "[v$((i-1))]" >/dev/null; i=$((i+1)); done
}

stage_chunks() {
  # chunk A = seg1-6, offsets 5.8 10.16667 13.66667 16.96667 18.5
  if [ "$(nf $W/chunkA.mov)" != "1092" ]; then
    F 280 $(seg_inputs 1 6) -filter_complex "[0:v]setpts=PTS-STARTPTS,fps=30[v0];[1:v]setpts=PTS-STARTPTS,fps=30[v1];[2:v]setpts=PTS-STARTPTS,fps=30[v2];[3:v]setpts=PTS-STARTPTS,fps=30[v3];[4:v]setpts=PTS-STARTPTS,fps=30[v4];[5:v]setpts=PTS-STARTPTS,fps=30[v5];[v0][v1]xfade=transition=fade:duration=0.2:offset=5.8[x1];[x1][v2]xfade=transition=fade:duration=0.2:offset=10.16667[x2];[x2][v3]xfade=transition=fade:duration=0.2:offset=13.66667[x3];[x3][v4]xfade=transition=fade:duration=0.2:offset=16.96667[x4];[x4][v5]xfade=transition=fade:duration=0.2:offset=18.5[vout]" -map "[vout]" $VENC -an $W/chunkA.mov \
      && echo "chunkA: $(nf $W/chunkA.mov)f $(vd $W/chunkA.mov)s" || echo "FAIL chunkA"
  else echo "chunkA cached"; fi
  # chunk B = seg7-11, offsets 9.53333 12.33333 16.0 21.7 -> 763f
  if [ "$(nf $W/chunkB.mov)" != "763" ]; then
    F 280 $(seg_inputs 7 11) -filter_complex "[0:v]setpts=PTS-STARTPTS,fps=30[v0];[1:v]setpts=PTS-STARTPTS,fps=30[v1];[2:v]setpts=PTS-STARTPTS,fps=30[v2];[3:v]setpts=PTS-STARTPTS,fps=30[v3];[4:v]setpts=PTS-STARTPTS,fps=30[v4];[v0][v1]xfade=transition=fade:duration=0.2:offset=9.53333[x1];[x1][v2]xfade=transition=fade:duration=0.2:offset=12.33333[x2];[x2][v3]xfade=transition=fade:duration=0.2:offset=16.0[x3];[x3][v4]xfade=transition=fade:duration=0.2:offset=21.7[vout]" -map "[vout]" $VENC -an $W/chunkB.mov \
      && echo "chunkB: $(nf $W/chunkB.mov)f $(vd $W/chunkB.mov)s" || echo "FAIL chunkB"
  else echo "chunkB cached"; fi
  # chunk C = seg12-16, offsets 3.76667 7.6 10.0 16.4 -> 531f
  if [ "$(nf $W/chunkC.mov)" != "531" ]; then
    F 280 $(seg_inputs 12 16) -filter_complex "[0:v]setpts=PTS-STARTPTS,fps=30[v0];[1:v]setpts=PTS-STARTPTS,fps=30[v1];[2:v]setpts=PTS-STARTPTS,fps=30[v2];[3:v]setpts=PTS-STARTPTS,fps=30[v3];[4:v]setpts=PTS-STARTPTS,fps=30[v4];[v0][v1]xfade=transition=fade:duration=0.2:offset=3.76667[x1];[x1][v2]xfade=transition=fade:duration=0.2:offset=7.6[x2];[x2][v3]xfade=transition=fade:duration=0.2:offset=10.0[x3];[x3][v4]xfade=transition=fade:duration=0.2:offset=16.4[vout]" -map "[vout]" $VENC -an $W/chunkC.mov \
      && echo "chunkC: $(nf $W/chunkC.mov)f $(vd $W/chunkC.mov)s" || echo "FAIL chunkC"
  else echo "chunkC cached"; fi
  # chunk D = seg17-21, offsets 10.93333 15.5 20.83333 25.7 -> 1130f
  if [ "$(nf $W/chunkD.mov)" != "1130" ]; then
    F 280 $(seg_inputs 17 21) -filter_complex "[0:v]setpts=PTS-STARTPTS,fps=30[v0];[1:v]setpts=PTS-STARTPTS,fps=30[v1];[2:v]setpts=PTS-STARTPTS,fps=30[v2];[3:v]setpts=PTS-STARTPTS,fps=30[v3];[4:v]setpts=PTS-STARTPTS,fps=30[v4];[v0][v1]xfade=transition=fade:duration=0.2:offset=10.93333[x1];[x1][v2]xfade=transition=fade:duration=0.2:offset=15.5[x2];[x2][v3]xfade=transition=fade:duration=0.2:offset=20.83333[x3];[x3][v4]xfade=transition=fade:duration=0.2:offset=25.7[vout]" -map "[vout]" $VENC -an $W/chunkD.mov \
      && echo "chunkD: $(nf $W/chunkD.mov)f $(vd $W/chunkD.mov)s" || echo "FAIL chunkD"
  else echo "chunkD cached"; fi
}

stage_joins() {
  # single pass: A + B + C + D (3 xfades, one encode)
  if [ "$(nf $W/dissolved_video.mov)" != "3498" ]; then
    F 700 -i $W/chunkA.mov -i $W/chunkB.mov -i $W/chunkC.mov -i $W/chunkD.mov \
      -filter_complex "[0:v]setpts=PTS-STARTPTS,fps=30[v0];[1:v]setpts=PTS-STARTPTS,fps=30[v1];[2:v]setpts=PTS-STARTPTS,fps=30[v2];[3:v]setpts=PTS-STARTPTS,fps=30[v3];[v0][v1]xfade=transition=fade:duration=0.2:offset=36.2[x1];[x1][v2]xfade=transition=fade:duration=0.2:offset=61.43333[x2];[x2][v3]xfade=transition=fade:duration=0.2:offset=78.93333[vout]" \
      -map "[vout]" $VENC -an $W/dissolved_video.mov \
      && echo "dissolved: $(nf $W/dissolved_video.mov)f $(vd $W/dissolved_video.mov)s" || echo "FAIL joins"
  else echo "dissolved cached"; fi
  [ "$(nf $W/dissolved_video.mov)" = "3498" ] && echo "dissolved video ready: $(vd $W/dissolved_video.mov)s"
}

stage_audio() {
  # one pure-filter pass: 21 sample-exact trims + 20 acrossfades (d=0.2)
  local B=(0 6.0 10.5667 14.2667 17.7667 19.5 37.4 47.1333 50.1333 54.0 59.9 63.6333 67.6 71.6333 74.2333 80.8333 82.1333 93.2667 98.0333 103.5667 108.6333 120.6)
  local g="[0:a]asplit=21"
  for i in $(seq 0 20); do g="$g[a$i]"; done
  g="$g;"
  for i in $(seq 0 20); do g="${g}[a$i]atrim=start=${B[$i]}:end=${B[$((i+1))]},asetpts=PTS-STARTPTS[s$i];"; done
  g="${g}[s0][s1]acrossfade=d=0.2[z1]"
  for i in $(seq 2 20); do g="$g;[z$((i-1))][s$i]acrossfade=d=0.2[z$i]"; done
  F 280 -i "$SRC" -filter_complex "$g" -map "[z20]" -c:a pcm_s16le -ar 44100 -ac 2 "$W/voice_dissolved.wav" \
    && echo "voice_dissolved: $(ad $W/voice_dissolved.wav)s" || echo "FAIL audio"
}

stage_bedmix() {
  local D; D=$(ad "$W/voice_dissolved.wav"); local fo
  fo=$(python3 -c "print(round($D-3.0,3))")
  F 280 -i "$W/voice_dissolved.wav" -i "$VID/ambient.wav" -filter_complex \
"[1:a]atrim=0:${D},asetpts=PTS-STARTPTS,highpass=f=40,afade=t=in:st=0:d=2,afade=t=out:st=${fo}:d=3,volume=-12.4dB[bed];[0:a]asplit=2[vo][vsc];[bed][vsc]sidechaincompress=threshold=0.05:ratio=2.5:attack=250:release=1000:makeup=1[duck];[vo][duck]amix=inputs=2:normalize=0:duration=first[mix]" \
    -map "[mix]" -c:a pcm_s16le -ar 44100 -ac 2 "$W/master_bed.wav" \
    && echo "master_bed: $(ad $W/master_bed.wav)s" || echo "FAIL bedmix"
}

stage_mux() {
  F 280 -i "$W/dissolved_video.mov" -i "$W/master_bed.wav" -map 0:v -map 1:a \
    -c:v copy -c:a aac -b:a 192k -ar 44100 -movflags +faststart -shortest \
    "$VID/guide_10_10.mp4" && echo "FINAL: $VID/guide_10_10.mp4 $(vd $VID/guide_10_10.mp4)s $(du -m "$VID/guide_10_10.mp4" | cut -f1)MB" || echo "FAIL mux"
}

stage_qc() {
  echo "--- loudness (target ~ -14 LUFS) ---"
  timeout 200 ffmpeg -hide_banner -nostats -i "$VID/guide_10_10.mp4" -map 0:a -af ebur128=peak=true -f null - 2>&1 | tail -8
  echo "--- bed-only pause RMS (out 103.7-104.4, expect ~ -42 dBFS) ---"
  timeout 100 ffmpeg -hide_banner -nostats -ss 103.7 -t 0.7 -i "$VID/guide_10_10.mp4" -map 0:a -af astats=metadata=0 -f null - 2>&1 | grep -m1 "RMS level"
  echo "--- dissolve mid-frames ---"
  for t in 5.9 36.3 78.95; do
    timeout 60 ffmpeg -hide_banner -loglevel error -ss "$t" -i "$VID/guide_10_10.mp4" -frames:v 1 -y "$W/qc_diss_${t}.png"
  done
  echo "saved qc frames: $W/qc_diss_*.png"
}

case "${1:-all}" in
  extract) stage_extract ;;
  chunks)  stage_chunks ;;
  joins)   stage_joins ;;
  audio)   stage_audio ;;
  bedmix)  stage_bedmix ;;
  mux)     stage_mux ;;
  qc)      stage_qc ;;
  *) stage_extract; stage_chunks; stage_joins; stage_audio; stage_bedmix; stage_mux; stage_qc ;;
esac
