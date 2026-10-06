#!/usr/bin/env python3
"""Panta Rooms guide — final polish (10/10 pass) on the approved 9/10 cut.

Polish items (user spec):
  1. Lo-fi ambient bed at ~-23 dB relative to voiceover (fills sentence pauses),
     gentle sidechain ducking under speech.  ambient.wav (123s) already exists.
  2. 0.2 s cross-dissolves at the 20 major navigation cut points.

Source: public/guide.mp4 (1280x578@30, 120.6s video / 120.65s audio, -14 LUFS master).

Design (box kills long/complex ffmpeg runs, so everything is short + bounded):
  extract : 21 VIDEO-ONLY segments, exact -frames:v (no container quirks)
  chunks  : xfade-join segments in 4 chunks (<=5 dissolves per run)
  joins   : 3 pairwise joins -> dissolved video (silent)
  audio   : ONE pure-filter pass on source audio: 20 sample-exact trims +
            acrossfade d=0.2 chain -> voice_dissolved.wav (no re-encode gen loss)
  bedmix  : bed gain -12.4 dB (bed RMS -42.6 dBFS = voice RMS -19.1 - 23.5),
            sidechain duck under speech, fades -> master_bed.wav
  mux/qc  : video copy + aac 192k -> guide_10_10.mp4, loudness + pause-level QC
"""
import json, os, subprocess, sys

ROOT = "/home/z/my-project"
SRC = f"{ROOT}/public/guide.mp4"
W = f"{ROOT}/scripts/video/polish"
OUT = f"{W}/dissolved_video.mov"
VOICE = f"{W}/voice_dissolved.wav"
FINAL_AUD = f"{W}/master_bed.wav"
BED = f"{ROOT}/scripts/video/ambient.wav"
MP4 = f"{ROOT}/scripts/video/guide_10_10.mp4"

os.makedirs(W, exist_ok=True)
FPS = 30
D = 0.2

CUTS_RAW = [6.000, 10.567, 14.267, 17.767, 19.500, 37.400, 47.133, 50.133, 54.000,
            59.900, 63.633, 67.600, 71.633, 74.233, 80.833, 82.133, 93.267, 98.033,
            103.567, 108.633]
CUTS = [round(t * FPS) / FPS for t in CUTS_RAW]
BOUNDS = [0.0] + CUTS + [120.600]           # video bounds (frame-snapped)
FRAMES = [round((BOUNDS[i + 1] - BOUNDS[i]) * FPS) for i in range(len(BOUNDS) - 1)]

VENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
        "-pix_fmt", "yuv420p", "-r", "30"]
CHUNKS = [(1, 6), (7, 11), (12, 16), (17, 21)]


def sh(cmd, timeout=280):
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        print("CMD FAILED:", " ".join(map(str, cmd))[:280], flush=True)
        print((p.stderr or "")[-2000:], flush=True)
        sys.exit(1)
    return p


def dur(f, sel="v:0"):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", sel,
                        "-show_entries", "stream=duration", "-of", "csv=p=0", f],
                       capture_output=True, text=True).stdout.strip()
    return float(r)


def frames_of(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                        "-count_packets", "-show_entries", "stream=nb_read_packets",
                        "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip()
    return int(r)


# ---------------- extract: video-only segments ----------------
def stage_extract():
    assert sum(FRAMES) == 3618, f"frame budget broken: {sum(FRAMES)}"
    for k in range(len(BOUNDS) - 1):
        s = BOUNDS[k]
        n = FRAMES[k]
        out = f"{W}/seg{k+1:02d}.mov"
        if os.path.exists(out) and frames_of(out) == n:
            print(f"seg{k+1:02d} cached ({n}f)", flush=True)
            continue
        sh(["ffmpeg", "-y", "-i", SRC, "-ss", f"{s:.4f}", "-frames:v", str(n),
            "-an"] + VENC + [out], timeout=240)
        got = frames_of(out)
        assert got == n, f"seg{k+1}: {got} frames, want {n}"
        print(f"seg{k+1:02d}: {n}f OK", flush=True)
    print("extract done", flush=True)


# ---------------- chunks + joins: video-only xfade ----------------
def build_chunk(a, b, out):
    n = b - a + 1
    idx = list(range(a, b + 1))            # segment numbers
    fc, acc, last = [], 0.0, "v0"
    for i, sg in enumerate(idx):
        fc.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}]")
    for i in range(n - 1):
        acc += FRAMES[idx[i] - 1]
        off = acc - D * (i + 1)
        nxt = f"x{i+1}"
        fc.append(f"[{last}][v{i+1}]xfade=transition=fade:duration={D}:offset={off:.4f}[{nxt}]")
        last = nxt
    cmd = ["ffmpeg", "-y"] + sum([["-i", f"{W}/seg{k:02d}.mov"] for k in idx], []) \
        + ["-filter_complex", ";".join(fc), "-map", f"[{last}]"] + VENC + ["-an", out]
    sh(cmd, timeout=560)
    print(f"{os.path.basename(out)}: {frames_of(out)}f {dur(out):.3f}s", flush=True)


def join_two(left, right, out):
    off = dur(left) - D
    fc = (f"[0:v]setpts=PTS-STARTPTS[lv];[1:v]setpts=PTS-STARTPTS[rv];"
          f"[lv][rv]xfade=transition=fade:duration={D}:offset={off:.4f}[v]")
    sh(["ffmpeg", "-y", "-i", left, "-i", right, "-filter_complex", fc,
        "-map", "[v]"] + VENC + ["-an", out], timeout=560)
    print(f"{os.path.basename(out)}: {frames_of(out)}f {dur(out):.3f}s (off={off:.3f})", flush=True)


