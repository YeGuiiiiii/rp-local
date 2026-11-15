"""Prepare one character reference for the new software campaign."""

from pathlib import Path

from PIL import Image


work = Path(__file__).resolve().parent
previous = work.parent / "update-notice-20261115"
reference = Image.new("RGB", (1600, 900), "#ffffff")
for index, folder in enumerate(("yueyue", "honghualing-qipao")):
    source = next((previous / folder).glob("*/*.png"))
    image = Image.open(source).convert("RGBA")
    image = image.crop(image.getchannel("A").getbbox())
    image.thumbnail((770, 850), Image.Resampling.LANCZOS)
    reference.paste(image, (index * 800 + (800 - image.width) // 2,
                           (900 - image.height) // 2), image)
reference.save(work / "character-reference.png")
