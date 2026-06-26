import Foundation

/// Single source of environment/config for the CitiGrove app. Mirrors Grovli's
/// pattern but with all identity extracted here (no hardcoded literals scattered
/// across the app). Values marked PLACEHOLDER are provisioned before TestFlight.
enum AppConfig {
    // MARK: Auth0 (same tenant as Grovli; a NEW native client for CitiGrove)
    static let auth0Domain = "dev-rw8ff6vxgb7t0i4c.us.auth0.com"
    static let auth0ClientId = "CITIGROVE_AUTH0_CLIENT_ID" // PLACEHOLDER — provision a native client
    static let auth0Audience = "https://grovli.citigrove.com/audience"
    static let authCallbackScheme = "citigrove"
    static var authRedirectURI: String {
        "\(authCallbackScheme)://\(auth0Domain)/ios/com.citigrove.app/callback"
    }

    // MARK: Services
    /// citigrove-store-api — store + events. PLACEHOLDER until the Cloud Run service is deployed.
    static let storeAPIBaseURL = URL(string: "https://citigrove-store-api-uyply7jkca-uc.a.run.app")!
    /// document-api public KB — the CitiGrove Journal source (same as citigrove.com).
    static let documentAPIBaseURL = URL(string: "https://grovli-document-api-public-uyply7jkca-uc.a.run.app")!

    // MARK: Storage
    static let keychainService = "com.citigrove.app"
    static let offlineCacheDirectory = "CitiGroveOffline"
}