def stage_chunks():
    for ci, (a, b) in enumerate(CHUNKS):
        out = f"{W}/chunk{chr(65 + ci)}.mov"
        if os.path.exists(out) and frames_of(out) > 30:
            print(f"chunk{chr(65+ci)} cached", flush=True)
            continue
        build_chunk(a, b, out)


def stage_joins():
    acc = f"{W}/chunkA.mov"
    for i, nxt in enumerate(["chunkB.mov", "chunkC.mov", "chunkD.mov"]):
        out = f"{W}/acc{i+1}.mov"
        if os.path.exists(out) and frames_of(out) > 30:
            acc = out
            continue
        join_two(acc, f"{W}/{nxt}", out)
        acc = out
    sh(["cp", acc, OUT])
    print(f"dissolved video: {OUT} {frames_of(OUT)}f {dur(OUT):.3f}s", flush=True)


# ---------------- audio: one-pass sample-exact dissolves ----------------
def stage_audio():
    n = len(BOUNDS) - 1
    parts = [f"[0:a]asplit={n}" + "".join(f"[a{i}]" for i in range(n))]
    for i in range(n):
        s, e = BOUNDS[i], BOUNDS[i + 1]
        parts.append(f"[a{i}]atrim=start={s:.4f}:end={e:.4f},asetpts=PTS-STARTPTS[s{i}]")
    last = "s0"
    for i in range(1, n):
        nxt = f"z{i}"
        parts.append(f"[{last}][s{i}]acrossfade=d={D}[{nxt}]")
        last = nxt
    parts.append(f"[{last}]apad=pad_dur=0.2")
    fc = ";".join(parts)
    sh(["ffmpeg", "-y", "-i", SRC, "-filter_complex", fc,
        "-map", f"[{last}]", "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", VOICE],
       timeout=280)
    print(f"voice dissolved: {VOICE} {dur(VOICE, 'a:0'):.3f}s", flush=True)


# ---------------- bed mix ----------------
BED_GAIN_DB = -12.4   # bed RMS -30.18 -> -42.6 dBFS = voice RMS (-19.1) - 23.5 dB


def stage_bedmix():
    fadur = dur(VOICE, "a:0")
    fc = (
        f"[1:a]atrim=0:{fadur:.3f},asetpts=PTS-STARTPTS,"
        f"highpass=f=40,afade=t=in:st=0:d=2,afade=t=out:st={fadur - 3.0:.3f}:d=3,"
        f"volume={BED_GAIN_DB}dB[bed];"
        f"[0:a]asplit=2[vo][vsc];"
        f"[bed][vsc]sidechaincompress=threshold=0.05:ratio=2.5:attack=250:release=1000:makeup=1[duck];"
        f"[vo][duck]amix=inputs=2:normalize=0:duration=first[mix]"
    )
    sh(["ffmpeg", "-y", "-i", VOICE, "-i", BED, "-filter_complex", fc,
        "-map", "[mix]", "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", FINAL_AUD],
       timeout=280)
    print(f"bed mix: {FINAL_AUD} {dur(FINAL_AUD, 'a:0'):.3f}s", flush=True)


def stage_mux():
    sh(["ffmpeg", "-y", "-i", OUT, "-i", FINAL_AUD, "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
        "-movflags", "+faststart", "-shortest", MP4], timeout=280)
    print(f"FINAL MP4: {MP4} {dur(MP4):.3f}s {os.path.getsize(MP4)/1e6:.1f} MB", flush=True)


# ---------------- qc ----------------
def stage_qc():
    import re
    rep = {"src_v": dur(SRC), "out_v": dur(MP4), "out_frames": frames_of(MP4)}
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", MP4, "-map", "0:a",
                        "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, timeout=280).stderr
    m = re.findall(r"I:\s*(-?[\d.]+) LUFS", p)
    tp = re.findall(r"Peak:\s*(-?[\d.]+) dBFS", p)
    rep["lufs"] = float(m[-1]) if m else None
    rep["tp"] = float(tp[-1]) if tp else None
    # bed-only window: output pause before last cut (src 107.9-108.5 -> out -4.0s)
    pw = subprocess.run(["ffmpeg", "-hide_banner", "-ss", "103.7", "-t", "0.7", "-i", MP4,
                         "-map", "0:a", "-af", "astats=metadata=0", "-f", "null", "-"],
                        capture_output=True, text=True, timeout=120).stderr
    rms = re.findall(r"RMS level dB: (-?[\d.]+)", pw)
    rep["pause_rms"] = float(rms[0]) if rms else None
    print(json.dumps(rep, indent=1), flush=True)


if __name__ == "__main__":
    st = sys.argv[1] if len(sys.argv) > 1 else "all"
    steps = {"extract": stage_extract, "chunks": stage_chunks, "joins": stage_joins,
             "audio": stage_audio, "bedmix": stage_bedmix, "mux": stage_mux, "qc": stage_qc}
    if st == "all":
        for s in ["extract", "chunks", "joins", "audio", "bedmix", "mux", "qc"]:
            print(f"===== {s} =====", flush=True)
            steps[s]()
    else:
        steps[st]()
    sys.stdout.flush()
    os._exit(0)   # box kills python on normal exit sometimes; force clean exit
