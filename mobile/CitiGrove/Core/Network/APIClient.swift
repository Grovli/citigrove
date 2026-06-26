import Foundation

enum APIError: Error {
    case http(Int, Data?)
    case decoding(Error)
    case transport(Error)
    case unauthorized
}

/// Thin async API client. Injects a bearer token via a provider, maps status
/// codes to typed errors, decodes snake_case JSON by default.
actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private var tokenProvider: @Sendable () -> String? = { nil }

    init(session: URLSession = .shared) {
        self.session = session
    }

    func setTokenProvider(_ provider: @escaping @Sendable () -> String?) {
        tokenProvider = provider
    }

    func value<T: Decodable>(for endpoint: APIEndpoint, as type: T.Type = T.self) async throws -> T {
        let data = try await data(for: endpoint)
        do {
            return try JSONDecoder.cgSnakeCase.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    func data(for endpoint: APIEndpoint) async throws -> Data {
        var request = URLRequest(url: endpoint.url)
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        for (key, value) in endpoint.headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        if endpoint.authenticated, let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = endpoint.body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.transport(URLError(.badServerResponse))
            }
            switch http.statusCode {
            case 200..<300: return data
            case 401: throw APIError.unauthorized
            default: throw APIError.http(http.statusCode, data)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.transport(error)
        }
    }
}

extension JSONDecoder {
    static var cgSnakeCase: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}

extension JSONEncoder {
    static var cgSnakeCase: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }
}
