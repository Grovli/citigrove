import SwiftUI

/// Spacing scale (points) — mirrors the design-tokens spacing scale.
enum CGSpace {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
    /// Bottom inset reserved for the floating tab bar so scroll content clears it.
    static let tabBarInset: CGFloat = 96
}

/// Corner radii (points) — the site's near-square "Ffern register", single-sourced
/// from `design-tokens/tokens/radius.citigrove.json` via `CitiGroveRadiusTokens`.
/// Buttons/inputs square to 2, cards/cells to 3 — matching citigrove.com exactly.
/// `pill` stays a true circle for badges + accent dots only.
enum CGRadius {
    static let sm   = CitiGroveRadiusTokens.sm    // 2  — buttons, inputs, chips
    static let md   = CitiGroveRadiusTokens.md    // 3  — cards, product cells, image tiles
    static let lg   = CitiGroveRadiusTokens.lg    // 4  — larger raised surfaces / sheets
    static let xl   = CitiGroveRadiusTokens.xl    // 6  — hero / feature panels
    static let pill = CitiGroveRadiusTokens.pill  // circles / pills only
}

/// Money formatting — server amounts are integer cents; clients render.
enum CGMoney {
    static func string(_ cents: Int) -> String {
        let dollars = Double(cents) / 100.0
        if dollars == dollars.rounded() {
            return "$\(Int(dollars))"
        }
        return String(format: "$%.2f", dollars)
    }
}
