# Builds docs/og-image.png (1200x630) — the social share card. Pillow only; Hebrew shaped via
# arabic_reshaper/bidi if installed, else simple reversal (fine for these short strings).
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "og-image.png")
FONT_B = "C:/Windows/Fonts/arialbd.ttf"
FONT_R = "C:/Windows/Fonts/arial.ttf"
MONO = "C:/Windows/Fonts/consolab.ttf" if os.path.exists("C:/Windows/Fonts/consolab.ttf") else FONT_B

def heb(s):
    try:
        from bidi.algorithm import get_display
        return get_display(s)
    except Exception:
        # Reverse Hebrew runs only; keep latin/digits in order.
        import re
        parts = re.split(r'(\s+)', s)
        return " ".join(p[::-1] if re.search(r'[\u0590-\u05FF]', p) else p for p in parts[::-1]).replace("  ", " ")

img = Image.new("RGB", (W, H), (10, 14, 22))
d = ImageDraw.Draw(img)
# ambient glows
glow = Image.new("RGB", (W, H), (10, 14, 22))
g = ImageDraw.Draw(glow)
g.ellipse((300, -320, 900, 260), fill=(20, 60, 62))
g.ellipse((900, 380, 1500, 900), fill=(30, 34, 70))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, glow, 0.9)
d = ImageDraw.Draw(img)

# sea: three sine layers
for i, (amp, mid, col, alpha) in enumerate([(14, 470, (45, 212, 191), 90), (10, 505, (45, 212, 191), 150), (7, 540, (45, 212, 191), 235)]):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    pts = [(x, mid - amp * math.sin(x / 90 + i)) for x in range(0, W + 1, 6)] + [(W, H), (0, H)]
    ld.polygon(pts, fill=col + (alpha,))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
d = ImageDraw.Draw(img)
# horizon glow line
d.line((80, 462, W - 80, 462), fill=(255, 212, 121), width=2)

# logo badge
badge_path = os.path.join(os.path.dirname(__file__), "..", "docs", "brand-badge.png")
if os.path.exists(badge_path):
    b = Image.open(badge_path).convert("RGBA").resize((110, 110))
    img.paste(b, (W - 80 - 110, 60), b)

# score
score_font = ImageFont.truetype(MONO, 150)
d.text((80, 90), "9.2", font=score_font, fill=(45, 212, 191))
sw = d.textlength("9.2", font=score_font)
d.text((80 + sw + 10, 175), "/10", font=ImageFont.truetype(MONO, 54), fill=(138, 152, 173))

title_font = ImageFont.truetype(FONT_B, 76)
sub_font = ImageFont.truetype(FONT_R, 40)
tag_font = ImageFont.truetype(FONT_B, 34)
t1 = heb("ים פלטה")
t2 = heb("מתי הים באמת רגוע?")
t3 = heb("ציון מאפס עד עשר לשחייה, סאפ ושנירקול · לכל חוף · לשבוע הקרוב")
def rtext(y, s, f, fill):
    w = d.textlength(s, font=f); d.text((W - 80 - w, y), s, font=f, fill=fill)
rtext(200, t1, title_font, (230, 237, 246))
rtext(290, t2, sub_font, (45, 212, 191))
rtext(350, t3, ImageFont.truetype(FONT_R, 30), (170, 184, 206))
# url
d.text((80, 570), "yamplata.com", font=tag_font, fill=(10, 14, 22))

img.save(OUT, optimize=True)
print("wrote", OUT, img.size)
