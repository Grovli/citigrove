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

/// Corner radii (points).
enum CGRadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 22
    static let pill: CGFloat = 999
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
