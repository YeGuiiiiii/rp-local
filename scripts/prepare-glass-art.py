from pathlib import Path
from html import escape
import json
import numpy as np
from scipy import ndimage
from PIL import Image

root = Path(__file__).resolve().parent.parent
source_root = root / "artwork/glass-ui-20261106"
source = next((source_root / "sheet").glob("*/ui_output.png"))
image = Image.open(source).convert("RGBA")
alpha = np.array(image.getchannel("A"))
labels, count = ndimage.label(alpha >= 230)
sizes = np.bincount(labels.ravel())
centers = [
    ("corner-upper", 300, 430, 192), ("corner-lower", 800, 450, 192),
    ("clasp", 1230, 450, 144), ("divider", 1740, 430, 320),
    ("nav-characters", 280, 1110, 144), ("nav-album", 810, 1110, 144),
    ("nav-advanced", 1320, 1110, 144), ("nav-settings", 1800, 1110, 144),
]
masks = [np.zeros(alpha.shape, dtype=bool) for _ in centers]
for label in range(1, count + 1):
    if sizes[label] < 40:
        continue
    y, x = ndimage.center_of_mass(alpha, labels, label)
    index = min(range(len(centers)), key=lambda i: (centers[i][1] - x) ** 2 + (centers[i][2] - y) ** 2)
    masks[index] |= labels == label

prompt = (source_root / "prompt.txt").read_text(encoding="utf-8")
xmp = ('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
       '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:description>' +
       escape(prompt) + '</dc:description></rdf:Description></rdf:RDF></x:xmpmeta>').encode()
output = root / "web/assets/themes/vampire"
records = []
for (name, _, _, maximum), mask in zip(centers, masks):
    mask = ndimage.binary_dilation(mask, iterations=2)
    crop = image.copy()
    crop.putalpha(Image.fromarray(np.where(mask, alpha, 0).astype("uint8")))
    bounds = crop.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Missing artwork: " + name)
    crop = crop.crop(bounds)
    crop.thumbnail((maximum - 16, maximum - 16), Image.Resampling.LANCZOS)
    padded = Image.new("RGBA", (crop.width + 16, crop.height + 16))
    padded.alpha_composite(crop, (8, 8))
    padded.save(output / (name + ".webp"), quality=94, method=6, xmp=xmp)
    records.append({"name": name, "size": padded.size, "sourceBounds": bounds})
(root / "verification/glass-art-1.09.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
print("Prepared", len(records), "coordinated assets with preserved contours and padding.")
