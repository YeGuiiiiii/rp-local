from pathlib import Path
from collections import deque
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Path("C:/Users/pzh/.codex/visualizations/2026/11/04/01a1a58c-8b15-7582-8398-eb1f2dde5bac/角色表情包70种汇总/单张PNG")
out = root / "web/assets/images/mascot"
out.mkdir(parents=True, exist_ok=True)
records = []
for name, filename in {
    "welcome": "12_期待.png",
    "peek": "28_门后探头冒泡.png",
    "heart": "03_比心.png",
    "writing": "13_奋笔疾书.png",
}.items():
    file = source / filename
    image = Image.open(file).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    # Remove only white connected to the outside; retain white eyes and highlights.
    seen = set()
    queue = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        r, g, b, alpha = pixels[x, y]
        if min(r, g, b) < 238 and alpha != 0:
            continue
        pixels[x, y] = (r, g, b, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
                queue.append((nx, ny))
    image.thumbnail((320, 320), Image.Resampling.LANCZOS)
    image.save(out / (name + ".webp"), quality=90, method=6)
    records.append({"file": name + ".webp", "source": str(file), "sourceSha256": hashlib.sha256(file.read_bytes()).hexdigest()})
(root / "verification/home-mascot-sources.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
print("Prepared four existing persona stickers for the home screen.")
