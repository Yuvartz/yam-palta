# Generate a tier illustration with OpenAI gpt-image-1 (needs OPENAI_API_KEY in the environment).
# Usage: python scripts/gen-tier-art.py <tier-key> <prompt-file> [size] [quality]
# Writes docs/img/tiers/<tier-key>.png (transparent) and a 160px preview next to it.
import json, os, sys, base64, urllib.request
from PIL import Image

key = os.environ.get("OPENAI_API_KEY")
if not key: sys.exit("OPENAI_API_KEY not set")
tier, prompt_file = sys.argv[1], sys.argv[2]
size = sys.argv[3] if len(sys.argv) > 3 else "1024x1024"
quality = sys.argv[4] if len(sys.argv) > 4 else "high"
prompt = open(prompt_file, encoding="utf-8").read().strip()
body = json.dumps({"model": "gpt-image-1", "prompt": prompt, "n": 1, "size": size, "quality": quality,
                   "background": "transparent", "output_format": "png"}).encode()
req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body,
                             headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=180) as r: data = json.load(r)
b64 = data["data"][0]["b64_json"]
out_dir = os.path.join(os.path.dirname(__file__), "..", "docs", "img", "tiers"); os.makedirs(out_dir, exist_ok=True)
raw = os.path.join(out_dir, f"{tier}-raw.png")
open(raw, "wb").write(base64.b64decode(b64))
im = Image.open(raw).convert("RGBA")
# trim transparent margins, then pad to square with a small margin
bbox = im.getbbox()
if bbox: im = im.crop(bbox)
w, h = im.size; s = int(max(w, h) * 1.12)
canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0)); canvas.paste(im, ((s - w) // 2, (s - h) // 2), im)
canvas.resize((320, 320), Image.LANCZOS).save(os.path.join(out_dir, f"{tier}.png"), optimize=True)
canvas.resize((160, 160), Image.LANCZOS).save(os.path.join(out_dir, f"{tier}-preview.png"), optimize=True)
os.remove(raw)
print("wrote", os.path.join(out_dir, f"{tier}.png"), "usage:", data.get("usage"))
