"""Compose the software campaign with current application screenshots."""

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from PIL.PngImagePlugin import PngInfo


work = Path(__file__).resolve().parent
root = work.parents[1]
output = root / "宣传图/2.9.111-新版实拍宣传"
output.mkdir(parents=True, exist_ok=True)
size = (2400, 4000)
ink, muted, accent = "#252a2c", "#5c6667", "#993f4b"
font_regular = "C:/Windows/Fonts/msyh.ttc"
font_bold = "C:/Windows/Fonts/msyhbd.ttc"
font_brand = "C:/Windows/Fonts/timesbd.ttf"
text_records, screen_records = [], []
reports = []
inputs = work / "phone-screens"
inputs.mkdir(exist_ok=True)
shots = {
    "characters": "181812", "cloud-night": "181832", "backup": "181917",
    "worldbook": "181930", "presets": "181939",
    "gallery": "182014", "advanced": "182027",
}
for key, time in shots.items():
    original = Path(f"C:/Users/pzh/Downloads/Screenshot_20261115_{time}.jpg")
    destination = inputs / (key + ".jpg")
    shutil.copyfile(original, destination)
    assert original.read_bytes() == destination.read_bytes()
manifest = json.loads(next((work / "position-swap").glob("*/final_outputs.json"))
                      .read_text(encoding="utf-8"))
art_path = Path(manifest["outputs"][0]["path"])
if not art_path.is_absolute():
    art_path = root / art_path
art = Image.open(art_path).convert("RGB")
assert art.size == (1536, 2048)
page = Image.new("RGBA", size, "#f5f4f4")
illustration = art.resize((2400, 3200), Image.Resampling.LANCZOS)
page.paste(illustration, (0, 0))

# Continue the paper surface below the illustration for the campaign footer.
paper = Image.new("RGBA", (2400, 1000))
for y in range(paper.height):
    alpha = round(255 * min(1, y / 170))
    ImageDraw.Draw(paper).line((0, y, 2399, y), fill=(247, 247, 245, alpha))
page.alpha_composite(paper, (0, 3000))


def text(x, y, value, pixels, color=ink, font=font_regular):
    face = ImageFont.truetype(font, pixels)
    draw = ImageDraw.Draw(page)
    bounds = draw.textbbox((x, y), value, font=face, anchor="lt")
    assert bounds[0] >= 0 and bounds[1] >= 0
    assert bounds[2] <= size[0] and bounds[3] <= size[1], (value, bounds)
    draw.text((x, y), value, font=face, fill=color, anchor="lt")
    text_records.append({"text": value, "bounds": list(bounds), "size": pixels})


def phone(name, x, y, width, angle=0, night=False, crop=None):
    source = inputs / (name + ".jpg")
    screen = Image.open(source).convert("RGB")
    original_size = screen.size
    if crop:
        assert 0 <= crop[0] < crop[2] <= screen.width
        assert 0 <= crop[1] < crop[3] <= screen.height
        screen = screen.crop(crop)
    screen = screen.resize((width, round(width * screen.height / screen.width)),
                           Image.Resampling.LANCZOS)
    border, pad, radius = 14, 95, 45
    frame = (screen.width + 2 * border, screen.height + 2 * border)
    layer = Image.new("RGBA", (frame[0] + pad * 2, frame[1] + pad * 2))
    shadow = Image.new("RGBA", layer.size)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (pad + 5, pad + 22, pad + frame[0] + 5, pad + frame[1] + 22),
        radius, fill=(42, 29, 34, 74))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(29)))
    ImageDraw.Draw(layer).rounded_rectangle(
        (pad, pad, pad + frame[0], pad + frame[1]), radius,
        fill="#393238" if night else "#ffffff", outline="#b7b5b7", width=3)
    mask = Image.new("L", screen.size)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, screen.width - 1, screen.height - 1), radius - border, fill=255)
    layer.paste(screen, (pad + border, pad + border), mask)
    interior = (50, 50, screen.width - 50, screen.height - 50)
    assert screen.crop(interior).tobytes() == layer.convert("RGB").crop((
        pad + border + 50, pad + border + 50,
        pad + border + screen.width - 50, pad + border + screen.height - 50
    )).tobytes()
    placed = layer.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    center = (x + frame[0] / 2, y + frame[1] / 2)
    page.alpha_composite(placed, (round(center[0] - placed.width / 2),
                                 round(center[1] - placed.height / 2)))
    screen_records.append({
        "source": str(source.relative_to(root)), "sha256": digest(source),
        "capturedFrom": "User-provided mobile screenshot, November 15, 2026",
        "screenshotVersion": "2.9.109", "originalSize": list(original_size),
        "crop": crop,
        "displayWidth": width, "angle": angle,
        "screenshotPixelsUnpainted": True,
    })


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


