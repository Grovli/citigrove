import SwiftUI

/// Custom tab shell: full-bleed page canvas, the selected tab's NavigationStack,
/// and the floating `CGTabBar` overlaid at the bottom. Each tab owns its own
/// navigation stack so it pops independently. Mirrors the Grovli pattern minus
/// the deep-link/sheet router churn.
struct MainTabView: View {
    @EnvironmentObject private var bag: BagStore
    @State private var selection: CGTab = .shop

    var body: some View {
        ZStack(alignment: .bottom) {
            CGColors.page.ignoresSafeArea()
            content
            CGTabBar(selection: $selection, badges: [.bag: bag.itemCount])
        }
    }

    @ViewBuilder private var content: some View {
        switch selection {
        case .shop:    NavigationStack { ShopView() }
        case .journal: NavigationStack { JournalView() }
        case .events:  NavigationStack { EventsView() }
        case .bag:     NavigationStack { BagView() }
        case .account: NavigationStack { AccountView() }
        }
    }
}
