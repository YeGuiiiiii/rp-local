import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


work = Path(__file__).resolve().parent
root = work.parents[1]
output = root / "宣传图"
output.mkdir(exist_ok=True)
canvas_size = (2400, 3600)
font_regular = "C:/Windows/Fonts/msyh.ttc"
font_bold = "C:/Windows/Fonts/msyhbd.ttc"
font_brand = "C:/Windows/Fonts/timesbd.ttf"
report = []


def text(image, x, y, content, size, color, bold=False, brand=False):
    font = ImageFont.truetype(font_brand if brand else font_bold if bold else font_regular, size)
    draw = ImageDraw.Draw(image)
    bounds = draw.textbbox((x, y), content, font=font, anchor="lt")
    assert bounds[0] >= 0 and bounds[1] >= 0
    assert bounds[2] <= canvas_size[0] and bounds[3] <= canvas_size[1], (content, bounds)
    draw.text((x, y), content, font=font, fill=color, anchor="lt")


def phone(image, name, width, center, top, angle=0, night=False):
    source = work / "screens" / (name + ".png")
    screen = Image.open(source).convert("RGB")
    screen = screen.resize((width, round(width * screen.height / screen.width)), Image.Resampling.LANCZOS)
    border, margin, radius = 13, 74, 45
    w, h = screen.width + 2 * border, screen.height + 2 * border
    layer = Image.new("RGBA", (w + margin * 2, h + margin * 2))
    shadow = Image.new("RGBA", layer.size)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (margin + 2, margin + 19, margin + w + 2, margin + h + 19),
        radius=radius, fill=(0, 0, 0, 150 if night else 70),
    )
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(27)))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((margin, margin, margin + w, margin + h), radius,
                           fill="#2d2932" if night else "#fafbff",
                           outline="#a69ca8" if night else "#bbc0ce", width=2)
    draw.rounded_rectangle((margin + 4, margin + 4, margin + w - 4, margin + h - 4),
                           radius - 4, outline="#615864" if night else "#ffffff", width=2)
    mask = Image.new("L", screen.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, screen.width - 1, screen.height - 1),
                                           radius - border, fill=255)
    layer.paste(screen, (margin + border, margin + border), mask)
    # Only rounded corners are masked; the application pixels are not repainted.
    center_crop = (55, 55, screen.width - 55, screen.height - 55)
    assert screen.crop(center_crop).tobytes() == layer.convert("RGB").crop((
        margin + border + 55, margin + border + 55,
        margin + border + screen.width - 55, margin + border + screen.height - 55,
    )).tobytes()
    rotated = layer.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    x = round(center - rotated.width / 2)
    y = round(top + h / 2 - rotated.height / 2)
    image.alpha_composite(rotated, (x, y))
    return {
        "source": source.relative_to(root).as_posix(),
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "displayWidth": width, "rotationDegrees": angle,
        "applicationPixelsPreservedBeforePlacement": True,
    }


