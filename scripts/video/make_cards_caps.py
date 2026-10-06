#!/usr/bin/env python3
"""Panta Rooms guide v2 — cards + caption PNGs.
Style: Inter Bold, white, black outline + soft shadow, gold keywords (user spec).
Cards carry their own text (title/outro), so no small captions on cards.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

V = "/tmp/video"
W, H = 1280, 578
FONT_B = f"{V}/Inter-Bold.ttf"
GOLD = (255, 214, 46)
WHITE = (255, 255, 255)
ZINC = (9, 9, 11)
GREY = (161, 161, 170)

# ---------------- cards ----------------
def card(path, lines):
    img = Image.new("RGB", (W, H), ZINC)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 6], fill=(234, 179, 8))
    total = sum(h for _, _, h, gap, _ in lines) + sum(gap for _, _, _, gap, _ in lines[:-1])
    y = (H - total) // 2
    for text, font, h, gap, color in lines:
        if text:
            w = d.textlength(text, font=font)
            d.text(((W - w) / 2, y), text, font=font, fill=color)
        y += h + gap
    img.save(path)

big = ImageFont.truetype(FONT_B, 72)
mid = ImageFont.truetype(FONT_B, 34)
url = ImageFont.truetype(FONT_B, 40)

card(f"{V}/card2_title.png", [
    ("Panta Rooms", big, 82, 22, WHITE),
    ("The social layer for prediction markets", mid, 42, 0, GREY),
])
card(f"{V}/card2_outro.png", [
    ("Explore. Discuss. Predict.", big, 82, 26, WHITE),
    ("panta-rooms.vercel.app", url, 48, 0, GOLD),
])
print("cards ok")

# ---------------- captions ----------------
# (text, [yellow words]) — hand-crafted 2-5 word chunks per scene
CAPTIONS = {
    "n1": [("Welcome to Panta Rooms", ["panta", "rooms"]),
           ("the social layer", []),
           ("for prediction markets", [])],
    "n2": [("Browsing is Free", ["free"]),
           ("Connect your Solana wallet", ["connect"]),
           ("at the top right", []),
           ("whenever you're ready", []),
           ("to trade with real USDC", ["usdc"])],
    "n3": [("In Explore, markets are", ["explore"]),
           ("organized into ten categories", []),
           ("like Sports, Crypto, and Politics", ["sports", "crypto", "politics"]),
           ("Filter by open or resolved", ["filter"]),
           ("markets, or search directly", ["search"])],
    "n4": [("Connect natively with", ["connect"]),
           ("Phantom, Solflare, or MetaMask", ["phantom", "solflare", "metamask"]),
           ("to manage your positions", [])],
    "n5": [("Click any market", ["click"]),
           ("to enter its Room", ["room"]),
           ("part market, part conversation", []),
           ("Scroll down to post your take", ["post"]),
           ("react, or comment as a guest", []),
           ("with no wallet required", ["no", "wallet"])],
    "n6": [("The Community tab ranks", ["community"]),
           ("the most-discussed Rooms", []),
           ("and loudest voices", []),
           ("across the platform", [])],
    "n7": [("Want to test things out first?", []),
           ("Switch to Demo Mode", ["demo", "mode"]),
           ("for a full sandbox experience", []),
           ("with zero setup", ["zero", "setup"])],
    "n8": [("To create a Room,", []),
           ("type any question", ["type"]),
           ("AI structures it into a market", ["ai"]),
           ("sets resolution rules", []),
           ("and gets it ready to launch", [])],
    "n9": [("Pick YES or NO", ["yes", "no"]),
           ("enter your amount", []),
           ("get a live quote,", ["quote"]),
           ("and confirm", ["confirm"]),
           ("The mechanics match", []),
           ("live mainnet trading", ["mainnet"])],
    "n10": [("Explore, discuss, and predict.", ["explore", "discuss", "predict"]),
            ("Visit", []),
            ("panta-rooms.vercel.app", ["panta-rooms.vercel.app"]),
            ("to start", [])],
}

CAP_F = ImageFont.truetype(FONT_B, 32)
CAP_F_SMALL = ImageFont.truetype(FONT_B, 27)  # fallback for long chunks

def draw_caption(text, yellow, path):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = CAP_F
    words = text.split()
    # width check; shrink to 34px if overflow
    def width(fs, ws):
        f = CAP_F if fs == 32 else CAP_F_SMALL
        return d.textlength(" ".join(ws), font=f) + 16 * len(ws)
    fs = 32
    if width(fs, words) > W - 140:
        fs = 27
    font = CAP_F if fs == 32 else CAP_F_SMALL
    total_w = width(fs, words)
    x = (W - total_w) / 2
    y = 486
    # soft shadow pass
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    cx = x
    for wtext in words:
        wl = wtext.lower().strip(".,!?—")
        color = GOLD if wl in yellow else WHITE
        sw = sd.textlength(wtext + " ", font=font)
        sd.text((cx + 2, y + 3), wtext, font=font, fill=(0, 0, 0, 200))
        cx += sw
    shadow = shadow.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, shadow)
    d = ImageDraw.Draw(img)
    cx = x
    for wtext in words:
        wl = wtext.lower().strip(".,!?—")
        color = GOLD if wl in yellow else WHITE
        sw = d.textlength(wtext + " ", font=font)
        d.text((cx, y), wtext, font=font, fill=color, stroke_width=2, stroke_fill=(0, 0, 0))
        cx += sw
    img.save(path)

os.makedirs(f"{V}/caps", exist_ok=True)
for sid, chunks in CAPTIONS.items():
    for i, (text, yellow) in enumerate(chunks):
        draw_caption(text, set(yellow), f"{V}/caps/{sid}_{i}.png")
    print(f"{sid}: {len(chunks)} caption PNGs")
print("captions ok")
