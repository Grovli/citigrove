import Foundation

/// Reads the CitiGrove Journal from document-api's public KB — the same source
/// citigrove.com renders. No auth required.
enum JournalService {
    static func fetchIndex(limit: Int = 50) async throws -> [JournalPost] {
        let response: JournalIndexResponse = try await APIClient.shared.value(for: .journalIndex(limit: limit))
        return response.items ?? []
    }

    static func fetchPost(slug: String) async throws -> JournalPostDetail {
        try await APIClient.shared.value(for: .journalPost(slug: slug))
    }
}
