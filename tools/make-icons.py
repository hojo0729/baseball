# Draws the app icons (original artwork: a baseball under stadium lights). Run: python3 tools/make-icons.py
from PIL import Image, ImageDraw, ImageFilter
import math, os
os.makedirs('docs/icons', exist_ok=True)
def art(size, safe=1.0):
    S = size * 4
    im = Image.new('RGB', (S, S), (10, 24, 21))
    d = ImageDraw.Draw(im)
    for y in range(S):                       # night sky -> field glow
        t = y / S; c = (int(10 + 20 * t), int(24 + 55 * t), int(21 + 35 * t)); d.line([(0, y), (S, y)], fill=c)
    glow = Image.new('RGB', (S, S), (0, 0, 0)); g = ImageDraw.Draw(glow)
    r0 = int(S * 0.42 * safe); cx, cy = S // 2, int(S * 0.46)
    g.ellipse([cx - r0, cy - r0, cx + r0, cy + r0], fill=(90, 70, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.09))
    im = Image.composite(glow, im, glow.convert('L').point(lambda v: min(255, v * 2))) if False else Image.blend(im, Image.eval(glow, lambda v: v), 0.0)
    from PIL import ImageChops
    im = ImageChops.add(im, glow)
    d = ImageDraw.Draw(im)
    R = int(S * 0.27 * safe)                 # the ball
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(244, 240, 226), outline=(200, 196, 180), width=max(2, S // 200))
    lw = max(3, int(S * 0.012 * safe))
    for sgn in (-1, 1):                      # two red seams
        pts = []
        for i in range(-24, 25):
            a = i / 24 * 0.95
            x = cx + sgn * R * (0.56 + 0.12 * math.cos(a * 1.6)) * math.cos(a * 0.0 + 0) - sgn * 0
            y = cy + R * 0.92 * math.sin(a)
            x = cx + sgn * (R * 0.52 - R * 0.14 * (1 - math.cos(a)) * 2.2) + 0
            pts.append((x, y))
        d.line(pts, fill=(217, 104, 59), width=lw * 2, joint='curve')
        for i in range(-20, 21, 5):
            a = i / 24 * 0.95
            x = cx + sgn * (R * 0.52 - R * 0.14 * (1 - math.cos(a)) * 2.2); y = cy + R * 0.92 * math.sin(a)
            dx = -sgn * 1; d.line([(x, y), (x + sgn * R * 0.12, y)], fill=(217, 104, 59), width=lw)
    # little strike-zone bracket under the ball
    zw, zh = int(S * 0.22 * safe), int(S * 0.15 * safe); zy = int(S * 0.78 - (1 - safe) * S * 0.1)
    d.rectangle([cx - zw, zy, cx + zw, zy + zh], outline=(244, 201, 90), width=max(3, int(S * 0.014)))
    return im.resize((size, size), Image.LANCZOS)
art(512).save('docs/icons/icon-512.png')
art(192).save('docs/icons/icon-192.png')
art(512, 0.78).save('docs/icons/icon-maskable-512.png')   # content kept inside the safe zone
art(180).save('docs/icons/apple-touch-icon.png')
art(64).save('docs/icons/favicon.png')
print('icons done')
