#!/usr/bin/env python3
"""Panta Rooms guide v2 — full assembly.
Native 1280x578 (no distortion — v1's hidden stretch bug fixed).
Windows: narration starts +0.6s into each scene (>=0.5s tab pauses, user spec).
Audio: highpass 80Hz -> compressor -> two-pass loudnorm -14 LUFS (user spec).
"""
import json, subprocess, os, sys

V = "/tmp/video"
FPS = 30
OUT = "/home/z/my-project/download/panta-rooms-community-guide-v2.mp4"
LEAD = 0.6  # narration lead-in per scene (tab pause)

DUR = json.load(open(f"{V}/durations_v2.json"))
vpro = lambda f: float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
    capture_output=True, text=True).stdout.strip())

# placeholder sources until s8v2/s9v2 are recorded
HAVE_S8V2 = os.path.exists(f"{V}/s8v2.webm")
HAVE_S9V2 = os.path.exists(f"{V}/s9v2.webm")

SCENES = [
    {"id": "n1",  "type": "card", "png": f"{V}/card2_title.png",          "T": round(LEAD + DUR["n1"]["audio"] + 1.2, 2)},
    {"id": "n2",  "src": f"{V}/s2.webm",   "trim": (0, 13.5)},
    {"id": "n3",  "src": f"{V}/s3v2.webm", "trim": (0, 17.13)},
    {"id": "n4",  "src": f"{V}/s3.webm",   "trim": (17.4, 27.9)},
    {"id": "n5",  "src": f"{V}/s4.webm",   "trim": (0, 16.5)},
    {"id": "n6",  "src": f"{V}/s5.webm",   "trim": (0, 8.0)},
    {"id": "n7",  "src": f"{V}/s6.webm",   "trim": (0, 10.5)},
    {"id": "n8",  "src": f"{V}/s8v2.webm" if HAVE_S8V2 else f"{V}/s7.webm", "trim": None, "T": 15.9},
    {"id": "n9",  "src": f"{V}/s9v2b.mp4" if HAVE_S9V2 else f"{V}/s8.webm", "trim": None},
    {"id": "n10", "type": "card", "png": f"{V}/card2_outro.png",           "T": round(LEAD + DUR["n10"]["audio"] + 3.2, 2)},
]

for s in SCENES:
    if "T" not in s:
        if s["trim"] is None:
            s["T"] = round(min(vpro(s["src"]), LEAD + DUR[s["id"]]["audio"] + 4.0), 2)
        else:
            s["T"] = round(s["trim"][1] - s["trim"][0], 2)

# ---- scene start offsets ----
starts, acc = {}, 0.0
for s in SCENES:
    starts[s["id"]] = round(acc, 3)
    acc += s["T"]
TOTAL = round(acc, 3)
print("windows:", {s["id"]: s["T"] for s in SCENES})
print(f"TOTAL: {TOTAL:.2f}s ({int(TOTAL//60)}:{TOTAL%60:04.1f})")

# ---- caption enable windows (char-weighted across [LEAD, LEAD+audio]) ----
CAPTIONS = {
    "n2": ["Browsing is Free", "Connect your Solana wallet", "at the top right", "whenever you're ready", "to trade with real USDC"],
    "n3": ["In Explore, markets are", "organized into ten categories", "like Sports, Crypto, and Politics", "Filter by open or resolved", "markets, or search directly"],
    "n4": ["Connect natively with", "Phantom, Solflare, or MetaMask", "to manage your positions"],
    "n5": ["Click any market", "to enter its Room", "part market, part conversation", "Scroll down to post your take", "react, or comment as a guest", "with no wallet required"],
    "n6": ["The Community tab ranks", "the most-discussed Rooms", "and loudest voices", "across the platform"],
    "n7": ["Want to test things out first?", "Switch to Demo Mode", "for a full sandbox experience", "with zero setup"],
    "n8": ["To create a Room,", "type any question", "AI structures it into a market", "sets resolution rules", "and gets it ready to launch"],
    "n9": ["Pick YES or NO", "enter your amount", "get a live quote,", "and confirm", "The mechanics match", "live mainnet trading"],
    "n10": ["Explore, discuss, and predict.", "Visit", "panta-rooms.vercel.app", "to start"],
}
# n10 is a card — its own text is the caption; skip burning (visual duplicate)
CAPTIONS.pop("n10", None)

def alloc(sid, chunks):
    a = DUR[sid]["audio"]
    ws = [len(c) for c in chunks]
    tot = sum(ws)
    out, cur = [], LEAD
    for c, w in zip(chunks, ws):
        d = a * w / tot
        out.append((round(cur, 3), round(min(cur + d, LEAD + a) - 0.04, 3)))
        cur += d
    return out

cap_windows = {}
for sid, chunks in CAPTIONS.items():
    cap_windows[sid] = list(zip(chunks, alloc(sid, chunks)))

