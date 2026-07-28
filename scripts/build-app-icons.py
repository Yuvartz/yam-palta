# One-off: regenerate docs/ app icons, iOS splash screens and the notification badge
# from the Yam Palata logo artwork. Source PNG lives outside the repo (provided directly
# by the user); re-run from the repo root: python scripts/build-app-icons.py
import math
from pathlib import Path
from PIL import Image, ImageDraw

SRC = "../files/newlogo.png"
BG = (10, 14, 22)  # --bg: #0a0e16, matches manifest background_color
logo = Image.open(SRC).convert("RGB")

def save(size, path):
    logo.resize((size, size), Image.LANCZOS).save(path, optimize=True)

save(192, "docs/icon-192.png")
save(512, "docs/icon-512.png")
save(180, "docs/apple-touch-icon.png")
# Keep the .ico small — it used to embed up to 256px frames and weighed 93KB,
# all of which the service worker precached on every install.
logo.save("docs/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Maskable icons: Android's adaptive mask crops to a circle inside the ~80% safe zone,
# so the artwork is scaled down onto a full-bleed background instead of plain-resized.
def maskable(size, path):
    canvas = Image.new("RGB", (size, size), BG)
    inner = int(size * 0.72)
    art = logo.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(art, (off, off))
    canvas.save(path, optimize=True)

maskable(192, "docs/icon-192-maskable.png")
maskable(512, "docs/icon-512-maskable.png")

# Small header badge: square crop favoring the turtle/horizon over the sun glow,
# since a tight circular crop of the full icon mostly showed empty sky/sun.
w, h = logo.size
crop = logo.crop((int(w * 0.1395), int(h * 0.2791), int(w * 0.8604), h))
crop.resize((96, 96), Image.LANCZOS).save("docs/brand-badge.png", optimize=True)

# Monochrome notification badge (Android status bar): three white wave strokes on
# transparent — the OS only renders the alpha channel, so it must be a silhouette.
def wave_badge(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    stroke = max(3, size // 12)
    for row in range(3):
        cy = size * (0.32 + 0.22 * row)
        pts = [(x, cy + math.sin(x / size * 2 * math.pi * 1.5) * size * 0.06)
               for x in range(int(size * 0.08), int(size * 0.92))]
        d.line(pts, fill=(255, 255, 255, 255), width=stroke, joint="curve")
    img.save(path, optimize=True)

wave_badge(96, "docs/badge-96.png")

# iOS launch screens: solid dark background + centred logo (~38% of the short edge).
# Sizes must match the <link rel="apple-touch-startup-image"> media queries in index.html.
SPLASH = [(640, 1136), (750, 1334), (828, 1792), (1125, 2436), (1170, 2532), (1179, 2556),
          (1206, 2622), (1242, 2688), (1284, 2778), (1290, 2796), (1320, 2868)]
Path("docs/splash").mkdir(parents=True, exist_ok=True)
for sw, sh in SPLASH:
    canvas = Image.new("RGB", (sw, sh), BG)
    side = int(min(sw, sh) * 0.38)
    art = logo.resize((side, side), Image.LANCZOS)
    canvas.paste(art, ((sw - side) // 2, (sh - side) // 2))
    canvas.save(f"docs/splash/splash-{sw}x{sh}.png", optimize=True)

print("done")
