#!/usr/bin/env python3
"""Precise cut list: all frame diffs > 2.0 + static segment detection."""
import numpy as np

N_FRAMES, H, W, FPS = 724, 45, 80, 6
raw = np.fromfile('/home/z/my-project/scripts/video/raw_gray.bin', dtype=np.uint8)
frames = raw[:N_FRAMES * H * W].reshape(N_FRAMES, H, W).astype(np.int16)
diff = np.abs(frames[1:] - frames[:-1]).mean(axis=(1, 2))  # diff[i] between frame i and i+1

print("=== ALL VISUAL EVENTS (diff > 2.0), t = time AFTER change ===")
for i in range(len(diff)):
    if diff[i] > 2.0:
        print(f"  t={(i+1)/FPS:8.3f}  diff={diff[i]:6.2f}")

print("\n=== STATIC RUNS (>=1.0s with diff<0.35) ===")
static = diff < 0.35
i = 0
while i < len(static):
    if static[i]:
        j = i
        while j + 1 < len(static) and static[j + 1]:
            j += 1
        if (j - i + 1) >= FPS:  # >= 1 second
            print(f"  {i/FPS:8.3f} -> {(j+1)/FPS:8.3f}  ({(j+1-i)/FPS:.1f}s)")
        i = j + 1
    else:
        i += 1
