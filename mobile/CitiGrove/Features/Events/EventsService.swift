import Foundation

/// Reads nearby events + posts RSVPs to citigrove-store-api.
enum EventsService {
    static func fetchNearby(lat: Double, lng: Double, radiusMeters: Int = 40_000) async throws -> [StoreEvent] {
        let response: EventsNearbyResponse = try await APIClient.shared.value(
            for: .eventsNearby(lat: lat, lng: lng, radiusMeters: radiusMeters)
        )
        return response.events ?? []
    }

    /// Join (POST) or leave (DELETE) an event. Capacity/waitlist are server-owned.
    static func rsvp(eventId: String, joining: Bool) async throws {
        _ = try await APIClient.shared.data(for: .eventRSVP(eventId: eventId, joining: joining))
    }
}
