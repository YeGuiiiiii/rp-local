import Foundation

final class NetworkBridge: NSObject, URLSessionDataDelegate {
    var receive: (([String: Any]) -> Void)?
    private var requests: [Int: String] = [:]
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 120
        config.timeoutIntervalForResource = 1800
        return URLSession(configuration: config, delegate: self, delegateQueue: .main)
    }()

    func handle(_ message: [String: Any]) {
        if let cancel = message["cancel"] as? String {
            for (taskID, id) in requests where id == cancel {
                session.getAllTasks { tasks in
                    tasks.first(where: { $0.taskIdentifier == taskID })?.cancel()
                }
            }
            return
        }
        guard let id = message["id"] as? String else { return }
        guard let text = message["url"] as? String, let url = URL(string: text),
              ["http", "https"].contains(url.scheme?.lowercased() ?? ""),
              url.host != nil, url.user == nil, url.password == nil else {
            receive?(["id": id, "type": "error", "error": "Invalid HTTP URL"])
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = message["method"] as? String ?? "GET"
        for (name, value) in message["headers"] as? [String: String] ?? [:] {
            request.setValue(value, forHTTPHeaderField: name)
        }
        if let encoded = message["body"] as? String {
            guard let body = Data(base64Encoded: encoded) else {
                receive?(["id": id, "type": "error", "error": "Invalid request body"])
                return
            }
            request.httpBody = body
        }
        let task = session.dataTask(with: request)
        requests[task.taskIdentifier] = id
        task.resume()
    }

    func cancelAll() {
        session.getAllTasks { tasks in tasks.forEach { $0.cancel() } }
        requests.removeAll()
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let id = requests[dataTask.taskIdentifier], let http = response as? HTTPURLResponse else {
            completionHandler(.cancel)
            return
        }
        var headers: [String: String] = [:]
        for (key, value) in http.allHeaderFields {
            headers[String(describing: key).lowercased()] = String(describing: value)
        }
        // URLSession has already decompressed the body.
        headers.removeValue(forKey: "content-encoding")
        headers.removeValue(forKey: "content-length")
        receive?(["id": id, "type": "response", "status": http.statusCode, "headers": headers,
                  "url": http.url?.absoluteString ?? ""])
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let id = requests[dataTask.taskIdentifier] else { return }
        receive?(["id": id, "type": "data", "data": data.base64EncodedString()])
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let id = requests.removeValue(forKey: task.taskIdentifier) else { return }
        if let error = error {
            receive?(["id": id, "type": "error", "error": error.localizedDescription])
        } else {
            receive?(["id": id, "type": "end"])
        }
    }
}
