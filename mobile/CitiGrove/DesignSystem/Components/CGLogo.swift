import SwiftUI

/// CitiGrove wordmark — the full name in the Newsreader editorial serif, exactly
/// as it reads in the site's sidebar / top bar. Every surface references this
/// view so the brand mark stays one place.
struct CGLogo: View {
    var size: CGFloat = 22
    var color: Color = CGColors.ink
    var body: some View {
        Text("CitiGrove")
            .font(CGType.display(size, .medium))
            .tracking(0.1)
            .foregroundStyle(color)
            .accessibilityLabel("CitiGrove")
    }
}

#Preview {
    VStack(spacing: 24) {
        CGLogo(size: 29)
        CGLogo(size: 20)
    }
    .padding()
    .background(CGColors.page)
}
