import Foundation

/// Reads the live SKU catalog from citigrove-store-api.
enum StoreService {
    static func fetchProducts() async throws -> [StoreProduct] {
        let response: StoreProductsResponse = try await APIClient.shared.value(for: .storeProducts())
        return response.products ?? []
    }
}
