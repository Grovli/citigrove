import SwiftUI

/// A local event display model.
struct CGEvent: Identifiable, Hashable {
    let id: String
    let title: String
    let kind: CGEventKind
    let venue: String
    let dateLabel: String
    let distanceLabel: String
}

enum CGEventKind: String {
    case move = "Move"
    case eat = "Eat"
    case gather = "Gather"

    var glyph: String {
        switch self {
        case .move:   return "figure.run"
        case .eat:    return "fork.knife"
        case .gather: return "sparkles"
        }
    }
}

enum CGEventsSample {
    static let events: [CGEvent] = [
        CGEvent(id: "e1", title: "Sunrise trail walk", kind: .move, venue: "Riverside Park", dateLabel: "Sat · 7:00 AM", distanceLabel: "1.2 mi"),
        CGEvent(id: "e2", title: "Market-to-table supper", kind: .eat, venue: "The Grove Kitchen", dateLabel: "Sun · 6:30 PM", distanceLabel: "2.8 mi"),
        CGEvent(id: "e3", title: "Seed swap & coffee", kind: .gather, venue: "Cornerstone Cafe", dateLabel: "Wed · 9:00 AM", distanceLabel: "0.6 mi"),
    ]
}

/// Events — food, wellness, and fun, nearby. Live from citigrove-store-api (geo
/// discovery) with a graceful fallback to curated samples.
struct EventsView: View {
    @State private var model = EventsViewModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: CGSpace.xl) {
                header
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
            VStack(spacing: CGSpace.md) {
                ForEach(0..<3, id: \.self) { _ in CGEventSkeleton() }
            }
        case .loaded(let events, _):
            if events.isEmpty {
                CGEmptyState(icon: "calendar", title: "No events nearby", message: "Check back soon — new gatherings are added often.")
                    .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: CGSpace.md) {
                    ForEach(events) { CGEventCard(event: $0) }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            CGEyebrow(text: "Near you")
            Text("Move, eat, and\ngather — together.")
                .font(CGType.title)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(2)
            Text("Small local gatherings around food, wellness, and fun.")
                .font(CGType.body)
                .foregroundStyle(CGColors.inkSoft)
        }
        .padding(.top, CGSpace.sm)
    }
}

private struct CGEventCard: View {
    let event: CGEvent
    var body: some View {
        HStack(spacing: CGSpace.md) {
            RoundedRectangle(cornerRadius: CGRadius.md, style: .continuous)
                .fill(CGColors.primary.opacity(0.16))
                .frame(width: 56, height: 56)
                .overlay(
                    Image(systemName: event.kind.glyph)
                        .font(.system(size: 20, weight: .regular))
                        .foregroundStyle(CGColors.primaryDeep)
                )
            VStack(alignment: .leading, spacing: 3) {
                CGEyebrow(text: event.kind.rawValue)
                Text(event.title)
                    .font(CGType.display(17, .medium))
                    .foregroundStyle(CGColors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(eventSubtitle)
                    .font(CGType.caption)
                    .foregroundStyle(CGColors.inkSoft)
            }
            Spacer(minLength: CGSpace.sm)
            if !event.distanceLabel.isEmpty {
                Text(event.distanceLabel)
                    .font(CGType.text(11, .medium))
                    .foregroundStyle(CGColors.inkFaint)
            }
        }
        .cgCard()
    }

    private var eventSubtitle: String {
        [event.venue, event.dateLabel].filter { !$0.isEmpty }.joined(separator: " · ")
    }
}

private struct CGEventSkeleton: View {
    var body: some View {
        HStack(spacing: CGSpace.md) {
            RoundedRectangle(cornerRadius: CGRadius.md).fill(CGColors.line).frame(width: 56, height: 56)
            VStack(alignment: .leading, spacing: CGSpace.sm) {
                RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(width: 60, height: 9)
                RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(height: 16).padding(.trailing, 40)
            }
            Spacer()
        }
        .cgCard()
        .opacity(0.5)
    }
}
