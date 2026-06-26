import SwiftUI

@main
struct CitiGroveApp: App {
    @StateObject private var auth = AuthManager()
    @StateObject private var bag = BagStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(bag)
                .tint(CGColors.primaryDeep)
        }
    }
}
