import Foundation

/// CitiGrove Journal essay (index projection from document-api `/public/categories/blog`).
/// snake_case fields (`published_at`) map via APIClient's convertFromSnakeCase.
struct JournalPost: Identifiable, Codable, Hashable {
    let slug: String
    let title: String
    let summary: String
    let publishedAt: String?
    let tags: [String]?

    var id: String { slug }
}

struct JournalIndexResponse: Codable {
    let items: [JournalPost]?
}

/// Full essay (`/public/documents/{slug}`) — adds the Markdown body + optional hero.
struct JournalPostDetail: Codable, Equatable {
    let slug: String
    let title: String
    let summary: String?
    let category: String?
    let publishedAt: String?
    let body: String?
    let bodyFormat: String?
    let tags: [String]?
    let heroImageUrl: String?
}

/// Renders document-api's naive timestamps ("2026-05-30T03:37:50.418000") to a
/// human date, tolerating the missing timezone + microseconds.
enum JournalDateFormatter {
    private static let output: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .long
        return f
    }()

    static func display(_ raw: String) -> String? {
        guard !raw.isEmpty else { return nil }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = iso.date(from: raw)
        if date == nil {
            iso.formatOptions = [.withInternetDateTime]
            date = iso.date(from: raw)
        }
        if date == nil {
            let naive = DateFormatter()
            naive.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            naive.timeZone = TimeZone(identifier: "UTC")
            date = naive.date(from: String(raw.prefix(19)))
        }
        guard let resolved = date else { return nil }
        return output.string(from: resolved)
    }
}
