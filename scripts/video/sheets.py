#!/usr/bin/env python3
"""Contact sheets (1 fps) of guide.mp4 from dumped gray frames, with timestamps."""
import numpy as np
from PIL import Image, ImageDraw

N_FRAMES, H, W, FPS = 724, 45, 80, 6
raw = np.fromfile('/home/z/my-project/scripts/video/raw_gray.bin', dtype=np.uint8)
frames = raw[:N_FRAMES * H * W].reshape(N_FRAMES, H, W)

CW, CH = 192, 108          # cell size (upscale x2.4)
COLS, ROWS = 8, 5
PER = COLS * ROWS          # 40 per sheet -> 1 fps => 40s per sheet

# take every 6th frame (1 fps)
sel = list(range(0, N_FRAMES, FPS))
for s in range(0, len(sel), PER):
    chunk = sel[s:s + PER]
    sheet = Image.new('L', (COLS * CW, ROWS * (CH + 14)), 20)
    dr = ImageDraw.Draw(sheet)
    for k, fi in enumerate(chunk):
        img = Image.fromarray(frames[fi]).resize((CW, CH), Image.LANCZOS)
        cx, cy = (k % COLS) * CW, (k // COLS) * (CH + 14)
        sheet.paste(img, (cx, cy))
        dr.text((cx + 4, cy + CH + 1), f"t={fi/FPS:6.2f}s", fill=235)
    out = f'/home/z/my-project/scripts/video/sheet_{s//PER}.png'
    sheet.save(out)
    print(out, f'frames {chunk[0]/FPS:.1f}..{chunk[-1]/FPS:.1f}s')
