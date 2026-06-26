import SwiftUI

/// Loads the Journal index with stale-while-revalidate: show the cached list
/// immediately, then refresh from document-api. Falls back to the cache on a
/// network failure so the Journal still reads offline.
@MainActor
@Observable
final class JournalViewModel {
    enum State {
        case loading
        case loaded([JournalPost])
        case failed(String)
    }

    private(set) var state: State = .loading
    private static let cacheKey = "journal_index"

    func load() async {
        if let cached: [JournalPost] = OfflineStore.load([JournalPost].self, key: Self.cacheKey),
           !cached.isEmpty {
            state = .loaded(cached)
        }
        do {
            let posts = try await JournalService.fetchIndex()
            OfflineStore.save(posts, as: Self.cacheKey)
            state = .loaded(posts)
        } catch {
            if case .loaded = state { return } // keep the cache on failure
            state = .failed("We couldn't reach the Journal. Check your connection and pull to refresh.")
        }
    }
}
