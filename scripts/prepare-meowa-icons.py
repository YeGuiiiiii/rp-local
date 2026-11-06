from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / "artwork/meowa-navigation-20261106/A_cohesive_set_of_four_softly_cute_minimal_mobile_navigation_icons_on_transparent_background_one_single_horizo_a0ebe115/ui_output.png"
image = Image.open(source).convert("RGBA")
out = root / "web/assets/images/navigation"
out.mkdir(parents=True, exist_ok=True)
# Keep the four whole designed icons; component detection splits sliders and album details.
for name, box in {
    "characters": (30, 525, 525, 1010),
    "album": (550, 525, 1030, 1000),
    "advanced": (1090, 525, 1510, 990),
    "settings": (1590, 525, 2010, 1010),
}.items():
    crop = image.crop(box)
    alpha = crop.getchannel("A").point(lambda value: 0 if value < 220 else round((value - 220) * 255 / 34))
    crop.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError("Empty icon: " + name)
    crop = crop.crop(bounds)
    crop.thumbnail((112, 112), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (128, 128))
    canvas.alpha_composite(crop, ((128 - crop.width) // 2, (128 - crop.height) // 2))
    canvas.save(out / f"{name}.webp", lossless=True)
print("Prepared four Meowa navigation icons at 128px.")
