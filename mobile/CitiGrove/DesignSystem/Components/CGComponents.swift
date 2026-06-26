import SwiftUI

// MARK: - Eyebrow

/// Small letterspaced label — the editorial "eyebrow" above a heading.
struct CGEyebrow: View {
    let text: String
    var color: Color = CGColors.primaryDeep
    var body: some View {
        Text(text.uppercased())
            .font(CGType.eyebrow)
            .tracking(1.6)
            .foregroundStyle(color)
    }
}

// MARK: - Section header

struct CGSectionHeader: View {
    let eyebrow: String
    let title: String
    var body: some View {
        VStack(alignment: .leading, spacing: CGSpace.xs + 2) {
            CGEyebrow(text: eyebrow)
            Text(title)
                .font(CGType.section)
                .foregroundStyle(CGColors.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - Card surface

struct CGCardSurface: ViewModifier {
    var padding: CGFloat = CGSpace.lg
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(CGColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CGRadius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: CGRadius.lg, style: .continuous)
                    .strokeBorder(CGColors.line, lineWidth: 0.5)
            )
    }
}

extension View {
    /// Raised Sea Glass card: surface fill, hairline border, generous radius.
    func cgCard(padding: CGFloat = CGSpace.lg) -> some View {
        modifier(CGCardSurface(padding: padding))
    }
}

// MARK: - Buttons

/// Primary CTA — chrome fill, cream text. The AA-safe high-contrast action.
struct CGPrimaryButtonStyle: ButtonStyle {
    var fullWidth: Bool = true
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(CGType.text(14, .semibold))
            .tracking(0.4)
            .foregroundStyle(CGColors.onChrome)
            .padding(.vertical, 14)
            .padding(.horizontal, 24)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .background(CGColors.chrome)
            .clipShape(Capsule())
            .opacity(configuration.isPressed ? 0.92 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Secondary — quiet outline pill, primary-deep text.
struct CGSecondaryButtonStyle: ButtonStyle {
    var fullWidth: Bool = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(CGType.text(14, .semibold))
            .tracking(0.4)
            .foregroundStyle(CGColors.primaryDeep)
            .padding(.vertical, 13)
            .padding(.horizontal, 22)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .overlay(Capsule().strokeBorder(CGColors.line, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == CGPrimaryButtonStyle {
    static var cgPrimary: CGPrimaryButtonStyle { CGPrimaryButtonStyle() }
    static func cgPrimary(fullWidth: Bool) -> CGPrimaryButtonStyle { CGPrimaryButtonStyle(fullWidth: fullWidth) }
}
extension ButtonStyle where Self == CGSecondaryButtonStyle {
    static var cgSecondary: CGSecondaryButtonStyle { CGSecondaryButtonStyle() }
}

// MARK: - Empty state

struct CGEmptyState: View {
    let icon: String
    let title: String
    let message: String
    var body: some View {
        VStack(spacing: CGSpace.md) {
            Image(systemName: icon)
                .font(.system(size: 30, weight: .light))
                .foregroundStyle(CGColors.primary)
            Text(title)
                .font(CGType.display(20, .medium))
                .foregroundStyle(CGColors.ink)
            Text(message)
                .font(CGType.callout)
                .foregroundStyle(CGColors.inkSoft)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: 320)
        .padding(CGSpace.xl)
    }
}
