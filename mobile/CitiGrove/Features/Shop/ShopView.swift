import SwiftUI

/// The store. Slow, editorial pacing: a breathing hero, then one merchandised
/// section per category. Live catalog from citigrove-store-api with a graceful
/// fallback to the curated placeholder. Browse without an account; checkout gates auth.
struct ShopView: View {
    @EnvironmentObject private var bag: BagStore
    @State private var model = ShopViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: CGSpace.md),
        GridItem(.flexible(), spacing: CGSpace.md),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: CGSpace.xxl) {
                hero
                content
                Color.clear.frame(height: CGSpace.tabBarInset)
            }
            .padding(.horizontal, CGSpace.lg)
            .padding(.top, CGSpace.sm)
        }
        .background(CGColors.page)
        .scrollIndicators(.hidden)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .principal) { CGLogo(size: 20) } }
        .task { await model.load() }
        .refreshable { await model.load() }
    }

    @ViewBuilder private var content: some View {
        switch model.state {
        case .loading:
            LazyVGrid(columns: columns, spacing: CGSpace.md) {
                ForEach(0..<4, id: \.self) { _ in CGProductSkeleton() }
            }
        case .loaded(let products, _):
            ForEach(CGProductCategory.allCases) { category in
                let items = products.filter { $0.category == category }
                if !items.isEmpty {
                    VStack(alignment: .leading, spacing: CGSpace.lg) {
                        CGSectionHeader(eyebrow: category.rawValue, title: category.sectionTitle)
                        LazyVGrid(columns: columns, spacing: CGSpace.md) {
                            ForEach(items) { product in
                                CGProductCard(product: product) { bag.add(product) }
                            }
                        }
                    }
                }
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            CGEyebrow(text: "In season")
            Text("Small-batch goods\nfor a slower table.")
                .font(CGType.hero)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(2)
            Text("Sparkling drinks, everyday objects, and skincare — made to match how you eat, grow, and live.")
                .font(CGType.body)
                .foregroundStyle(CGColors.inkSoft)
                .padding(.top, 2)
        }
        .padding(.top, CGSpace.sm)
    }
}

struct CGProductSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            RoundedRectangle(cornerRadius: CGRadius.md).fill(CGColors.line).frame(height: 148)
            RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(width: 60, height: 9).padding(.top, 4)
            RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(height: 16)
            RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(width: 50, height: 14)
        }
        .padding(CGSpace.md)
        .background(CGColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CGRadius.lg, style: .continuous))
        .opacity(0.5)
    }
}
