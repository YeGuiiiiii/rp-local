"""Compose release posters from Meowa illustrations and real rendered UI."""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


work = Path(__file__).resolve().parent
root = work.parents[1]
output = root / "宣传图/2.9.111-更新提醒"
output.mkdir(parents=True, exist_ok=True)
screens = root / ".impeccable/review/update-notice-2.9.111"
regular = "C:/Windows/Fonts/msyh.ttc"
bold = "C:/Windows/Fonts/msyhbd.ttc"
brand = "C:/Windows/Fonts/bahnschrift.ttf"
report = []


def text(page, xy, value, size, color, font=regular):
    face = ImageFont.truetype(font, size)
    draw = ImageDraw.Draw(page)
    box = draw.textbbox(xy, value, font=face)
    if box[0] < 0 or box[2] > page.width or box[3] > page.height:
        raise ValueError(f"Text outside poster: {value}")
    draw.text(xy, value, font=face, fill=color)


for mascot, folder, title, caption, background in [
    ("yueyue", "yueyue", "霓裳玥玥", "有新版本，先提醒你。", "#e7f0ed"),
    ("honghualing", "honghualing-qipao", "旗袍红花铃", "看到新版本，再决定更新。", "#f5eaee"),
]:
    manifest_path = next((work / folder).glob("*/final_outputs.json"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    source = Path(manifest["outputs"][0]["path"])
    page = Image.new("RGBA", (1600, 2400), background)
    ink, accent, muted = "#213e3b", "#9a3049", "#47635f"
    draw = ImageDraw.Draw(page)
    draw.rectangle((0, 0, 20, 2400), fill=accent)
    text(page, (96, 80), "RP-Local", 160, ink, brand)
    text(page, (102, 280), "2.9.111  /  新版本提醒", 44, accent, bold)
    text(page, (98, 382), caption, 66, ink, bold)
    draw.line((100, 510, 1500, 510), fill="#adc4bb", width=2)

    figure = Image.open(source).convert("RGBA")
    figure = figure.crop(figure.getbbox())
    figure.thumbnail((1110, 1230), Image.Resampling.LANCZOS)
    page.alpha_composite(figure, (30, 550 + (1230 - figure.height) // 2))
    text(page, (102, 1685), title, 42, accent, bold)

    screen_path = screens / f"poster-{mascot}.png"
    screen = Image.open(screen_path).convert("RGBA")
    width = 470
    screen = screen.resize((width, round(width * screen.height / screen.width)), Image.Resampling.LANCZOS)
    x, y = 1010, 720
    if y + screen.height > 1450:
        raise ValueError("The update popup is too large for the poster")
    page.alpha_composite(screen, (x, y))
    text(page, (x + 2, y - 62), "新版界面演示", 30, muted)
    text(page, (x, 1315), "小弹窗，随时关掉", 36, ink, bold)
    text(page, (x, 1378), "点下载，才开始更新", 34, muted)

    draw.line((100, 1780, 1500, 1780), fill="#adc4bb", width=2)
    text(page, (102, 1815), "这次更新", 44, accent, bold)
    for index, line in enumerate([
        "两张 Q 版插画随机出现，玥玥与红花铃陪你发现新版。",
        "版本号跟随最新正式版，关闭提醒后继续玩。",
        "保留角色卡导入修复与原有聊天、备份功能。",
    ]):
        text(page, (102, 1905 + index * 70), line, 37, ink)
    draw.line((100, 2150, 1500, 2150), fill="#adc4bb", width=2)
    text(page, (102, 2180), "更新交流群  132292045", 58, accent, bold)
    text(page, (104, 2290), "原作 STA1N156 / RP-Hub · 鸣谢 红花铃、启元", 28, muted)
    name = f"RP-Local-2.9.111-{title}-更新宣传"
    final = page.convert("RGB")
    description = json.dumps({
        "composition": "Typography composed with Pillow; UI is a screenshot of the implemented popup.",
        "illustrationPrompt": (work / f"{mascot}-prompt.txt").read_text(encoding="utf-8").strip(),
        "meowaJobId": manifest["job_id"],
    }, ensure_ascii=False)
    from PIL.PngImagePlugin import PngInfo
    png_info = PngInfo()
    png_info.add_text("Description", description)
    final.save(output / f"{name}.png", pnginfo=png_info)
    final.save(output / f"{name}.jpg", quality=94, subsampling=0)
    report.append({
        "name": name, "size": list(final.size), "group": "132292045",
        "illustration": source.relative_to(root).as_posix(), "meowaJobId": manifest["job_id"],
        "screenshot": screen_path.relative_to(root).as_posix(),
        "screenshotSha256": hashlib.sha256(screen_path.read_bytes()).hexdigest(),
    })
    print(output / f"{name}.png")

(output / "素材与界面来源.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
