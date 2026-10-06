#!/usr/bin/env python3
"""Audio level at each candidate cut (max dBFS in +-0.2s window)."""
import numpy as np

SR = 22050
a = np.fromfile('/home/z/my-project/scripts/video/audio_mono.raw', dtype=np.int16).astype(np.float32) / 32768.0
n = len(a)

CUTS = [5.833, 10.5, 14.333, 17.833, 19.5, 37.333, 47.167, 50.167, 54.0,
        59.833, 63.667, 67.667, 71.667, 74.167, 80.833, 82.167, 93.333,
        98.0, 103.5, 108.667]

print(f"{'cut':>9} | {'maxdB ±0.2s':>11} | {'maxdB ±0.5s':>11} | verdict")
for t in CUTS:
    lo, hi = int((t - 0.2) * SR), min(n, int((t + 0.2) * SR))
    lo5, hi5 = int((t - 0.5) * SR), min(n, int((t + 0.5) * SR))
    seg = a[lo:hi]
    seg5 = a[lo5:hi5]
    peak = 20 * np.log10(np.abs(seg).max() + 1e-9)
    peak5 = 20 * np.log10(np.abs(seg5).max() + 1e-9)
    verdict = "SILENT" if peak < -55 else ("quiet" if peak < -30 else "SPEECH")
    print(f"{t:9.3f} | {peak:11.1f} | {peak5:11.1f} | {verdict}")
