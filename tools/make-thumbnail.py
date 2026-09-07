"""The Discover-section thumbnail: 1024x768, the HUD's palette, drawn with Pillow.

A World's thumbnail is its whole pitch in the mobile app's Discover list, and a thumbnail from
before the stadium existed was selling a different scene. This draws the brand rather than a
screenshot, so it is legible at 200px wide: a title, one promise, and the shapes the game is made
of. Swap in a real phone screenshot of the stadium if you get a good one - this is the floor.

Run: python3 tools/make-thumbnail.py
"""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 768
NAVY = (43, 28, 84)
DEEP = (23, 13, 51)
PINK = (255, 61, 158)
YELLOW = (255, 212, 64)
CYAN = (51, 204, 255)
GREEN = (92, 219, 128)
WHITE = (255, 255, 255)
SHADOW = (23, 13, 51)

BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def font(size):
    return ImageFont.truetype(BOLD, size)


def hexagon(cx, cy, r):
    return [(cx + r * math.cos(math.radians(60 * i - 30)), cy + r * math.sin(math.radians(60 * i - 30))) for i in range(6)]


img = Image.new('RGB', (W, H), NAVY)
d = ImageDraw.Draw(img)

# Vertical gradient, navy to deep purple: the stadium at dusk.
for y in range(H):
    t = y / H
    c = tuple(int(NAVY[i] * (1 - t) + DEEP[i] * t) for i in range(3))
    d.line([(0, y), (W, y)], fill=c)

# A field of hex tiles in the lower half, in the fruit palette, some already fallen.
palette = [PINK, YELLOW, CYAN, GREEN, (170, 110, 255)]
r = 44
rows = 4
for row in range(rows):
    y = H - 60 - row * (r * 1.55)
    for col in range(-1, 14):
        x = 40 + col * (r * 1.75) + (r * 0.875 if row % 2 else 0)
        i = (row * 7 + col * 3) % len(palette)
        fallen = (row * 5 + col) % 9 == 0
        pts = hexagon(x, y, r - 4)
        if fallen:
            d.polygon(pts, fill=DEEP, outline=(60, 40, 110))
        else:
            d.polygon([(px + 5, py + 7) for px, py in pts], fill=SHADOW)
            d.polygon(pts, fill=palette[i], outline=SHADOW, width=3)

# The title, chunky with a hard shadow, the way the HUD does it.
title = 'STUMBLEZONE'
f = font(104)
tw = d.textlength(title, font=f)
tx, ty = (W - tw) / 2, 140
d.text((tx + 8, ty + 8), title, font=f, fill=SHADOW)
d.text((tx, ty), title, font=f, fill=WHITE)


def pill(cx, cy, text, color, textcolor, size=38, pad=28):
    f2 = font(size)
    w = d.textlength(text, font=f2) + pad * 2
    h = size + pad
    box = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
    d.rounded_rectangle([b + 6 for b in box], radius=h / 2, fill=SHADOW)
    d.rounded_rectangle(box, radius=h / 2, fill=color)
    d.text((cx - (w - pad * 2) / 2, cy - size / 2 - 4), text, font=f2, fill=textcolor)


pill(W / 2, 300, 'A NEW ROUND EVERY 2 MINUTES', PINK, WHITE, 38)
pill(W / 2 - 250, 378, 'FALL. CHEER. RETURN.', CYAN, DEEP, 28)
pill(W / 2 + 250, 378, 'BUILT FOR YOUR PHONE', YELLOW, DEEP, 28)

img.save('images/scene-thumbnail.png', optimize=True)
print('wrote images/scene-thumbnail.png', img.size)
