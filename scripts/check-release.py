"""Check a prepared release tag before uploading its signed APK."""

import argparse
import re
import subprocess
import sys


def git(*args):
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.STDOUT).strip()


def check(version, latest=None):
    if not re.fullmatch(r"\d+\.\d+\.\d{3}", version):
        raise ValueError("Expected a version such as 2.9.134")
    tag = "v" + version
    if latest:
        if not re.fullmatch(r"v\d+\.\d+(?:\.\d+)?", latest):
            raise ValueError("Cannot determine the current stable version")
        if tuple(map(int, version.split("."))) < tuple(map(int, latest[1:].split("."))):
            raise ValueError("Refusing to publish an older stable version")
    git("merge-base", "--is-ancestor", "refs/tags/" + tag, "origin/main")
    git("diff", "--exit-code", "origin/main", "refs/tags/" + tag, "--",
        ".github/workflows/android-release.yml", "scripts/check-release.py")
    checksum = git("show", f"{tag}:dist/SHA256SUMS-{version}.txt")
    if not re.fullmatch(r"[a-fA-F0-9]{64}\s+\*?" + re.escape(f"RP-local-{version}.apk"), checksum):
        raise ValueError("Checksum must identify exactly this version's APK")
    if not git("show", f"{tag}:dist/RELEASE-{version}.md"):
        raise ValueError("Release notes are empty")
    return tag


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version")
    parser.add_argument("--latest")
    args = parser.parse_args()
    try:
        print("Release preflight passed: " + check(args.version, args.latest))
    except (ValueError, subprocess.CalledProcessError) as error:
        print("Release preflight failed: " + str(error), file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError) and error.output:
            print(error.output, file=sys.stderr)
        sys.exit(1)
