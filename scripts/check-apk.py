import hashlib
import argparse
import io
import json
from pathlib import Path
from zipfile import ZipFile

from loguru import logger
from PIL import Image

logger.remove()
from androguard.core.apk import APK
from androguard.core.dex import DEX

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("--version", default="2.9.017")
version = parser.parse_args().version
file = root / "dist" / f"RP-local-{version}.apk"
apk = APK(str(file))
assert apk.get_package() == "com.rphub.local"
assert apk.get_main_activity() == "com.rphub.app.MainActivity"
assert apk.get_androidversion_name() == (version if int(version.split('.')[0]) >= 1 else f"2.8.80-local.{version.split('.')[-1]}")
assert apk.is_signed_v2() and apk.is_signed_v3()
previous = APK(str(root / "dist" / "RP-local-0.1.apk"))
assert apk.get_certificates_der_v2() == previous.get_certificates_der_v2()
assert int(apk.get_androidversion_code()) > int(previous.get_androidversion_code())
classes = {cls.get_name(): cls for dex in apk.get_all_dex() for cls in DEX(dex).get_classes()}
assert "Lcom/rphub/app/LocalAssets;" in classes
assert "Lcom/rphub/app/LocalFiles;" in classes
assert "Lcom/rphub/app/LocalPaths;" in classes
assert "Lcom/rphub/app/OnlineReturn;" in classes
if tuple(map(int, version.split('.'))) >= (1, 4):
    local_methods = {method.get_name() for method in classes["Lcom/rphub/app/LocalFiles;"].get_methods()}
    assert {"writeTextIfChanged", "runtimeInfo"} <= local_methods
if tuple(map(int, version.split('.'))) >= (1, 22):
    assert "prepareBackupFileRead" in local_methods
    assert "Lcom/rphub/app/RenderRecovery;" in classes
    reader = next(method for method in classes["Lcom/rphub/app/LocalFiles;"].get_methods()
                  if method.get_name() == "backupResponse")
    reader_code = "\n".join(instruction.get_output() for instruction in reader.get_instructions())
    assert "->openInputStream(" in reader_code
    assert "->readAllBytes(" not in reader_code
if tuple(map(int, version.split('.'))) >= (1, 23):
    assert "Lcom/rphub/app/WebViewSupport;" in classes
    bridge = classes["Lcom/rphub/app/MainActivity$6;"]
    assert any(method.get_name() == "copyText" for method in bridge.get_methods())
    startup = next(method for method in classes["Lcom/rphub/app/MainActivity;"].get_methods()
                   if method.get_name() == "onCreate")
    assert "WebViewSupport;->loadEntry" in "\n".join(i.get_output() for i in startup.get_instructions())
activity = classes["Lcom/rphub/app/MainActivity;"]
if (2, 9, 8) <= tuple(map(int, version.split("."))) < (2, 9, 12):
    darkening = list(next(method for method in activity.get_methods()
                          if method.get_name() == "applyForceDark").get_instructions())
    for index, instruction in enumerate(darkening):
        if not any(name in instruction.get_output()
                   for name in ("->setAlgorithmicDarkeningAllowed(", "->setForceDark(")):
            continue
        argument = instruction.get_operands()[-2][1]
        assigned = next(previous for previous in reversed(darkening[:index])
                        if previous.get_name().startswith("const")
                        and previous.get_operands()[0][1] == argument)
        assert assigned.get_operands()[1][1] == 0, "WebView must not recolor card-authored text or backgrounds"
if tuple(map(int, version.split("."))) >= (2, 9, 12):
    card_night = classes["Lcom/rphub/app/CardNight;"]
    assert {"install", "setEnabled", "apply"} <= {method.get_name() for method in card_night.get_methods()}
    instructions = "\n".join(i.get_output() for method in card_night.get_methods() for i in method.get_instructions())
    assert "RPHubCardTheme" in instructions and "->runOnUiThread(" in instructions
    assert "->setAlgorithmicDarkeningAllowed(" in instructions and "->setForceDark(" in instructions
    startup = next(method for method in activity.get_methods() if method.get_name() == "onCreate")
    assert "CardNight;->install" in "\n".join(i.get_output() for i in startup.get_instructions())
if tuple(map(int, version.split('.'))) >= (1, 13):
    back = next(method for method in activity.get_methods() if method.get_name() == "handleBackPressed")
    back_code = "\n".join(instruction.get_output() for instruction in back.get_instructions())
    assert "window.rphubHandleBack() === true" in back_code
    assert "->canGoBack" not in back_code and "->finish" not in back_code
    back_callback = classes["Lcom/rphub/app/MainActivity$25;"]
    callback_code = "\n".join(instruction.get_output() for method in back_callback.get_methods()
                              if method.get_descriptor() == "(Ljava/lang/String;)V"
                              for instruction in method.get_instructions())
    assert "->equals(" in callback_code and "->startsWith(" not in callback_code
    assert callback_code.count("->access$46") == 2
    key_back = next(method for method in activity.get_methods() if method.get_name() == "onKeyDown")
    assert any("->getRepeatCount" in instruction.get_output() for instruction in key_back.get_instructions())