# ---- per-scene encode ----
def encode_scene(s):
    sid, T = s["id"], s["T"]
    out = f"{V}/enc2_{sid}.mp4"
    if s.get("type") == "card":
        cmd = ["ffmpeg", "-y", "-loop", "1", "-t", str(T), "-i", s["png"],
               "-filter_complex",
               f"[0:v]fps={FPS},format=yuv420p[v]",
               "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "21",
               "-t", str(T), out]
        subprocess.run(cmd, check=True, capture_output=True)
        return
    src, trim = s["src"], s["trim"]
    parts = ["[0:v]fps=30,format=yuv420p[base]"]
    last = "base"
    for i, (text, (a, b)) in enumerate(cap_windows.get(sid, [])):
        nxt = f"c{i}"
        parts.append(f"[{last}][{i+1}:v]overlay=0:0:enable='between(t,{a},{b})'[{nxt}]")
        last = nxt
    fc = ";".join(parts)
    cmd = ["ffmpeg", "-y"]
    if trim:
        cmd += ["-ss", str(trim[0])]
    cmd += ["-i", src]
    n_caps = len(cap_windows.get(sid, []))
    for i in range(n_caps):
        cmd += ["-i", f"{V}/caps/{sid}_{i}.png"]
    cmd += ["-t", str(T)]
    cmd += ["-filter_complex", fc, "-map", f"[{last}]", "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "21", out]
    subprocess.run(cmd, check=True, capture_output=True)

import sys
STAGE = sys.argv[1] if len(sys.argv) > 1 else "all"
if STAGE in ("all",) or STAGE.startswith("enc"):
    if STAGE == "all":
        for s in SCENES:
            encode_scene(s)
            print(f"enc2_{s['id']}: {vpro(f'{V}/enc2_{s[chr(105)+chr(100)]}.mp4'):.2f}s", flush=True)
    else:
        sid = STAGE.split(":")[1]
        encode_scene(next(x for x in SCENES if x["id"] == sid))
        print(f"enc2_{sid}: {vpro(f'{V}/enc2_{sid}.mp4'):.2f}s", flush=True)

def stage_concat():
    with open(f"{V}/concat2.txt", "w") as f:
        for s in SCENES:
            f.write(f"file '{V}/enc2_{s['id']}.mp4'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"{V}/concat2.txt",
                    "-c", "copy", f"{V}/joined2.mp4"], check=True, capture_output=True)
    print(f"joined2: {vpro(f'{V}/joined2.mp4'):.2f}s", flush=True)

def stage_audio():
    inputs, filt = [], []
    for i, s in enumerate(SCENES):
        inputs += ["-i", f"{V}/{s['id']}.wav"]
        delay_ms = int((starts[s["id"]] + LEAD) * 1000)
        filt.append(f"[{i+1}:a]adelay={delay_ms}|{delay_ms}[a{i}]")
    mix_in = "".join(f"[a{i}]" for i in range(len(SCENES)))
    filt.append(f"[0:a]{mix_in}amix=inputs={len(SCENES)+1}:normalize=0:duration=first[bed]")
    cmd = (["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo:d={TOTAL}"] + inputs +
           ["-filter_complex", ";".join(filt), "-map", "[bed]", "-t", str(TOTAL), f"{V}/bed.wav"])
    subprocess.run(cmd, check=True, capture_output=True, timeout=180)
    print(f"bed: {vpro(f'{V}/bed.wav'):.2f}s", flush=True)

def stage_loud():
    CHAIN = "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=2,loudnorm=I=-14:TP=-1.5:LRA=11"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", f"{V}/bed.wav", "-af", CHAIN + ":print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, timeout=180)
    import re as _re
    m = _re.search(r"\{[^{}]+\}", p.stderr, _re.S)
    meas = json.loads(m.group(0)) if m else {}
    ln2 = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={meas.get('input_i')}:measured_TP={meas.get('input_tp')}:"
           f"measured_LRA={meas.get('input_lra')}:measured_thresh={meas.get('input_thresh')}:"
           f"offset={meas.get('target_offset')}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-i", f"{V}/bed.wav",
                    "-af", f"highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=2,{ln2},aresample=44100",
                    "-c:a", "pcm_s16le", f"{V}/master.wav"], check=True, capture_output=True, timeout=180)
    print("master ok (measured I=%.1f)" % float(meas.get("input_i", -14)), flush=True)

def stage_mux():
    subprocess.run(["ffmpeg", "-y", "-i", f"{V}/joined2.mp4", "-i", f"{V}/master.wav",
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", "-shortest", OUT], check=True, capture_output=True, timeout=180)
    print(f"FINAL: {OUT} -> {vpro(OUT):.2f}s, {os.path.getsize(OUT)/1e6:.1f} MB", flush=True)
    json.dump({"starts": starts, "windows": {s["id"]: s["T"] for s in SCENES}, "total": TOTAL},
              open(f"{V}/timeline_v2.json", "w"), indent=1)

if STAGE == "concat": stage_concat()
elif STAGE == "audio": stage_audio()
elif STAGE == "loud": stage_loud()
elif STAGE == "mux": stage_mux()
