import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


work = Path(__file__).resolve().parent
output = work.parents[1] / "宣传图"
output.mkdir(exist_ok=True)
size = (1536, 2048)
regular = "C:/Windows/Fonts/msyh.ttc"
bold = "C:/Windows/Fonts/msyhbd.ttc"
version = re.search(r"RP_LOCAL_VERSION = '([^']+)'",
                    (work.parents[1] / "web/index.html").read_text(encoding="utf-8"))[1]


def text(image, position, value, pixels, color, heavy=False):
    font = ImageFont.truetype(bold if heavy else regular, pixels)
    bounds = ImageDraw.Draw(image).textbbox(position, value, font=font, anchor="lt")
    assert 0 <= bounds[0] < bounds[2] <= size[0]
    assert 0 <= bounds[1] < bounds[3] <= size[1]
    ImageDraw.Draw(image).text(position, value, font=font, fill=color, anchor="lt")


def phone(image, source, night):
    screen = Image.open(source).convert("RGB")
    screen = screen.resize((610, round(610 * screen.height / screen.width)), Image.Resampling.LANCZOS)
    x, y, border = 88, 490, 12
    width, height = screen.width + border * 2, screen.height + border * 2
    box = (x, y, x + width, y + height)
    shadow = Image.new("RGBA", size)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (x + 8, y + 18, x + width + 8, y + height + 18), 52,
        fill=(0, 0, 0, 110 if night else 55),
    )
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(box, 50, fill="#211b21" if night else "#eff0ef",
                           outline="#857778" if night else "#a1aaa7", width=3)
    mask = Image.new("L", screen.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, screen.width - 1, screen.height - 1), 38, fill=255)
    image.paste(screen, (x + border, y + border), mask)
    # The central screenshot pixels must remain the actual application capture.
    original = screen.crop((40, 40, screen.width - 40, screen.height - 40))
    rendered = image.convert("RGB").crop(
        (x + border + 40, y + border + 40,
         x + border + screen.width - 40, y + border + screen.height - 40)
    )
    assert original.tobytes() == rendered.tobytes()


posters = [
    {
        "name": "RP本地版-白昼手账",
        "art": "day-generated",
        "screen": "screen-day-home.png",
        "edition": f"{version}  /  白昼手账",
        "tagline": "把故事，写成你的世界。",
        "features": "角色卡管理   ·   世界书   ·   分支记忆",
        "night": False,
        "job": "job_e1cc3e44ce7c4926aa15216123529ef7",
    },
    {
        "name": "RP本地版-夜蔷薇",
        "art": "night-generated",
        "screen": "screen-night-gallery.png",
        "edition": f"{version}  /  夜蔷薇",
        "tagline": "今夜，也有故事等你。",
        "features": "夜蔷薇主题   ·   角色相簿   ·   倾斜反光",
        "night": True,
        "job": "job_1e2332f76ee5409f9f6ac3d88838683f",
    },
]
record = []
for item in posters:
    illustration = next((work / item["art"]).glob("*/result_images_0_url.png"))
    with Image.open(illustration) as source:
        assert source.size == size
        poster = source.convert("RGBA")
    night = item["night"]
    primary = "#f8eff0" if night else "#333c39"
    secondary = "#d0bfc4" if night else "#626b66"
    accent = "#e3b9c2" if night else "#87515b"
    text(poster, (105, 85), item["edition"], 32, accent)
    text(poster, (98, 151), "RP 本地版", 126, primary, True)
    text(poster, (105, 321), item["tagline"], 53, secondary)
    ImageDraw.Draw(poster).line((107, 423, 251, 423), fill=accent, width=5)
    phone(poster, work / item["screen"], night)
    text(poster, (105, 1870), item["features"], 38, primary, True)
    text(poster, (105, 1943), "更新发布 · QQ 群 472441481 / 132292045", 38, accent, True)
    text(poster, (105, 2008), "基于 STA1N156 / RP-Hub", 22, secondary)
    final = poster.convert("RGB")
    final.save(output / (item["name"] + ".png"), optimize=True)
    final.save(output / (item["name"] + ".jpg"), quality=95, subsampling=0)
    preview = final.resize((768, 1024), Image.Resampling.LANCZOS)
    preview.save(work / (item["name"] + "-preview.jpg"), quality=94)
    record.append({
        "output": item["name"] + ".png", "size": list(size),
        "illustration": str(illustration.relative_to(work)), "meowaJob": item["job"],
        "screenshot": item["screen"], "appVersion": version,
        "cards": [card["source"] for card in json.loads((work / "cards.json").read_text(encoding="utf-8"))],
        "prompts": ["day-prompt.txt", "night-prompt.txt"],
        "method": "Meowa illustration with unchanged real application screenshot and locally typeset text",
    })
    print(f'Saved {item["name"]}: {size[0]} x {size[1]}, PNG + JPG; screenshot pixels verified.')
(work / "provenance.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