def figures(kind):
    paths = list((work / (kind + "-eyes")).glob("*/edited.png"))
    assert len(paths) == 1, kind
    image = Image.open(paths[0]).convert("RGBA")
    assert image.getchannel("A").getextrema()[0] == 0, "Figure background must be transparent"
    result = []
    for left, right in [(0, image.width // 2), (image.width // 2, image.width)]:
        figure = image.crop((left, 0, right, image.height))
        bounds = figure.getchannel("A").point(lambda value: 255 if value > 60 else 0).getbbox()
        assert bounds is not None
        result.append(figure.crop((max(0, bounds[0] - 12), max(0, bounds[1] - 12),
                                   min(figure.width, bounds[2] + 12),
                                   min(figure.height, bounds[3] + 12))))
    return result, {
        "source": paths[0].relative_to(root).as_posix(),
        "sha256": hashlib.sha256(paths[0].read_bytes()).hexdigest(),
        "jobId": {"day": "job_45e63beec2f54687be758e591ac086df",
                  "night": "job_593f236de7e44ad191dd1839b8e34977"}[kind],
    }


def place_figure(image, figure, center, top, height, max_width):
    ratio = min(height / figure.height, max_width / figure.width)
    figure = figure.resize((round(figure.width * ratio), round(figure.height * ratio)),
                           Image.Resampling.LANCZOS)
    x = round(center - figure.width / 2)
    assert x >= 0 and x + figure.width <= image.width
    assert top >= 0 and top + figure.height <= 3290
    image.alpha_composite(figure, (x, top))
    return [x, top, x + figure.width, top + figure.height]


for kind, name, headline, entries in [
    ("day", "RP本地版-双人篇-经典与陪伴", "熟悉的故事，新的陪伴。",
     ["screen-day-home", "screen-night-home", "screen-classic-deck"]),
    ("night", "RP本地版-双人篇-界面与画廊", "昼夜随心，故事常在。",
     ["screen-classic-memory", "screen-day-appearance", "screen-night-gallery"]),
]:
    night = kind == "night"
    page = Image.new("RGBA", canvas_size, "#17151d" if night else "#f5f6fa")
    ink = "#f8f4f6" if night else "#242431"
    muted = "#bab3c0" if night else "#6b6878"
    accent = "#e7adba" if night else "#99516b"
    brand_color = "#d8c5de" if night else "#6769be"
    draw = ImageDraw.Draw(page)
    draw.line((140, 690, 2260, 690), fill="#413a49" if night else "#d7d8e1", width=2)
    draw.line((140, 690, 390, 690), fill=accent, width=7)
    text(page, 140, 118, "RP", 230, ink, brand=True)
    text(page, 510, 177, "HUB", 158, brand_color, brand=True)
    text(page, 1890, 150, "2.9", 126, ink, bold=True)
    text(page, 2018, 315, "本地版", 42, muted)
    text(page, 145, 395, "经典 · 白昼手账 · 夜蔷薇" if night else "红花铃 × 玥玥",
         47, accent, bold=True)
    text(page, 140, 488, headline, 91, ink, bold=True)
    text(page, 145, 619, "原作 STA1N156 · RP-Hub   /   鸣谢 红花铃、启元", 42, muted)

    labels = ["记忆系统", "外观切换", "角色画廊"] if night else ["白昼手账", "夜蔷薇", "经典布局"]
    text(page, 185, 765, labels[0], 46, muted, bold=True)
    text(page, 1885, 765, labels[1], 46, muted, bold=True)
    screens = [
        phone(page, entries[0], 760, 520, 935, 6, night),
        phone(page, entries[1], 760, 1880, 935, -6, night),
    ]
    text(page, 1000, 855, labels[2], 47, accent, bold=True)
    screens.append(phone(page, entries[2], 930, 1200, 955, 0, night))

    people, source = figures(kind)
    bounds = [
        place_figure(page, people[0], 370, 2235, 1035, 730),
        place_figure(page, people[1], 2030, 2245, 1025, 730),
    ]
    text(page, 225, 3290, "红花铃", 42, muted, bold=True)
    text(page, 1985, 3290, "玥玥", 42, muted, bold=True)
    draw = ImageDraw.Draw(page)
    draw.line((140, 3380, 2260, 3380), fill="#514452" if night else "#d2d2dc", width=2)
    text(page, 145, 3425, "加入红花铃交流群", 36, muted)
    text(page, 140, 3490, "QQ 132292045", 80, ink, bold=True)
    text(page, 1710, 3525, "QQ 472441481", 43, "#8d8491" if night else "#8a8491")
    final = page.convert("RGB")
    final.save(output / (name + ".png"), optimize=True)
    final.save(output / (name + ".jpg"), quality=96, subsampling=0)
    final.resize((800, 1200), Image.Resampling.LANCZOS).save(work / (name + "-preview.jpg"), quality=95)
    report.append({
        "name": name, "dimensions": canvas_size, "files": [name + ".png", name + ".jpg"],
        "appVersion": "2.9.001", "screens": screens, "figureBounds": bounds,
        "figureEdit": source, "generation": "Meowa general image and focused eye edit",
        "authors": {"original": "STA1N156 / RP-Hub", "acknowledgements": ["红花铃", "启元"]},
        "characters": ["红花铃", "玥玥"], "primaryGroup": "132292045", "secondaryGroup": "472441481",
        "primaryGroupFont": 80, "secondaryGroupFont": 43,
    })
    print(f"Saved {name}: 2400 x 3600, PNG + JPG; three real application pages.")
(work / "provenance.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
