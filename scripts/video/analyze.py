#!/usr/bin/env python3
"""Analyze guide.mp4: detect scene cuts + find quiet narration gaps near each cut."""
import numpy as np

# ---------- Video: frame-difference cut detection ----------
N_FRAMES, H, W, FPS = 724, 45, 80, 6
raw = np.fromfile('/home/z/my-project/scripts/video/raw_gray.bin', dtype=np.uint8)
frames = raw[:N_FRAMES * H * W].reshape(N_FRAMES, H, W).astype(np.int16)

diff = np.abs(frames[1:] - frames[:-1]).mean(axis=(1, 2))  # len 723
# A cut between frame i and i+1 => boundary time = (i+1)/FPS
cands = []
for i in range(len(diff)):
    t = (i + 1) / FPS
    d = diff[i]
    if d > 8.0:  # strong change threshold (0-255 gray mean abs diff)
        cands.append((t, d))

# Merge candidates within 0.35s, keep strongest
merged = []
for t, d in cands:
    if merged and t - merged[-1][0] < 0.35:
        if d > merged[-1][1]:
            merged[-1] = (t, d)
    else:
        merged.append((t, d))

print("=== CUT CANDIDATES (time_s, frame_diff) ===")
for t, d in merged:
    print(f"  {t:8.3f}   diff={d:6.1f}")

# Print top-40 diffs overall for context (to catch weaker scene changes)
print("\n=== TOP 40 FRAME DIFFS ===")
idx = np.argsort(diff)[::-1][:40]
for i in sorted(idx):
    print(f"  t={(i+1)/FPS:8.3f}  diff={diff[i]:6.2f}")

# ---------- Audio: RMS envelope ----------
SR = 22050
a = np.fromfile('/home/z/my-project/scripts/video/audio_mono.raw', dtype=np.int16).astype(np.float32) / 32768.0
hop = int(0.02 * SR)  # 20 ms
n = len(a) // hop
rms = np.sqrt((a[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
db = 20 * np.log10(rms + 1e-9)

def quietest_window(center, span=1.4, win=0.24):
    """Return center time of quietest `win`-s window within +-span of `center`."""
    c = int(center / 0.02)
    w = int(win / 0.02)
    lo = max(0, c - int(span / 0.02))
    hi = min(n - w, c + int(span / 0.02))
    if hi <= lo:
        return center, db[c] if 0 <= c < n else -99
    # sliding sum of dB (minimize max dB inside window -> quietest)
    best_i, best_v = lo, 1e9
    for i in range(lo, hi):
        v = db[i:i + w].max()
        if v < best_v:
            best_v, best_i = v, i
    return (best_i + w / 2) * 0.02, best_v

print("\n=== QUIETEST GAP NEAR EACH CUT ===")
for t, d in merged:
    qt, qdb = quietest_window(t)
    print(f"  cut {t:8.3f} -> best dissolve center {qt:8.3f} (peak {qdb:6.1f} dBFS)")
