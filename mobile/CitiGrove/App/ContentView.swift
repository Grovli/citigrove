import SwiftUI

/// Root view. v1 shows the shopping experience immediately (browse without an
/// account); auth gates only checkout + RSVP + account. The auth-gated flow is
/// driven by `AuthManager` injected at the app root.
struct ContentView: View {
    var body: some View {
        MainTabView()
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
        .environmentObject(BagStore())
}
