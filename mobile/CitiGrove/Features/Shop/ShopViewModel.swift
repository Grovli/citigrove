import SwiftUI

/// Loads the Shop catalog from citigrove-store-api with stale-while-revalidate
/// and a graceful fallback: until the service is deployed (or when offline), the
/// curated placeholder catalog renders so the store is never empty. `live`
/// tracks whether the displayed catalog came from the server.
@MainActor
@Observable
final class ShopViewModel {
    enum State {
        case loading
        case loaded(products: [CGProduct], live: Bool)
    }

    private(set) var state: State = .loading
    private static let cacheKey = "store_products"

    func load() async {
        if let cached: [StoreProduct] = OfflineStore.load([StoreProduct].self, key: Self.cacheKey),
           !cached.isEmpty {
            state = .loaded(products: cached.map { $0.asDisplay() }, live: true)
        }
        do {
            let products = try await StoreService.fetchProducts()
            guard !products.isEmpty else { fallback(); return }
            OfflineStore.save(products, as: Self.cacheKey)
            state = .loaded(products: products.map { $0.asDisplay() }, live: true)
        } catch {
            fallback()
        }
    }

    private func fallback() {
        if case .loaded(_, true) = state { return } // keep a live cache
        state = .loaded(products: CGCatalog.products, live: false)
    }
}
