import Foundation
import PassKit

/// Talks to citigrove-store-api's order endpoints. Auth is injected by the
/// APIClient token provider (wired in AuthManager). Physical goods → Apple Pay /
/// Stripe via grovli-payments `/direct/*`; NEVER In-App Purchase (Guideline 3.1.3(e)).
enum CheckoutService {
    /// Authoritatively re-price the cart.
    static func quote(items: [CheckoutCartItem]) async throws -> QuoteResponse {
        let body = try JSONEncoder.cgSnakeCase.encode(
            QuoteRequest(items: items, shippingRateId: nil, tipCents: 0)
        )
        return try await APIClient.shared.value(for: .storeQuote(body: body))
    }

    /// Create the order + a Stripe PaymentIntent.
    static func createOrder(items: [CheckoutCartItem]) async throws -> CreateOrderResponse {
        let request = CreateOrderRequest(
            items: items,
            shippingRateId: nil,
            idempotencyKey: UUID().uuidString
        )
        let body = try JSONEncoder.cgSnakeCase.encode(request)
        return try await APIClient.shared.value(for: .storeCreateOrder(body: body))
    }

    /// Settle the PaymentIntent with the Apple Pay token. The token's encrypted
    /// `paymentData` is forwarded verbatim; the backend hands it to
    /// grovli-payments which decrypts + confirms via Stripe.
    static func settleApplePay(orderId: String, payment: PKPayment) async throws {
        var payload: [String: Any] = [
            "transaction_id": payment.token.transactionIdentifier,
        ]
        if let json = try? JSONSerialization.jsonObject(with: payment.token.paymentData) {
            payload["payment_data"] = json
        }
        if let network = payment.token.paymentMethod.network?.rawValue {
            payload["payment_network"] = network
        }
        let body = try JSONSerialization.data(withJSONObject: payload)
        _ = try await APIClient.shared.data(for: .storeSettleApplePay(orderId: orderId, body: body))
    }
}
