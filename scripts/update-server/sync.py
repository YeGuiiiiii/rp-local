"""Mirror only complete, checksummed GitHub stable releases."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.request import Request, urlopen


API = "https://api.github.com/repos/YeGuiiiiii/rp-local"


def fetch(url, binary=False):
    request = Request(url, headers={"User-Agent": "rp-local-updates",
                                   "Accept": "application/octet-stream" if binary else "application/vnd.github+json"})
    deadline = time.monotonic() + 600
    content = bytearray()
    with urlopen(request, timeout=45) as response:
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError("Release transfer exceeded ten minutes")
            chunk = response.read(65536)
            if not chunk:
                break
            content.extend(chunk)
            if len(content) > 256 * 1024 * 1024:
                raise ValueError("Release exceeds transfer limit")
    content = bytes(content)
    return content if binary else json.loads(content)


def inspect_apk(path):
    text = subprocess.check_output(["aapt", "dump", "badging", str(path)], text=True)
    package = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", text)
    if not package or package[1] != "com.rphub.local":
        raise ValueError("Release APK belongs to another application")
    return int(package[2])


def publish(release, root, origin, download, inspect):
    if release.get("draft") or release.get("prerelease") or not re.fullmatch(r"v\d+\.\d+(?:\.\d+)?", release["tag_name"]):
        raise ValueError("Only official stable releases can be published")
    root.mkdir(parents=True, exist_ok=True)
    version = release["tag_name"][1:]
    filename = "RP-local-" + version + ".apk"
    assets = {item["name"]: item for item in release["assets"]}
    apk_asset, checksum_asset = assets[filename], assets["SHA256SUMS-" + version + ".txt"]
    checksum = download(checksum_asset).decode("utf-8-sig")
    match = re.search(r"^([a-f0-9]{64})\s+\*?" + re.escape(filename) + r"\s*$", checksum, re.M)
    if not match:
        raise ValueError("Release checksum missing")
    content = download(apk_asset)
    digest = hashlib.sha256(content).hexdigest()
    if len(content) != apk_asset["size"] or digest != match[1] or apk_asset.get("digest", "sha256:" + digest) != "sha256:" + digest:
        raise ValueError("Release package failed checksum verification")
    with tempfile.NamedTemporaryFile(dir=root, suffix=".apk", delete=False) as temporary:
        stage = Path(temporary.name)
        try:
            temporary.write(content)
            temporary.flush()
            code = inspect(stage)
            previous = root / "latest.json"
            if previous.exists() and code < json.loads(previous.read_text())["versionCode"]:
                raise ValueError("Refusing to roll back published updates")
            manifest = {
                "schema": 1, "channel": "stable", "packageName": "com.rphub.local",
                "versionName": version, "versionCode": code, "size": len(content), "sha256": digest,
                "url": origin.rstrip("/") + "/updates/stable/" + filename,
                "notes": str(release.get("body") or "")[:12000],
                "publishedAt": release.get("published_at", ""),
                "checkedAt": datetime.now(timezone.utc).isoformat(),
            }
        except BaseException:
            temporary.close()
            stage.unlink(missing_ok=True)
            raise
    stage.chmod(0o644)
    stage.replace(root / filename)
    stage_manifest = root / ".latest.json.tmp"
    stage_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    stage_manifest.chmod(0o644)
    stage_manifest.replace(root / "latest.json")
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("/srv/rp-updates/updates/stable"))
    parser.add_argument("--origin", default="https://121.40.147.125")
    args = parser.parse_args()
    release = fetch(API + "/releases/latest")
    current = args.root / "latest.json"
    if current.exists() and json.loads(current.read_text())["versionName"] == release["tag_name"][1:]:
        print("Release already mirrored: " + release["tag_name"])
        return
    result = publish(release, args.root, args.origin, lambda asset: fetch(asset["url"], True), inspect_apk)
    print(json.dumps({"version": result["versionName"], "versionCode": result["versionCode"],
                      "sha256": result["sha256"]}))


if __name__ == "__main__":
    main()
