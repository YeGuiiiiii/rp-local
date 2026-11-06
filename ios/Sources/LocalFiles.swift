import Foundation
import UniformTypeIdentifiers

enum RPError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self {
        case .message(let text): return text
        }
    }
}

final class LocalFiles {
    let root: URL
    private let manager = FileManager.default

    init(root: URL) {
        self.root = root
    }

    static func contained(_ root: URL, _ relative: String) throws -> URL {
        let parts = relative.split(separator: "/", omittingEmptySubsequences: false)
        guard relative.count <= 600, !relative.contains("\\"), !relative.contains("\0"),
              !parts.contains(where: { $0.isEmpty || $0 == "." || $0 == ".." }) else {
            throw RPError.message("Invalid path")
        }
        let base = root.standardizedFileURL.resolvingSymlinksInPath()
        let target = base.appendingPathComponent(relative).standardizedFileURL.resolvingSymlinksInPath()
        guard target.path.hasPrefix(base.path + "/") else {
            throw RPError.message("Path outside storage")
        }
        return target
    }

    func file(_ relative: String) throws -> URL {
        guard ["个人数据", "角色卡数据", "图片"].contains(String(relative.split(separator: "/").first ?? "")) else {
            throw RPError.message("Invalid category")
        }
        return try Self.contained(root, relative)
    }

    static func mime(_ url: URL) -> String {
        UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
    }

    func write(_ url: URL, _ data: Data) throws {
        try manager.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url, options: .atomic)
    }

    func list(_ directory: URL) throws -> [[String: Any]] {
        guard manager.fileExists(atPath: directory.path) else { return [] }
        return try manager.contentsOfDirectory(at: directory, includingPropertiesForKeys: [
            .isDirectoryKey, .fileSizeKey, .contentModificationDateKey,
        ], options: .skipsHiddenFiles).map { url in
            let values = try url.resourceValues(forKeys: [.isDirectoryKey, .fileSizeKey, .contentModificationDateKey])
            return ["name": url.lastPathComponent, "directory": values.isDirectory ?? false,
                    "bytes": values.fileSize ?? 0,
                    "modified": (values.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000]
        }
    }

    func call(_ method: String, _ args: [Any]) throws -> Any {
        if method == "locations" {
            return ["personal": try file("个人数据").path, "characters": try file("角色卡数据").path,
                    "images": try file("图片").path]
        }
        if method == "runtimeInfo" {
            return ["packageName": Bundle.main.bundleIdentifier ?? "com.rphub.local",
                    "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
                    "webView": "Apple WKWebView"]
        }
        if method == "consumeReleaseNotice" {
            let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0"
            let key = "RPReleaseNotice"
            if UserDefaults.standard.string(forKey: key) == version { return false }
            UserDefaults.standard.set(version, forKey: key)
            return true
        }
        guard let relative = args.first as? String else { throw RPError.message("Missing path") }
        let url = try file(relative)
        switch method {
        case "readText":
            return manager.fileExists(atPath: url.path) ? try String(contentsOf: url, encoding: .utf8) : NSNull()
        case "writeText", "writeTextIfChanged":
            guard args.count > 1, let text = args[1] as? String else { throw RPError.message("Missing text") }
            if method == "writeTextIfChanged",
               manager.fileExists(atPath: url.path),
               try String(contentsOf: url, encoding: .utf8) == text { return false }
            try write(url, Data(text.utf8))
            return true
        case "writeImage":
            guard relative.hasPrefix("图片/"), Self.mime(url).hasPrefix("image/"),
                  args.count > 1, let encoded = args[1] as? String, encoded.count <= 48 * 1024 * 1024,
                  let bytes = Data(base64Encoded: encoded) else { throw RPError.message("Invalid image") }
            try write(url, bytes)
            return true
        case "readImage":
            guard relative.hasPrefix("图片/"), Self.mime(url).hasPrefix("image/") else {
                throw RPError.message("Not an image")
            }
            let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size <= 32 * 1024 * 1024 else { throw RPError.message("Image too large") }
            return ["base64": try Data(contentsOf: url).base64EncodedString(), "mime": Self.mime(url)]
        case "exists":
            var directory: ObjCBool = false
            return manager.fileExists(atPath: url.path, isDirectory: &directory) && !directory.boolValue
        case "list":
            return try list(url)
        case "remove":
            var directory: ObjCBool = false
            if manager.fileExists(atPath: url.path, isDirectory: &directory) {
                guard !directory.boolValue else { throw RPError.message("Only individual files may be removed") }
                try manager.removeItem(at: url)
            }
            return true
        default:
            throw RPError.message("Unsupported file operation: \(method)")
        }
    }
}
