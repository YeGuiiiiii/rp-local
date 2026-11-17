from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("check-release.py")


class ReleasePreflightTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.git("init", "-b", "main")
        self.git("config", "user.name", "Release test")
        self.git("config", "user.email", "release-test@example.invalid")
        self.write(".github/workflows/android-release.yml", "manual release policy\n")
        self.write("scripts/check-release.py", "release policy\n")
        self.write("dist/RELEASE-2.9.134.md", "Release notes\n")
        self.write("dist/SHA256SUMS-2.9.134.txt", "a" * 64 + "  RP-local-2.9.134.apk\n")
        self.commit()
        self.git("tag", "v2.9.134")
        self.git("update-ref", "refs/remotes/origin/main", "HEAD")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True, capture_output=True, text=True)

    def write(self, name, content):
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def commit(self):
        self.git("add", ".")
        self.git("commit", "-m", "Release fixture")

    def check(self, version="2.9.134", *options):
        return subprocess.run([sys.executable, str(SCRIPT), version, *options], cwd=self.root,
                              capture_output=True, text=True)

    def test_prepared_mainline_tag_can_be_released(self):
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_tag_missing_current_release_policy_is_rejected(self):
        self.write(".github/workflows/android-release.yml", "new manual release policy\n")
        self.commit()
        self.git("update-ref", "refs/remotes/origin/main", "HEAD")
        self.assertNotEqual(self.check().returncode, 0)

    def test_tag_not_merged_into_main_is_rejected(self):
        self.write("feature.txt", "Unmerged feature\n")
        self.commit()
        self.git("tag", "-f", "v2.9.134")
        self.assertNotEqual(self.check().returncode, 0)

    def test_checksum_for_a_different_package_is_rejected(self):
        self.write("dist/SHA256SUMS-2.9.134.txt", "a" * 64 + "  RP-local-2.9.117.apk\n")
        self.commit()
        self.git("tag", "-f", "v2.9.134")
        self.git("update-ref", "refs/remotes/origin/main", "HEAD")
        self.assertNotEqual(self.check().returncode, 0)

    def test_invalid_version_is_rejected(self):
        self.assertNotEqual(self.check("../2.9.134").returncode, 0)

    def test_older_than_current_stable_is_rejected(self):
        self.assertNotEqual(self.check("2.9.134", "--latest", "v2.9.135").returncode, 0)


if __name__ == "__main__":
    unittest.main()