text(135, 130, "AI 角色扮演  /  Android 本地版", 48, muted)
text(125, 235, "RP-Local", 230, ink, font_brand)
text(135, 505, "故事随你展开，", 78, ink, font_bold)
text(135, 615, "陪伴留在身边。", 78, ink, font_bold)
draw = ImageDraw.Draw(page)
draw.line((140, 755, 340, 755), fill=accent, width=8)
text(135, 810, "角色卡 · 世界书 · 分支记忆", 44, muted)
text(135, 890, "2.9.111  /  新版体验", 38, accent, font_bold)

text(50, 1030, "角色卡", 38, muted)
text(735, 1030, "画廊", 38, muted)
phone("characters", 35, 1120, 640, 0, night=True)
phone("gallery", 720, 1120, 640, 0)

# Keep Yueyue's feet and bell anklets clear of both screenshots and shadows.
feet_bounds = (1490, 2510, 1840, 2940)
assert page.convert("RGB").crop(feet_bounds).tobytes() == illustration.crop(feet_bounds).tobytes()

draw = ImageDraw.Draw(page)
draw.line((135, 3105, 2265, 3105), fill="#bcb8b6", width=2)
draw.line((135, 3105, 335, 3105), fill=accent, width=7)
for x, title, subtitle in [
    (135, "世界随你编排", "世界书多选 · 固定生图"),
    (875, "画面随心切换", "生图站点 · 画廊与皮肤"),
    (1615, "存档多重守护", "多重备份 · 云端互传"),
]:
    text(x, 3170, title, 58, ink, font_bold)
    text(x, 3275, subtitle, 38, muted)
text(135, 3435, "新版自动提醒，应用内更新", 62, accent, font_bold)
text(135, 3535, "确认后下载与安装 · 持续修复导入、记忆等问题", 38, muted)
draw.line((135, 3665, 2265, 3665), fill="#bcb8b6", width=2)
text(135, 3750, "更新交流群", 47, muted)
text(465, 3725, "132292045", 86, accent, font_bold)
text(135, 3890, "基于 STA1N156 / RP-Hub  ·  鸣谢 红花铃、启元", 32, muted)

def save(name, feet=None):
    report = {
        "name": name, "size": list(size), "campaignVersion": "2.9.111",
        "group": "132292045", "meowaJobId": manifest["job_id"],
        "illustration": str(art_path.relative_to(root)), "illustrationSha256": digest(art_path),
        "screens": list(screen_records), "text": list(text_records),
        "uncoveredFeetBounds": feet,
        "updateBehavior": "Automatically checks and reminds; downloading and installing require confirmation.",
    }
    assert all("472441481" not in item["text"] for item in text_records)
    for first_index, first in enumerate(text_records):
        for second in text_records[first_index + 1:]:
            a, b = first["bounds"], second["bounds"]
            assert min(a[2], b[2]) <= max(a[0], b[0]) or min(a[3], b[3]) <= max(a[1], b[1]), (
                first["text"], second["text"])
    final = page.convert("RGB")
    metadata = PngInfo()
    metadata.add_text("Description", json.dumps(report, ensure_ascii=False))
    final.save(output / (name + ".png"), pnginfo=metadata, optimize=True)
    final.save(output / (name + ".jpg"), quality=96, subsampling=0)
    final.resize((900, round(900 * size[1] / size[0])), Image.Resampling.LANCZOS).save(
        output / (name + "-预览.jpg"), quality=95, subsampling=0)
    reports.append(report)
    print(f"Saved {name}: {size}, {len(screen_records)} new mobile screenshots; text checks passed")


