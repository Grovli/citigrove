import SwiftUI

/// Editorial essay reader — optional hero image, serif title, dateline, the
/// Markdown body rendered as blocks, and a closing Grovli CTA (the funnel back
/// into the food-planning app, UTM-tagged).
struct JournalPostView: View {
    let post: JournalPost

    @State private var detail: JournalPostDetail?
    @State private var failed = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: CGSpace.md) {
                hero
                CGEyebrow(text: post.tags?.first ?? "Essay")
                Text(post.title)
                    .font(CGType.title)
                    .foregroundStyle(CGColors.ink)
                    .fixedSize(horizontal: false, vertical: true)
                if let date = JournalDateFormatter.display(post.publishedAt ?? "") {
                    Text(date).font(CGType.caption).foregroundStyle(CGColors.inkFaint)
                }
                bodyView
                grovliCTA
                Color.clear.frame(height: CGSpace.xl)
            }
            .padding(.horizontal, CGSpace.lg)
            .padding(.top, CGSpace.sm)
        }
        .background(CGColors.page)
        .scrollIndicators(.hidden)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    @ViewBuilder private var hero: some View {
        if let urlString = detail?.heroImageUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle().fill(CGColors.primary.opacity(0.12))
            }
            .frame(height: 220)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: CGRadius.lg, style: .continuous))
        }
    }

    @ViewBuilder private var bodyView: some View {
        if let body = detail?.body, !body.isEmpty {
            VStack(alignment: .leading, spacing: CGSpace.md) {
                ForEach(Array(JournalMarkdown.blocks(from: body).enumerated()), id: \.offset) { _, block in
                    blockView(block)
                }
            }
            .padding(.top, CGSpace.xs)
        } else if failed {
            Text(post.summary)
                .font(CGType.serifBody)
                .foregroundStyle(CGColors.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        } else {
            ProgressView().tint(CGColors.primary).padding(.vertical, CGSpace.xxl)
        }
    }

    @ViewBuilder private func blockView(_ block: JournalBlock) -> some View {
        switch block {
        case .heading(let text):
            Text(text)
                .font(CGType.section)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, CGSpace.sm)
        case .subheading(let text):
            Text(text)
                .font(CGType.display(18, .medium))
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, CGSpace.xs)
        case .quote(let text):
            Text(text)
                .font(CGType.display(20, .regular))
                .italic()
                .foregroundStyle(CGColors.primaryDeep)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.leading, CGSpace.md)
                .overlay(alignment: .leading) {
                    Rectangle().fill(CGColors.primary).frame(width: 3)
                }
                .padding(.vertical, CGSpace.xs)
        case .paragraph(let attributed):
            Text(attributed)
                .font(CGType.serifBody)
                .foregroundStyle(CGColors.ink.opacity(0.9))
                .lineSpacing(5)
                .fixedSize(horizontal: false, vertical: true)
        case .rule:
            Rectangle().fill(CGColors.line).frame(height: 1).padding(.vertical, CGSpace.sm)
        }
    }

    private var grovliCTA: some View {
        VStack(alignment: .leading, spacing: CGSpace.sm) {
            CGEyebrow(text: "Food planning, handled", color: CGColors.onChrome.opacity(0.6))
            Text("Let Grovli plan your food, not just your meals.")
                .font(CGType.display(20, .medium))
                .foregroundStyle(CGColors.onChrome)
                .fixedSize(horizontal: false, vertical: true)
            Link(destination: grovliURL) {
                Text("Start food planning →")
                    .font(CGType.text(13, .semibold))
                    .foregroundStyle(CGColors.chrome)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
                    .background(CGColors.onChrome, in: Capsule())
            }
            .padding(.top, CGSpace.xs)
        }
        .padding(CGSpace.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(CGColors.chrome)
        .clipShape(RoundedRectangle(cornerRadius: CGRadius.lg, style: .continuous))
        .padding(.top, CGSpace.md)
    }

    private var grovliURL: URL {
        URL(string: "https://grovli.citigrove.com/?utm_source=citigrove_app&utm_medium=journal&utm_campaign=\(post.slug)")
            ?? URL(string: "https://grovli.citigrove.com")!
    }

    private func load() async {
        do {
            detail = try await JournalService.fetchPost(slug: post.slug)
        } catch {
            failed = true
        }
    }
}
