#!/usr/bin/env python3
"""Build labeled 2x2 contact sheets for each v1 scene recording to map content."""
import subprocess
from PIL import Image, ImageDraw, ImageFont

V = "/tmp/video"
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)

def probe(f):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
        capture_output=True, text=True).stdout.strip())

for sid in ["s2", "s3", "s4", "s5", "s6", "s7", "s8"]:
    f = f"{V}/{sid}.webm"
    dur = probe(f)
    ts = [dur * p for p in (0.08, 0.35, 0.62, 0.88)]
    W, H = 720, 450
    sheet = Image.new("RGB", (W * 2 + 30, H * 2 + 60), (18, 18, 20))
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(ts):
        out = f"{V}/fr_{sid}_{i}.jpg"
        subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", f, "-frames:v", "1", "-q:v", "3", out],
                       capture_output=True)
        im = Image.open(out).resize((W, H))
        x, y = (i % 2) * (W + 10) + 10, (i // 2) * (H + 35) + 32
        sheet.paste(im, (x, y))
        d.text((x, y - 26), f"{sid} @ {t:.1f}s / {dur:.1f}s", font=FONT, fill=(255, 220, 0))
    sheet.save(f"{V}/sheet_{sid}.jpg", quality=82)
    print(f"sheet_{sid}.jpg  ({dur:.2f}s)")
print("done")
