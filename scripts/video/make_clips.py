#!/usr/bin/env python3
"""Build 20 transition clips (6 frames each) from source frames.
Type A (dissolve): blend src[J-3+j] with src[J+3+j], w=(j+0.5)/6, j=0..5
Type B (dip):      darken src[J-3+j] by b=[0.4,0.8,1,1,0.8,0.4]
Idempotent + verified. Usage: make_clips.py [k ...] (1-based joint no; default all)
"""
import numpy as np, json, os, subprocess, sys

VID = '/home/z/my-project/public/guide.mp4'
DIR = '/home/z/my-project/scripts/video/pieces'
FW, FH, FPS = 1280, 578, 30
FRAMES_PER_CLIP = 6

plan = json.load(open('/home/z/my-project/scripts/video/plan.json'))
cuts = plan['cuts']
all_joints = sorted(plan['dissolve'] + plan['dip'], key=lambda k: cuts[k])

# joints with original 6fps names in stable order (1-based)
ORDER = ["5.833", "10.5", "14.333", "17.833", "19.5", "37.333", "47.167", "50.167",
         "54.0", "59.833", "63.667", "67.667", "71.667", "74.167", "80.833",
         "82.167", "93.333", "98.0", "103.5", "108.667"]

def run(cmd, timeout=20):
    try:
        subprocess.run(cmd, timeout=timeout, capture_output=True)
        return True
    except subprocess.TimeoutExpired:
        return False

def count_frames(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0',
                        '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f],
                       capture_output=True, text=True)
    try:
        return int(r.stdout.strip())
    except ValueError:
        return -1

def extract_frames(start_frame, n):
    """Extract n rgb24 frames starting at start_frame. Returns array or None."""
    raw = f'{DIR}/tmp_extract.raw'
    if os.path.exists(raw):
        os.remove(raw)
    ss = start_frame / FPS
    for attempt in range(3):
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', f'{ss:.6f}', '-i', VID,
             '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-y', raw])
        if os.path.exists(raw) and os.path.getsize(raw) >= n * FH * FW * 3:
            data = np.fromfile(raw, dtype=np.uint8)
            os.remove(raw)
            return data[:n * FH * FW * 3].reshape(n, FH, FW, 3)
    return None

DIP_B = np.array([0.4, 0.8, 1.0, 1.0, 0.8, 0.4])

def build_joint(idx):
    name = ORDER[idx - 1]
    J = round(cuts[name] * FPS)          # joint frame
    typ = 'dissolve' if name in plan['dissolve'] else 'dip'
    out_mp4 = f'{DIR}/clip{idx:02d}.mp4'
    if os.path.exists(out_mp4) and count_frames(out_mp4) == FRAMES_PER_CLIP:
        return f'clip{idx:02d} OK (cached, {typ})'
    if typ == 'dissolve':
        nf = 12
        fr = extract_frames(J - 3, nf)
        if fr is None:
            return f'clip{idx:02d} EXTRACT FAIL'
        out = np.empty((6, FH, FW, 3), dtype=np.uint8)
        for j in range(6):
            w = (j + 0.5) / 6
            out[j] = np.clip((1 - w) * fr[j].astype(np.float32) + w * fr[j + 6].astype(np.float32),
                             0, 255).astype(np.uint8)
    else:
        nf = 6
        fr = extract_frames(J - 3, nf)
        if fr is None:
            return f'clip{idx:02d} EXTRACT FAIL'
        out = np.empty((6, FH, FW, 3), dtype=np.uint8)
        for j in range(6):
            out[j] = (fr[j].astype(np.float32) * (1 - DIP_B[j])).astype(np.uint8)
    rawf = f'{DIR}/tmp_clip.raw'
    out.tofile(rawf)
    ok = run(['ffmpeg', '-hide_banner', '-loglevel', 'error',
              '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{FW}x{FH}', '-framerate', '30',
              '-i', rawf, '-frames:v', '6',
              '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '17', '-pix_fmt', 'yuv420p',
              '-bf', '0', '-g', '60', '-video_track_timescale', '15360',
              '-an', '-y', out_mp4])
    os.remove(rawf)
    c = count_frames(out_mp4)
    if c == FRAMES_PER_CLIP:
        return f'clip{idx:02d} OK ({typ}, J={J})'
    return f'clip{idx:02d} FAIL (got {c} frames, rc={ok})'

if __name__ == '__main__':
    os.makedirs(DIR, exist_ok=True)
    targets = [int(x) for x in sys.argv[1:]] or list(range(1, 21))
    for i in targets:
        print(build_joint(i))
    print('CLIPS PASS COMPLETE')
