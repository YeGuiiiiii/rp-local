from pathlib import Path
import json
from PIL import Image, ImageChops, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
ui_dir = root / "artwork/chenyue-ui-20261106/A_reusable_hand_drawn_mobile_app_UI_asset_sheet_inspired_by_the_reference_girls_rough_cute_sticker_art_White_p_463db8d7"
out = root / "web/assets/images/chenyue"
out.mkdir(parents=True, exist_ok=True)
ui = Image.open(ui_dir / "ui_output.png").convert("RGBA")
records = []

def crop_clean(image, box, max_size, padding=8):
    crop = image.crop(box)
    alpha = crop.getchannel("A")
    # Keep the source antialiasing near solid art, excluding disconnected glow.
    core = alpha.point(lambda value: 255 if value >= 220 else 0)
    core = core.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(7))
    alpha = ImageChops.multiply(alpha, core)
    crop.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("Empty asset")
    crop = crop.crop(bbox)
    crop.thumbnail((max_size[0] - padding * 2, max_size[1] - padding * 2), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (crop.width + padding * 2, crop.height + padding * 2))
    result.paste(crop, (padding, padding))
    return result

def night_variant(image):
    result = image.copy()
    pixels = []
    for r, g, b, a in image.get_flattened_data():
        light = (r + g + b) / 3
        if light > 190:
            amount = (light - 190) / 65
            r, g, b = (round(65 - 24 * amount), round(61 - 21 * amount), round(71 - 22 * amount))
        elif light < 125:
            amount = light / 125
            r, g, b = (round(193 - 60 * amount), round(184 - 59 * amount), round(203 - 62 * amount))
        else:
            r, g, b = (round(r * .6), round(g * .55), round(b * .65))
        pixels.append((r, g, b, a))
    result.putdata(pixels)
    return result

for name, box, size in [
    ("title-label", (940, 176, 1949, 546), (800, 400)),
    ("button-paper", (133, 760, 962, 1002), (640, 220)),
    ("close", (1337, 1104, 1672, 1438), (128, 128)),
]:
    image = crop_clean(ui, box, size)
    image.save(out / (name + ".webp"), quality=94, method=6)
    night_variant(image).save(out / (name + "-night.webp"), quality=94, method=6)
    records.append({"name": name, "source": str(ui_dir / "ui_output.png"), "size": image.size, "alpha": image.getchannel("A").getextrema()})

# Separate the painted ornaments from the exposed paper and frame strokes.
def corner_cutout(image, name):
    width, height = image.size
    paper = Image.new("L", image.size)
    paper.putdata([255 if min(r, g, b) > 170 and max(r, g, b) - min(r, g, b) < 65 or not a else 0
                   for r, g, b, a in image.get_flattened_data()])
    for x in range(width):
        for y in (0, height - 1):
            if paper.getpixel((x, y)) == 255:
                ImageDraw.floodfill(paper, (x, y), 128)
    for y in range(height):
        for x in (0, width - 1):
            if paper.getpixel((x, y)) == 255:
                ImageDraw.floodfill(paper, (x, y), 128)
    alpha = ImageChops.multiply(image.getchannel("A"), paper.point(lambda value: 0 if value == 128 else 255))
    # These bounds pass outside the ornament, excluding the adjoining frame.
    outline = [(0, 0), (132, 0), (158, 28), (167, 62), (160, 100), (139, 125),
               (110, 140), (70, 140), (62, 177), (0, 177)] if name.endswith("moon") else [
               (64, 0), (100, 0), (106, 45), (119, 62), (147, 56), (147, 161),
               (50, 161), (50, 135), (0, 135), (0, 106), (43, 94),
               (43, 84), (26, 74), (37, 55), (60, 43)]
    matte = Image.new("L", image.size)
    ImageDraw.Draw(matte).polygon(outline, fill=255)
    image.putalpha(ImageChops.multiply(alpha, matte))
    if name.endswith("moon"):
        image.putdata([(r, g, b, 0 if index // width > 125 and r >= g >= b and (r + g + b) / 3 > 120 else a)
                       for index, (r, g, b, a) in enumerate(image.get_flattened_data())])
    image = image.crop(image.getchannel("A").getbbox())
    padded = Image.new("RGBA", (image.width + 16, image.height + 16))
    padded.paste(image, (8, 8))
    return padded

for name, box in [
    ("album-corner-moon", (163, 1025, 343, 1202)),
    ("album-corner-leaf", (730, 1307, 880, 1468)),
]:
    image = crop_clean(ui, box, (240, 240), padding=0)
    image = corner_cutout(image, name)
    image.save(out / (name + ".webp"), quality=96, method=6)
    night_variant(image).save(out / (name + "-night.webp"), quality=96, method=6)
    records.append({"name": name, "source": str(ui_dir / "ui_output.png"), "size": image.size,
                    "contentBox": image.getchannel("A").getbbox(), "padding": 8})

# The final character sheet includes the user's corrected right-wrist ribbon.
corrected = root / "artwork/chenyue-right-wrist-20261106"
canonical = corrected if list(corrected.rglob("final_outputs.json")) else root / "artwork/chenyue-canonical-20261106"
manifests = list(canonical.rglob("final_outputs.json")) if canonical.exists() else []
if manifests:
    manifest = json.loads(manifests[0].read_text(encoding="utf-8"))
    outputs = manifest.get("outputs", [])
    media = next(Path(item["path"]) for item in outputs if item.get("type") == "media")
    sheet = Image.open(media).convert("RGBA")
    assert sheet.size == (2048, 1536), "Recheck per-pose bounds for a different source sheet"
    # Row boundaries follow the actual hair silhouettes, not equal thirds.
    rows = [(0, 500), (500, 1005), (1005, 1536)]
    for index, name in enumerate(["welcome", "writing", "album", "workshop", "peek", "confused"]):
        column, row = index % 2, index // 2
        box = (column * 1024, rows[row][0], (column + 1) * 1024, rows[row][1])
        image = crop_clean(sheet, box, (360, 280))
        image.save(out / (name + ".webp"), quality=93, method=6)
        records.append({"name": name, "source": str(media), "sourceBox": box, "size": image.size,
                        "contentBox": image.getchannel("A").getbbox(), "padding": 8,
                        "alpha": image.getchannel("A").getextrema()})

for record in records:
    if "contentBox" in record:
        left, top, right, bottom = record["contentBox"]
        assert min(left, top, record["size"][0] - right, record["size"][1] - bottom) >= 8, record["name"]
for obsolete in ("album-frame.webp", "album-frame-night.webp", "button-mint.webp", "button-mint-night.webp"):
    (out / obsolete).unlink(missing_ok=True)
(root / "verification/chenyue-art.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
print("Prepared", len(records), "Chen Yue source assets, plus paper night variants.")
