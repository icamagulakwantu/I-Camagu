"""Trim product packshots to the product, so every product fills its Bulk Buy
tile the same way.

Packshots arrive with very different amounts of white or transparent space
around the bottle, can or bag, which made some products look tiny and others
huge in the same grid. For each image in public/images/brands whose corners
are white or transparent (a packshot), this crops to the product, adds an
even 4% margin in the same background, and limits the longest side to 900px.
Photographs (corners that are not background) are left untouched.

Idempotent: an already-trimmed image is left as it is.

Usage: python3 scripts/normalise-product-images.py [--dry-run] [files...]
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops

BRANDS = Path(__file__).resolve().parent.parent / 'public' / 'images' / 'brands'
WHITE = 238          # a channel at or above this counts as white background
MARGIN = 0.04        # margin added around the product, per side
MAX_SIDE = 900
MIN_GAIN = 0.06      # skip when trimming would remove under 6% of either side


def is_background(pixel):
    r, g, b, a = pixel
    return a < 24 or (r >= WHITE and g >= WHITE and b >= WHITE)


def corners_are_background(im):
    w, h = im.size
    px = im.load()
    points = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    return sum(is_background(px[x, y]) for x, y in points) >= 7


def content_box(im):
    """Bounding box of product pixels: visible and darker than white in any channel."""
    r, g, b, a = im.convert('RGBA').split()
    darker = ImageChops.lighter(ImageChops.lighter(
        r.point(lambda v: 255 if v < WHITE else 0),
        g.point(lambda v: 255 if v < WHITE else 0)),
        b.point(lambda v: 255 if v < WHITE else 0))
    visible = a.point(lambda v: 255 if v >= 24 else 0)
    return ImageChops.darker(darker, visible).getbbox()


def normalise(path, dry_run=False):
    im = Image.open(path)
    im.load()
    original_mode = im.mode
    rgba = im.convert('RGBA')
    if not corners_are_background(rgba):
        return 'photo'
    box = content_box(rgba)
    if not box:
        return 'empty'
    w, h = rgba.size
    bw, bh = box[2] - box[0], box[3] - box[1]
    if (w - bw) / w < MIN_GAIN and (h - bh) / h < MIN_GAIN and max(w, h) <= MAX_SIDE:
        return 'already tight'
    product = rgba.crop(box)
    pad = int(round(max(bw, bh) * MARGIN))
    transparent = original_mode in ('RGBA', 'LA', 'P') and rgba.getextrema()[3][0] < 24
    background = (255, 255, 255, 0) if transparent else (255, 255, 255, 255)
    canvas = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), background)
    canvas.paste(product, (pad, pad), product)
    if max(canvas.size) > MAX_SIDE:
        canvas.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    if dry_run:
        return f'trim {w}x{h} -> {canvas.size[0]}x{canvas.size[1]}'
    suffix = path.suffix.lower()
    if suffix in ('.jpg', '.jpeg'):
        canvas.convert('RGB').save(path, quality=88, optimize=True)
    elif suffix == '.webp':
        canvas.save(path, quality=88)
    else:
        canvas.save(path, optimize=True)
    return f'trimmed {w}x{h} -> {canvas.size[0]}x{canvas.size[1]}'


def main(argv):
    dry_run = '--dry-run' in argv
    names = [a for a in argv if not a.startswith('--')]
    files = [BRANDS / n for n in names] if names else sorted(p for p in BRANDS.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'))
    counts = {}
    for path in files:
        try:
            result = normalise(path, dry_run)
        except Exception as error:  # a broken file should not stop the rest
            result = f'error: {error}'
        key = result.split(' ')[0]
        counts[key] = counts.get(key, 0) + 1
        if result.startswith(('trim', 'error')):
            print(f'{path.name}: {result}')
    print(counts)


if __name__ == '__main__':
    main(sys.argv[1:])
