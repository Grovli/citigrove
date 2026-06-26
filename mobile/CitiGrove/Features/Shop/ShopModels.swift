import SwiftUI

/// A purchasable physical good. Money is integer cents (server-authoritative on
/// real prices — this catalog is a v1 placeholder until citigrove-store-api
/// serves the live SKU catalog).
struct CGProduct: Identifiable, Equatable {
    let id: String
    let name: String
    let tagline: String
    let priceCents: Int
    let category: CGProductCategory
}

extension CGProduct {
    /// Decorative flavor-dot tone for the Shop cell — mirrors citigrove.com's
    /// varied per-product dots. Deterministic per SKU (stable across launches and
    /// for live catalog items) via a small djb2 hash over the id, picked from the
    /// on-brand tonal palette. Purely decorative; never carries meaning.
    var toneDot: Color {
        let palette: [Color] = [
            CGColors.peach, CGColors.sage, CGColors.clay,
            CGColors.accent, CGColors.primaryDeep,
        ]
        var hash = 5381
        for byte in id.utf8 { hash = (hash &* 33) &+ Int(byte) }
        return palette[((hash % palette.count) + palette.count) % palette.count]
    }
}

enum CGProductCategory: String, CaseIterable, Identifiable {
    case beverages = "Sparkling"
    case apparel   = "Apparel"
    case home      = "Home & Garden"
    case skincare  = "Skincare"

    var id: String { rawValue }

    var sectionTitle: String {
        switch self {
        case .beverages: return "Two-ingredient sparkling"
        case .apparel:   return "Wear the grove"
        case .home:      return "For home & garden"
        case .skincare:  return "Skin, restored"
        }
    }

    var glyph: String {
        switch self {
        case .beverages: return "drop"
        case .apparel:   return "tshirt"
        case .home:      return "leaf"
        case .skincare:  return "sparkles"
        }
    }
}

/// v1 placeholder catalog — mirrors the lines merchandised on citigrove.com.
/// Replaced by citigrove-store-api's live catalog in Phase 2.
enum CGCatalog {
    static let products: [CGProduct] = [
        CGProduct(id: "spark-cranberry", name: "Cranberry Lemongrass Apple", tagline: "Crisp, tart, barely sweet", priceCents: 2500, category: .beverages),
        CGProduct(id: "spark-lime",      name: "Lime Rosemary Grapefruit",  tagline: "Bittersweet and herbal",   priceCents: 2500, category: .beverages),
        CGProduct(id: "spark-mint",      name: "Mint Blueberry Lime",       tagline: "Cool, bright, clean",      priceCents: 2500, category: .beverages),
        CGProduct(id: "spark-fennel",    name: "Fennel Apple Spritz",       tagline: "Anise and orchard",        priceCents: 1800, category: .beverages),
        CGProduct(id: "tee-grove",       name: "Grove Organic Tee",         tagline: "Heavyweight organic cotton", priceCents: 4200, category: .apparel),
        CGProduct(id: "tank-field",      name: "Field Tank",                tagline: "Breathable, garment-dyed", priceCents: 3600, category: .apparel),
        CGProduct(id: "tote-market",     name: "Market Tote",               tagline: "Waxed canvas, built to last", priceCents: 3800, category: .home),
        CGProduct(id: "seeds-herb",      name: "Heirloom Herb Set",         tagline: "Six culinary herbs",       priceCents: 1800, category: .home),
        CGProduct(id: "skincare-oil",    name: "Restorative Face Oil",      tagline: "Cold-pressed botanicals",  priceCents: 5400, category: .skincare),
        CGProduct(id: "skincare-balm",   name: "Everyday Hand Balm",        tagline: "Beeswax and calendula",    priceCents: 2200, category: .skincare),
    ]

    static func products(in category: CGProductCategory) -> [CGProduct] {
        products.filter { $0.category == category }
    }
}
