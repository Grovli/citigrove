import Foundation

struct SSEEvent: Sendable {
    let id: String?
    let event: String?
    let data: String
}

/// Server-Sent-Events client built on `URLSessionDataDelegate.didReceive(data:)`
/// — NOT `URLSession.bytes(for:).lines`, which buffers HTTP/2 frames and breaks
/// real-time streaming (the hard-won Grovli lesson, carried forward). Parses
/// blank-line-delimited frames and yields them on an AsyncStream. Used for live
/// order tracking (Phase 2).
final class SSEClient: NSObject, @unchecked Sendable {
    private var session: URLSession?
    private var task: URLSessionDataTask?
    private var buffer = Data()
    private var continuation: AsyncStream<SSEEvent>.Continuation?

    func connect(to url: URL, token: String? = nil) -> AsyncStream<SSEEvent> {
        AsyncStream { continuation in
            self.continuation = continuation

            var request = URLRequest(url: url)
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
            // Defeat proxy gzip buffering so frames arrive promptly.
            request.setValue("identity", forHTTPHeaderField: "Accept-Encoding")
            if let token {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            let configuration = URLSessionConfiguration.default
            configuration.timeoutIntervalForRequest = .infinity
            let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
            self.session = session
            let task = session.dataTask(with: request)
            self.task = task

            continuation.onTermination = { [weak self] _ in self?.cancel() }
            task.resume()
        }
    }

    func cancel() {
        task?.cancel()
        session?.invalidateAndCancel()
        continuation?.finish()
        continuation = nil
    }
}

extension SSEClient: URLSessionDataDelegate {
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        buffer.append(data)
        let separator = Data("\n\n".utf8)
        while let range = buffer.range(of: separator) {
            let frameData = buffer.subdata(in: buffer.startIndex..<range.lowerBound)
            buffer.removeSubrange(buffer.startIndex..<range.upperBound)
            if let frame = String(data: frameData, encoding: .utf8),
               let event = Self.parse(frame) {
                continuation?.yield(event)
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        continuation?.finish()
        continuation = nil
    }

    private static func parse(_ frame: String) -> SSEEvent? {
        var id: String?
        var event: String?
        var dataLines: [String] = []
        for rawLine in frame.split(separator: "\n", omittingEmptySubsequences: false) {
            let line = String(rawLine)
            if line.hasPrefix(":") { continue } // comment / heartbeat
            guard let colon = line.firstIndex(of: ":") else { continue }
            let field = String(line[line.startIndex..<colon])
            var value = String(line[line.index(after: colon)...])
            if value.hasPrefix(" ") { value.removeFirst() }
            switch field {
            case "id": id = value
            case "event": event = value
            case "data": dataLines.append(value)
            default: break
            }
        }
        guard !dataLines.isEmpty else { return nil }
        return SSEEvent(id: id, event: event, data: dataLines.joined(separator: "\n"))
    }
}
