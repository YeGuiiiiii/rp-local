import hashlib
import importlib.util
import io
import itertools
from contextlib import contextmanager, redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("rp_update_sync", Path(__file__).with_name("sync.py"))


@contextmanager
def release_server(responses):
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            status, body, size = responses[min(len(requests), len(responses) - 1)]
            requests.append(self.path)
            self.send_response(status)
            self.send_header("Content-Length", str(size))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    with ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}/release.apk", requests
        finally:
            server.shutdown()
            thread.join()


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.sync = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(self.sync)

    def test_transient_http_failure_retries_and_reports_received_bytes(self):
        output = io.StringIO()
        with release_server([(503, b"", 0), (200, b"verified-apk", 12)]) as (url, requests), \
                patch("time.sleep"), redirect_stdout(output):
            self.assertEqual(self.sync.fetch(url, True), b"verified-apk")
        self.assertEqual(len(requests), 2)
        self.assertRegex(output.getvalue(), r"12/12 bytes")

    def test_failed_download_stops_after_three_attempts(self):
        with release_server([(503, b"", 0)]) as (url, requests), patch("time.sleep"):
            with self.assertRaises(HTTPError):
                self.sync.fetch(url, True)
        self.assertEqual(len(requests), 3)

    def test_missing_asset_is_not_retried(self):
        with release_server([(404, b"", 0)]) as (url, requests), patch("time.sleep"):
            with self.assertRaises(HTTPError):
                self.sync.fetch(url, True)
        self.assertEqual(len(requests), 1)

    def test_incomplete_attempt_is_discarded_before_retry(self):
        with release_server([(200, b"bad", 12), (200, b"verified-apk", 12)]) as (url, requests), \
                patch("time.sleep"):
            self.assertEqual(self.sync.fetch(url, True), b"verified-apk")
        self.assertEqual(len(requests), 2)

    def test_slow_transfer_has_a_total_deadline(self):
        sync = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(sync)

        class SlowResponse:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return b"chunk"

        with patch.object(sync, "urlopen", return_value=SlowResponse()), \
                patch("time.monotonic", side_effect=[0, 3601]):
            with self.assertRaises(TimeoutError):
                sync.fetch("https://example.com/release.apk", True)

    def test_slow_release_download_can_finish_after_ten_minutes(self):
        sync = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(sync)
        chunks = iter([b"verified-apk", b""])

        class SlowResponse:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): return next(chunks)

        with patch.object(sync, "urlopen", return_value=SlowResponse()), \
                patch("time.monotonic", side_effect=itertools.chain([0, 601], itertools.repeat(602))):
            self.assertEqual(sync.fetch("https://example.com/release.apk", True), b"verified-apk")

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
            def failed_download(asset):
                if asset["url"] == "apk":
                    raise TimeoutError("Network unavailable")
                return downloads[asset["url"]]
            with self.assertRaises(TimeoutError):
                sync.publish(release, root, "https://121.40.147.125", failed_download, lambda _: 291)
            self.assertEqual((root / "latest.json").read_bytes(), original)
            self.assertEqual((root / "RP-local-2.9.027.apk").read_bytes(), data)
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
