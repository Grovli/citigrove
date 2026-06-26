import SwiftUI

/// The store. Slow, editorial pacing that mirrors citigrove.com: a warm tonal
/// hero band, then one hairline-divided section per category — single-column
/// product cells (the site collapses its grid to one column on mobile). Live
/// catalog from citigrove-store-api with a graceful fallback to the curated
/// placeholder. Browse without an account; checkout gates auth.
struct ShopView: View {
    @EnvironmentObject private var bag: BagStore
    @State private var model = ShopViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero
                content
            }
        }
        .background(CGColors.page)
        .scrollIndicators(.hidden)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .principal) { CGLogo(size: 20) } }
        .task { await model.load() }
        .refreshable { await model.load() }
    }

    // Warm peach feature band — the site's hero composition.
    private var hero: some View {
        CGTonalBand(tone: CGColors.peach, hairlineTop: false) {
            VStack(alignment: .leading, spacing: CGSpace.md) {
                CGEyebrow(text: "In season", color: CGColors.ink.opacity(0.55))
                Text("Small-batch goods\nfor a slower table.")
                    .font(CGType.hero)
                    .foregroundStyle(CGColors.ink)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Sparkling drinks, everyday objects, and skincare — made to match how you eat, grow, and live.")
                    .font(CGType.callout)
                    .foregroundStyle(CGColors.ink.opacity(0.8))
                    .padding(.top, 2)
            }
        }
    }

    @ViewBuilder private var content: some View {
        switch model.state {
        case .loading:
            VStack(alignment: .leading, spacing: CGSpace.lg) {
                CGSectionHeader(eyebrow: "In season", title: "Sparkling")
                VStack(spacing: 0) {
                    ForEach(0..<4, id: \.self) { _ in CGProductSkeleton() }
                }
            }
            .padding(.horizontal, CGSpace.xl)
            .padding(.top, CGSpace.xxl)

        case .loaded(let products, _):
            ForEach(CGProductCategory.allCases) { category in
                let items = products.filter { $0.category == category }
                if !items.isEmpty {
                    VStack(alignment: .leading, spacing: CGSpace.lg) {
                        CGSectionHeader(eyebrow: category.rawValue, title: category.sectionTitle)
                        VStack(spacing: 0) {
                            ForEach(items) { product in
                                CGProductCard(product: product) { bag.add(product) }
                            }
                        }
                    }
                    .padding(.horizontal, CGSpace.xl)
                    .padding(.top, CGSpace.xxl)
                    .padding(.bottom, CGSpace.xl)
                    .overlay(alignment: .bottom) { CGHairline() }
                }
            }
        }
    }
}
