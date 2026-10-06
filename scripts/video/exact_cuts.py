#!/usr/bin/env python3
"""Compute exact 30fps cut times from refine dumps (160x92 gray)."""
import numpy as np, json

W, H, FPS = 160, 92, 30
CUTS = [5.833, 10.5, 14.333, 17.833, 19.5, 37.333, 47.167, 50.167, 54.0, 59.833,
        63.667, 67.667, 71.667, 74.167, 80.833, 82.167, 93.333, 98.0, 103.5, 108.667]
out = {}
for T in CUTS:
    raw = np.fromfile(f'/home/z/my-project/scripts/video/refine/cut_{T}.bin', dtype=np.uint8)
    n = len(raw) // (W * H)
    fr = raw[:n * W * H].reshape(n, H, W).astype(np.int16)
    d = np.abs(fr[1:] - fr[:-1]).mean(axis=(1, 2))
    exact = None
    for i in range(len(d)):
        t = (i + 1) / FPS
        if abs(t - 0.6) > 0.4:
            continue
        if d[i] > 4.0:
            exact = t
            break
    if exact is None:
        exact = 0.6
    abs_t = round(T - 0.6 + exact, 4)
    out[str(T)] = abs_t
    # snap to frame grid
    fr_idx = round(abs_t * FPS)
    snapped = round(fr_idx / FPS, 4)
    out[str(T)] = snapped
    print(f"  {T:8.3f} -> exact {abs_t:8.4f} -> snapped {snapped:8.4f} (frame {fr_idx}, diff={d[int(exact*FPS)-1]:.1f})")

with open('/home/z/my-project/scripts/video/exact_cuts.json', 'w') as f:
    json.dump(out, f, indent=1)
print("saved exact_cuts.json")
