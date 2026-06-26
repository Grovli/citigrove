import SwiftUI

/// The Journal — slow, editorial reading. Live essays from document-api (the
/// same KB citigrove.com renders), stale-while-revalidate with offline fallback.
struct JournalView: View {
    @State private var model = JournalViewModel()

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
        .navigationDestination(for: JournalPost.self) { JournalPostView(post: $0) }
        .task { await model.load() }
        .refreshable { await model.load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            CGEyebrow(text: "The Journal")
            Text("Notes on food,\nseasons, and slowing down.")
                .font(CGType.title)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(2)
        }
        .padding(.top, CGSpace.sm)
    }

    @ViewBuilder private var content: some View {
        switch model.state {
        case .loading:
            VStack(spacing: 0) {
                ForEach(0..<4, id: \.self) { index in
                    JournalSkeletonRow()
                    if index < 3 { Divider().overlay(CGColors.line) }
                }
            }
        case .loaded(let posts):
            if posts.isEmpty {
                CGEmptyState(icon: "book.closed", title: "Coming soon", message: "New essays are on the way — pull to refresh.")
                    .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: 0) {
                    ForEach(posts) { post in
                        NavigationLink(value: post) { JournalRow(post: post) }
                            .buttonStyle(.plain)
                        if post.id != posts.last?.id { Divider().overlay(CGColors.line) }
                    }
                }
            }
        case .failed(let message):
            CGEmptyState(icon: "wifi.slash", title: "Offline", message: message)
                .frame(maxWidth: .infinity)
        }
    }
}

private struct JournalRow: View {
    let post: JournalPost
    var body: some View {
        VStack(alignment: .leading, spacing: CGSpace.xs + 2) {
            HStack(spacing: CGSpace.sm) {
                CGEyebrow(text: post.tags?.first ?? "Essay")
                if let date = JournalDateFormatter.display(post.publishedAt ?? "") {
                    Text(date).font(CGType.text(11, .medium)).foregroundStyle(CGColors.inkFaint)
                }
            }
            Text(post.title)
                .font(CGType.display(22, .medium))
                .foregroundStyle(CGColors.ink)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            Text(post.summary)
                .font(CGType.callout)
                .foregroundStyle(CGColors.inkSoft)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            Text("Read essay →")
                .font(CGType.text(12, .semibold))
                .tracking(0.6)
                .foregroundStyle(CGColors.primaryDeep)
                .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, CGSpace.lg)
        .contentShape(Rectangle())
    }
}

private struct JournalSkeletonRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(width: 90, height: 9)
            RoundedRectangle(cornerRadius: 6).fill(CGColors.line).frame(height: 22).padding(.trailing, 24)
            RoundedRectangle(cornerRadius: 4).fill(CGColors.line).frame(height: 12).padding(.trailing, 60)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, CGSpace.lg)
        .opacity(0.5)
    }
}
