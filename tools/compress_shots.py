"""Quantize README screenshots to a 1998-friendly 256 colors and strip metadata."""

from pathlib import Path
from PIL import Image

folder = Path("docs/screenshots")
for path in sorted(folder.glob("*.png")):
    before = path.stat().st_size
    img = Image.open(path).convert("RGB")
    # Gradients look worse with dithering than with smooth banding.
    use_dither = path.name.startswith("0") and "title" not in path.name
    dither = Image.Dither.FLOYDSTEINBERG if use_dither else Image.Dither.NONE
    quantized = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=dither)
    quantized.save(path, format="PNG", optimize=True)
    after = path.stat().st_size
    print(f"{path.name:26} {before/1024:7.1f} KB -> {after/1024:6.1f} KB  dither={use_dither}")
