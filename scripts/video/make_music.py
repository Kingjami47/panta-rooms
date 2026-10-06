#!/usr/bin/env python3
"""Lo-fi ambient bed for Panta Rooms guide: warm pad chords + vinyl crackle.
Output: 44.1kHz stereo WAV, ~123s, RMS ~ -30 dBFS (final level set in the mix)."""
import numpy as np
from scipy.signal import lfilter
import wave

SR = 44100
DUR = 123.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(42)

def f_of(midi): return 440.0 * 2 ** ((midi - 69) / 12)

# Chord progression: Am9 -> Fmaj9 -> Cmaj7(add9) -> G6/9   (8s each, 32s cycle)
CHORDS = [
    [45, 57, 60, 64, 67, 71],   # A2 A3 C4 E4 G4 B4
    [41, 53, 57, 60, 64, 67],   # F2 F3 A3 C4 E4 G4
    [48, 55, 59, 62, 67, 71],   # C3 G3 B3 D4 G4 B4  (Cadd9)
    [43, 55, 59, 62, 64, 69],   # G2 G3 B3 D4 E4 A4  (G6/9)
]
CHORD_LEN = 8.0
CYCLE = CHORD_LEN * len(CHORDS)

def one_pole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    b = 1 - a
    return lfilter([b], [1, -a], x)

def build_pad(seed_offset):
    rng_l = np.random.default_rng(100 + seed_offset)
    pad = np.zeros(N)
    n_chords = int(np.ceil(DUR / CHORD_LEN)) + 1
    for ci in range(n_chords):
        notes = CHORDS[ci % len(CHORDS)]
        c0 = ci * CHORD_LEN
        # envelope with 2.5s attack/release overlapping neighbors
        env = np.zeros(N)
        i0, i1 = int(c0 * SR), min(N, int((c0 + CHORD_LEN + 2.5) * SR))
        seg = t[i0:i1] - c0
        e = np.ones(len(seg))
        atk = 2.5
        rel_start = CHORD_LEN
        e[seg < atk] = 0.5 - 0.5 * np.cos(np.pi * seg[seg < atk] / atk)
        m = seg >= rel_start
        e[m] = np.clip(1 - (seg[m] - rel_start) / 2.5, 0, 1)
        e = 0.5 - 0.5 * np.cos(np.pi * np.clip(e, 0, 1))  # smooth
        env[i0:i1] = e
        for ni, midi in enumerate(notes):
            f = f_of(midi)
            det = 1.0 + (0.0012 * (1 if ni % 2 == 0 else -1)) * (1 + seed_offset * 0.3)
            lfo_f = 0.07 + 0.05 * ((ni * 7 + ci * 3) % 5) / 5
            lfo = 1 + 0.16 * np.sin(2 * np.pi * lfo_f * t + ni * 1.7 + ci)
            amp = (1.0 if ni < 2 else 0.55 if ni < 4 else 0.34) * lfo * env
            # dual detuned sines + soft octave shimmer
            pad += amp * np.sin(2 * np.pi * f * det * t + rng_l.uniform(0, 6.28))
            pad += 0.45 * amp * np.sin(2 * np.pi * f / det * t + rng_l.uniform(0, 6.28))
            if ni < 2:
                pad += 0.22 * amp * np.sin(2 * np.pi * f * 2.0007 * t + rng_l.uniform(0, 6.28))
    return pad

print("building pads...")
L = build_pad(0)
R = build_pad(1)
print("sub bass...")
# sub bass: root of each chord, one octave below, gentle
sub = np.zeros(N)
n_chords = int(np.ceil(DUR / CHORD_LEN)) + 1
for ci in range(n_chords):
    root = CHORDS[ci % len(CHORDS)][0]
    c0 = ci * CHORD_LEN
    i0, i1 = int(c0 * SR), min(N, int((c0 + CHORD_LEN + 1.5) * SR))
    seg = t[i0:i1] - c0
    e = np.ones(len(seg))
    e[seg < 1.8] = 0.5 - 0.5 * np.cos(np.pi * seg[seg < 1.8] / 1.8)
    m = seg >= CHORD_LEN
    e[m] = np.clip(1 - (seg[m] - CHORD_LEN) / 1.5, 0, 1)
    sub[i0:i1] += 0.5 * e * np.sin(2 * np.pi * f_of(root) / 2 * t[i0:i1] + 0.3)

print("vinyl crackle...")
crackle = np.zeros(N)
n_ev = int(18 * DUR)
pos = rng.integers(0, N - 500, n_ev)
for p in pos:
    ln = rng.integers(60, 320)          # 1.4-7ms burst
    amp = rng.uniform(0.15, 1.0) * rng.choice([1, 1, 1, 0.35])
    burst = rng.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 4))
    crackle[p:p + ln] += amp * burst
crackle = one_pole_lp(crackle, 3800) - one_pole_lp(crackle, 500)  # bandpass-ish

print("mixing + filtering...")
wet = 0.9 * L + 0.9 * R + 1.15 * sub + 0.5 * crackle
wet = one_pole_lp(wet, 3600)                       # dark lo-fi roll-off
wet = np.tanh(1.4 * wet) / np.tanh(1.4)            # gentle saturation
# overall slow swell for movement
wet *= (1 + 0.08 * np.sin(2 * np.pi * 0.021 * t - 1.0))

# normalize to target RMS -30 dBFS
rms = np.sqrt((wet ** 2).mean())
wet *= (10 ** (-30 / 20)) / (rms + 1e-9)
peak = np.abs(wet).max()
if peak > 0.5:
    wet *= 0.5 / peak

st = np.stack([wet, np.roll(wet, 147)], axis=1)    # slight stereo offset
st *= 0.98
pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)

with wave.open('/home/z/my-project/scripts/video/ambient.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("WROTE ambient.wav", pcm.shape, f"RMS={20*np.log10(np.sqrt((st**2).mean())):.1f} dBFS")
