#!/usr/bin/env python3
"""Assemble the Panta Rooms community guide:
title card + browser scenes (narration-synced) + outro card -> captions -> final MP4.
"""
import json, subprocess, os

V = "/tmp/video"
W, H, FPS = 1440, 900, 30
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FINAL = "/home/z/my-project/download/panta-rooms-community-guide.mp4"

dur = json.load(open(f"{V}/durations.json"))

# ---- 1. title & outro cards (PIL, app aesthetic: zinc-950 bg, gold accent) ----
from PIL import Image, ImageDraw, ImageFont

GOLD = (234, 179, 8)
ZINC = (9, 9, 11)
WHITE = (244, 244, 245)
GREY = (161, 161, 170)

def card(path, lines):
    img = Image.new("RGB", (W, H), ZINC)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 6], fill=GOLD)
    total = sum(h for _, _, h, gap in lines) + sum(gap for *_, gap in lines[:-1])
    y = (H - total) // 2
    for text, font, h, gap in lines:
        if text:
            w = d.textlength(text, font=font)
            d.text(((W - w) / 2, y), text, font=font, fill=WHITE if font != small else GREY)
        y += h + gap
    img.save(path)

big = ImageFont.truetype(FONT_B, 92)
mid = ImageFont.truetype(FONT_B, 44)
small = ImageFont.truetype(FONT_R, 30)

card(f"{V}/card_title.png", [
    ("Panta Rooms", big, 100, 28),
    ("Every question can become a market.", mid, 52, 40),
    ("A 3-minute community walkthrough", small, 36, 0),
])
card(f"{V}/card_outro.png", [
    ("You're ready.", big, 100, 30),
    ("Explore . Discuss . Predict .", mid, 52, 34),
    ("panta-rooms.vercel.app", small, 36, 0),
])

# ---- 2. per-scene targets ----
# target = min(video_dur, audio+3.2) but never below audio+0.9 (cards: audio+1.1)
def target(sid, vdur, is_card):
    a = dur[sid]["audio"]
    if is_card:
        return round(a + 1.1, 2)
    return round(max(a + 0.9, min(vdur, a + 3.2)), 2)

vpro = lambda f: float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
    capture_output=True, text=True).stdout.strip())

VDUR = {s: vpro(f"{V}/{s}.webm") for s in ["s2","s3","s4","s5","s6","s7","s8"]}
TGT = {"s1": target("s1", 0, True), "s9": target("s9", 0, True)}
TGT.update({s: target(s, VDUR[s], False) for s in VDUR})
print("targets:", {k: TGT[k] for k in ["s1","s2","s3","s4","s5","s6","s7","s8","s9"]})

# ---- 3. render each scene -> uniform mp4 (h264 yuv420p 30fps + aac 44.1k stereo) ----
def render_card(sid, png):
    t = TGT[sid]
    cmd = ["ffmpeg","-y","-loop","1","-t",str(t),"-i",png,"-i",f"{V}/{sid}.wav",
      "-filter_complex",
      f"[0:v]fps={FPS},scale={W}:{H},format=yuv420p[v];"
      f"[1:a]adelay=600|600,apad,atrim=0:{t},aformat=sample_rates=44100:channel_layouts=stereo[a]",
      "-map","[v]","-map","[a]","-c:v","libx264","-preset","medium","-crf","22",
      "-c:a","aac","-b:a","128k","-t",str(t), f"{V}/enc_{sid}.mp4"]
    subprocess.run(cmd, check=True, capture_output=True)

def render_scene(sid):
    t = TGT[sid]
    pad = max(0.0, t - VDUR[sid])
    vf = f"[0:v]fps={FPS},scale={W}:{H},format=yuv420p"
    if pad > 0.05:
        vf += f",tpad=stop_mode=clone:stop_duration={pad:.2f}"
    vf += "[v]"
    cmd = ["ffmpeg","-y","-i",f"{V}/{sid}.webm","-i",f"{V}/{sid}.wav",
      "-filter_complex",
      vf + f";[1:a]adelay=700|700,apad,atrim=0:{t},aformat=sample_rates=44100:channel_layouts=stereo[a]",
      "-map","[v]","-map","[a]","-c:v","libx264","-preset","medium","-crf","22",
      "-c:a","aac","-b:a","128k","-t",str(t), f"{V}/enc_{sid}.mp4"]
    subprocess.run(cmd, check=True, capture_output=True)

for s in ["s1","s2","s3","s4","s5","s6","s7","s8","s9"]:
    if s == "s1": render_card(s, f"{V}/card_title.png")
    elif s == "s9": render_card(s, f"{V}/card_outro.png")
    else: render_scene(s)
    print(f"encoded {s}: {vpro(f'{V}/enc_{s}.mp4'):.2f}s")

# ---- 4. concat ----
with open(f"{V}/concat.txt","w") as f:
    for s in ["s1","s2","s3","s4","s5","s6","s7","s8","s9"]:
        f.write(f"file '{V}/enc_{s}.mp4'\n")
subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",f"{V}/concat.txt",
                "-c","copy",f"{V}/joined.mp4"], check=True, capture_output=True)
total = vpro(f"{V}/joined.mp4")
print(f"joined: {total:.2f}s")

# ---- 5. captions (SRT from cumulative starts, burned in) ----
def ts(t):
    h, m = int(t//3600), int(t%3600//60)
    s = t%60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")

starts, acc = {}, 0.0
for s in ["s1","s2","s3","s4","s5","s6","s7","s8","s9"]:
    starts[s] = acc
    acc += TGT[s]

srt = []
for i, s in enumerate(["s1","s2","s3","s4","s5","s6","s7","s8","s9"], 1):
    st = starts[s] + (0.7 if s not in ("s1","s9") else 0.4)
    en = starts[s] + TGT[s] - 0.3
    srt.append(f"{i}\n{ts(st)} --> {ts(en)}\n{dur[s]['caption']}\n")
open(f"{V}/captions.srt","w").write("\n".join(srt))

style = "FontName=DejaVu Sans,FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&HC8000000,BorderStyle=1,Outline=1,Shadow=1,MarginV=26"
subprocess.run(["ffmpeg","-y","-i",f"{V}/joined.mp4","-vf",
                f"subtitles={V}/captions.srt:force_style='{style}'",
                "-c:v","libx264","-preset","medium","-crf","22","-c:a","copy", FINAL],
               check=True, capture_output=True)
print(f"FINAL: {FINAL} -> {vpro(FINAL):.2f}s, {os.path.getsize(FINAL)/1e6:.1f} MB")
