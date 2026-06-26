import SwiftUI

/// A line in the bag — a product + quantity. The server re-prices at checkout;
/// these client-side amounts are display-only (subtotal preview).
struct BagLine: Identifiable, Equatable {
    let id: String
    let product: CGProduct
    var quantity: Int

    init(product: CGProduct, quantity: Int = 1) {
        self.id = product.id
        self.product = product
        self.quantity = quantity
    }
}

/// The shopping bag. Client-staged; on checkout the cart is sent to
/// citigrove-store-api which re-prices, computes tax + shipping, and returns the
/// authoritative order. Never trust these totals server-side.
@MainActor
final class BagStore: ObservableObject {
    @Published private(set) var lines: [BagLine] = []

    var itemCount: Int { lines.reduce(0) { $0 + $1.quantity } }
    var isEmpty: Bool { lines.isEmpty }

    /// Display-only subtotal preview (server is authoritative at checkout).
    var subtotalCents: Int {
        lines.reduce(0) { $0 + $1.product.priceCents * $1.quantity }
    }

    func add(_ product: CGProduct) {
        if let i = lines.firstIndex(where: { $0.product.id == product.id }) {
            lines[i].quantity += 1
        } else {
            lines.append(BagLine(product: product))
        }
    }

    func setQuantity(_ quantity: Int, for line: BagLine) {
        guard let i = lines.firstIndex(where: { $0.id == line.id }) else { return }
        if quantity <= 0 {
            lines.remove(at: i)
        } else {
            lines[i].quantity = quantity
        }
    }

    func remove(_ line: BagLine) {
        lines.removeAll { $0.id == line.id }
    }

    func clear() {
        lines.removeAll()
    }
}
