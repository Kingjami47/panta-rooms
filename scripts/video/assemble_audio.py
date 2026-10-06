#!/usr/bin/env python3
"""Assemble narration from bodies + transition windows (sample-exact),
then mix ambient bed with ducking. Output: final_audio.wav"""
import numpy as np, json, wave

SR = 44100
SPF = 1470  # samples per video frame (44100/30)
DIR = '/home/z/my-project/scripts/video'

plan = json.load(open(f'{DIR}/plan.json'))
cuts = plan['cuts']
ORDER = ["5.833", "10.5", "14.333", "17.833", "19.5", "37.333", "47.167", "50.167",
         "54.0", "59.833", "63.667", "67.667", "71.667", "74.167", "80.833",
         "82.167", "93.333", "98.0", "103.5", "108.667"]
BODIES = [(0,177),(189,314),(320,425),(437,530),(542,582),(594,1119),(1125,1411),
          (1423,1501),(1513,1617),(1623,1794),(1800,1906),(1918,2025),(2031,2146),
          (2158,2224),(2236,2422),(2434,2461),(2473,2795),(2807,2938),(2950,3104),
          (3110,3256),(3268,3618)]
TOTAL_FRAMES = 3534  # output video frames

raw = np.fromfile(f'{DIR}/audio_st.raw', dtype=np.int16).astype(np.float32) / 32768.0
a = raw.reshape(-1, 2)  # (N, 2)

# interleave pieces: b00, clip1, b01, clip2, ..., clip20, b20
joints = [round(cuts[n] * 30) for n in ORDER]
types = ['dissolve' if n in plan['dissolve'] else 'dip' for n in ORDER]

pieces = []
for bi, (S, E) in enumerate(BODIES):
    pieces.append(a[S * SPF: E * SPF])
    if bi < 20:
        J = joints[bi]
        if types[bi] == 'dissolve':
            n = 6 * SPF
            i = np.arange(n)
            wB = np.sin(np.pi / 2 * (i + 1) / n)[:, None]
            wA = np.cos(np.pi / 2 * (i + 1) / n)[:, None]
            A = a[(J - 3) * SPF: (J - 3) * SPF + n]
            B = a[(J + 3) * SPF: (J + 3) * SPF + n]
            pieces.append(wA * A + wB * B)
        else:  # dip: source audio passes through untouched
            pieces.append(a[(J - 3) * SPF: (J + 3) * SPF])

narr = np.concatenate(pieces)
TARGET = TOTAL_FRAMES * SPF
if len(narr) > TARGET:
    narr = narr[:TARGET]
elif len(narr) < TARGET:
    narr = np.vstack([narr, np.zeros((TARGET - len(narr), 2))])
print(f"narration: {len(narr)} samples = {len(narr)/SR:.2f}s (target {TARGET})")

# sanity: click check at every piece seam
seam_db = []
pos = 0
for p in pieces[:-1]:
    pos += len(p)
    d = np.abs(narr[pos] - narr[pos - 1]).max() if 0 < pos < len(narr) else 0
    seam_db.append(20 * np.log10(d + 1e-9))
print(f"seam discontinuity max: {max(seam_db):.1f} dBFS (should be < -20)")

# ---- ambient bed ----
with wave.open(f'{DIR}/ambient.wav', 'rb') as w:
    amb = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    amb = amb.reshape(-1, 2)
amb = amb[:TARGET]
if len(amb) < TARGET:
    amb = np.vstack([amb, np.zeros((TARGET - len(amb), 2))])

# fades: in 1.5s, out last 3s
fi = int(1.5 * SR)
fo = int(3.0 * SR)
env_fade = np.ones(TARGET)
env_fade[:fi] = np.linspace(0, 1, fi)
env_fade[-fo:] = np.linspace(1, 0, fo)
amb *= env_fade[:, None]

# ---- ducking from narration envelope ----
mono = narr.mean(axis=1)
hop = 2205  # 50 ms
n = len(mono) // hop
rms = np.sqrt((mono[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
env_db = 20 * np.log10(rms + 1e-9)
act = np.clip((env_db - (-42)) / 12, 0, 1)           # 0 silence -> 1 speech
act_up = np.repeat(act, hop)[:TARGET]
if len(act_up) < TARGET:
    act_up = np.concatenate([act_up, np.full(TARGET - len(act_up), act_up[-1] if len(act_up) else 0)])
# asymmetric smoothing: fast attack, slow release
sm = np.zeros(TARGET)
g = 0.0
att = np.exp(-1 / (0.08 * SR))
rel = np.exp(-1 / (0.7 * SR))
# vectorized-ish loop in chunks (fast enough)
for i, v in enumerate(act_up):
    g = att * g + (1 - att) * v if v > g else rel * g + (1 - rel) * v
    sm[i] = g
gain_db = -7.0 - 9.0 * sm
gain = 10 ** (gain_db / 20)
music = amb * gain[:, None]

mix = narr + music
peak = np.abs(mix).max()
print(f"mix peak: {20*np.log10(peak+1e-9):.2f} dBFS")
nr = 20 * np.log10(np.sqrt((narr ** 2).mean()) + 1e-9)
mr = 20 * np.log10(np.sqrt((music ** 2).mean()) + 1e-9)
print(f"narration RMS {nr:.1f} dBFS | music RMS {mr:.1f} dBFS | gap {nr-mr:.1f} dB")

out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open(f'{DIR}/final_audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(out.tobytes())
print("WROTE final_audio.wav")
