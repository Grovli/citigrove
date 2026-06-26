import Foundation

/// A nearby event from citigrove-store-api `/events/nearby` (2dsphere geo).
struct StoreEvent: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let category: String?
    let venueName: String?
    let startsAt: String?
    let distanceMeters: Double?
    let capacity: Int?
    let rsvpCount: Int?
    let capacityFull: Bool?
}

struct EventsNearbyResponse: Codable {
    let events: [StoreEvent]?
}

extension StoreEvent {
    func asDisplay() -> CGEvent {
        CGEvent(
            id: id,
            title: title,
            kind: CGEventKind.from(category),
            venue: venueName ?? "",
            dateLabel: EventDateFormatter.short(startsAt),
            distanceLabel: EventDistance.label(distanceMeters)
        )
    }
}

extension CGEventKind {
    static func from(_ raw: String?) -> CGEventKind {
        let value = (raw ?? "").lowercased()
        if value.contains("exer") || value.contains("move") || value.contains("run") || value.contains("fit") {
            return .move
        }
        if value.contains("food") || value.contains("eat") || value.contains("supper") || value.contains("dinner") {
            return .eat
        }
        return .gather
    }
}

enum EventDateFormatter {
    static func short(_ raw: String?) -> String {
        guard let raw, let date = parse(raw) else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE · h:mm a"
        return formatter.string(from: date)
    }

    private static func parse(_ raw: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: raw) { return date }
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: raw) { return date }
        let naive = DateFormatter()
        naive.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        naive.timeZone = TimeZone(identifier: "UTC")
        return naive.date(from: String(raw.prefix(19)))
    }
}

enum EventDistance {
    static func label(_ meters: Double?) -> String {
        guard let meters else { return "" }
        let miles = meters / 1609.34
        return miles < 0.1 ? "Nearby" : String(format: "%.1f mi", miles)
    }
}
