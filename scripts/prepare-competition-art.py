"""Export organizer posters and generated illustrations for the bundled events."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--art", type=Path, required=True)
parser.add_argument("--typhon-poster", type=Path, required=True)
parser.add_argument("--thunder-poster", type=Path, required=True)
parser.add_argument("--posters", type=Path, help="Optional directory for finished 1600x600 posters")
args = parser.parse_args()
output = Path(__file__).resolve().parents[1] / "web/assets/images/competitions"

for name in ("typhon", "thunder"):
    source, = (args.art / name).rglob("result_images_0_url.png")
    with Image.open(source) as original:
        art = original.convert("RGB")
        art.thumbnail((1600, 600), Image.Resampling.LANCZOS)
        banner = Image.new("RGB", (1600, 600), art.getpixel((0, 0)))
        banner.paste(art, (1600 - art.width, (600 - art.height) // 2))
        banner.save(output / f"{name}-banner.webp", quality=90, method=6)
        if args.posters:
            args.posters.mkdir(parents=True, exist_ok=True)
            draw = ImageDraw.Draw(banner)
            font = lambda size: ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", size)
            title, lines = {
                "typhon": ("提丰杯", ["第一届 RP卡创作大奖赛", "4万+饼干奖池", "2100元京东E卡", "2027年1月31日 23:59 截稿"]),
                "thunder": ("雷霆杯", ["RP角色卡创作赛", "过审33饼干", "热度达标累计387饼干", "2027年2月2日 24:00 截稿"])
            }[name]
            for text, y, size in [(lines[0], 55, 30), (title, 112, 100),
                                  (lines[1], 274, 46), (lines[2], 345, 34), (lines[3], 490, 28)]:
                draw.text((64, y), text, font=font(size), fill="#fff8ed")
            banner.save(args.posters / f"{title}-横版海报.png")
    with Image.open(getattr(args, name + "_poster")) as original:
        poster = original.convert("RGB")
        poster.thumbnail((1400, 2400), Image.Resampling.LANCZOS)
        poster.save(output / f"{name}.webp", quality=88, method=6)
