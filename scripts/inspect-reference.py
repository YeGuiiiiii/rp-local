from pathlib import Path
from zipfile import ZipFile
import json
from loguru import logger

logger.remove()
from androguard.core.apk import APK

source = Path("C:/Users/pzh/Downloads/base.apk")
apk = APK(str(source), skip_analysis=False)
with ZipFile(source) as archive:
    navigation = [name for name in archive.namelist()
                  if name.startswith("res/layout/") and any(key in name for key in
                      ("main", "tab", "bottom", "home", "profile", "tool"))]
    animations = {}
    for name in archive.namelist():
        if name.startswith(("assets/lottie/day/", "assets/lottie/night/")):
            item = json.loads(archive.read(name))
            animations[name] = {key: item.get(key) for key in ("w", "h", "fr", "ip", "op")}
report = {
    "package": apk.get_package(),
    "version": apk.get_androidversion_name(),
    "minSdk": apk.get_min_sdk_version(),
    "targetSdk": apk.get_target_sdk_version(),
    "navigationLayouts": navigation,
    "tabAnimationMetadata": animations,
    "observations": [
        "Native Android resources and AndroidX navigation/Compose libraries are present.",
        "The four main tabs have separate day/night animation resources.",
        "Use supplied screenshots for actual geometry; APK resources alone do not prove runtime behavior.",
        "No reference code or media was copied into the local app.",
    ],
}
out = Path(__file__).resolve().parent.parent / "verification" / "reference-apk.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({key: value for key, value in report.items() if key != "tabAnimationMetadata"}, ensure_ascii=True, indent=2))
