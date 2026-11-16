"""Mirror only complete, checksummed GitHub stable releases."""

import argparse
from datetime import datetime, timezone
import hashlib
from http.client import HTTPException
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError


API = "https://api.github.com/repos/YeGuiiiiii/rp-local"


def fetch(url, binary=False):
    request = Request(url, headers={"User-Agent": "rp-local-updates",
                                   "Accept": "application/octet-stream" if binary else "application/vnd.github+json"})
    deadline = time.monotonic() + (3600 if binary else 600)
    for attempt in range(1, 4):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("Release transfer exceeded its time limit")
        print(f"Fetching {'release asset' if binary else 'metadata'}, attempt {attempt}/3", flush=True)
        content = bytearray()
        try:
            with urlopen(request, timeout=min(45, remaining)) as response:
                expected = int(getattr(response, "headers", {}).get("Content-Length", "0"))
                read = getattr(response, "read1", response.read)
                next_progress = 0
                while True:
                    now = time.monotonic()
                    if now >= deadline:
                        raise TimeoutError("Release transfer exceeded its time limit")
                    chunk = read(65536)
                    if not chunk:
                        break
                    content.extend(chunk)
                    if len(content) > 256 * 1024 * 1024:
                        raise ValueError("Release exceeds transfer limit")
                    if now >= next_progress:
                        print(f"Received {len(content)}/{expected or '?'} bytes", flush=True)
                        next_progress = now + 15
                if expected and len(content) != expected:
                    raise OSError(f"Incomplete download: {len(content)}/{expected} bytes")
        except (OSError, HTTPException) as error:
            if isinstance(error, HTTPError):
                if error.code not in (408, 429, 500, 502, 503, 504):
                    raise
                error.close()
            print(f"Transfer attempt {attempt}/3 failed: {type(error).__name__}: {error}", flush=True)
            if attempt == 3 or time.monotonic() >= deadline:
                raise
            time.sleep(attempt * 2)
            continue
        print(f"Received {len(content)}/{expected or '?'} bytes; transfer complete", flush=True)
        return bytes(content) if binary else json.loads(content)


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
    print("Checking latest GitHub stable release", flush=True)
    release = fetch(API + "/releases/latest")
    current = args.root / "latest.json"
    if current.exists() and json.loads(current.read_text())["versionName"] == release["tag_name"][1:]:
        print("Release already mirrored: " + release["tag_name"], flush=True)
        return
    def download(asset):
        print("Downloading " + asset["name"], flush=True)
        return fetch(asset["url"], True)

    result = publish(release, args.root, args.origin, download, inspect_apk)
    print(json.dumps({"version": result["versionName"], "versionCode": result["versionCode"],
                      "sha256": result["sha256"]}), flush=True)


if __name__ == "__main__":
    main()
