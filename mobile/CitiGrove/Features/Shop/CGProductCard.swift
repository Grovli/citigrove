import SwiftUI

/// Product tile — quiet surface card, full-bleed tinted image placeholder, serif
/// name, price, and a single restrained add action. Real product photography
/// replaces the tint block when the catalog ships images.
struct CGProductCard: View {
    let product: CGProduct
    var onAdd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            RoundedRectangle(cornerRadius: CGRadius.md, style: .continuous)
                .fill(CGColors.primary.opacity(0.16))
                .frame(height: 148)
                .overlay(
                    Image(systemName: product.category.glyph)
                        .font(.system(size: 26, weight: .light))
                        .foregroundStyle(CGColors.primaryDeep)
                )

            CGEyebrow(text: product.category.rawValue)
                .padding(.top, CGSpace.md)

            Text(product.name)
                .font(CGType.display(16, .medium))
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 3)

            Text(product.tagline)
                .font(CGType.caption)
                .foregroundStyle(CGColors.inkSoft)
                .padding(.top, 2)

            HStack {
                Text(CGMoney.string(product.priceCents))
                    .font(CGType.text(15, .semibold))
                    .foregroundStyle(CGColors.ink)
                Spacer(minLength: CGSpace.sm)
                Button(action: onAdd) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(CGColors.onChrome)
                        .frame(width: 34, height: 34)
                        .background(CGColors.chrome, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Add \(product.name) to bag")
            }
            .padding(.top, CGSpace.md)
        }
        .cgCard(padding: CGSpace.md)
    }
}
