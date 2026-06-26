import SwiftUI

/// Placeholder CitiGrove wordmark — "CG" in the serif display face. Swapped for
/// the real logo when it's designed; every surface references this view so the
/// swap is one place.
struct CGLogo: View {
    var size: CGFloat = 22
    var color: Color = CGColors.ink
    var body: some View {
        Text("CG")
            .font(CGType.display(size, .semibold))
            .tracking(1.5)
            .foregroundStyle(color)
            .accessibilityLabel("CitiGrove")
    }
}

#Preview {
    CGLogo(size: 40)
}
