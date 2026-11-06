import base64
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


out = Path(__file__).resolve().parent
exports = Path("D:/大模型用/rp/rp可导入数据-最终/分项导入")
sources = [
    Path("C:/Users/pzh/Downloads/新建文件夹/地牢小馆：炒翻日常 V1.5.png"),
    exports / "05-现在是“安可”时间~/角色卡含头像.png",
    exports / "04-漆黑的子弹/角色卡含头像.png",
    next(exports.glob("02-*/角色卡含头像.png")),
]
cards = []
sheet = Image.new("RGB", (1200, 520), "#eeeef0")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
for index, source in enumerate(sources):
    with Image.open(source) as image:
        payload = image.info.get("chara") or image.info.get("ccv3")
        if payload:
            raw = json.loads(base64.b64decode(payload).decode("utf-8"))
        else:
            raw = json.loads(source.with_name("角色卡.json").read_text(encoding="utf-8-sig"))
        card = raw.get("data", raw)
        cards.append({"source": str(source), "raw": raw})
        cover = image.convert("RGB")
        cover.save(out / f"card-cover-{index}.png")
        cover.thumbnail((280, 440))
        sheet.paste(cover, (index * 300 + (300 - cover.width) // 2, 0))
        draw.text((index * 300 + 8, 450), card["name"][:14], font=font, fill="#222222")
        print(f'{index}: {card["name"]} | {image.size} | source={source.name}')
(out / "cards.json").write_text(json.dumps(cards, ensure_ascii=False), encoding="utf-8")
sheet.save(out / "card-check.jpg")