save("RP-Local-把故事留在身边-主海报", list(feet_bounds))

size = (2400, 4500)
page = Image.new("RGBA", size, "#f7f7f5")
text_records, screen_records = [], []
manifest = json.loads(next((work / "feature-banner").glob("*/final_outputs.json"))
                      .read_text(encoding="utf-8"))
art_path = Path(manifest["outputs"][0]["path"])
if not art_path.is_absolute():
    art_path = root / art_path
banner = Image.open(art_path).convert("RGBA")
assert banner.size == (2048, 1152)
banner = banner.resize((2400, 1350), Image.Resampling.LANCZOS)
page.alpha_composite(banner, (0, 0))
paper_join = Image.new("RGBA", (2400, 250))
for y in range(paper_join.height):
    ImageDraw.Draw(paper_join).line((0, y, 2399, y), fill=(247, 247, 245, round(255 * y / 249)))
page.alpha_composite(paper_join, (0, 1100))

draw = ImageDraw.Draw(page)
draw.rectangle((0, 1350, 24, 4500), fill=accent)
text(135, 1000, "RP-Local", 155, ink, font_brand)
text(140, 1210, "让想象有画面，让故事有归处。", 78, ink, font_bold)
text(140, 1350, "AI 角色扮演  /  Android 本地版  /  2.9.111", 40, muted)
draw.line((135, 1460, 2265, 1460), fill="#bcb8b6", width=2)
for x, number, title, subtitle in [
    (135, "01", "设定自由编排", "世界书多选，批量管理"),
    (875, "02", "故事多重留存", "每日备份，网页云端互传"),
    (1615, "03", "画面值得收藏", "新画廊、图片与多款皮肤"),
]:
    text(x, 1525, number, 42, accent, font_bold)
    text(x, 1615, title, 62, ink, font_bold)
    text(x, 1720, subtitle, 36, muted)

phone("worldbook", 135, 1840, 650, crop=(0, 0, 1260, 2360))
phone("backup", 875, 1840, 650, crop=(0, 0, 1260, 2360))
phone("gallery", 1615, 1840, 650, crop=(0, 0, 1260, 2360))

draw = ImageDraw.Draw(page)
draw.rectangle((25, 3170, 2399, 3880), fill="#eef2f0")
draw.line((135, 3170, 335, 3170), fill=accent, width=8)
for x, y, title, subtitle in [
    (135, 3260, "固定生图", "喜欢的画面，固定保留"),
    (1310, 3260, "生图网站可切换", "选择适合自己的生图服务"),
    (135, 3470, "多重备份保护", "本地存档 · 每日 JSON 备份"),
    (1310, 3470, "原网站云端互传", "共用备份码，传输角色卡与聊天"),
    (135, 3680, "更好看的陪伴", "画廊、图片与皮肤外观一起焕新"),
    (1310, 3680, "应用内更新", "新版自动提醒，确认后下载安装"),
]:
    text(x, y, title, 60, ink, font_bold)
    text(x, y + 100, subtitle, 38, muted)
text(135, 3970, "持续修复，让每一次续写更顺手。", 53, accent, font_bold)
text(135, 4070, "云端传输包含角色卡与聊天，不含记忆与设置。", 32, muted)
draw.line((135, 4180, 2265, 4180), fill="#bcb8b6", width=2)
text(135, 4260, "更新交流群", 47, muted)
text(465, 4235, "132292045", 86, accent, font_bold)
text(135, 4400, "基于 STA1N156 / RP-Hub  ·  鸣谢 红花铃、启元", 32, muted)
save("RP-Local-让想象有画面-功能篇")

(output / "素材与界面来源.json").write_text(
    json.dumps(reports, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
