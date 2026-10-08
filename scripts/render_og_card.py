#!/usr/bin/env python3
"""Panta Rooms OG card (1200x630) for link previews on X / LinkedIn / Discord.

Brand-consistent with the submitted PR monogram: dark site background (#0b0d10),
light zinc PR tile (logo-pr-light-1024.png), Geist-like typography via DejaVu
Sans Bold. Output: public/og.png + src/app/twitter-image.png (Next auto-route).
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (11, 13, 16)        # #0b0d10 — matches header/body background
ZINC_100 = (244, 244, 245)
ZINC_400 = (161, 161, 170)
ZINC_500 = (113, 113, 122)
EMERALD = (52, 211, 153)

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
bold = lambda s: ImageFont.truetype(f"{FONT_DIR}/DejaVuSans-Bold.ttf", s)
reg = lambda s: ImageFont.truetype(f"{FONT_DIR}/DejaVuSans.ttf", s)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Subtle top vignette glow (radial-ish via alpha layers) for depth
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse((W // 2 - 520, -320, W // 2 + 520, 260), fill=26)
glow_rgb = Image.new("RGB", (W, H), (38, 42, 50))
img.paste(glow_rgb, (0, 0), glow)

# PR monogram tile
tile = Image.open("/home/z/my-project/download/logo-pr-light-1024.png").convert("RGBA")
T = 168
tile = tile.resize((T, T), Image.LANCZOS)

tx, ty = 88, (H - T) // 2 - 26
img.paste(tile, (tx, ty), tile)

# Live dot pulse line above title
d.ellipse((tx + 6, ty - 44, tx + 20, ty - 30), fill=EMERALD)
d.text((tx + 32, ty - 44), "A social layer for prediction markets", font=reg(24), fill=ZINC_400)

# Wordmark + tagline right of tile
text_x = tx + T + 56
d.text((text_x, ty + 6), "Panta Rooms", font=bold(92), fill=ZINC_100)
d.text((text_x + 4, ty + 122), "Every question can become a market.", font=reg(38), fill=ZINC_400)

# Footer meta
d.text((tx, H - 92), "Create Rooms  ·  Discuss  ·  Trade YES/NO on Solana", font=reg(26), fill=ZINC_500)
d.text((tx, H - 52), "Powered by the Panta API", font=bold(24), fill=ZINC_400)

img.save("/home/z/my-project/public/og.png", optimize=True)
img.save("/home/z/my-project/src/app/twitter-image.png", optimize=True)
print("OG card written:", W, "x", H)
