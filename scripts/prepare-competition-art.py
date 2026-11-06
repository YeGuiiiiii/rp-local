import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image

root = Path(__file__).resolve().parent.parent
artwork = root / "artwork/lighthouse-events-20261106"
output = root / "web/assets/images/competitions"
output.mkdir(parents=True, exist_ok=True)
prompt = "制作一张中文角色卡创作赛事海报，竖版3:4。画面是精致奇幻插画：一册展开的魔法书前，远处浮空魔法学院、盘旋巨龙、翠绿色山谷，银白日光，深绿和金色点缀，有探索未知世界的气息。构图和留白有秩序，让中文清楚可读，不做游戏充值广告，不用霓虹炫光。大标题准确写“奇幻杯周赛”，副标题“奇幻世界观 × 创新玩法”，重点奖励“1000 饼干奖池”，补充“主办方偏爱作品另有补贴”。底部清楚写“投稿：11月6日—11月12日 23:59”“热度排名 · 每位作者限一张”“参赛标签：#奇幻杯周赛”“打工人 发起 · 灯塔查看详情”。不要添加未提供的规则、二维码或网址。每段文字只出现一次。"
sources = {
    "fantasy": (
        next(artwork.glob("*/result_images_0_url.png")),
        {"tool": "Meowa general-image-run", "job": "job_f9f294bf80c9479f803f50f97b9bf5ef", "prompt": prompt},
    ),
    "science": (
        artwork / "science-source.png",
        {"origin": "User supplied poster, codex-clipboard-b6a29dc4-8223-4ece-87d1-f723f1bcbec4.png",
         "prompt": "Sourced, not generated: original science competition poster supplied by the user. Preserve the complete artwork and its aspect ratio.",
         "source": "https://wxdt.duckdns.org/designs/before-redesign/#forum/topic/E8198ObJXB0gHgWR"},
    ),
    "fantasy-banner": (
        next((root / "artwork/lighthouse-banners-20261106/fantasy").glob("*/result_images_0_url.png")),
        {"tool": "Meowa general-image-run", "job": "job_c5ab1daac8ba4d2fa8f6761770584021",
         "prompt": "为奇幻角色卡创作周赛绘制一张横幅背景插画，无文字。横向全景：右侧是浮空魔法学院和绕过塔尖的巨龙，下方可见翻开的魔法书，整体精致而安静，以浅银绿天空、深绿树叶与少量金色为主。主体全部集中在右侧三分之一，左侧三分之二是明亮平静的浅银绿色天空，干净留白，后续会放深绿色中文标题。所有重要景物集中在画面中央水平带，图片上下裁成细长横幅也不会截掉主体。不画文字、字母、数字、徽章、框、按钮、标志、水印。"},
    ),
    "science-banner": (
        next((root / "artwork/lighthouse-banners-20261106/science").glob("*/result_images_0_url.png")),
        {"tool": "Meowa general-image-run", "job": "job_f15e31b9828f4405a354df3c526e3bb9",
         "prompt": "为科技科幻角色卡创作赛事绘制一张横幅背景插画，无文字。横向全景：右侧是清晰精致的未来城市，一艘银色飞船从空中高架桥旁驶过，远处一颗行星；科技建筑具有可信的结构细节。深青色与银白色，局部柔和青色灯光，避免刺眼霓虹和发光雾。主体全部集中在右侧三分之一，左侧三分之二是干净平静的深青色太空背景，后续会放浅银白中文标题。所有重要景物集中在画面中央水平带，图片上下裁成细长横幅也不会截掉主体。不画文字、字母、数字、徽章、框、按钮、标志、水印。"},
    ),
}
for name, (source, metadata) in sources.items():
    with Image.open(source) as image:
        resized = image.convert("RGB")
        if name.endswith("-banner"):
            height = round(resized.width * 3 / 8)
            top = (resized.height - height) // 2
            resized = resized.crop((0, top, resized.width, top + height))
            resized = resized.resize((1200, 450), Image.Resampling.LANCZOS)
        else:
            resized.thumbnail((1152, 1536), Image.Resampling.LANCZOS)
        target = output / f"{name}.webp"
        description = json.dumps(metadata, ensure_ascii=False)
        xmp = (
            '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description>'
            '<rdf:Alt><rdf:li xml:lang="x-default">' + escape(description) +
            '</rdf:li></rdf:Alt></dc:description></rdf:Description></rdf:RDF></x:xmpmeta>'
        )
        resized.save(target, quality=90, method=6, xmp=xmp.encode("utf-8"))
        target.with_suffix(".webp.json").write_text(description + "\n", encoding="utf-8")
        print(f"{target.name}: {resized.width}x{resized.height}, {target.stat().st_size} bytes")
