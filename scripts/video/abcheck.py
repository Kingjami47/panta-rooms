#!/usr/bin/env python3
"""Direct A-tail [T-0.2,T] vs B-head [T,T+0.2] peak levels at speech cuts."""
import numpy as np

SR = 22050
a = np.fromfile('/home/z/my-project/scripts/video/audio_mono.raw', dtype=np.int16).astype(np.float32) / 32768.0

CUTS = [10.5, 37.333, 50.167, 54.0, 59.833, 67.667, 74.167, 103.5]
print(f"{'cut':>9} | {'A-tail dB':>10} | {'B-head dB':>10} | verdict")
dissolve_ok, skip = [], []
for t in CUTS:
    A = a[int((t - 0.2) * SR):int(t * SR)]
    B = a[int(t * SR):int((t + 0.2) * SR)]
    da = 20 * np.log10(np.abs(A).max() + 1e-9)
    db_ = 20 * np.log10(np.abs(B).max() + 1e-9)
    ok = da < -35 or db_ < -35   # at least one side quiet -> clean overlap
    (dissolve_ok if ok else skip).append(t)
    print(f"{t:9.3f} | {da:10.1f} | {db_:10.1f} | {'DISSOLVE OK' if ok else 'keep hard cut'}")

print("\nFinal dissolve set (speech-region additions):", [f"{t:.2f}" for t in dissolve_ok])
print("Keep hard cuts:", [f"{t:.2f}" for t in skip])
