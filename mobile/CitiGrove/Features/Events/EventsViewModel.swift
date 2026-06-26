import SwiftUI

/// Loads nearby events: get a one-shot location, query citigrove-store-api, and
/// fall back to a curated placeholder when location is denied or the service is
/// unreachable (so Events is never empty until the service is deployed).
@MainActor
@Observable
final class EventsViewModel {
    enum State {
        case loading
        case loaded(events: [CGEvent], live: Bool)
    }

    private(set) var state: State = .loading
    private let location = LocationProvider()

    func load() async {
        guard let coordinate = await location.current() else { fallback(); return }
        do {
            let events = try await EventsService.fetchNearby(
                lat: coordinate.latitude,
                lng: coordinate.longitude
            )
            guard !events.isEmpty else { fallback(); return }
            state = .loaded(events: events.map { $0.asDisplay() }, live: true)
        } catch {
            fallback()
        }
    }

    private func fallback() {
        if case .loaded(_, true) = state { return }
        state = .loaded(events: CGEventsSample.events, live: false)
    }
}
