import SwiftUI

/// Product cell — the site's image-void Sparkling treatment: a top hairline, a
/// coral tone dot + category eyebrow, the name in light editorial serif, a note,
/// then price with one restrained squared add action. Reads as a divided
/// editorial list on mobile (the site collapses its product grid to one column),
/// not a floating card. Real photography slots in above the text later.
struct CGProductCard: View {
    let product: CGProduct
    var onAdd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CGHairline()
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 9) {
                    CGDot(color: product.toneDot, size: 8)
                    CGEyebrow(text: product.category.rawValue)
                }
                Text(product.name)
                    .font(CGType.section)
                    .foregroundStyle(CGColors.ink)
                    .fixedSize(horizontal: false, vertical: true)

                Text(product.tagline)
                    .font(CGType.caption)
                    .foregroundStyle(CGColors.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(alignment: .center) {
                    Text(CGMoney.string(product.priceCents))
                        .font(CGType.caption)
                        .foregroundStyle(CGColors.ink)
                    Spacer(minLength: CGSpace.sm)
                    addButton
                }
                .padding(.top, 4)
            }
            .padding(.top, CGSpace.xl)
        }
    }

    private var addButton: some View {
        Button(action: onAdd) {
            HStack(spacing: 5) {
                Text("Add")
                Image(systemName: "plus").font(.system(size: 9, weight: .semibold))
            }
            .font(CGType.actionLabel)
            .textCase(.uppercase)
            .tracking(CGType.Tracking.actionLabel)
            .foregroundStyle(CGColors.primaryDeep)
            .padding(.vertical, 8)
            .padding(.horizontal, 14)
            .overlay(
                RoundedRectangle(cornerRadius: CGRadius.sm, style: .continuous)
                    .strokeBorder(CGColors.line, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Add \(product.name) to bag")
    }
}

/// Loading placeholder — a single hairline-divided text row, matching the cell.
struct CGProductSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CGHairline()
            VStack(alignment: .leading, spacing: CGSpace.sm) {
                RoundedRectangle(cornerRadius: 2).fill(CGColors.line).frame(width: 60, height: 9)
                RoundedRectangle(cornerRadius: 2).fill(CGColors.line).frame(height: 20).padding(.trailing, 80)
                RoundedRectangle(cornerRadius: 2).fill(CGColors.line).frame(width: 120, height: 12)
            }
            .padding(.top, CGSpace.xl)
        }
        .opacity(0.5)
    }
}
