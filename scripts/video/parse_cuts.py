#!/usr/bin/env python3
"""Merge scene-detect dumps -> candidate cut list with scores."""
import re, sys

def load(path, offset=0.0):
    pts, out = None, []
    for line in open(path):
        m = re.search(r"pts_time:([\d.]+)", line)
        if m: pts = float(m.group(1)) + offset
        m = re.search(r"scene_score=([\d.]+)", line)
        if m and pts is not None:
            out.append((round(pts, 3), float(m.group(1))))
    return out

cands = load("/home/z/my-project/scripts/video/scene_detect.txt")
cands += load("/home/z/my-project/scripts/video/scene_detect_tail.txt", 108.0)
cands.sort()
# de-dup within 0.25s (keep max score)
merged = []
for t, s in cands:
    if merged and t - merged[-1][0] < 0.25:
        if s > merged[-1][1]: merged[-1] = (merged[-1][0], s)
    else:
        merged.append((t, s))
for t, s in merged:
    print(f"{t:8.3f}  {s:.4f}")
print(f"-- total candidates: {len(merged)}", file=sys.stderr)
