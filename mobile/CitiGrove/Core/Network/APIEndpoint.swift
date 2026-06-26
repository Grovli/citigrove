import Foundation

/// A value-type API request. Endpoints are declared as static factories in
/// extensions, grown per feature (kept empty-ish on purpose — none of Grovli's
/// 3000-line endpoint catalog).
struct APIEndpoint {
    enum Method: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case delete = "DELETE"
    }

    let url: URL
    var method: Method = .get
    var headers: [String: String] = [:]
    var body: Data? = nil
    var authenticated: Bool = false
}

extension APIEndpoint {
    /// CitiGrove Journal index (public document-api — same KB as citigrove.com).
    static func journalIndex(limit: Int = 50) -> APIEndpoint {
        var components = URLComponents(
            url: AppConfig.documentAPIBaseURL.appendingPathComponent("public/categories/blog"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "limit", value: String(limit))]
        return APIEndpoint(url: components?.url ?? AppConfig.documentAPIBaseURL)
    }

    /// One Journal post by slug.
    static func journalPost(slug: String) -> APIEndpoint {
        APIEndpoint(url: AppConfig.documentAPIBaseURL.appendingPathComponent("public/documents/\(slug)"))
    }

    /// Store catalog (citigrove-store-api).
    static func storeProducts() -> APIEndpoint {
        APIEndpoint(url: AppConfig.storeAPIBaseURL.appendingPathComponent("store/products"))
    }

    /// Nearby events.
    static func eventsNearby(lat: Double, lng: Double, radiusMeters: Int) -> APIEndpoint {
        var components = URLComponents(
            url: AppConfig.storeAPIBaseURL.appendingPathComponent("events/nearby"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
            URLQueryItem(name: "radius_m", value: String(radiusMeters)),
        ]
        return APIEndpoint(url: components?.url ?? AppConfig.storeAPIBaseURL)
    }

    // MARK: Checkout (authenticated)

    static func storeQuote(body: Data) -> APIEndpoint {
        APIEndpoint(
            url: AppConfig.storeAPIBaseURL.appendingPathComponent("store/quote"),
            method: .post, body: body, authenticated: true
        )
    }

    static func storeCreateOrder(body: Data) -> APIEndpoint {
        APIEndpoint(
            url: AppConfig.storeAPIBaseURL.appendingPathComponent("store/orders"),
            method: .post, body: body, authenticated: true
        )
    }

    static func storeSettleApplePay(orderId: String, body: Data) -> APIEndpoint {
        APIEndpoint(
            url: AppConfig.storeAPIBaseURL.appendingPathComponent("store/orders/\(orderId)/settle-apple-pay"),
            method: .post, body: body, authenticated: true
        )
    }

    static func eventRSVP(eventId: String, joining: Bool) -> APIEndpoint {
        APIEndpoint(
            url: AppConfig.storeAPIBaseURL.appendingPathComponent("events/\(eventId)/rsvp"),
            method: joining ? .post : .delete, authenticated: true
        )
    }
}
