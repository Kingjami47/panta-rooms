#!/usr/bin/env python3
"""Fine 50ms RMS profile +-0.6s around the 8 speech cuts, to find usable lulls."""
import numpy as np

SR = 22050
a = np.fromfile('/home/z/my-project/scripts/video/audio_mono.raw', dtype=np.int16).astype(np.float32) / 32768.0

SPEECH_CUTS = [10.5, 37.333, 50.167, 54.0, 59.833, 67.667, 74.167, 103.5]
HOP = int(0.05 * SR)
for t in SPEECH_CUTS:
    lo, hi = int((t - 0.6) * SR), min(len(a), int((t + 0.6) * SR))
    seg = a[lo:hi]
    m = len(seg) // HOP
    rms = np.sqrt((seg[:m * HOP].reshape(m, HOP) ** 2).mean(axis=1))
    db = 20 * np.log10(rms + 1e-9)
    bars = ''.join('#' if d > -20 else ('+' if d > -35 else ('.' if d > -55 else ' ')) for d in db)
    print(f"cut {t:8.3f}  [-0.6s{" " * 20}0.0s{" " * 8}+0.6s]")
    print(f"   {bars}")
    # best 0.2s window (min peak) within +-0.35s
    w = int(0.2 / 0.05)
    best, bt = 1e9, None
    for i in range(len(db) - w):
        pk = db[i:i + w].max()
        if pk < best:
            best, bt = pk, (lo / SR) + (i + w / 2) * 0.05
    print(f"   quietest 0.2s window: center {bt:.2f}s (peak {best:.1f} dBFS), cut-center offset {bt - t:+.2f}s")
    print()
