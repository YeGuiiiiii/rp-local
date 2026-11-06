from pathlib import Path
from html import escape
import json
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation

root = Path(__file__).resolve().parent.parent
source_root = root / "artwork/announcement-20261106"
source = next((source_root / "generated").glob("*/*.png"))
image = Image.open(source).convert("RGBA")
alpha = np.array(image.getchannel("A"))
# Keep the painted outline and antialiasing while removing the generated outer glow.
mask = binary_dilation(alpha >= 220, iterations=3)
image.putalpha(Image.fromarray(np.where(mask, alpha, 0).astype("uint8")))
bounds = image.getchannel("A").getbbox()
image = image.crop(bounds)
image.thumbnail((432, 496), Image.Resampling.LANCZOS)
padded = Image.new("RGBA", (image.width + 16, image.height + 16))
padded.alpha_composite(image, (8, 8))
prompt = (source_root / "prompt.txt").read_text(encoding="utf-8")
xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
       '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description>' +
       escape(prompt) + '</dc:description></rdf:Description></rdf:RDF></x:xmpmeta>').encode()
output = root / "web/assets/images/announcements"
output.mkdir(parents=True, exist_ok=True)
padded.save(output / "secretary.webp", quality=94, method=6, xmp=xmp)
report = {"source": str(source.relative_to(root)), "sourceSize": [768, 1024],
          "sourceBounds": bounds, "outputSize": padded.size, "transparentPadding": 8,
          "job": "job_6f358516420042f38cb020b851879867"}
(root / "verification/announcement-art-1.10.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report))
