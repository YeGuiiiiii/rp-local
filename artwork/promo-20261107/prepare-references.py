from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
day = next((root / "artwork/chenyue-right-wrist-20261106").glob("*/edited.png"))
night = root / "artwork/vampire-night-20261106/mascots/job_66c3096b35ee45fe824dc0755a219e35/ui_output.png"
Image.open(day).crop((180, 0, 1000, 500)).save(out / "day-reference.png")
Image.open(night).crop((195, 0, 1020, 550)).save(out / "night-reference.png")
print("Prepared two single-character references.")
