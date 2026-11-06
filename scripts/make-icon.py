from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
image = Image.open(root / "app-icon.jpg").convert("RGBA")
for density, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    image.resize((size, size), Image.Resampling.LANCZOS).save(
        root / "android" / "res" / f"mipmap-{density}-v4" / "ic_launcher.png"
    )
image.save(root / "dist" / "app-icon.png")
print("Generated five launcher icon sizes.")
