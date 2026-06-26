import SwiftUI

/// Account — sign-in prompt when signed out, profile + rows when signed in.
/// Auth is Auth0 PKCE (same tenant as Grovli) via `AuthManager`.
struct AccountView: View {
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: CGSpace.xl) {
                if let user = auth.user {
                    profileHeader(user)
                } else {
                    signInCard
                }
                rows
                footer
                Color.clear.frame(height: CGSpace.tabBarInset)
            }
            .padding(.horizontal, CGSpace.lg)
            .padding(.top, CGSpace.sm)
        }
        .background(CGColors.page)
        .scrollIndicators(.hidden)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .principal) { CGLogo(size: 20) } }
    }

    private func profileHeader(_ user: CGUser) -> some View {
        VStack(alignment: .leading, spacing: CGSpace.xs) {
            CGEyebrow(text: "Your account")
            Text(user.name ?? user.email ?? "Member")
                .font(CGType.title)
                .foregroundStyle(CGColors.ink)
            if let email = user.email {
                Text(email).font(CGType.callout).foregroundStyle(CGColors.inkSoft)
            }
        }
        .padding(.top, CGSpace.sm)
    }

    private var signInCard: some View {
        VStack(alignment: .leading, spacing: CGSpace.md) {
            CGEyebrow(text: "Welcome")
            Text("Sign in to check out,\nsave addresses, and RSVP.")
                .font(CGType.title)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(2)
            Button {
                auth.signIn()
            } label: {
                Text(auth.isAuthenticating ? "Signing in…" : "Sign in")
            }
            .buttonStyle(.cgPrimary)
            .disabled(auth.isAuthenticating)
            .padding(.top, CGSpace.xs)
        }
        .cgCard(padding: CGSpace.lg)
        .padding(.top, CGSpace.sm)
    }

    private var rows: some View {
        VStack(spacing: 0) {
            AccountRow(icon: "shippingbox", title: "Orders")
            Divider().overlay(CGColors.line)
            AccountRow(icon: "mappin.and.ellipse", title: "Shipping addresses")
            Divider().overlay(CGColors.line)
            AccountRow(icon: "calendar", title: "My events")
            Divider().overlay(CGColors.line)
            AccountRow(icon: "book.closed", title: "The Journal")
            Divider().overlay(CGColors.line)
            AccountRow(icon: "leaf", title: "About CitiGrove")
        }
        .cgCard(padding: 0)
    }

    @ViewBuilder private var footer: some View {
        if auth.user != nil {
            Button { auth.signOut() } label: { Text("Sign out") }
                .buttonStyle(.cgSecondary)
        }
    }
}

private struct AccountRow: View {
    let icon: String
    let title: String
    var body: some View {
        HStack(spacing: CGSpace.md) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .regular))
                .foregroundStyle(CGColors.primaryDeep)
                .frame(width: 26)
            Text(title).font(CGType.body).foregroundStyle(CGColors.ink)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(CGColors.inkFaint)
        }
        .padding(.horizontal, CGSpace.lg)
        .padding(.vertical, CGSpace.md + 2)
        .contentShape(Rectangle())
    }
}
