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

/// Floating capsule tab bar — ultraThin material + hairline, the brand's quiet
/// chrome. Selected tab reads in `primaryDeep`; the rest in `inkFaint`. Soft
/// haptic on change (restrained, per the luxury motion language).
struct CGTabBar: View {
    @Binding var selection: CGTab
    /// Per-tab badge counts (e.g. items in the bag). 0 = hidden.
    var badges: [CGTab: Int] = [:]

    var body: some View {
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
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(CGColors.line, lineWidth: 0.5))
        .padding(.horizontal, 24)
        .shadow(color: CGColors.chrome.opacity(0.10), radius: 18, x: 0, y: 10)
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
