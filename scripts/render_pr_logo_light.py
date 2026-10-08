#!/usr/bin/env python3
"""PR monogram v2 - synced with the live site header style:
light zinc gradient tile (from-zinc-100 to-zinc-400), dark zinc-950 glyph.
Matches AppShell.tsx Logo component (rounded-lg light tile + bold dark P)."""
import os
import matplotlib
matplotlib.use("Agg")
from matplotlib.textpath import TextPath
from matplotlib.font_manager import FontProperties

OUT_DIR = "/home/z/my-project/download"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_SIZE = 58
tp = TextPath((0, 0), "PR", size=FONT_SIZE,
              prop=FontProperties(family="DejaVu Sans", weight="bold"))

polys = tp.to_polygons()
glyph_path = " ".join(
    "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in p) + " Z" for p in polys)

bb = tp.get_extents()
cx = (bb.x0 + bb.x1) / 2.0
cy = (bb.y0 + bb.y1) / 2.0
dx = 50 - cx
dy = 50 + cy  # SVG y-down flip

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F4F4F5"/>
      <stop offset="1" stop-color="#A1A1AA"/>
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="94" height="94" rx="24"
        fill="url(#tile)" stroke="#A1A1AA" stroke-width="1"/>
  <g transform="translate({dx:.2f},{dy:.2f}) scale(1,-1)" fill="#09090B" fill-rule="evenodd">
    <path d="{glyph_path}"/>
  </g>
</svg>
'''

svg_path = os.path.join(OUT_DIR, "logo-pr-light.svg")
with open(svg_path, "w", encoding="utf-8") as f:
    f.write(svg)

from cairosvg import svg2png
svg2png(url=svg_path,
        write_to=os.path.join(OUT_DIR, "logo-pr-light-1024.png"),
        output_width=1024, output_height=1024)

for f in ("logo-pr-light.svg", "logo-pr-light-1024.png"):
    print(f, os.path.getsize(os.path.join(OUT_DIR, f)), "bytes")
print("DONE")
