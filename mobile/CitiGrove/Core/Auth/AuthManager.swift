import SwiftUI
import AuthenticationServices
import CryptoKit
import UIKit

/// The signed-in user (subset of the Auth0 id-token claims).
struct CGUser: Equatable {
    let id: String
    let email: String?
    let name: String?
}

/// Auth0 PKCE sign-in (same tenant as Grovli, a dedicated CitiGrove client) via
/// `ASWebAuthenticationSession`, with tokens in the Keychain. A clean re-take of
/// the Grovli auth flow — no tier/paywall plumbing. Token refresh + Sign in with
/// Apple are layered in Phase 2 when checkout needs an authenticated principal.
@MainActor
final class AuthManager: NSObject, ObservableObject {
    enum State: Equatable {
        case signedOut
        case authenticating
        case signedIn(CGUser)
    }

    @Published private(set) var state: State = .signedOut

    var user: CGUser? {
        if case let .signedIn(user) = state { return user }
        return nil
    }
    var isAuthenticating: Bool {
        if case .authenticating = state { return true }
        return false
    }

    private var webAuthSession: ASWebAuthenticationSession?
    private var pkceVerifier: String?

    override init() {
        super.init()
        restoreSession()
        // Wire the API client's bearer source to the Keychain so every
        // `authenticated` endpoint (checkout, RSVP) carries the access token.
        Task { await APIClient.shared.setTokenProvider { KeychainHelper.get("access_token") } }
    }

    // MARK: Sign in / out

    func signIn() {
        guard !isAuthenticating else { return }
        let verifier = Self.randomURLSafeString(64)
        pkceVerifier = verifier
        state = .authenticating

        var components = URLComponents(string: "https://\(AppConfig.auth0Domain)/authorize")
        components?.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: AppConfig.auth0ClientId),
            URLQueryItem(name: "redirect_uri", value: AppConfig.authRedirectURI),
            URLQueryItem(name: "scope", value: "openid profile email offline_access"),
            URLQueryItem(name: "audience", value: AppConfig.auth0Audience),
            URLQueryItem(name: "code_challenge", value: Self.codeChallenge(for: verifier)),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
        ]
        guard let url = components?.url else { state = .signedOut; return }

        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: AppConfig.authCallbackScheme
        ) { [weak self] callbackURL, error in
            Task { @MainActor in await self?.handleCallback(callbackURL, error: error) }
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        webAuthSession = session
        session.start()
    }

    func signOut() {
        KeychainHelper.delete("access_token")
        KeychainHelper.delete("refresh_token")
        KeychainHelper.delete("id_token")
        state = .signedOut
    }

    /// The current bearer token for API calls (nil if signed out).
    func currentAccessToken() -> String? { KeychainHelper.get("access_token") }

    // MARK: Internals

    private func handleCallback(_ url: URL?, error: Error?) async {
        defer { webAuthSession = nil }
        guard error == nil,
              let url,
              let code = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                  .queryItems?.first(where: { $0.name == "code" })?.value,
              let verifier = pkceVerifier else {
            state = .signedOut
            return
        }
        do {
            let tokens = try await exchange(code: code, verifier: verifier)
            persist(tokens)
            state = .signedIn(Self.user(fromIdToken: tokens.idToken))
        } catch {
            state = .signedOut
        }
    }

    private struct Tokens { let access: String; let refresh: String?; let idToken: String? }

    private struct TokenResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let idToken: String?
        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case idToken = "id_token"
        }
    }

    private func exchange(code: String, verifier: String) async throws -> Tokens {
        var request = URLRequest(url: URL(string: "https://\(AppConfig.auth0Domain)/oauth/token")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: String] = [
            "grant_type": "authorization_code",
            "client_id": AppConfig.auth0ClientId,
            "code_verifier": verifier,
            "code": code,
            "redirect_uri": AppConfig.authRedirectURI,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.userAuthenticationRequired)
        }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return Tokens(access: decoded.accessToken, refresh: decoded.refreshToken, idToken: decoded.idToken)
    }

    private func persist(_ tokens: Tokens) {
        KeychainHelper.set(tokens.access, for: "access_token")
        if let refresh = tokens.refresh { KeychainHelper.set(refresh, for: "refresh_token") }
        if let idToken = tokens.idToken { KeychainHelper.set(idToken, for: "id_token") }
    }

    private func restoreSession() {
        guard KeychainHelper.get("access_token") != nil else { return }
        state = .signedIn(Self.user(fromIdToken: KeychainHelper.get("id_token")))
    }

    // MARK: PKCE + JWT helpers

    private static func randomURLSafeString(_ count: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: count)
        _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        return Data(bytes).cgBase64URLEncoded()
    }

    private static func codeChallenge(for verifier: String) -> String {
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return Data(digest).cgBase64URLEncoded()
    }

    private static func user(fromIdToken token: String?) -> CGUser {
        guard let token, let claims = decodeJWTClaims(token) else {
            return CGUser(id: "unknown", email: nil, name: nil)
        }
        return CGUser(
            id: claims["sub"] as? String ?? "unknown",
            email: claims["email"] as? String,
            name: claims["name"] as? String
        )
    }

    private static func decodeJWTClaims(_ token: String) -> [String: Any]? {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }
        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json
    }
}

extension AuthManager: ASWebAuthenticationPresentationContextProviding {
    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let window = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }
            return window ?? ASPresentationAnchor()
        }
    }
}

private extension Data {
    func cgBase64URLEncoded() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
