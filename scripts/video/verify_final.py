#!/usr/bin/env python3
"""Verify A-tail/B-head audio safety at REFINED cut times for the 15 dissolves."""
import numpy as np, json

SR = 44100
a = np.fromfile('/home/z/my-project/scripts/video/audio_st.raw', dtype=np.int16).astype(np.float32) / 32768.0
a = a.reshape(-1, 2).mean(axis=1)  # mono for analysis

cuts = json.load(open('/home/z/my-project/scripts/video/exact_cuts.json'))
DISSOLVE = ["5.833", "14.333", "17.833", "19.5", "37.333", "47.167", "50.167",
            "63.667", "71.667", "74.167", "80.833", "82.167", "93.333", "98.0", "108.667"]
DIP = ["10.5", "54.0", "59.833", "67.667", "103.5"]

print(f"{'joint':>9} | {'A-tail dB':>10} | {'B-head dB':>10} | decision")
final_dissolves, final_dips = [], []
for k, v in cuts.items():
    T = v
    A = a[int((T - 0.2) * SR):int(T * SR)]
    B = a[int(T * SR):int((T + 0.2) * SR)]
    da = 20 * np.log10(np.abs(A).max() + 1e-9)
    db_ = 20 * np.log10(np.abs(B).max() + 1e-9)
    if k in DISSOLVE:
        ok = da < -20 or db_ < -20
        (final_dissolves if ok else final_dips).append(k)
        print(f"{k:>9} | {da:10.1f} | {db_:10.1f} | {'DISSOLVE' if ok else '-> demote to DIP'}")
    else:
        final_dips.append(k)
        print(f"{k:>9} | {da:10.1f} | {db_:10.1f} | DIP (speech-safe)")

plan = {"dissolve": sorted(final_dissolves, key=lambda k: cuts[k]),
        "dip": sorted(final_dips, key=lambda k: cuts[k]),
        "cuts": cuts}
with open('/home/z/my-project/scripts/video/plan.json', 'w') as f:
    json.dump(plan, f, indent=1)
print(f"\nFINAL: {len(plan['dissolve'])} dissolves, {len(plan['dip'])} dips")
