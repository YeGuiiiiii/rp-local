"""Export the two reviewed Meowa illustrations to small transparent app assets."""

import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image


work = Path(__file__).resolve().parent
root = work.parents[1]
output = root / "web/assets/images/updates"
output.mkdir(parents=True, exist_ok=True)

manifests = list((work / "chibi").glob("*/final_outputs.json"))
if len(manifests) != 1:
    raise ValueError("Expected one successful Meowa chibi sheet")
manifest = json.loads(manifests[0].read_text(encoding="utf-8"))
source = Path(manifest["outputs"][0]["path"])
prompt = (work / "chibi-prompt.txt").read_text(encoding="utf-8").strip()
sheet = Image.open(source).convert("RGBA")
for index, name in enumerate(["yueyue", "honghualing"]):
    image = sheet.crop((index * sheet.width // 2, 0, (index + 1) * sheet.width // 2, sheet.height))
    if image.getchannel("A").getextrema()[0] != 0:
        raise ValueError(f"{name} needs a transparent background")
    image = image.crop(image.getbbox())
    image.thumbnail((704, 524), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (720, 540))
    canvas.alpha_composite(image, ((720 - image.width) // 2, (540 - image.height) // 2))
    metadata = {
        "subject": name,
        "source": source.relative_to(root).as_posix(),
        "generator": "Meowa",
        "jobId": manifest["job_id"],
        "prompt": prompt,
        "dimensions": [720, 540],
        "transparent": True,
    }
    xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
           '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description><rdf:Alt>'
           f'<rdf:li xml:lang="x-default">{escape(prompt)}</rdf:li></rdf:Alt></dc:description>'
           '</rdf:Description></rdf:RDF></x:xmpmeta>').encode()
    target = output / f"{name}.webp"
    canvas.save(target, quality=88, method=6, xmp=xmp)
    target.with_suffix(".webp.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    saved = Image.open(target)
    assert saved.size == (720, 540) and saved.getchannel("A").getextrema()[0] == 0
    print(f"{name}: 720x540 transparent WebP, {target.stat().st_size} bytes")
