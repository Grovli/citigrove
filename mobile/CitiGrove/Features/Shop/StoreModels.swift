import Foundation

/// A product from citigrove-store-api `/store/products` (server-authoritative on
/// price + inventory). snake_case maps via convertFromSnakeCase.
struct StoreProduct: Identifiable, Codable, Hashable {
    let id: String
    let sku: String?
    let title: String
    let description: String?
    let category: String?
    let basePriceCents: Int
    let currency: String?
    let images: [String]?
}

struct StoreProductsResponse: Codable {
    let products: [StoreProduct]?
}

extension StoreProduct {
    /// Map a live product into the display model the Shop UI renders.
    func asDisplay() -> CGProduct {
        CGProduct(
            id: id,
            name: title,
            tagline: description ?? "",
            priceCents: basePriceCents,
            category: CGProductCategory.from(category)
        )
    }
}

extension CGProductCategory {
    /// Best-effort map of a live category string to a display section.
    static func from(_ raw: String?) -> CGProductCategory {
        let value = (raw ?? "").lowercased()
        if value.contains("spark") || value.contains("bever") || value.contains("drink") {
            return .beverages
        }
        if value.contains("apparel") || value.contains("tee") || value.contains("tank") || value.contains("wear") {
            return .apparel
        }
        if value.contains("skin") || value.contains("care") || value.contains("balm") {
            return .skincare
        }
        return .home
    }
}
