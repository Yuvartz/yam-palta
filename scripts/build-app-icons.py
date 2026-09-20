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

# iOS launch screens: dark sea background with a soft glow, the logo as a ROUNDED tile (the source
# art has white corners that used to show as an ugly square), and a small wordmark. The page's
# first-launch intro starts from exactly this composition and grows it to full screen, so the
# native splash → web intro hand-off feels like one animation.
from PIL import ImageFilter, ImageFont
SPLASH = [(640, 1136), (750, 1334), (828, 1792), (1125, 2436), (1170, 2532), (1179, 2556),
          (1206, 2622), (1242, 2688), (1284, 2778), (1290, 2796), (1320, 2868)]
Path("docs/splash").mkdir(parents=True, exist_ok=True)
def rounded_logo(side):
    art = logo.resize((side, side), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, side - 1, side - 1), radius=int(side * 0.225), fill=255)
    art.putalpha(mask)
    return art
def splash(sw, sh, path):
    canvas = Image.new("RGB", (sw, sh), BG)
    # ambient glows like the app background
    glow = Image.new("RGB", (sw, sh), BG); g = ImageDraw.Draw(glow)
    g.ellipse((sw * 0.15, sh * 0.28, sw * 0.85, sh * 0.62), fill=(48, 44, 30))
    g.ellipse((sw * 0.55, sh * 0.62, sw * 1.25, sh * 1.05), fill=(22, 30, 48))
    glow = glow.filter(ImageFilter.GaussianBlur(int(sw * 0.16)))
    canvas = Image.blend(canvas, glow, 0.85)
    side = int(sw * 0.42)
    art = rounded_logo(side)
    # soft shadow under the tile
    sh_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    ImageDraw.Draw(sh_img).rounded_rectangle(((sw - side) // 2, int(sh * 0.455 - side / 2) + int(side * 0.06), (sw + side) // 2, int(sh * 0.455 + side / 2) + int(side * 0.06)), radius=int(side * 0.225), fill=(0, 0, 0, 150))
    sh_img = sh_img.filter(ImageFilter.GaussianBlur(int(side * 0.08)))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), sh_img)
    canvas.paste(art, ((sw - side) // 2, int(sh * 0.455 - side / 2)), art)
    # wordmark
    d = ImageDraw.Draw(canvas)
    try: f = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", int(sw * 0.052))
    except Exception: f = ImageFont.load_default()
    txt = "YAM PALATA"; tw = d.textlength(txt, font=f)
    d.text(((sw - tw) / 2, int(sh * 0.455 + side / 2) + int(sw * 0.07)), txt, font=f, fill=(45, 212, 191))
    canvas.convert("RGB").save(path, optimize=True)
for sw, sh in SPLASH:
    splash(sw, sh, f"docs/splash/splash-{sw}x{sh}.png")
# the same tile for the web intro's first frame
rounded_logo(512).save("docs/img/ui/logo-tile.png", optimize=True)

print("done")
