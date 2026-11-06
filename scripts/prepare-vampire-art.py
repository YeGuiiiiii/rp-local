from pathlib import Path
from html import escape
import json
from PIL import Image, ImageChops, ImageFilter

root = Path(__file__).resolve().parent.parent
source = root / "artwork/vampire-night-20261106"
out = root / "web/assets/themes/vampire"
out.mkdir(parents=True, exist_ok=True)
records = []

def export(group, job, name, box, maximum):
    original = source / group / job / "ui_output.png"
    image = Image.open(original).convert("RGBA").crop(box)
    alpha = image.getchannel("A")
    core = alpha.point(lambda value: 255 if value >= 230 else 0)
    core = core.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5))
    image.putalpha(ImageChops.multiply(alpha, core))
    image = image.crop(image.getchannel("A").getbbox())
    image.thumbnail((maximum[0] - 16, maximum[1] - 16), Image.Resampling.LANCZOS)
    padded = Image.new("RGBA", (image.width + 16, image.height + 16))
    padded.paste(image, (8, 8))
    prompt = (source / ("mascot-prompt.txt" if group == "mascots" else "ornament-prompt.txt")).read_text(encoding="utf-8")
    xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
           '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description>' +
           escape(prompt) + '</dc:description></rdf:Description></rdf:RDF></x:xmpmeta>').encode()
    padded.save(out / (name + ".webp"), quality=94, method=6, xmp=xmp)
    bounds = padded.getchannel("A").getbbox()
    assert min(bounds[0], bounds[1], padded.width - bounds[2], padded.height - bounds[3]) >= 8
    records.append({"name": name, "source": str(original), "box": box, "size": padded.size, "contentBox": bounds})

for name, box in [
    ("welcome", (222, 23, 1001, 538)),
    ("writing", (1088, 22, 1864, 556)),
    ("album", (242, 546, 991, 1061)),
    ("workshop", (1076, 560, 1858, 1048)),
    ("peek", (277, 1112, 990, 1520)),
    ("confused", (1138, 1048, 1865, 1528)),
]:
    export("mascots", "job_66c3096b35ee45fe824dc0755a219e35", name, box, (440, 320))
for name, box, maximum in [
    ("brooch", (117, 99, 754, 748), (192, 192)),
    ("ribbon", (832, 270, 1995, 663), (480, 180)),
    ("seal", (1213, 780, 1815, 1382), (128, 128)),
]:
    export("ornaments", "job_e4fcf0970a324d25ad3057c00816f333", name, box, maximum)
(root / "verification/vampire-art.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
print("Prepared", len(records), "vampire assets with transparent padding and embedded prompts.")