if tuple(map(int, version.split('.'))) >= (1, 6):
    for class_name, method_name, directory in [
        ("Lcom/rphub/app/MainActivity$6;", "openDownloadsWriteTarget", "数据备份"),
        ("Lcom/rphub/app/MainActivity;", "writeBase64ToDownloads", "导出文件"),
    ]:
        method = next(method for method in classes[class_name].get_methods() if method.get_name() == method_name)
        strings = [str(operand[-1]) for instruction in method.get_instructions()
                   if instruction.get_name().startswith("const-string") for operand in instruction.get_operands()]
        assert strings.count("Download/RP本地版/" + directory) == 2, (method_name, strings)
show_lighthouse = next(method for method in activity.get_methods() if method.get_name() == "showLighthouseLayer")
assert "OnlineReturn;->attach" in "\n".join(i.get_output() for i in show_lighthouse.get_instructions())
return_listener = classes["Lcom/rphub/app/MainActivity$OnlineReturn;"]
assert any("access$44" in i.get_output() for method in return_listener.get_methods()
           if method.get_name() == "onClick" for i in method.get_instructions())
older_packages = []
for candidate in (root / "dist").glob("RP-local-*.apk"):
    parts = candidate.stem.removeprefix("RP-local-").split(".")
    if all(part.isdigit() for part in parts):
        number = tuple(map(int, parts))
        if number < tuple(map(int, version.split("."))):
            older_packages.append((number, candidate))
previous_local = APK(str(max(older_packages, key=lambda item: item[0])[1]))
assert int(apk.get_androidversion_code()) > int(previous_local.get_androidversion_code())
assert any(method.get_name() == "readImage" for method in classes["Lcom/rphub/app/LocalFiles;"].get_methods())
client = classes["Lcom/rphub/app/MainActivity$7;"]
for method in client.get_methods():
    if method.get_name() in {"onPageStarted", "onPageFinished"}:
        assert not any("access$2" in i.get_output() or "access$3" in i.get_output()
                       for i in method.get_instructions()), "Old script injection still active"
engine = classes["Lcom/rphub/app/PatchEngine;"]
intercept = next(method for method in engine.get_methods() if method.get_name() == "intercept")
assert "LocalAssets;->intercept" in "\n".join(i.get_output() for i in intercept.get_instructions())
for class_name, method_name in [
    ("Lcom/rphub/app/OfficialUpdateWatcher;", "checkOnColdStart"),
    ("Lcom/rphub/app/PatchEngine;", "scheduleRefresh"),
]:
    method = next(method for method in classes[class_name].get_methods() if method.get_name() == method_name)
    assert [instruction.get_name() for instruction in method.get_instructions()] == ["return-void"]
checked = 0
with ZipFile(file) as archive:
    assert 'assets/patch-manifest.json' not in archive.namelist()
    assert 'assets/local-site/assets/js/update-check.js' not in archive.namelist()
    assert not any(name.startswith('assets/patch-seed/') for name in archive.namelist())
    assert not any(name.endswith((".woff", ".woff2", ".ttf", ".otf", ".original", ".map")) for name in archive.namelist())
    assert not any(name.startswith('assets/assets/vendor/') for name in archive.namelist())
    assert not any(name.startswith('assets/') and name.endswith('.js') and not name.startswith('assets/local-site/') for name in archive.namelist())
    for source in (root / "web").rglob("*"):
        if not source.is_file():
            continue
        name = "assets/local-site/" + source.relative_to(root / "web").as_posix()
        assert archive.read(name) == source.read_bytes(), name
        checked += 1
    for density in ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]:
        name = f"res/mipmap-{density}-v4/ic_launcher.png"
        actual = Image.open(io.BytesIO(archive.read(name))).convert("RGBA")
        expected = Image.open(root / "android" / name).convert("RGBA")
        assert actual.size == expected.size and actual.tobytes() == expected.tobytes()
    assert not any(".signing/" in name or ".p12" in name for name in archive.namelist())
    for name in archive.namelist():
        if name.startswith("assets/local-site/") and name.endswith((".html",".js")):
            data=archive.read(name)
            assert b"UpdateNotificationModal" not in data and "网站公告".encode() not in data, name
    asset_hashes = {}
    for name in archive.namelist():
        if name.startswith("assets/") and not name.endswith("/"):
            digest = hashlib.sha256(archive.read(name)).hexdigest()
            assert digest not in asset_hashes, f"Duplicate assets: {name}, {asset_hashes.get(digest)}"
            asset_hashes[digest] = name
report = {
    "package": apk.get_package(),
    "mainActivity": apk.get_main_activity(),
    "version": apk.get_androidversion_name(),
    "webFilesVerified": checked,
    "iconSizesVerified": 5,
    "signatureSchemesPresent": ["v2", "v3"],
    "sameSigningCertificateAs01": True,
    "nativeLighthouseReturnWired": True,
    "cardRecoloring": "per-card night preference" if tuple(map(int, version.split("."))) >= (2, 9, 12) else "original",
    "bundledFonts": 0,
    "duplicateAssets": 0,
    "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
    "bytes": file.stat().st_size,
}
(root / "verification" / "apk.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
