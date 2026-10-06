#!/bin/bash
# Refine each transition cut time to 30fps precision.
VID=/home/z/my-project/public/guide.mp4
DIR=/home/z/my-project/scripts/video
mkdir -p "$DIR/refine"
CUTS="5.833 10.5 14.333 17.833 19.5 37.333 47.167 50.167 54.0 59.833 63.667 67.667 71.667 74.167 80.833 82.167 93.333 98.0 103.5 108.667"
for T in $CUTS; do
  S=$(python3 -c "print(max(0, $T - 0.6))")
  ffmpeg -hide_banner -loglevel error -ss "$S" -t 1.2 -i "$VID" \
    -vf "fps=30,scale=80:45" -pix_fmt gray -f rawvideo -y "$DIR/refine/cut_$T.bin"
done
echo "DUMPS DONE"
python3 - <<'EOF'
import numpy as np, os
DIR = '/home/z/my-project/scripts/video/refine'
CUTS = [5.833, 10.5, 14.333, 17.833, 19.5, 37.333, 47.167, 50.167, 54.0, 59.833,
        63.667, 67.667, 71.667, 74.167, 80.833, 82.167, 93.333, 98.0, 103.5, 108.667]
out = {}
for T in CUTS:
    p = f'{DIR}/cut_{T}.bin'
    raw = np.fromfile(p, dtype=np.uint8)
    n = len(raw) // 3600
    fr = raw[:n * 3600].reshape(n, 45, 80).astype(np.int16)
    d = np.abs(fr[1:] - fr[:-1]).mean(axis=(1, 2))
    # search window: expected cut is at 0.6s into the clip; scan +-0.35s around it
    exact = None
    for i in range(len(d)):
        t = (i + 1) / 30.0  # end time of interval i (relative to clip start)
        if abs(t - 0.6) > 0.4:
            continue
        if d[i] > 4.0:
            exact = t
            break
    if exact is None:
        exact = 0.6
    abs_t = T - 0.6 + exact
    out[T] = round(abs_t, 4)
    print(f"  {T:8.3f} -> {abs_t:8.4f}  (diff={d[int(exact*30)-1] if exact>0 else 0:.1f})")
with open(f'{DIR}/exact_cuts.json', 'w') as f:
    import json
    json.dump(out, f, indent=1)
print("EXACT CUTS WRITTEN")
EOF
