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
                    signInBlock
                }
                rows
                footer
            }
            .padding(.horizontal, CGSpace.lg)
            .padding(.top, CGSpace.sm)
            .padding(.bottom, CGSpace.xxl)
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

    private var signInBlock: some View {
        VStack(alignment: .leading, spacing: CGSpace.md) {
            CGEyebrow(text: "Welcome")
            Text("Sign in to check out,\nsave addresses, and RSVP.")
                .font(CGType.title)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(3)
            Button {
                auth.signIn()
            } label: {
                Text(auth.isAuthenticating ? "Signing in…" : "Sign in")
            }
            .buttonStyle(.cgPrimary)
            .disabled(auth.isAuthenticating)
            .padding(.top, CGSpace.xs)
        }
        .padding(.top, CGSpace.sm)
    }

    private var rows: some View {
        VStack(spacing: 0) {
            CGHairline()
            AccountRow(icon: "shippingbox", title: "Orders")
            CGHairline()
            AccountRow(icon: "mappin.and.ellipse", title: "Shipping addresses")
            CGHairline()
            AccountRow(icon: "calendar", title: "My events")
            CGHairline()
            AccountRow(icon: "book.closed", title: "The Journal")
            CGHairline()
            AccountRow(icon: "leaf", title: "About CitiGrove")
            CGHairline()
        }
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
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(CGColors.inkFaint)
        }
        .padding(.vertical, CGSpace.md + 2)
        .contentShape(Rectangle())
    }
}
