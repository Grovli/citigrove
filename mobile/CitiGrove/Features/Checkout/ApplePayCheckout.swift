import PassKit
import SwiftUI

/// Apple Pay checkout coordinator — the Grovli Direct pattern, re-taken for the
/// CitiGrove store. Physical goods → Apple Pay (PassKit) + Stripe via the
/// store-api; never IAP. Flow: server-authoritative `quote` → present the
/// PassKit sheet with the real totals → on authorize, `createOrder` (Stripe
/// PaymentIntent) → `settleApplePay` with the token.
@MainActor
final class ApplePayCheckout: NSObject, ObservableObject {
    enum Outcome {
        case success
        case cancelled
        case failed(String)
    }

    static var isAvailable: Bool { PKPaymentAuthorizationController.canMakePayments() }

    @Published private(set) var isBusy = false

    private let merchantId = "merchant.com.citigrove"
    private var controller: PKPaymentAuthorizationController?
    private var cartItems: [CheckoutCartItem] = []
    private var completion: ((Outcome) -> Void)?
    private var didSucceed = false

    func start(items: [CheckoutCartItem], completion: @escaping (Outcome) -> Void) {
        guard !items.isEmpty else { completion(.cancelled); return }
        self.cartItems = items
        self.completion = completion
        self.didSucceed = false
        isBusy = true
        Task {
            do {
                let quote = try await CheckoutService.quote(items: items)
                presentSheet(for: quote)
            } catch {
                finish(.failed("We couldn't price your bag right now. Try again in a moment."))
            }
        }
    }

    private func presentSheet(for quote: QuoteResponse) {
        let request = PKPaymentRequest()
        request.merchantIdentifier = merchantId
        request.supportedNetworks = [.visa, .masterCard, .amex, .discover]
        request.merchantCapabilities = [.threeDSecure]
        request.countryCode = "US"
        request.currencyCode = "USD"
        request.requiredShippingContactFields = [.postalAddress, .name, .emailAddress]
        request.paymentSummaryItems = summaryItems(for: quote)

        let controller = PKPaymentAuthorizationController(paymentRequest: request)
        controller.delegate = self
        self.controller = controller
        controller.present { [weak self] presented in
            guard let self else { return }
            Task { @MainActor in
                if !presented { self.finish(.failed("Apple Pay isn't available on this device.")) }
            }
        }
    }

    private func summaryItems(for quote: QuoteResponse) -> [PKPaymentSummaryItem] {
        var items: [PKPaymentSummaryItem] = []
        if let subtotal = quote.subtotalCents {
            items.append(PKPaymentSummaryItem(label: "Subtotal", amount: dollars(subtotal)))
        }
        if let shipping = quote.selectedShippingCents, shipping > 0 {
            items.append(PKPaymentSummaryItem(label: "Shipping", amount: dollars(shipping)))
        }
        if let tax = quote.taxCents, tax > 0 {
            items.append(PKPaymentSummaryItem(label: "Tax", amount: dollars(tax)))
        }
        items.append(PKPaymentSummaryItem(label: "CitiGrove", amount: dollars(quote.totalCents)))
        return items
    }

    private func dollars(_ cents: Int) -> NSDecimalNumber {
        NSDecimalNumber(value: cents).dividing(by: 100)
    }

    private func finish(_ outcome: Outcome) {
        isBusy = false
        let callback = completion
        completion = nil
        controller = nil
        callback?(outcome)
    }
}

extension ApplePayCheckout: PKPaymentAuthorizationControllerDelegate {
    func paymentAuthorizationController(
        _ controller: PKPaymentAuthorizationController,
        didAuthorizePayment payment: PKPayment
    ) async -> PKPaymentAuthorizationResult {
        do {
            let order = try await CheckoutService.createOrder(items: cartItems)
            try await CheckoutService.settleApplePay(orderId: order.orderId, payment: payment)
            didSucceed = true
            return PKPaymentAuthorizationResult(status: .success, errors: nil)
        } catch {
            didSucceed = false
            return PKPaymentAuthorizationResult(status: .failure, errors: [error])
        }
    }

    func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.finish(self.didSucceed ? .success : .cancelled)
            }
        }
    }
}
