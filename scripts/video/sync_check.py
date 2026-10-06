#!/usr/bin/env python3
"""A/V sync check: cross-correlate source vs dissolved-cut narration windows.
Expected lag ~ 0 ms (audio dissolves compress the timeline identically to video)."""
import numpy as np

SR = 8000

def load(p):
    a = np.frombuffer(open(p, "rb").read(), dtype=np.int16).astype(np.float64)
    return a / 32768.0

def lag_ms(src, out):
    n = min(len(src), len(out))
    src, out = src[:n] - src[:n].mean(), out[:n] - out[:n].mean()
    c = np.correlate(out, src, mode="full")
    mid = len(src) - 1
    k = int(np.argmax(c[max(0, mid - SR // 4): mid + SR // 4 + 1]) + max(0, mid - SR // 4))
    return (k - mid) / SR * 1000.0

pairs = [("/tmp/src_30.raw", "/tmp/out_29.raw", "t=30s (5 cuts before, shift 1.0s)"),
         ("/tmp/src_100.raw", "/tmp/out_966.raw", "t=100s (17 cuts before, shift 3.4s)")]
for s, o, label in pairs:
    print(f"{label}: lag = {lag_ms(load(s), load(o)):+.1f} ms (positive = output audio later)")
