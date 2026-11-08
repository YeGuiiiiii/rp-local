import UIKit
import WebKit
import SafariServices
import CryptoKit
import os

final class RPViewController: UIViewController, WKUIDelegate, WKNavigationDelegate,
                              WKURLSchemeHandler, WKScriptMessageHandler {
    private let origin = URL(string: "rplocal://localhost/RP-Hub/")!
    private let files = LocalFiles(root: FileManager.default.urls(for: .applicationSupportDirectory,
                                                                in: .userDomainMask)[0].appendingPathComponent("RPData"))
    private let network = NetworkBridge()
    private var web: WKWebView!
    private var backups: [String: (url: URL, stream: FileHandle, share: Bool)] = [:]
    private var backupRoot: URL { files.root.appendingPathComponent("Backups") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.setURLSchemeHandler(self, forURLScheme: "rplocal")
        config.userContentController.add(self, name: "rpNetwork")
        config.userContentController.add(self, name: "rpLog")
        // 把网页里的报错转到系统日志（Console.app 里按 com.rphub.local 过滤），便于排查白屏等问题。
        config.userContentController.addUserScript(WKUserScript(source: Self.errorReporter, injectionTime: .atDocumentStart,
                                                               forMainFrameOnly: true))
        guard let script = Bundle.main.url(forResource: "ios-bridge", withExtension: "js"),
              let source = try? String(contentsOf: script, encoding: .utf8) else {
            fatalError("Missing ios-bridge.js")
        }
        config.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart,
                                                               forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: config)
        if #available(iOS 16.4, macCatalyst 16.4, *) { web.isInspectable = true }
        web.uiDelegate = self
        web.navigationDelegate = self
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        network.receive = { [weak self] message in
            guard let self = self, let data = try? JSONSerialization.data(withJSONObject: message),
                  let json = String(data: data, encoding: .utf8) else { return }
            self.web.evaluateJavaScript("window.__rpReceiveNetwork(\(json))", completionHandler: nil)
        }
        web.load(URLRequest(url: origin))
    }

    private static let log = Logger(subsystem: "com.rphub.local", category: "web")
    private static let errorReporter = """
    (function () {
        const handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rpLog;
        if (!handler) return;
        const send = (kind, msg) => { try { handler.postMessage({ kind, msg: String(msg).slice(0, 2000) }); } catch (e) {} };
        addEventListener('error', e => send('error', (e.message || 'resource failed') + ' @ ' +
            (e.filename || (e.target && (e.target.src || e.target.href)) || '') + ':' + (e.lineno || 0)), true);
        addEventListener('unhandledrejection', e => send('rejection', (e.reason && (e.reason.stack || e.reason)) || ''));
        const original = console.error;
        console.error = function (...args) { send('console', args.map(String).join(' ')); return original.apply(console, args); };
        addEventListener('load', () => send('load', 'page loaded'));
    })();
    """

    private func trusted(_ frame: WKFrameInfo) -> Bool {
        frame.isMainFrame && frame.request.url?.scheme == origin.scheme &&
            frame.request.url?.host == origin.host && frame.request.url?.path.hasPrefix("/RP-Hub/") == true
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard trusted(message.frameInfo), let body = message.body as? [String: Any] else { return }
        if message.name == "rpLog" {
            let kind = body["kind"] as? String ?? "log", text = body["msg"] as? String ?? ""
            Self.log.error("web \(kind, privacy: .public): \(text, privacy: .public)")
            return
        }
        network.handle(body)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        if prompt == "__RP_IOS__" {
            guard trusted(frame) else { completionHandler(nil); return }
            do {
                let data = Data((defaultText ?? "").utf8)
                guard let request = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let method = request["method"] as? String else { throw RPError.message("Invalid bridge request") }
                let args = request["args"] as? [Any] ?? []
                let value: Any
                switch request["scope"] as? String {
                case "files": value = try files.call(method, args)
                case "app": value = try appCall(method, args)
                case "crypto":
                    guard method == "sha256", let bytes = args.first as? [UInt8] else {
                        throw RPError.message("Invalid digest request")
                    }
                    value = SHA256.hash(data: Data(bytes)).map { String(format: "%02x", $0) }.joined()
                default: throw RPError.message("Unknown bridge scope")
                }
                completionHandler(json(["ok": true, "value": value]))
            } catch { completionHandler(json(["ok": false, "error": error.localizedDescription])) }
            return
        }
        let alert = UIAlertController(title: prompt, message: nil, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.targetFrame?.isMainFrame == false { decisionHandler(.allow); return }
        if url.scheme == origin.scheme && url.host == origin.host && url.path.hasPrefix("/RP-Hub/") {
            network.cancelAll()
            for token in Array(backups.keys) { _ = try? appCall("abortBackupWrite", [token]) }
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            openExternal(url)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { openExternal(url) }
        return nil
    }

    private func openExternal(_ url: URL) {
        guard ["http", "https"].contains(url.scheme?.lowercased() ?? "") else { return }
        #if targetEnvironment(macCatalyst)
        // Mac 上没有应用内网页窗口，交给系统默认浏览器。
        UIApplication.shared.open(url)
        #else
        if presentedViewController == nil { present(SFSafariViewController(url: url), animated: true) }
        #endif
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        do {
            guard let url = urlSchemeTask.request.url, url.host == origin.host,
                  url.path.hasPrefix("/RP-Hub/") else { throw RPError.message("Invalid local URL") }
            let relative = String(url.path.dropFirst("/RP-Hub/".count))
            let file: URL
            if relative.hasPrefix("_files/") {
                let name = String(relative.dropFirst("_files/".count))
                guard name.hasPrefix("图片/"), !name.hasSuffix(".json") else { throw RPError.message("Not an image") }
                file = try files.file(name)
            } else {
                guard let root = Bundle.main.url(forResource: "site", withExtension: nil) else {
                    throw RPError.message("Missing bundled website")
                }
                file = try LocalFiles.contained(root, relative.isEmpty ? "index.html" : relative)
            }
            let data = try Data(contentsOf: file)
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                           headerFields: ["Content-Type": LocalFiles.mime(file),
                                                          "Content-Length": String(data.count)])!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch { urlSchemeTask.didFailWithError(error) }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func json(_ object: Any) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: object),
              let text = String(data: data, encoding: .utf8) else { return "{\"ok\":false,\"error\":\"JSON error\"}" }
        return text
    }

    private func share(_ url: URL) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.presentedViewController == nil else { return }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = self.view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: self.view.bounds.midX,
                                                                     y: self.view.bounds.maxY, width: 1, height: 1)
            self.present(sheet, animated: true)
        }
    }

    private func appCall(_ method: String, _ args: [Any]) throws -> Any {
        let first = args.first as? String ?? ""
        switch method {
        case "saveFile", "saveImageToGallery":
            guard args.count > 1, let name = args[1] as? String,
                  first.count <= 64 * 1024 * 1024, let data = Data(base64Encoded: first) else {
                throw RPError.message("Invalid or oversized export")
            }
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
            let url = try LocalFiles.contained(directory, name)
            try files.write(url, data)
            share(url)
            return true
        case "openLighthouse":
            guard let url = URL(string: first), ["http", "https"].contains(url.scheme ?? "") else {
                throw RPError.message("Invalid website")
            }
            DispatchQueue.main.async { self.openExternal(url) }
            return true
        case "getBackupFolder": return ""
        case "getDefaultBackupFolderPath": return backupRoot.path
        case "createBackupFile", "createBackupFileToDownloads":
            let url = try LocalFiles.contained(backupRoot, first)
            let token = UUID().uuidString
            let partial = backupRoot.appendingPathComponent("." + token)
            try files.write(partial, Data())
            backups[token] = (url, try FileHandle(forWritingTo: partial), method == "createBackupFileToDownloads")
            return "OK:" + token
        case "writeBackupChunk":
            guard let entry = backups[first], args.count > 1, let encoded = args[1] as? String,
                  let data = Data(base64Encoded: encoded) else { throw RPError.message("Invalid backup chunk") }
            try entry.stream.write(contentsOf: data)
            return "OK"
        case "finishBackupWrite":
            guard let entry = backups[first] else { throw RPError.message("Unknown backup session") }
            try entry.stream.synchronize()
            try entry.stream.close()
            let partial = backupRoot.appendingPathComponent("." + first)
            if FileManager.default.fileExists(atPath: entry.url.path) {
                _ = try FileManager.default.replaceItemAt(entry.url, withItemAt: partial)
            } else {
                try FileManager.default.moveItem(at: partial, to: entry.url)
            }
            backups.removeValue(forKey: first)
            if entry.share { share(entry.url) }
            return "OK"
        case "abortBackupWrite":
            if let entry = backups.removeValue(forKey: first) {
                try? entry.stream.close()
                try? FileManager.default.removeItem(at: backupRoot.appendingPathComponent("." + first))
            }
            return "OK"
        case "listBackupFiles":
            return json(try files.list(backupRoot).filter { !($0["directory"] as? Bool ?? false) }.map {
                ["id": $0["name"]!, "name": $0["name"]!, "size": $0["bytes"]!, "time": $0["modified"]!, "isTreeDoc": false]
            })
        case "readBackupFileText":
            return try String(contentsOf: LocalFiles.contained(backupRoot, first), encoding: .utf8)
        case "deleteBackupFile":
            try FileManager.default.removeItem(at: LocalFiles.contained(backupRoot, first))
            return true
        case "renameBackupFile":
            guard args.count > 2, let name = args[2] as? String else { throw RPError.message("Missing backup name") }
            try FileManager.default.moveItem(at: LocalFiles.contained(backupRoot, first),
                                            to: LocalFiles.contained(backupRoot, name))
            return "OK"
        default: throw RPError.message("Unsupported app operation: \(method)")
        }
    }
}
