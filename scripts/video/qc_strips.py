#!/usr/bin/env python3
"""QC strips from the FINAL video: frames around dissolve #1 and dissolve #20."""
import subprocess, numpy as np
from PIL import Image, ImageDraw

FIN = '/home/z/my-project/scripts/video/panta_rooms_guide_final.mp4'
FW, FH = 1280, 578

def strip(t0, n, out, label):
    raw = f'/home/z/my-project/scripts/video/tmp_qc.raw'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(t0),
                    '-i', FIN, '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                    '-y', raw], timeout=20)
    data = np.fromfile(raw, dtype=np.uint8)
    got = len(data) // (FW * FH * 3)
    fr = data[:got * FW * FH * 3].reshape(got, FH, FW, 3)
    CW, CH = 200, 90
    cols = got
    sheet = Image.new('RGB', (cols * (CW + 4), CH + 16), (30, 30, 30))
    dr = ImageDraw.Draw(sheet)
    for k in range(got):
        img = Image.fromarray(fr[k]).resize((CW, CH), Image.LANCZOS)
        sheet.paste(img, (k * (CW + 4), 0))
        dr.text((k * (CW + 4) + 3, CH + 2), f"{t0 + k / 30:.2f}s", fill=(240, 240, 240))
    sheet.save(out)
    print(out, f'{got} frames')

strip(5.70, 15, '/home/z/my-project/scripts/video/qc_dissolve1.png', 'dissolve1')
strip(105.75, 15, '/home/z/my-project/scripts/video/qc_dissolve20.png', 'dissolve20')
strip(10.15, 15, '/home/z/my-project/scripts/video/qc_dip2.png', 'dip2')
