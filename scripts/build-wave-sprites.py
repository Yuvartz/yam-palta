# One-off: slice the hand-drawn wave spritesheet (10 frames, flat -> breaking) into
# docs/img/waves/wave-0.png .. wave-9.png as white-on-transparent alpha masks, so the app
# can recolor them live via CSS mask-image + background-color (see miniWave() in index.html).
# Source PNG lives outside the repo (provided directly by the user); re-run by pointing
# SRC at the spritesheet file if it ever needs to be regenerated.
from PIL import Image
import numpy as np
import os

SRC = "../files/ChatGPT Image Jun 23, 2026, 01_40_59 AM.png"
sprite = Image.open(SRC).convert("RGB")
arr = np.array(sprite)

# Find the 10 cards by locating the whitespace gaps between them (more robust than
# assuming a fixed width per card, since the source frames aren't perfectly uniform).
dark = 255 - arr.min(axis=2)
has_content = dark.max(axis=0) > 15
gap_cols = np.where(~has_content)[0]
runs, start, prev = [], gap_cols[0], gap_cols[0]
for c in gap_cols[1:]:
    if c != prev + 1:
        runs.append((start, prev))
        start = c
    prev = c
runs.append((start, prev))
big_gaps = [r for r in runs if r[1] - r[0] + 1 >= 8]
assert len(big_gaps) == 11, f"expected 11 gaps (margins + 9 dividers), got {len(big_gaps)}"
cards = [(big_gaps[i][1] + 1, big_gaps[i + 1][0] - 1) for i in range(10)]

os.makedirs("docs/img/waves", exist_ok=True)
Y0, Y1 = 305, 415  # vertical band containing the wave/sun art in every card

dims = []
for idx, (x0, x1) in enumerate(cards):
    frame = sprite.crop((x0, Y0, x1, Y1))
    farr = np.array(frame).astype(np.float32)
    alpha = np.clip((255 - farr.min(axis=2)) * 1.6, 0, 255).astype(np.uint8)
    out = np.zeros((farr.shape[0], farr.shape[1], 4), dtype=np.uint8)
    out[..., 0] = 255; out[..., 1] = 255; out[..., 2] = 255
    out[..., 3] = alpha
    Image.fromarray(out, "RGBA").save(f"docs/img/waves/wave-{idx}.png")
    dims.append(frame.size)

print("wrote 10 frames:", dims)
