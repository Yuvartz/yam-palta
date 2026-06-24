# One-off: regenerate docs/ app icons from the Yam Palata logo artwork.
# Source PNG lives outside the repo (provided directly by the user); re-run by pointing
# SRC at the logo file if it ever needs to be regenerated.
from PIL import Image

SRC = "../files/ChatGPT Image Jun 23, 2026, 01_40_42 AM.png"
logo = Image.open(SRC).convert("RGB")

def save(size, path):
    logo.resize((size, size), Image.LANCZOS).save(path)

save(192, "docs/icon-192.png")
save(512, "docs/icon-512.png")
save(180, "docs/apple-touch-icon.png")
icon_sizes = [16, 32, 48, 64, 128, 256]
logo.save("docs/favicon.ico", sizes=[(s, s) for s in icon_sizes])
print("done")
