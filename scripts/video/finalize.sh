#!/bin/bash
# Concat pieces -> video_final.mp4, mux with final_audio.wav -> final MP4
DIR=/home/z/my-project/scripts/video/pieces
OUT=/home/z/my-project/scripts/video
LIST=$OUT/concat_list.txt

{
  echo "file '$DIR/b00.mp4'"
  for i in $(seq 1 20); do
    printf "file '$DIR/clip%02d.mp4'\n" "$i"
    printf "file '$DIR/b%02d.mp4'\n" "$i"
  done
} > "$LIST"

echo "--- concat (stream copy) ---"
timeout 25 ffmpeg -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
  -c copy -movflags +faststart -y "$OUT/video_final.mp4" 2>&1
VF=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$OUT/video_final.mp4" 2>/dev/null)
echo "video_final frames: $VF (expect 3534)"

echo "--- mux audio (aac 192k) ---"
timeout 30 ffmpeg -hide_banner -loglevel error -i "$OUT/video_final.mp4" -i "$OUT/final_audio.wav" \
  -c:v copy -c:a aac -b:a 192k -ar 44100 -movflags +faststart -shortest -y \
  "$OUT/panta_rooms_guide_final.mp4" 2>&1
echo "--- probe final ---"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 "$OUT/panta_rooms_guide_final.mp4"
