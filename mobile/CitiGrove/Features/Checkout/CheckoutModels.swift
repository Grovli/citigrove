import Foundation

/// A line sent to citigrove-store-api for re-pricing. The server is authoritative
/// on price/tax/shipping/total — the client only sends sku + quantity.
struct CheckoutCartItem: Codable {
    let sku: String
    let quantity: Int
}

struct QuoteRequest: Codable {
    let items: [CheckoutCartItem]
    let shippingRateId: String?
    let tipCents: Int
}

struct ShippingOption: Codable, Hashable {
    let id: String?
    let label: String?
    let amountCents: Int?
}

/// Server-authoritative quote (`POST /store/quote`). All money integer cents.
struct QuoteResponse: Codable {
    let subtotalCents: Int?
    let taxCents: Int?
    let selectedShippingCents: Int?
    let totalCents: Int
    let shippingOptions: [ShippingOption]?
}

struct CreateOrderRequest: Codable {
    let items: [CheckoutCartItem]
    let shippingRateId: String?
    let idempotencyKey: String
}

/// `POST /store/orders` → an order + Stripe PaymentIntent (settled via Apple Pay).
struct CreateOrderResponse: Codable {
    let orderId: String
    let clientSecret: String?
    let totalCents: Int?
}
