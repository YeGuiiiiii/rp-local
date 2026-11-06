from pathlib import Path
from html import escape
import json
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

root = Path(__file__).resolve().parent.parent
source_root = root / "artwork/mascot-poke-20261106"
source = next((source_root / "generated").glob("*/*.png"))
sheet = Image.open(source).convert("RGBA")
prompt = (source_root / "prompt.txt").read_text(encoding="utf-8")
xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
       '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description>' +
       escape(prompt) + '</dc:description></rdf:Description></rdf:RDF></x:xmpmeta>').encode()
records = []
for row, folder in enumerate(("images/chenyue", "themes/vampire")):
    for column, emotion in enumerate(("pout", "angry", "happy")):
        bounds = (round(column * sheet.width / 3), row * 384,
                  round((column + 1) * sheet.width / 3), (row + 1) * 384)
        image = sheet.crop(bounds)
        alpha = np.array(image.getchannel("A"))
        image.putalpha(Image.fromarray(np.where(binary_dilation(alpha >= 220, iterations=2), alpha, 0).astype("uint8")))
        image = image.crop(image.getchannel("A").getbbox())
        image.thumbnail((352, 304), Image.Resampling.LANCZOS)
        padded = Image.new("RGBA", (image.width + 16, image.height + 16))
        padded.alpha_composite(image, (8, 8))
        output = root / "web/assets" / folder / ("poke-" + emotion + ".webp")
        padded.save(output, quality=94, method=6, xmp=xmp)
        records.append({"file": str(output.relative_to(root)), "size": padded.size, "transparentPadding": 8})
(root / "verification/mascot-poke-art-1.14.json").write_text(
    json.dumps({"job": "job_bdd9616eed03420b80bfc4a0aef00219", "source": str(source.relative_to(root)),
                "assets": records}, indent=2), encoding="utf-8")
print(json.dumps(records))
