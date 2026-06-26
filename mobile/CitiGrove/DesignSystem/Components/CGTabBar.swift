import SwiftUI

/// The five CitiGrove tabs.
enum CGTab: Int, CaseIterable, Identifiable {
    case shop, journal, events, bag, account
    var id: Int { rawValue }

    var title: String {
        switch self {
        case .shop:    return "Shop"
        case .journal: return "Journal"
        case .events:  return "Events"
        case .bag:     return "Bag"
        case .account: return "You"
        }
    }

    var icon: String {
        switch self {
        case .shop:    return "bag"
        case .journal: return "book.closed"
        case .events:  return "calendar"
        case .bag:     return "cart"
        case .account: return "person.crop.circle"
        }
    }
}

/// Flat hairline tab bar — a full-width bottom bar split from the content by a
/// single top hairline, on the warm page canvas. The site has no bottom nav (it
/// uses a sidebar/top bar), so this mirrors its flat, bordered chrome rather than
/// inventing a floating pill. Selected tab reads in `primaryDeep`; the rest in
/// `inkFaint`. Soft haptic on change (restrained, per the editorial motion language).
///
/// Hosted via `.safeAreaInset(edge: .bottom)`, so it sits above the home
/// indicator and auto-insets scroll content (screens no longer reserve their own
/// tab-bar gap). The page canvas behind the home indicator comes from the root.
struct CGTabBar: View {
    @Binding var selection: CGTab
    /// Per-tab badge counts (e.g. items in the bag). 0 = hidden.
    var badges: [CGTab: Int] = [:]

    var body: some View {
        VStack(spacing: 0) {
            CGHairline()
            HStack(spacing: 0) {
                ForEach(CGTab.allCases) { tab in
                    CGTabButton(
                        tab: tab,
                        isSelected: selection == tab,
                        badge: badges[tab] ?? 0
                    ) {
                        selection = tab
                    }
                }
            }
            .padding(.top, 9)
            .padding(.bottom, 2)
            .padding(.horizontal, CGSpace.sm)
        }
        .background(CGColors.page)
        .sensoryFeedback(.impact(weight: .light), trigger: selection)
    }
}

private struct CGTabButton: View {
    let tab: CGTab
    let isSelected: Bool
    let badge: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                icon
                Text(tab.title)
                    .font(CGType.text(10, isSelected ? .semibold : .medium))
            }
            .foregroundStyle(isSelected ? CGColors.primaryDeep : CGColors.inkFaint)
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.title)
    }

    private var icon: some View {
        Image(systemName: tab.icon)
            .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
            .frame(width: 26, height: 22)
            .overlay(alignment: .topTrailing) {
                if badge > 0 {
                    Text("\(min(badge, 99))")
                        .font(CGType.text(9, .semibold))
                        .foregroundStyle(CGColors.onChrome)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(CGColors.accent, in: Capsule())
                        .offset(x: 12, y: -6)
                }
            }
    }
}
