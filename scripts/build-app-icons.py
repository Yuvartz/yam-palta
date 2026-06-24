# One-off: regenerate docs/ app icons from the Yam Palata logo artwork.
# Source PNG lives outside the repo (provided directly by the user); re-run by pointing
# SRC at the logo file if it ever needs to be regenerated.
from PIL import Image

SRC = "../files/newlogo.png"
logo = Image.open(SRC).convert("RGB")

def save(size, path):
    logo.resize((size, size), Image.LANCZOS).save(path)

save(192, "docs/icon-192.png")
save(512, "docs/icon-512.png")
save(180, "docs/apple-touch-icon.png")
icon_sizes = [16, 32, 48, 64, 128, 256]
logo.save("docs/favicon.ico", sizes=[(s, s) for s in icon_sizes])

# Small header badge: square crop favoring the turtle/horizon over the sun glow,
# since a tight circular crop of the full icon mostly showed empty sky/sun.
w, h = logo.size
crop = logo.crop((int(w * 0.1395), int(h * 0.2791), int(w * 0.8604), h))
crop.resize((96, 96), Image.LANCZOS).save("docs/brand-badge.png")

print("done")
