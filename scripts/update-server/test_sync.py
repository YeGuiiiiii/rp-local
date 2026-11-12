import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("rp_update_sync", Path(__file__).with_name("sync.py"))


class SyncTests(unittest.TestCase):
    def test_slow_transfer_has_a_total_deadline(self):
        sync = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(sync)

        class SlowResponse:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return b"chunk"

        with patch.object(sync, "urlopen", return_value=SlowResponse()), \
                patch("time.monotonic", side_effect=[0, 601]):
            with self.assertRaises(TimeoutError):
                sync.fetch("https://example.com/release.apk", True)

    def test_only_complete_verified_releases_replace_the_live_manifest(self):
        self.assertTrue(Path(SPEC.origin).exists(), "Update server sync is missing")
        sync = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(sync)
        data = b"verified-apk"
        digest = hashlib.sha256(data).hexdigest()
        release = {"tag_name": "v2.9.027", "draft": False, "prerelease": False, "body": "Notes",
                   "assets": [{"name": "RP-local-2.9.027.apk", "url": "apk", "size": len(data),
                               "digest": "sha256:" + digest},
                              {"name": "SHA256SUMS-2.9.027.txt", "url": "checksum"}]}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            downloads = {"apk": data, "checksum": (digest + "  RP-local-2.9.027.apk\n").encode()}
            manifest = sync.publish(release, root, "https://121.40.147.125",
                                    lambda asset: downloads[asset["url"]], lambda _: 291)
            self.assertEqual(manifest["versionCode"], 291)
            self.assertEqual((root / "RP-local-2.9.027.apk").read_bytes(), data)
            original = (root / "latest.json").read_bytes()
            downloads["apk"] = b"corrupted"
            with self.assertRaises(ValueError):
                sync.publish(release, root, "https://121.40.147.125",
                             lambda asset: downloads[asset["url"]], lambda _: 291)
            self.assertEqual((root / "latest.json").read_bytes(), original)
            release["prerelease"] = True
            with self.assertRaises(ValueError):
                sync.publish(release, root, "https://121.40.147.125",
                             lambda asset: downloads[asset["url"]], lambda _: 291)
            self.assertEqual((root / "latest.json").read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
